const fs = require('fs');
const path = require('path');

// ─── Security Event Logger ──────────────────────────────────────────────────
// Logs security-related events: auth failures, unauthorized access, encryption errors.

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'security.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log a security event to both console and file.
 */
const logSecurityEvent = (event) => {
    const entry = {
        timestamp: new Date().toISOString(),
        ...event
    };

    const logLine = JSON.stringify(entry) + '\n';

    // Write to log file (async, non-blocking)
    fs.appendFile(LOG_FILE, logLine, (err) => {
        if (err) console.error('Failed to write security log:', err.message);
    });

    // Also log to console in dev mode
    if (process.env.NODE_ENV !== 'production') {
        console.log(`🔒 SECURITY: [${entry.type}] ${entry.message} | IP: ${entry.ip || 'unknown'}`);
    }
};

/**
 * Express middleware that logs security-relevant request data.
 * Captures failed auth attempts, access to sensitive endpoints, etc.
 */
const securityLogger = (req, res, next) => {
    // Store original end method to capture response status
    const originalEnd = res.end;

    res.end = function (...args) {
        // Log failed authentication attempts
        if (req.path.includes('/auth/login') && res.statusCode === 401) {
            logSecurityEvent({
                type: 'AUTH_FAILURE',
                message: `Failed login attempt for: ${req.body?.email || 'unknown'}`,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent'],
                path: req.path,
                method: req.method
            });
        }

        // Log unauthorized access attempts
        if (res.statusCode === 403) {
            logSecurityEvent({
                type: 'UNAUTHORIZED_ACCESS',
                message: `Unauthorized access attempt`,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent'],
                path: req.path,
                method: req.method,
                userId: req.user?.id || 'unauthenticated'
            });
        }

        // Log rate limit hits
        if (res.statusCode === 429) {
            logSecurityEvent({
                type: 'RATE_LIMIT',
                message: `Rate limit exceeded`,
                ip: req.ip || req.connection?.remoteAddress,
                path: req.path,
                method: req.method
            });
        }

        originalEnd.apply(this, args);
    };

    next();
};

module.exports = { securityLogger, logSecurityEvent };
