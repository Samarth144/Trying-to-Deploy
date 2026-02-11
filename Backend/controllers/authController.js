const User = require('../models/User');
const Patient = require('../models/Patient');
const generateToken = require('../utils/generateToken');


// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const trimmedEmail = email ? email.trim() : '';

        // Check if user exists
        const userExists = await User.findOne({ where: { email: trimmedEmail } });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email: trimmedEmail,
            password,
            role: role || 'oncologist'
        });

        // Link existing patient record if this is a patient registration
        if (user.role === 'patient') {
            await Patient.update(
                { userId: user.id },
                { where: { email: trimmedEmail, userId: null } }
            );
        }

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id)
            }
        });
    } catch (error) {
        console.error('REGISTRATION ERROR:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check for user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }



        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Check user role by email
// @route   GET /api/auth/check-role/:email
// @access  Public
exports.checkUserRole = async (req, res) => {
    try {
        const user = await User.findOne({ where: { email: req.params.email } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                id: user.id, // Include user ID
                role: user.role,
                hasFaceLogin: user.faceDescriptors && user.faceDescriptors.length > 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
