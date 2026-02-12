const { decryptPayload } = require('../utils/encryption');

// ─── Request Decryption Middleware ───────────────────────────────────────────
// Detects incoming encrypted request bodies and decrypts them before
// passing to controllers. Encrypted requests have the format:
// { encrypted: true, payload: '<base64-aes-data>' }

/**
 * Middleware to decrypt incoming encrypted request bodies.
 * If the body has { encrypted: true, payload: '...' }, it decrypts and
 * replaces req.body with the decrypted data.
 */
const decryptRequest = (req, res, next) => {
    try {
        if (req.body && req.body.encrypted === true && req.body.payload) {
            const decryptedData = decryptPayload(req.body.payload);

            if (typeof decryptedData === 'object' && decryptedData !== null) {
                req.body = decryptedData;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid encrypted payload format'
                });
            }
        }
    } catch (error) {
        console.error('Request decryption error:', error.message);
        return res.status(400).json({
            success: false,
            message: 'Failed to decrypt request payload'
        });
    }

    next();
};

module.exports = decryptRequest;
