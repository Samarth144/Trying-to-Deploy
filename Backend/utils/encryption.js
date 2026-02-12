const crypto = require('crypto');

// ─── AES-256-GCM Encryption Utility ─────────────────────────────────────────
// Uses AES-256-GCM for authenticated encryption (confidentiality + integrity)
// Format: base64(iv:authTag:ciphertext)

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;      // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32;      // 256-bit key

/**
 * Get the encryption key from environment variable.
 * The key must be a 64-character hex string (32 bytes = 256 bits).
 */
const getEncryptionKey = () => {
    const key = process.env.AES_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('AES_ENCRYPTION_KEY is not set in environment variables');
    }
    return Buffer.from(key, 'hex');
};

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Base64 encoded string containing iv:authTag:ciphertext
 */
const encrypt = (plaintext) => {
    if (plaintext === null || plaintext === undefined) return null;

    const text = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    });

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all hex), then base64 encode the whole thing
    const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    return Buffer.from(combined).toString('base64');
};

/**
 * Decrypt AES-256-GCM encrypted data.
 * @param {string} ciphertext - Base64 encoded iv:authTag:encryptedData
 * @returns {string} Original plaintext
 */
const decrypt = (ciphertext) => {
    if (!ciphertext || ciphertext === null) return null;

    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(ciphertext, 'base64').toString('utf8');
        const parts = combined.split(':');

        if (parts.length !== 3) {
            // Data is not encrypted, return as-is
            return ciphertext;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedData = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error.message);
        // Return original value if decryption fails (data might not be encrypted)
        return ciphertext;
    }
};

/**
 * Encrypt a model field value. Handles JSON objects by stringifying first.
 * @param {*} value - The value to encrypt
 * @returns {string|null} Encrypted string or null
 */
const encryptField = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') {
        return encrypt(JSON.stringify(value));
    }
    return encrypt(String(value));
};

/**
 * Decrypt a model field value.
 * @param {string} value - Encrypted string
 * @param {boolean} parseJson - Whether to parse the result as JSON
 * @returns {*} Decrypted value
 */
const decryptField = (value, parseJson = false) => {
    if (!value) return value;
    const decrypted = decrypt(value);
    if (parseJson && decrypted) {
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    }
    return decrypted;
};

/**
 * One-way hash for searchable encrypted fields.
 * @param {string} value - The value to hash
 * @returns {string} SHA-256 hash
 */
const hashSensitiveData = (value) => {
    if (!value) return null;
    return crypto.createHash('sha256').update(String(value)).digest('hex');
};

/**
 * Encrypt an entire JSON response payload.
 * @param {object} data - The response data to encrypt
 * @returns {object} { encrypted: true, payload: '<encrypted-base64>' }
 */
const encryptPayload = (data) => {
    const jsonString = JSON.stringify(data);
    return {
        encrypted: true,
        payload: encrypt(jsonString)
    };
};

/**
 * Decrypt an encrypted payload.
 * @param {string} payload - The encrypted payload string
 * @returns {object} Decrypted data
 */
const decryptPayload = (payload) => {
    const decrypted = decrypt(payload);
    try {
        return JSON.parse(decrypted);
    } catch {
        return decrypted;
    }
};

/**
 * Generate a random AES-256 key (for initial setup).
 * @returns {string} 64-character hex string
 */
const generateEncryptionKey = () => {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
};

module.exports = {
    encrypt,
    decrypt,
    encryptField,
    decryptField,
    hashSensitiveData,
    encryptPayload,
    decryptPayload,
    generateEncryptionKey,
    ALGORITHM
};
