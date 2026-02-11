const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { sequelize, connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

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

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
}));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../Frontend/dist')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/face-auth', require('./routes/faceAuth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/analyses', require('./routes/analysis'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api/outcomes', require('./routes/outcomes'));

app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/uploads', require('./routes/uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'RESONANCE AI Backend is running',
        timestamp: new Date().toISOString()
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
