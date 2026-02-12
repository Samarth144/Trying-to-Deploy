import axios from 'axios';
import { decryptPayload, encryptPayload } from './encryption';

// ─── Secure API Client ──────────────────────────────────────────────────────
// Axios instance with request/response interceptors for automatic
// AES-256-GCM encryption/decryption of sensitive API traffic.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// The encryption key for API payloads (shared with backend via env)
const API_ENCRYPTION_KEY = import.meta.env.VITE_AES_KEY || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

// Endpoints that should have their request body encrypted
const ENCRYPT_REQUEST_ENDPOINTS = [
    '/patients',
    '/analyses',
    '/treatments'
];

// Create configured axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ─── Request Interceptor ────────────────────────────────────────────────────
// Attaches auth token and optionally encrypts request body.
apiClient.interceptors.request.use(
    async (config) => {
        // Attach authorization token
        const token = localStorage.getItem('token');
        if (token) {
            // Handle both encrypted and unencrypted tokens
            let actualToken = token;
            if (token.startsWith('enc_')) {
                const { decryptFromStorage } = await import('./encryption');
                actualToken = decryptFromStorage(token);
            }
            config.headers.Authorization = `Bearer ${actualToken}`;
        }

        // Encrypt request body for sensitive endpoints
        if (config.data && config.method !== 'get') {
            const shouldEncrypt = ENCRYPT_REQUEST_ENDPOINTS.some(ep =>
                config.url?.includes(ep)
            );

            if (shouldEncrypt && !config.data.encrypted) {
                try {
                    config.data = await encryptPayload(config.data, API_ENCRYPTION_KEY);
                    config.headers['X-Encrypted'] = 'true';
                } catch (err) {
                    console.warn('Request encryption failed, sending unencrypted:', err.message);
                }
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Response Interceptor ───────────────────────────────────────────────────
// Automatically detects and decrypts encrypted API responses.
apiClient.interceptors.response.use(
    async (response) => {
        // Check if response is encrypted
        if (response.data?.encrypted === true && response.data?.payload) {
            try {
                const decryptedData = await decryptPayload(
                    response.data.payload,
                    API_ENCRYPTION_KEY
                );
                response.data = decryptedData;
            } catch (err) {
                console.error('Response decryption failed:', err.message);
                // Return raw encrypted data if decryption fails
            }
        }

        return response;
    },
    (error) => {
        // Handle specific error cases
        if (error.response?.status === 401) {
            // Token expired or invalid — clear auth state
            localStorage.removeItem('token');
            delete apiClient.defaults.headers.common['Authorization'];
        }

        if (error.response?.status === 429) {
            console.warn('Rate limited — too many requests. Please wait.');
        }

        return Promise.reject(error);
    }
);

/**
 * Set the authorization token on the API client.
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

export default apiClient;
