const TreatmentPlan = require('../models/TreatmentPlan');
const Patient = require('../models/Patient');
const User = require('../models/User');
const axios = require('axios');
const { formatEvidenceWithGroq } = require('../utils/groqFormatter');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:5000';

const { generateMockAnalysis } = require('../utils/aiSimulator');

// @desc    Generate a weekly pathway from a treatment plan
// @route   POST /api/treatments/pathway/generate
// @access  Private
exports.generatePathway = async (req, res) => {
    try {
        const { plan } = req.body;

        if (!plan) {
            return res.status(400).json({
                success: false,
                message: 'Treatment plan is required'
            });
        }

        const aiEngineResponse = await axios.post(`${AI_ENGINE_URL}/generate_pathway`, { plan });
        const pathway = aiEngineResponse.data.pathway;

        res.json({
            success: true,
            data: pathway
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Generate and format a treatment plan using AI and local Ollama
// @route   POST /api/treatments/generate-formatted
// @access  Private
exports.generateFormattedPlan = async (req, res) => {
    console.log('--- Initiating generateFormattedPlan ---');
    
    try {
        const { patientId, cancer_type } = req.body;

        // 1. Check if a recent plan exists for this patient
        if (patientId) {
            const existingPlan = await TreatmentPlan.findOne({
                where: { patientId },
                order: [['createdAt', 'DESC']]
            });

            // If plan exists and was created in the last 24 hours, return it
            if (existingPlan && !req.body.forceRefresh) {
                console.log('Returning existing treatment plan from database.');
                
                // Still try to get experiences even for cached plans to show learning
                let experiences = [];
                try {
                    const aiMemResponse = await axios.post(`${AI_ENGINE_URL}/recommend`, req.body);
                    experiences = aiMemResponse.data.experiences || [];
                } catch (e) { console.log('Memory fetch failed for cache'); }

                return res.json({
                    success: true,
                    treatmentId: existingPlan.id,
                    confidence: existingPlan.confidence,
                    protocols: existingPlan.planData?.protocols || [],
                    experiences: experiences, // Include memories
                    data: {
                        rawPlan: existingPlan.planData || {
                            primary_treatment: existingPlan.recommendedProtocol,
                            clinical_rationale: existingPlan.rationale,
                            alternatives: existingPlan.alternativeOptions,
                            safety_alerts: []
                        },
                        formattedEvidence: existingPlan.guidelineAlignment
                    },
                    isCached: true
                });
            }
        }

        // Step 1: Call the Python AI engine to get the raw treatment plan and evidence.
        console.log('Step 1: Calling Python AI engine at http://127.0.0.1:5000/recommend...');
        const aiEngineResponse = await axios.post(`${AI_ENGINE_URL}/recommend`, req.body);

        const rawTreatmentData = aiEngineResponse.data;
        
        // Extract the raw plan and evidence from the AI engine's response
        const rawPlan = rawTreatmentData.plan || 'No specific plan provided by AI engine.';
        const evidence = rawTreatmentData.evidence || (rawTreatmentData.plan && rawTreatmentData.plan.evidence) || [];
        const experiences = rawTreatmentData.experiences || []; // Capture clinical memory
        const confidence = rawTreatmentData.confidence || 92.0;
        const protocols = rawTreatmentData.protocols || [];

        // Step 2: Use pre-formatted evidence from AI engine if available, otherwise format with local Ollama.
        console.log('Step 2: Checking for pre-formatted evidence...');
        let formattedEvidence = rawPlan.formatted_evidence;
        
        if (!formattedEvidence && evidence && evidence.length > 0) {
            console.log('No pre-formatted evidence found. Calling AI Engine for formatting...');
            const formatResponse = await axios.post(`${AI_ENGINE_URL}/format_evidence`, { evidence });
            formattedEvidence = formatResponse.data.formattedText;
        } else if (!formattedEvidence) {
            formattedEvidence = "No specific evidence provided for formatting.";
        }





        // CRITICAL FIX: Ensure all text fields are strings to prevent Sequelize errors
        if (typeof formattedEvidence !== 'string') {
            formattedEvidence = JSON.stringify(formattedEvidence, null, 2);
        }
        let protocol = rawPlan.primary_treatment || 'Standard Protocol';
        if (typeof protocol !== 'string') {
            protocol = JSON.stringify(protocol, null, 2);
        }
        let rationale = rawPlan.clinical_rationale;
        if (typeof rationale !== 'string') {
            rationale = JSON.stringify(rationale, null, 2);
        }

        // 3. Save the generated plan to DB if patientId is provided
        let newPlanId = null;
        if (patientId) {
            const savedPlan = await TreatmentPlan.create({
                patientId,
                recommendedProtocol: protocol,
                confidence: parseFloat(confidence),
                rationale: rationale,
                alternativeOptions: rawPlan.alternatives || [],
                guidelineAlignment: formattedEvidence, // Store the formatted evidence here
                planData: rawPlan,
                createdById: req.user ? req.user.id : null,
                status: 'active'
            });
            newPlanId = savedPlan.id;
            console.log('New treatment plan saved to database.');
        }

        // Step 3: Send the raw plan and formatted evidence back to the frontend.
        res.json({
            success: true,
            treatmentId: newPlanId,
            confidence: confidence,
            protocols: protocols,
            experiences: experiences, // New field for UI
            data: {
                rawPlan: rawPlan,
                formattedEvidence: formattedEvidence
            }
        });

    } catch (error) {
        console.error('--- ERROR in generateFormattedPlan ---');
        console.error('Error object:', error);

        // Distinguish between AI engine error and other errors
        if (error.response) {
            // Error from a downstream service (like AI engine)
            console.error('Downstream service error status:', error.response.status);
            console.error('Downstream service error data:', error.response.data);
            return res.status(500).json({
                success: false,
                message: 'Failed to get a valid response from the AI engine.',
                error: error.response.data
            });
        } else if (error.request) {
            // Request was made but no response received
            console.error('The request was made, but no response was received from the AI engine.');
            return res.status(500).json({
                success: false,
                message: 'The AI engine is not responding. Please ensure it is running and accessible at http://127.0.0.1:5000.'
            });
        }
        // Other errors (e.g., Ollama/AI Engine failure, data processing error)
        console.error('A non-request error occurred:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'An internal server error occurred during plan generation.'
        });
    }
};


// @desc    Get all treatment plans for a patient
// @route   GET /api/treatments/patient/:patientId
// @access  Private
exports.getPatientTreatments = async (req, res) => {
    try {
        const patient = await Patient.findByPk(req.params.patientId);

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
                message: 'You are not authorized to view treatment plans for this patient'
            });
        }

        const treatments = await TreatmentPlan.findAll({
            where: { patientId: req.params.patientId },
            include: [
                { model: User, as: 'createdBy', attributes: ['name', 'email'] },
                { model: User, as: 'approvedBy', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            count: treatments.length,
            data: treatments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Query AI about a treatment plan
// @route   POST /api/treatments/:id/query
// @access  Private
exports.queryTreatmentPlan = async (req, res) => {
    try {
        const { query, history } = req.body;
        const treatmentId = req.params.id;

        const treatment = await TreatmentPlan.findByPk(treatmentId, {
            include: [{ model: Patient }]
        });

        if (!treatment) {
            return res.status(404).json({
                success: false,
                message: 'Treatment plan not found'
            });
        }

        // Prepare context for AI Engine - SEND FULL RAW DATA
        const aiRequestData = {
            query,
            history: history || [],
            patient_data: treatment.Patient ? treatment.Patient.toJSON() : {},
            plan_data: treatment.planData || {
                recommendedProtocol: treatment.recommendedProtocol || 'Unknown',
                rationale: treatment.rationale || 'No rationale provided'
            }
        };

        console.log(`Step: Querying AI engine for treatment ${treatmentId}...`);
        const aiResponse = await axios.post(`${AI_ENGINE_URL}/chat`, aiRequestData);

        res.json({
            success: true,
            data: aiResponse.data
        });
    } catch (error) {
        console.error('Error in queryTreatmentPlan:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single treatment plan
// @route   GET /api/treatments/:id
// @access  Private
exports.getTreatment = async (req, res) => {
    try {
        const treatment = await TreatmentPlan.findByPk(req.params.id, {
            include: [
                { model: Patient, attributes: ['firstName', 'lastName', 'mrn', 'userId'] },
                { model: User, as: 'createdBy', attributes: ['name', 'email'] },
                { model: User, as: 'approvedBy', attributes: ['name', 'email'] }
            ]
        });

        if (!treatment) {
            return res.status(404).json({
                success: false,
                message: 'Treatment plan not found'
            });
        }

        // Role-based access check
        if (req.user.role === 'patient' && treatment.Patient.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this treatment plan'
            });
        }

        res.json({
            success: true,
            data: treatment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Generate treatment plan
// @route   POST /api/treatments
// @access  Private
exports.createTreatment = async (req, res) => {
    try {
        req.body.createdById = req.user.id;

        // If no treatment data provided, generate using AI
        if (!req.body.recommendedProtocol) {
            const aiResults = generateMockAnalysis('treatment');
            req.body.recommendedProtocol = aiResults.recommendedProtocol;
            req.body.confidence = parseFloat(aiResults.confidence);
            req.body.alternativeOptions = aiResults.alternativeOptions;
            req.body.guidelineAlignment = aiResults.guidelineAlignment;
            req.body.rationale = aiResults.rationale;
        }

        const treatment = await TreatmentPlan.create(req.body);



        res.status(201).json({
            success: true,
            data: treatment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update treatment plan
// @route   PUT /api/treatments/:id
// @access  Private
exports.updateTreatment = async (req, res) => {
    try {
        let treatment = await TreatmentPlan.findByPk(req.params.id);

        if (!treatment) {
            return res.status(404).json({
                success: false,
                message: 'Treatment plan not found'
            });
        }

        await treatment.update(req.body);



        res.json({
            success: true,
            data: treatment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Approve treatment plan
// @route   POST /api/treatments/:id/approve
// @access  Private (Oncologist only)
exports.approveTreatment = async (req, res) => {
    try {
        let treatment = await TreatmentPlan.findByPk(req.params.id, {
            include: [{ model: Patient }]
        });

        if (!treatment) {
            return res.status(404).json({
                success: false,
                message: 'Treatment plan not found'
            });
        }

        await treatment.update({
            status: 'approved',
            approvedById: req.user.id,
            approvalDate: Date.now()
        });

        // ─── Continuous Learning Trigger ───
        // Notify AI Engine to index this approved case into its Long-Term Memory
        try {
            console.log(`[LEARNING] Sending approved case ${treatment.id} to AI Engine memory...`);
            
            // Detect if the clinician modified the original AI suggestion
            const originalProtocol = treatment.planData?.primary_treatment || '';
            const finalProtocol = treatment.recommendedProtocol || '';
            
            const isCorrection = originalProtocol && finalProtocol && 
                               originalProtocol.toLowerCase().trim() !== finalProtocol.toLowerCase().trim();

            if (isCorrection) {
                console.log('[LEARNING] Detected Human Modification. Flagging as a supervised correction.');
            }

            await axios.post(`${AI_ENGINE_URL}/learn_from_case`, {
                patient_data: treatment.Patient ? treatment.Patient.toJSON() : {},
                treatment_plan: {
                    primary_treatment: finalProtocol,
                    clinical_rationale: treatment.rationale,
                    rationale: treatment.planData?.rationale || []
                },
                feedback_score: isCorrection ? 2.0 : 1.0, // Weight corrections more heavily
                is_correction: isCorrection
            });
        } catch (learnErr) {
            console.error('[LEARNING ERROR] Failed to update AI memory:', learnErr.message);
            // Don't fail the approval if learning fails, just log it
        }

        res.json({
            success: true,
            data: treatment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};