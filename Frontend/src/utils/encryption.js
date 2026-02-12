// ─── Frontend AES-256-GCM Encryption Utility ────────────────────────────────
// Uses the browser-native Web Crypto API (no npm packages needed).
// Provides encrypt/decrypt functions compatible with the backend encryption format.

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 16; // 128-bit IV
const KEY_LENGTH = 256; // 256-bit key

/**
 * Convert a hex string to ArrayBuffer.
 */
const hexToBuffer = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
};

/**
 * Convert ArrayBuffer to hex string.
 */
const bufferToHex = (buffer) => {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Import the AES key from a hex string for use with Web Crypto API.
 */
const importKey = async (keyHex) => {
    const keyBuffer = hexToBuffer(keyHex);
    return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: ALGORITHM },
        false,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypt plaintext using AES-256-GCM (browser-native Web Crypto API).
 * Output format matches the backend: base64(iv_hex:authTag_hex:ciphertext_hex)
 * @param {string} plaintext - Text to encrypt
 * @param {string} keyHex - 64-character hex key
 * @returns {Promise<string>} Encrypted base64 string
 */
export const encrypt = async (plaintext, keyHex) => {
    try {
        const key = await importKey(keyHex);
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv, tagLength: 128 },
            key,
            data
        );

        // Web Crypto API appends the auth tag to the ciphertext
        const encryptedArray = new Uint8Array(encrypted);
        const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);
        const authTag = encryptedArray.slice(encryptedArray.length - 16);

        const combined = `${bufferToHex(iv.buffer)}:${bufferToHex(authTag.buffer)}:${bufferToHex(ciphertext.buffer)}`;
        return btoa(combined);
    } catch (error) {
        console.error('Frontend encryption error:', error);
        throw error;
    }
};

/**
 * Decrypt AES-256-GCM encrypted data (compatible with backend format).
 * @param {string} ciphertext - Base64 encoded iv:authTag:encryptedData
 * @param {string} keyHex - 64-character hex key
 * @returns {Promise<string>} Decrypted plaintext
 */
export const decrypt = async (ciphertext, keyHex) => {
    try {
        const key = await importKey(keyHex);
        const combined = atob(ciphertext);
        const parts = combined.split(':');

        if (parts.length !== 3) {
            // Not encrypted, return as-is
            return ciphertext;
        }

        const iv = new Uint8Array(hexToBuffer(parts[0]));
        const authTag = new Uint8Array(hexToBuffer(parts[1]));
        const encryptedData = new Uint8Array(hexToBuffer(parts[2]));

        // Web Crypto expects authTag appended to ciphertext
        const encryptedWithTag = new Uint8Array(encryptedData.length + authTag.length);
        encryptedWithTag.set(encryptedData);
        encryptedWithTag.set(authTag, encryptedData.length);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv, tagLength: 128 },
            key,
            encryptedWithTag
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Frontend decryption error:', error);
        return ciphertext; // Return original if decryption fails
    }
};

/**
 * Encrypt a JSON object for API transmission.
 * @param {object} data - Object to encrypt
 * @param {string} keyHex - Encryption key
 * @returns {Promise<object>} { encrypted: true, payload: '<encrypted>' }
 */
export const encryptPayload = async (data, keyHex) => {
    const jsonString = JSON.stringify(data);
    const payload = await encrypt(jsonString, keyHex);
    return { encrypted: true, payload };
};

/**
 * Decrypt an encrypted API response.
 * @param {string} payload - Encrypted payload string
 * @param {string} keyHex - Decryption key
 * @returns {Promise<object>} Decrypted data
 */
export const decryptPayload = async (payload, keyHex) => {
    const decrypted = await decrypt(payload, keyHex);
    try {
        return JSON.parse(decrypted);
    } catch {
        return decrypted;
    }
};

/**
 * Encrypt a value for secure storage in localStorage.
 * Uses a simpler approach for token storage.
 * @param {string} value - Value to encrypt
 * @returns {string} Base64 encoded encrypted value
 */
export const encryptForStorage = (value) => {
    try {
        // Simple obfuscation for localStorage (not full AES, but prevents casual reading)
        const encoded = btoa(encodeURIComponent(value).split('').reverse().join(''));
        return `enc_${encoded}`;
    } catch {
        return value;
    }
};

/**
 * Decrypt a value from secure localStorage storage.
 * @param {string} value - Encrypted value
 * @returns {string} Decrypted value
 */
export const decryptFromStorage = (value) => {
    try {
        if (!value || !value.startsWith('enc_')) return value;
        const encoded = value.substring(4);
        return decodeURIComponent(atob(encoded).split('').reverse().join(''));
    } catch {
        return value;
    }
};
