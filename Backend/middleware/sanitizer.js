// ─── Input Sanitization Middleware ───────────────────────────────────────────
// Strips dangerous characters to prevent XSS and injection attacks.

/**
 * Recursively sanitize a value by removing potentially dangerous characters.
 * Strips HTML tags and common XSS vectors from strings.
 */
const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        return value
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/<[^>]*>/g, '')           // Remove HTML tags
            .replace(/javascript:/gi, '')       // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '')         // Remove event handlers (onclick=, etc.)
            .replace(/eval\s*\(/gi, '')         // Remove eval()
            .replace(/expression\s*\(/gi, '')   // Remove CSS expression()
            .trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
        const sanitized = {};
        for (const key of Object.keys(value)) {
            sanitized[sanitizeValue(key)] = sanitizeValue(value[key]);
        }
        return sanitized;
    }
    return value;
};

/**
 * Express middleware that sanitizes req.body, req.query, and req.params.
 */
const sanitizeInput = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object') {
            // Skip sanitization for encrypted payloads (they'll be sanitized after decryption)
            if (!req.body.encrypted) {
                req.body = sanitizeValue(req.body);
            }
        }
        if (req.query) {
            req.query = sanitizeValue(req.query);
        }
        if (req.params) {
            req.params = sanitizeValue(req.params);
        }
    } catch (error) {
        console.error('Sanitization error:', error.message);
    }
    next();
};

module.exports = sanitizeInput;
