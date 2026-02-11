const express = require('express');
const router = express.Router();
const { 
    registerDoctor,
    registerFace, 
    getFaceDescriptors, // Renamed
    generateTokenForFaceLogin,
    loginWithFace // New import
} = require('../controllers/faceAuthController');
const { protect } = require('../middleware/auth');

// @route   POST /api/face-auth/register-doctor
// @desc    Register a new doctor with face included
// @access  Public
router.post('/register-doctor', registerDoctor);

// @route   POST /api/face-auth/register
// @desc    Register a face descriptor for an existing doctor
// @access  Private
router.post('/register', protect, registerFace);

// @route   GET /api/face-auth/descriptors
// @desc    Get face descriptors for doctors (optionally by email)
// @access  Public
router.get('/descriptors', getFaceDescriptors); // Route updated

// @route   POST /api/face-auth/generate-token
// @desc    Generate a token after a successful client-side face match
// @access  Public
router.post('/generate-token', generateTokenForFaceLogin);

// @route   POST /api/face-auth/login
// @desc    Login with face descriptor
// @access  Public
router.post('/login', loginWithFace);

module.exports = router;
