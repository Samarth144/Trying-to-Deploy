const rateLimit = require('express-rate-limit');

// ─── Rate Limiting Middleware ────────────────────────────────────────────────
// Protects against brute-force attacks and API abuse.

/**
 * General API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth-specific rate limiter (login/register).
 * 5 requests per 15 minutes per IP — brute-force protection.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Sensitive operations rate limiter (data exports, admin actions).
 * 20 requests per 15 minutes per IP.
 */
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many sensitive requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter, sensitiveLimiter };
