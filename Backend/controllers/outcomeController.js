const axios = require('axios');
const { formatSideEffectsWithGemini } = require('../utils/geminiFormatter');
const OutcomePrediction = require('../models/OutcomePrediction');
const TreatmentPlan = require('../models/TreatmentPlan');
const Patient = require('../models/Patient');
const User = require('../models/User');

const { generateMockAnalysis } = require('../utils/aiSimulator');

// @desc    Generate and format outcomes using AI and Gemini
// @route   POST /api/outcomes/predict-formatted
// @access  Private
exports.generateFormattedOutcomes = async (req, res) => {
    try {
        const { patientId } = req.body;

        // 1. Check if a recent prediction exists
        if (patientId) {
            const existingOutcome = await OutcomePrediction.findOne({
                where: { patientId },
                order: [['createdAt', 'DESC']]
            });

            if (existingOutcome && !req.body.forceRefresh) {
                console.log('Returning existing outcome prediction from database.');
                return res.json({
                    success: true,
                    data: {
                        ...existingOutcome.predictionData,
                        formattedSideEffects: existingOutcome.sideEffects, // Assuming sideEffects field stores formatted text
                        confidence: existingOutcome.confidence || 92.0,
                        isCached: true
                    }
                });
            }
        }

        // Step 1: Call the Python AI engine to get the raw outcome predictions.
        const aiEngineResponse = await axios.post('http://127.0.0.1:5000/predict_side_effects', req.body);
        const rawOutcomeData = aiEngineResponse.data;

        // Extract side effects and patient data for formatting
        const { sideEffects, ...restOfOutcomeData } = rawOutcomeData;

        // Step 2: Format the side effects using the Gemini API formatter.
        const formattedSideEffects = await formatSideEffectsWithGemini(sideEffects, req.body);

        const finalResult = {
            ...restOfOutcomeData,
            sideEffects: sideEffects, 
            formattedSideEffects: formattedSideEffects,
            confidence: rawOutcomeData.confidence || 92.0,
            riskStratification: rawOutcomeData.riskStratification || { low: 25, moderate: 45, high: 30 },
            prognosticFactors: rawOutcomeData.prognosticFactors || { "Age": 65, "KPS": 85, "Biomarkers": 90 },
            timelineProjection: rawOutcomeData.timelineProjection || {
                "months": ["Baseline", "3 mo", "6 mo", "12 mo", "18 mo", "24 mo"],
                "response_indicator": [100, 40, 35, 45, 55, 65],
                "quality_of_life": [75, 70, 73, 67, 63, 60]
            }
        };

        // 3. Save to DB
        if (patientId) {
            await OutcomePrediction.create({
                patientId,
                overallSurvival: finalResult.overallSurvival,
                progressionFreeSurvival: finalResult.progressionFreeSurvival,
                sideEffects: formattedSideEffects,
                qualityOfLife: finalResult.qualityOfLife,
                predictionData: finalResult,
                generatedById: req.user.id,
                confidence: finalResult.confidence
            });
            console.log('New outcome prediction saved to database.');
        }

        // Step 3: Send the raw outcome data and the formatted side effects back to the frontend.
        res.json({
            success: true,
            data: finalResult
        });

    } catch (error) {
        console.error('--- ERROR in generateFormattedOutcomes ---');
        if (error.response) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get a valid response from the AI engine.',
                error: error.response.data
            });
        } else if (error.request) {
            return res.status(500).json({
                success: false,
                message: 'The AI engine is not responding. Please ensure it is running and accessible at http://127.0.0.1:5000.'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || 'An internal server error occurred during outcome prediction.'
        });
    }
};


// @desc    Get all outcome predictions for a patient
// @route   GET /api/outcomes/patient/:patientId
// @access  Private
exports.getPatientOutcomes = async (req, res) => {
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
                message: 'You are not authorized to view outcomes for this patient'
            });
        }

        const outcomes = await OutcomePrediction.findAll({
            where: { patientId: req.params.patientId },
            include: [
                { model: TreatmentPlan, attributes: ['recommendedProtocol'] },
                { model: User, as: 'generatedBy', attributes: ['name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            count: outcomes.length,
            data: outcomes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single outcome prediction
// @route   GET /api/outcomes/:id
// @access  Private
exports.getOutcome = async (req, res) => {
    try {
        const outcome = await OutcomePrediction.findByPk(req.params.id, {
            include: [
                { model: Patient, attributes: ['firstName', 'lastName', 'mrn', 'userId'] },
                { model: TreatmentPlan, attributes: ['recommendedProtocol'] },
                { model: User, as: 'generatedBy', attributes: ['name', 'email'] }
            ]
        });

        if (!outcome) {
            return res.status(404).json({
                success: false,
                message: 'Outcome prediction not found'
            });
        }

        // Role-based access check
        if (req.user.role === 'patient' && outcome.Patient.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this outcome prediction'
            });
        }

        res.json({
            success: true,
            data: outcome
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Generate outcome prediction
// @route   POST /api/outcomes
// @access  Private
exports.createOutcome = async (req, res) => {
    try {
        req.body.generatedById = req.user.id;

        // Generate AI-based outcome prediction
        const aiResults = generateMockAnalysis('outcome');

        const outcome = await OutcomePrediction.create({
            ...req.body,
            overallSurvival: aiResults.overallSurvival,
            progressionFreeSurvival: aiResults.progressionFreeSurvival,
            sideEffects: aiResults.sideEffects,
            qualityOfLife: aiResults.qualityOfLife
        });



        res.status(201).json({
            success: true,
            data: outcome
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
