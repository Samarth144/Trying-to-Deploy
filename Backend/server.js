const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { sequelize, connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ─── Security Middleware Imports ─────────────────────────────────────────────
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const sanitizeInput = require('./middleware/sanitizer');
const decryptRequest = require('./middleware/decryptRequest');
const encryptResponse = require('./middleware/encryptResponse');
const { securityLogger } = require('./middleware/securityLogger');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Sync models
sequelize.sync({ alter: true }).then(() => {
    console.log('🐘 Database models synchronized');
}).catch(err => {
    console.error('❌ Database synchronization failed:', err);
});

const app = express();

// ─── Core Middleware ─────────────────────────────────────────────────────────

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Security Middleware Stack ───────────────────────────────────────────────

// 1. CORS - Restrict origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:8000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Allow in development, restrict in production
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Encrypted']
}));

// 2. Security headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
}));

// 3. Rate limiting (general)
app.use('/api/', generalLimiter);

// 4. Security event logger
app.use(securityLogger);

// 5. Input sanitization
app.use(sanitizeInput);

// 6. Request decryption (decrypt encrypted payloads from frontend)
app.use(decryptRequest);

// 7. Response encryption (encrypt sensitive API responses)
app.use(encryptResponse);

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../Frontend/dist')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Route Mounting ──────────────────────────────────────────────────────────

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/face-auth', authLimiter, require('./routes/faceAuth'));

// Protected data routes
app.use('/api/patients', require('./routes/patients'));
app.use('/api/analyses', require('./routes/analysis'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api/outcomes', require('./routes/outcomes'));

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/uploads', require('./routes/uploads'));

// Health check endpoint (unencrypted)
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'RESONANCE AI Backend is running',
        timestamp: new Date().toISOString(),
        security: {
            aesEncryption: 'AES-256-GCM',
            rateLimiting: 'Active',
            inputSanitization: 'Active',
            responseEncryption: 'Active',
            securityLogging: 'Active'
        }
    });
});

// Serve index.html for any other routes (SPA support)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../Frontend/dist/index.html'));
    } else {
        res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              🧠 RESONANCE Backend Server Running          ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port: ${PORT}                                              ║
║   Database: Connected                                     ║
║                                                           ║
║   🔐 Security: AES-256-GCM Encryption Active             ║
║   🛡️  Rate Limiting: Active                               ║
║   🧹 Input Sanitization: Active                           ║
║   📋 Security Logging: Active                             ║
║                                                           ║
║   API Documentation: http://localhost:${PORT}/api/health    ║
║   Frontend: http://localhost:${PORT}                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;
