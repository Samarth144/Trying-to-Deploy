const axios = require('axios');
const { formatSideEffectsWithGemini } = require('../utils/geminiFormatter');
const { formatSideEffectsWithGroq } = require('../utils/groqFormatter');
const OutcomePrediction = require('../models/OutcomePrediction');
const TreatmentPlan = require('../models/TreatmentPlan');
const Patient = require('../models/Patient');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

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

        // Step 2: Format the side effects using the Groq API formatter.
        let formattedSideEffects;
        try {
            formattedSideEffects = await formatSideEffectsWithGroq(sideEffects, req.body);
        } catch (groqErr) {
            console.error("Groq formatting failed, falling back to Gemini:", groqErr.message);
            try {
                formattedSideEffects = await formatSideEffectsWithGemini(sideEffects, req.body);
            } catch (geminiErr) {
                console.error("Gemini formatting failed too:", geminiErr.message);
                formattedSideEffects = "Unable to format side effects at this time.";
            }
        }

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

// @desc    Download PDF Report
// @route   POST /api/outcomes/download-report
// @access  Private
exports.downloadReport = async (req, res) => {
    try {
        const { patientId, formData, outcomeData } = req.body;
        const Analysis = require('../models/Analysis');

        // 1. Fetch patient, latest analysis, and treatment plan
        const patient = await Patient.findByPk(patientId);
        const latestAnalysis = await Analysis.findOne({
            where: { patientId, analysisType: 'mri' },
            order: [['createdAt', 'DESC']]
        });
        const treatmentPlan = await TreatmentPlan.findOne({
            where: { patientId },
            order: [['createdAt', 'DESC']]
        });

        // 2. Safely parse encrypted/JSON fields
        const pathologyData = patient?.pathologyAnalysis ? 
            (typeof patient.pathologyAnalysis === 'string' ? JSON.parse(patient.pathologyAnalysis) : patient.pathologyAnalysis) : {};

        // 3. Prepare data for Python AI Engine (Cleaned of N/A)
        const reportData = {
            name: formData.name || (patient ? `${patient.firstName} ${patient.lastName}` : ''),
            mrn: formData.mrn || (patient ? patient.mrn : ''),
            gender: formData.gender || (patient ? patient.gender : ''),
            dob: formData.dob || (patient && patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : ''),
            age: formData.age || (patient && patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}` : ''),
            dod: formData.diagnosisDate || (patient && patient.diagnosisDate ? new Date(patient.diagnosisDate).toLocaleDateString() : ''),
            
            pathology: {
                diagnosis: formData.diagnosis || (patient ? patient.diagnosis : ''),
                subtype: pathologyData.extracted_data?.subtype || '',
                stage: formData.stage || (patient ? patient.stage : ''),
                grade: pathologyData.extracted_data?.grade || (patient && patient.grade ? patient.grade : '')
            },
            
            vcf_metrics: {
                total: patient?.vcfAnalysis?.stats?.total_vcf_rows || '',
                actionable: patient?.vcfAnalysis?.stats?.actionable_found || '',
                vus: patient?.vcfAnalysis?.stats?.uncertain_variants || ''
            },
            
            kps: formData.kps || patient?.kps || '',
            ecog: formData.ecog || patient?.performanceStatus || '',
            functional_category: formData.functional_category || (patient?.kps >= 80 ? 'Independent' : patient?.kps >= 50 ? 'Assisted' : 'Dependent'),
            
            symptoms: formData.symptoms ? (typeof formData.symptoms === 'string' ? formData.symptoms.split(',') : formData.symptoms) : (patient?.symptoms || []),
            comorbidities: formData.comorbidities ? (typeof formData.comorbidities === 'string' ? formData.comorbidities.split(',') : formData.comorbidities) : (patient?.comorbidities || []),
            
            imaging_metrics: {
                tumor_vol: latestAnalysis?.tumorVolume || outcomeData?.volumetricAnalysis?.tumorVolume || '',
                core_vol: latestAnalysis?.data?.volumetricAnalysis?.enhancingVolume || outcomeData?.volumetricAnalysis?.enhancingVolume || '',
                edema_vol: latestAnalysis?.edemaVolume || outcomeData?.volumetricAnalysis?.edemaVolume || '',
                necrotic_pct: latestAnalysis?.data?.volumetricAnalysis?.necrosisVolume || outcomeData?.volumetricAnalysis?.necrosisVolume || '',
                location: latestAnalysis?.tumorLocation || outcomeData?.tumorLocation || '',
                sphericity: latestAnalysis?.data?.textureFeatures?.sphericity || ''
            },

            genomics: [],
            biomarkers: [],
            treatment_options: [
                ["Radiotherapy", "Standard of care", "Targeted localized treatment"],
                ["Targeted therapy", "Molecular guided", "Personalized precision focus"],
                ["Palliative care", "Symptom management", "Quality of life focus"]
            ],

            treatment_plan: treatmentPlan ? treatmentPlan.recommendedProtocol : 'Standard Clinical Protocol',
            rationale: treatmentPlan ? (Array.isArray(treatmentPlan.rationale) ? treatmentPlan.rationale : [treatmentPlan.rationale]) : [],
            
            outcomes: {
                os: outcomeData?.overallSurvival ? `${outcomeData.overallSurvival.median} Months` : '',
                pfs: outcomeData?.progressionFreeSurvival ? `${outcomeData.progressionFreeSurvival.median} Months` : '',
                qol: outcomeData?.qualityOfLife ? `${outcomeData.qualityOfLife}/100` : '',
                toxicity: 'Monitor for fatigue and nausea'
            }
        };

        // Populate Genomics and Biomarkers based on Type (Cleaned)
        const type = formData.cancerType || (patient ? patient.cancerType : 'Unknown');
        
        // Helper to add biomarker if valid
        const addBiomarker = (name, status, meaning) => {
            if (name && status && status !== '' && status !== 'N/A' && status !== 'Unknown') {
                reportData.biomarkers.push([name, status, meaning || '']);
            }
        };

        if (type === 'Brain') {
            const idh = formData.idh1 || pathologyData.extracted_data?.IDH1 || patient?.genomicProfile?.IDH || '';
            const mgmt = formData.mgmt || pathologyData.extracted_data?.MGMT || patient?.genomicProfile?.MGMT || '';
            
            if (idh && idh !== '' && idh !== 'Unknown') {
                const isMutant = idh === 'Mutated' || idh === 'Mutant' || idh === 'Positive';
                reportData.genomics.push(["IDH1", idh, isMutant ? 'Favorable prognosis' : 'Aggressive phenotype', 'High']);
                addBiomarker("IDH1", idh, isMutant ? 'Biologically less aggressive' : 'Clinically more aggressive (Wild-Type)');
            }
            if (mgmt && mgmt !== '' && mgmt !== 'Unknown') {
                const isMethylated = mgmt === 'Methylated' || mgmt === 'Positive';
                reportData.genomics.push(["MGMT", mgmt, isMethylated ? 'Chemo-sensitive' : 'Resistant phenotype', 'High']);
                addBiomarker("MGMT", mgmt, isMethylated ? 'Better response to Temozolomide' : 'Poorer response to Temozolomide');
            }
            
            const resection = pathologyData.extracted_data?.resection || '';
            if (resection) addBiomarker("Resection Extent", resection, 'Impacts residual disease risk');

        } else if (type === 'Breast') {
            const er = formData.er || pathologyData.extracted_data?.ER || patient?.genomicProfile?.ER || '';
            const pr = formData.pr || pathologyData.extracted_data?.PR || patient?.genomicProfile?.PR || '';
            const her2 = formData.her2 || pathologyData.extracted_data?.HER2 || patient?.genomicProfile?.HER2 || '';
            const brca = formData.brca || pathologyData.extracted_data?.BRCA || patient?.genomicProfile?.BRCA || '';
            
            if (er && er !== 'Unknown') {
                reportData.genomics.push(["ER", er, 'Hormone Receptor Status', 'High']);
                addBiomarker("ER (Estrogen)", er, er === 'Positive' ? 'Endocrine therapy candidate' : 'Hormone independent');
            }
            if (pr && pr !== 'Unknown') {
                reportData.genomics.push(["PR", pr, 'Hormone Receptor Status', 'High']);
                addBiomarker("PR (Progesterone)", pr, pr === 'Positive' ? 'Functional ER signaling' : 'Incomplete signaling');
            }
            if (her2 && her2 !== 'Unknown') {
                reportData.genomics.push(["HER2", her2, 'Targetable Receptor', 'High']);
                addBiomarker("HER2 Status", her2, her2 === 'Positive' || her2 === '3+' ? 'Targetable with Anti-HER2' : 'HER2 Negative');
            }
            if (brca && brca !== 'Unknown') {
                reportData.genomics.push(["BRCA 1/2", brca, 'PARP Inhibitor Sensitivity', 'High']);
                addBiomarker("BRCA 1/2", brca, brca === 'Mutated' || brca === 'Positive' ? 'PARP Inhibitor sensitive' : 'Standard risk');
            }
            
        } else if (type === 'Lung') {
            const egfr = formData.egfr || pathologyData.extracted_data?.EGFR || patient?.genomicProfile?.EGFR || '';
            const pdl1 = formData.pdl1 || pathologyData.extracted_data?.PDL1 || patient?.genomicProfile?.PDL1 || '';
            const alk = formData.alk || pathologyData.extracted_data?.ALK || patient?.genomicProfile?.ALK || '';
            
            if (egfr && egfr !== 'Unknown') {
                reportData.genomics.push(["EGFR", egfr, 'Targetable Mutation', 'High']);
                addBiomarker("EGFR", egfr, egfr === 'Mutated' ? 'Sensitive to TKIs' : 'Wild-Type');
            }
            if (pdl1 && pdl1 !== 'Unknown') {
                reportData.genomics.push(["PD-L1", pdl1, 'Immune Checkpoint', 'High']);
                addBiomarker("PD-L1", pdl1, 'Determines immunotherapy benefit');
            }
            if (alk && alk !== 'Unknown') {
                reportData.genomics.push(["ALK", alk, 'Targetable Rearrangement', 'High']);
                addBiomarker("ALK", alk, alk === 'Positive' ? 'Sensitive to ALK inhibitors' : 'Negative');
            }
        }

        // Add Genomic markers from VCF analysis if available
        if (patient?.vcfAnalysis?.markers) {
            for (const markerId in patient.vcfAnalysis.markers) {
                const marker = patient.vcfAnalysis.markers[markerId];
                if (marker.gene && marker.value) {
                    reportData.genomics.push([
                        marker.gene,
                        `${marker.value} (${Math.round((marker.allele_freq || 0) * 100)}%)`,
                        `${marker.significance}`,
                        'High'
                    ]);

                    // Also add significant VCF markers to the Biomarker Analysis table
                    if (marker.evidence_tier === 'Tier 1' || marker.evidence_tier === 'Tier 2') {
                        addBiomarker(marker.gene, marker.value, `VCF detected significance: ${marker.significance}`);
                    }
                }
            }
        }

        // 3. Call Python AI Engine to generate report
        const aiResponse = await axios.post('http://127.0.0.1:5000/generate_report', reportData);

        if (aiResponse.data.success) {
            const filePath = aiResponse.data.path;
            
            // Check if file exists
            if (fs.existsSync(filePath)) {
                res.download(filePath, aiResponse.data.filename, (err) => {
                    if (err) {
                        console.error("Download Error:", err);
                    }
                });
            } else {
                throw new Error("Generated file not found on server");
            }
        } else {
            throw new Error(aiResponse.data.error || "Failed to generate report");
        }

    } catch (error) {
        console.error('Download Report Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
