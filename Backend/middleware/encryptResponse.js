const { encryptPayload } = require('../utils/encryption');

// ─── Response Encryption Middleware ──────────────────────────────────────────
// Intercepts outgoing JSON responses on sensitive endpoints and encrypts them.
// The encrypted response format: { encrypted: true, payload: '<base64-aes-data>' }

// Sensitive route prefixes that should have encrypted responses
const SENSITIVE_ROUTES = [
    '/api/patients',
    '/api/analyses',
    '/api/treatments',
    '/api/outcomes',
    '/api/dashboard',
    '/api/face-auth',
    '/api/admin',
    '/api/auth/me'
];

/**
 * Check if the current request path matches a sensitive route.
 */
const isSensitiveRoute = (path) => {
    return SENSITIVE_ROUTES.some(route => path.startsWith(route));
};

/**
 * Middleware that encrypts response body for sensitive API endpoints.
 * Uses AES-256-GCM to wrap response data.
 */
const encryptResponse = (req, res, next) => {
    // Only encrypt for sensitive routes
    if (!isSensitiveRoute(req.path)) {
        return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to encrypt the response
    res.json = (data) => {
        try {
            // Don't encrypt error responses or health checks
            if (res.statusCode >= 400 || data?.encrypted) {
                return originalJson(data);
            }

            const encryptedResponse = encryptPayload(data);
            return originalJson(encryptedResponse);
        } catch (error) {
            console.error('Response encryption error:', error.message);
            // Fall back to sending unencrypted data
            return originalJson(data);
        }
    };

    next();
};

module.exports = encryptResponse;
