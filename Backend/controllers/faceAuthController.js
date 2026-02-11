const { Op } = require('sequelize');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load face-api.js models once when the server starts
// This is a simplified approach for demonstration. In a production environment,
// you would want to load these models globally and ensure they are ready before requests.
let modelsLoaded = false;
const loadFaceApiModels = async () => {
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log('Face-API models loaded successfully on backend.');
    } catch (e) {
        console.error('Error loading Face-API models on backend:', e);
        // Depending on criticality, you might want to exit the process or disable face auth
    }
};
loadFaceApiModels();

// @desc    Register a new doctor with face
// @route   POST /api/face-auth/register-doctor
// @access  Public
exports.registerDoctor = async (req, res) => {
    try {
        const { name, email, password, descriptor } = req.body;

        // Basic validation
        if (!name || !email || !password || !descriptor) {
            return res.status(400).json({ success: false, message: 'Please provide name, email, password, and face descriptor.' });
        }

        // Check if user exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User with this email already exists.' });
        }

        // Create user with face descriptor
        const user = await User.create({
            name,
            email,
            password,
            role: 'oncologist', // Hardcode role to oncologist
            faceDescriptors: [descriptor] // Save the first descriptor
        });

        // Return user and token
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
        console.error('DOCTOR REGISTRATION ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error during doctor registration.' });
    }
};

// @desc    Register a doctor's face descriptor
// @route   POST /api/face-auth/register
// @access  Private (for the logged-in doctor)
exports.registerFace = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware
        const { descriptor } = req.body;

        if (!descriptor) {
            return res.status(400).json({ success: false, message: 'Face descriptor is required.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.role !== 'oncologist') {
            return res.status(403).json({ success: false, message: 'Face registration is only for doctors.' });
        }

        // The User model needs a 'faceDescriptors' field (e.g., JSONB or JSON)
        const existingDescriptors = user.faceDescriptors || [];
        // Add the new descriptor. You might want to limit the number of descriptors per user.
        const updatedDescriptors = [...existingDescriptors, descriptor];

        await user.update({ faceDescriptors: updatedDescriptors });

        res.status(201).json({
            success: true,
            message: 'Face descriptor registered successfully.'
        });

    } catch (error) {
        console.error('FACE DESCRIPTOR REGISTRATION ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error during face registration.' });
    }
};

// @desc    Get face descriptors for doctors (optionally by email)
// @route   GET /api/face-auth/descriptors
// @access  Public
exports.getFaceDescriptors = async (req, res) => {
    try {
        const { email } = req.query;
        let whereClause = {
            role: 'oncologist',
            faceDescriptors: {
                [Op.ne]: null
            }
        };

        if (email) {
            whereClause.email = email;
        }

        const doctors = await User.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'faceDescriptors']
        });

        // We need to format the data for the frontend FaceMatcher
        const labeledFaceDescriptors = doctors.map(doc => ({
            userId: doc.id,
            name: doc.name,
            descriptors: doc.faceDescriptors.map(d => Object.values(d)) // Convert descriptor objects to Float32Array compatible arrays
        }));

        res.json({
            success: true,
            data: labeledFaceDescriptors
        });

    } catch (error) {
        console.error('GET DESCRIPTORS ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching face descriptors.' });
    }
};

// @desc    Generate token after successful client-side face match
// @route   POST /api/face-auth/generate-token
// @access  Public
exports.generateTokenForFaceLogin = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const user = await User.findByPk(userId);
        if (!user || user.role !== 'oncologist') {
            // Also check for role as an extra security measure
            return res.status(401).json({ success: false, message: 'Invalid user.' });
        }

        // If successful, return user info and a new token
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
        console.error('FACE LOGIN TOKEN GENERATION ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error during token generation.' });
    }
};

// @desc    Login user with face descriptor
// @route   POST /api/face-auth/login
// @access  Public
exports.loginWithFace = async (req, res) => {
    try {
        const { email, descriptor } = req.body;

        if (!email || !descriptor) {
            return res.status(400).json({ success: false, message: 'Email and face descriptor are required.' });
        }

        if (!modelsLoaded) {
            return res.status(503).json({ success: false, message: 'Face recognition models are not yet loaded. Please try again in a moment.' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.faceDescriptors || user.faceDescriptors.length === 0) {
            return res.status(400).json({ success: false, message: 'No face descriptors registered for this user.' });
        }

        // Convert received descriptor to Float32Array
        const receivedDescriptor = new Float32Array(descriptor);

        let matchFound = false;
        const FACE_MATCH_THRESHOLD = 0.6; // Common threshold for face matching

        for (const storedDescriptor of user.faceDescriptors) {
            // Convert stored descriptor (which is an object from DB) to Float32Array
            // Ensure storedDescriptor is an array of numbers, not an object with numeric keys
            const storedFloat32Array = new Float32Array(Object.values(storedDescriptor));
            const distance = faceapi.euclideanDistance(receivedDescriptor, storedFloat32Array);

            if (distance < FACE_MATCH_THRESHOLD) {
                matchFound = true;
                break;
            }
        }

        if (matchFound) {
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
        } else {
            res.status(401).json({ success: false, message: 'Face verification failed. No match found.' });
        }

    } catch (error) {
        console.error('FACE LOGIN ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error during face login.' });
    }
};
