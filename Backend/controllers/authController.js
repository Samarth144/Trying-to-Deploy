const User = require('../models/User');
const Patient = require('../models/Patient');
const generateToken = require('../utils/generateToken');
const { hashSensitiveData } = require('../utils/encryption');
const { Op } = require('sequelize');


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
            const emailHash = hashSensitiveData(trimmedEmail.toLowerCase());
            
            // Try updating by hash first (best performance)
            const [affectedRows] = await Patient.update(
                { userId: user.id },
                { where: { emailHash, userId: null } }
            );

            // Fallback for existing patients without emailHash
            if (affectedRows === 0) {
                console.log(`No patient found by emailHash for ${trimmedEmail}, trying fallback search...`);
                const patientsWithoutHash = await Patient.findAll({ where: { userId: null } });
                for (const p of patientsWithoutHash) {
                    // Patient model automatically decrypts 'email' in afterFind hook
                    if (p.email && p.email.trim().toLowerCase() === trimmedEmail.toLowerCase()) {
                        console.log(`Matched patient ${p.id} via fallback search. Linking to user ${user.id}...`);
                        p.userId = user.id;
                        // Saving will also trigger beforeValidate which calculates emailHash for future lookups
                        await p.save();
                        break;
                    }
                }
            }
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



        // Link existing patient record if this is a patient login but userId is not linked yet
        if (user.role === 'patient') {
            const emailHash = hashSensitiveData(email.trim().toLowerCase());
            
            // Try to find patient record that matches emailHash first
            let patient = await Patient.findOne({
                where: { emailHash, userId: null }
            });

            if (!patient) {
                // Try fallback for patients who don't have emailHash yet
                const unlinkedPatients = await Patient.findAll({ where: { userId: null } });
                for (const p of unlinkedPatients) {
                    // Patient model automatically decrypts email in afterFind hook
                    if (p.email && p.email.trim().toLowerCase() === email.trim().toLowerCase()) {
                        patient = p;
                        break;
                    }
                }
            }

            if (patient) {
                console.log(`Linking patient ${patient.id} to user ${user.id} during login...`);
                patient.userId = user.id;
                // save() will trigger beforeValidate hook to calculate emailHash
                await patient.save();
            }
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
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};