const Patient = require('../models/Patient');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const pdfParser = require('pdf-parse');
const axios = require('axios');

// @desc    Analyze pathology report for a patient
// @route   POST /api/patients/:id/analyze-pathology
// @access  Private
exports.analyzePathology = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);

        if (!patient) {
            console.error(`Patient not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Patient not found' });
        }

        console.log(`Analyzing pathology for patient ${req.params.id}`);
        console.log(`Stored Report Path: '${patient.pathologyReportPath}'`);

        if (!patient.pathologyReportPath) {
            console.error("No pathology report path in DB");
            return res.status(400).json({ message: 'No pathology report linked to this patient. Please upload one via the Intake Form.' });
        }

        // Construct absolute path
        const absolutePath = path.resolve(__dirname, '..', patient.pathologyReportPath);
        console.log(`Absolute File Path for AI Engine: ${absolutePath}`);

        if (!fs.existsSync(absolutePath)) {
             console.error("File does not exist on disk at:", absolutePath);
             return res.status(404).json({ message: 'Report file not found on server.' });
        }

        // Send file path and cancerType to AI Engine
        console.log(`Sending file to AI Engine for ${patient.cancerType} analysis...`);
        let aiResponse;
        try {
            aiResponse = await axios.post('http://localhost:5000/process_report_file', {
                file_path: absolutePath,
                cancer_type: patient.cancerType // Pass the type from Intake Form
            });
            console.log("AI Engine responded successfully.");
        } catch (aiErr) {
            console.error("AI Engine Communication Error:", aiErr.message);
            if (aiErr.response) {
                console.error("AI Engine Data:", aiErr.response.data);
                return res.status(500).json({ message: "AI Engine Error", details: aiErr.response.data });
            }
            throw aiErr;
        }

        // Save extracted data and analysis to DB
        console.log("Updating patient record with analysis...");
        await patient.update({
            pathologyAnalysis: aiResponse.data // Save structured AI analysis
        });
        console.log("Patient record updated.");

        res.json({
            success: true,
            ...aiResponse.data
        });

    } catch (error) {
        console.error("CRITICAL ERROR in analyzePathology:", error);
        res.status(500).json({
            success: false,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = async (req, res) => {
    try {
        // Only oncologist, admin, and researcher can list patients
        if (req.user.role === 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Patients are not authorized to list all patients'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const where = {};
        // If oncologist, they might only want to see their own patients
        // For now, let's allow them to see all, but we could filter by oncologistId
        // if (req.user.role === 'oncologist') where.oncologistId = req.user.id;

        const { count, rows: patients } = await Patient.findAndCountAll({
            where,
            include: [{
                model: User,
                as: 'oncologist',
                attributes: ['name', 'email']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            success: true,
            count: patients.length,
            total: count,
            page,
            pages: Math.ceil(count / limit),
            data: patients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'oncologist',
                attributes: ['name', 'email']
            }]
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Role-based access check
        if (req.user.role === 'patient' && patient.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this patient record'
            });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private
exports.createPatient = async (req, res) => {
    try {
        const {
            name, mrn, dob, gender, contact, email, diagnosisDate, cancerType,
            idh1, mgmt, er, pr, her2, brca, pdl1, egfr, alk, ros1, kras, afp,
            kps, ecog, symptoms, comorbidities, pathologyReport, pathologyReportPath, mriPaths, vcfAnalysis,
            userId
        } = req.body;

        const trimmedEmail = email ? email.trim() : null;

        // 1. Split Name
        const nameParts = name ? name.split(' ') : ['Unknown', ''];
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

        // ... (formatting logic remains same)
        const symptomsArray = typeof symptoms === 'string' ? symptoms.split(',').filter(s => s.trim()) : [];
        const comorbiditiesArray = typeof comorbidities === 'string' ? comorbidities.split(',').filter(s => s.trim()) : [];

        const genomicProfile = {
            idh1, mgmt, er, pr, her2, brca, pdl1, egfr, alk, ros1, kras, afp
        };

        Object.keys(genomicProfile).forEach(key => 
            (genomicProfile[key] === undefined || genomicProfile[key] === null) && delete genomicProfile[key]
        );

        // 2. Automatic User Linking
        // If an email is provided but no userId, try to find a user with that email
        let finalUserId = userId;
        if (!finalUserId && trimmedEmail) {
            const userWithEmail = await User.findOne({ where: { email: trimmedEmail } });
            if (userWithEmail) {
                finalUserId = userWithEmail.id;
            }
        }

        // 3. Construct Patient Record
        const patientData = {
            firstName,
            lastName,
            mrn,
            dateOfBirth: dob,
            gender: gender ? gender.toLowerCase() : 'other',
            email: trimmedEmail,
            phone: contact,
            diagnosis: cancerType || 'Unknown', 
            diagnosisDate,
            cancerType,
            status: 'Pending',
            performanceStatus: ecog !== undefined ? String(ecog) : '1',
            kps: kps ? parseInt(kps) : 100,
            symptoms: symptomsArray,
            comorbidities: comorbiditiesArray,
            genomicProfile,
            vcfAnalysis: vcfAnalysis || {},
            medicalHistory: pathologyReport, 
            pathologyReportPath, 
            mriPaths,
            oncologistId: req.user.id,
            userId: finalUserId || null
        };

        const patient = await Patient.create(patientData);

        res.status(201).json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error("Error creating patient:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = async (req, res) => {
    try {
        let patient = await Patient.findByPk(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const { 
            name, mrn, dob, gender, contact, email, diagnosisDate, cancerType,
            idh1, mgmt, er, pr, her2, brca, pdl1, egfr, alk, ros1, kras, afp,
            kps, ecog, symptoms, comorbidities, pathologyReport, pathologyReportPath, mriPaths, vcfAnalysis,
            userId
        } = req.body;

        const trimmedEmail = email ? email.trim() : (patient.email ? patient.email.trim() : null);
        const updates = {};

        if (email) updates.email = trimmedEmail;
        
        // Automatic User Linking on Update
        if (userId) {
            updates.userId = userId;
        } else if (trimmedEmail && !patient.userId) {
            const userWithEmail = await User.findOne({ where: { email: trimmedEmail } });
            if (userWithEmail) {
                updates.userId = userWithEmail.id;
            }
        }
        // 1. Handle Name Split if provided
        if (name) {
            const nameParts = name.split(' ');
            updates.firstName = nameParts[0];
            updates.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : patient.lastName; 
        }

        if (mrn) updates.mrn = mrn;
        if (dob) updates.dateOfBirth = dob;
        if (gender) updates.gender = gender;
        if (contact) updates.phone = contact;
        if (diagnosisDate) updates.diagnosisDate = diagnosisDate;
        if (cancerType) {
            updates.cancerType = cancerType;
            updates.diagnosis = cancerType;
        }
        if (pathologyReport) updates.medicalHistory = pathologyReport;
        if (pathologyReportPath) updates.pathologyReportPath = pathologyReportPath;
        if (vcfAnalysis) updates.vcfAnalysis = vcfAnalysis;
        if (mriPaths) {
            updates.mriPaths = { ...(patient.mriPaths || {}), ...mriPaths };
        }
        
        // 2. Handle Arrays
        if (symptoms !== undefined) {
            updates.symptoms = typeof symptoms === 'string' ? symptoms.split(',').filter(s => s.trim()) : symptoms;
        }
        if (comorbidities !== undefined) {
            updates.comorbidities = typeof comorbidities === 'string' ? comorbidities.split(',').filter(s => s.trim()) : comorbidities;
        }

        // 3. Handle Scores
        if (ecog !== undefined) updates.performanceStatus = String(ecog);
        if (kps !== undefined) updates.kps = parseInt(kps);

        // 4. Update Genomic Profile (Merge with existing)
        const newMarkers = { idh1, mgmt, er, pr, her2, brca, pdl1, egfr, alk, ros1, kras, afp };
        // Remove undefined keys
        Object.keys(newMarkers).forEach(key => newMarkers[key] === undefined && delete newMarkers[key]);
        
        if (Object.keys(newMarkers).length > 0) {
            updates.genomicProfile = { ...(patient.genomicProfile || {}), ...newMarkers };
        }

        await patient.update(updates);

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error("Error updating patient:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private
exports.deletePatient = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        const mrn = patient.mrn;
        const patientId = patient.id;
        
        await patient.destroy();



        res.json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};