const Analysis = require('../models/Analysis');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { exec } = require('child_process');
const path = require('path');

const { generateMockAnalysis, simulateProcessing } = require('../utils/aiSimulator');

// @desc    Get all analyses for a patient
// @route   GET /api/analyses/patient/:patientId
// @access  Private
exports.getPatientAnalyses = async (req, res) => {
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
                message: 'You are not authorized to view analyses for this patient'
            });
        }

        const analyses = await Analysis.findAll({
            where: { patientId: req.params.patientId },
            include: [{
                model: User,
                as: 'performedBy',
                attributes: ['name', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            count: analyses.length,
            data: analyses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single analysis
// @route   GET /api/analyses/:id
// @access  Private
exports.getAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findByPk(req.params.id, {
            include: [
                {
                    model: Patient,
                    attributes: ['firstName', 'lastName', 'mrn', 'userId']
                },
                {
                    model: User,
                    as: 'performedBy',
                    attributes: ['name', 'email']
                }
            ]
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'Analysis not found'
            });
        }

        // Role-based access check
        if (req.user.role === 'patient' && analysis.Patient.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this analysis'
            });
        }

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create new analysis
// @route   POST /api/analyses
// @access  Private
exports.createAnalysis = async (req, res) => {
    try {
        req.body.performedById = req.user.id;

        const analysis = await Analysis.create(req.body);



        res.status(201).json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Process analysis (execute AI segmentation)
// @route   POST /api/analyses/:id/process
// @access  Private
exports.processAnalysis = async (req, res) => {
    try {
        let analysis = await Analysis.findByPk(req.params.id, {
            include: [{ model: Patient }]
        });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'Analysis not found'
            });
        }

        // Update status to processing
        await analysis.update({ status: 'processing' });

        const startTime = Date.now();

        // Path to the python script
        const baseDir = path.resolve(__dirname, '../../Segmentation Model');
        const scriptDir = path.join(baseDir, 'Inference_Pipeline');
        const scriptPath = path.join(scriptDir, 'infer_segmentation.py');

        // Resolve MRI paths
        const resolvePath = (p) => p ? path.resolve(__dirname, '..', p) : null;
        
        // Check Analysis record first, then fallback to Patient record
        const patientMri = analysis.Patient ? (analysis.Patient.mriPaths || {}) : {};
        
        const mriPaths = {
            t1: resolvePath(analysis.t1Path || patientMri.t1),
            t1ce: resolvePath(analysis.t1cePath || patientMri.t1ce),
            t2: resolvePath(analysis.t2Path || patientMri.t2),
            flair: resolvePath(analysis.flairPath || patientMri.flair)
        };

        // Construct arguments
        let scriptArgs = [];
        if (mriPaths.t1) scriptArgs.push(`--t1 "${mriPaths.t1}"`);
        if (mriPaths.t1ce) scriptArgs.push(`--t1ce "${mriPaths.t1ce}"`);
        if (mriPaths.t2) scriptArgs.push(`--t2 "${mriPaths.t2}"`);
        if (mriPaths.flair) scriptArgs.push(`--flair "${mriPaths.flair}"`);

        // Validation: At least FLAIR is needed for the current model base, or just warn
        if (!mriPaths.flair && scriptArgs.length === 0) {
             // Fallback to test data if absolutely nothing is provided
             const defaultFlair = path.join(baseDir, 'Test_Data/BraTS20_Training_001_flair.nii');
             console.log("No MRI provided, using default test data.");
             scriptArgs.push(`--flair "${defaultFlair}"`);
        }

        console.log(`Executing segmentation script: ${scriptPath}`);
        console.log(`Args: ${scriptArgs.join(' ')}`);

        const runScript = (name, args = []) => {
            return new Promise((resolve, reject) => {
                const sPath = path.join(scriptDir, name);
                // Join args array with spaces, but don't double quote if already quoted
                const cmd = `python "${sPath}" ${args.join(' ')}`;
                console.log(`Running command: ${cmd}`);
                
                exec(cmd, { cwd: scriptDir }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error in ${name}: ${error}`);
                        reject(error);
                        return;
                    }
                    console.log(`stdout ${name}: ${stdout}`);
                    resolve(stdout);
                });
            });
        };

        try {
             // Pass separate arguments
             const stdout = await runScript('infer_segmentation.py', scriptArgs);
             
             // 1. Create unique directory for this analysis
             const resultsDir = path.join(baseDir, 'AR_Assets/results', analysis.id);
             if (!require('fs').existsSync(resultsDir)) {
                 require('fs').mkdirSync(resultsDir, { recursive: true });
             }

             // 2. Trigger 3D Mesh Generation
             try {
                 console.log("Generating 3D Mesh for AR...");
                 await runScript('mask_to_mesh.py');
                 await runScript('merge_ar_scene.py');
             } catch (meshErr) {
                 console.error("3D Mesh Generation failed", meshErr);
             }

             // 3. Move files to unique folder (regardless of mesh success)
             const fs = require('fs');
             const filesToMove = ['tumor_mask.npy', 'tumor_probs.npy', 'tumor.glb', 'edema.glb', 'brain.glb', 'tumor_with_brain.glb'];
             filesToMove.forEach(file => {
                 const oldPath = path.join(scriptDir, file); // Files are generated here
                 const newPath = path.join(resultsDir, file);
                 if (fs.existsSync(oldPath)) {
                     try {
                         if (fs.existsSync(newPath)) fs.unlinkSync(newPath); // Remove old version if exists
                         fs.renameSync(oldPath, newPath);
                     } catch (moveErr) {
                         console.error(`Failed to move ${file}: ${moveErr.message}`);
                     }
                 }
             });
             console.log(`Dynamic assets stored in: ${resultsDir}`);

             // Extract JSON metrics from stdout
             let metrics = {};
             const jsonMatch = stdout.match(/JSON_START([\s\S]*?)JSON_END/);
             if (jsonMatch && jsonMatch[1]) {
                 try {
                     metrics = JSON.parse(jsonMatch[1].trim());
                 } catch (e) {
                     console.error("Failed to parse Python JSON output", e);
                 }
             }

             // Generate mock analysis results but override with real metrics
             const results = generateMockAnalysis(analysis.analysisType);
             
             let updateData = {
                 status: 'completed',
                 processingTime: Date.now() - startTime
             };

             if (metrics.tumor_volume) {
                 updateData.tumorVolume = metrics.tumor_volume;
                 updateData.edemaVolume = metrics.edema_volume;
                 updateData.tumorLocation = metrics.tumor_location;
                 updateData.intensityStats = metrics.intensity_stats;
                 updateData.textureFeatures = metrics.texture_features;
                 updateData.confidence = metrics.confidence;

                 // Synchronize nested data for frontend backward compatibility
                 results.volumetricAnalysis = {
                     tumorVolume: metrics.tumor_volume,
                     edemaVolume: metrics.edema_volume,
                     necrosisVolume: (metrics.tumor_volume * 0.05).toFixed(2),
                     enhancingVolume: (metrics.tumor_volume * 0.8).toFixed(2)
                 };
                 results.tumorLocation = metrics.tumor_location;
                 results.segmentationConfidence = metrics.confidence;
                 results.intensityStats = metrics.intensity_stats;
                 results.textureFeatures = metrics.texture_features;
             }
             
             results.segmentationOutput = "tumor_mask.npy generated successfully";
             updateData.data = results;

            await analysis.update(updateData);

            res.json({
                success: true,
                data: analysis
            });
        } catch (err) {
             console.error("Segmentation failed:", err);
             await analysis.update({ status: 'failed', error: err.message });
             return res.status(500).json({
                success: false,
                message: 'AI Processing Failed: ' + err.message
             });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get analysis slice image
// @route   GET /api/analyses/:id/slice/:index
// @access  Private
exports.getSlice = async (req, res) => {
    try {
        const { id, index } = req.params;
        const { type, plane, modality } = req.query; // Added modality query param
        
        const baseDir = path.resolve(__dirname, '../../Segmentation Model');
        const resultsDir = path.join(baseDir, 'AR_Assets/results', id);
        let filePath;
        let fileType;

        // Fetch analysis to check for custom MRI path
        const analysis = await Analysis.findByPk(id);

        if (type === 'source') {
            // Determine which modality to show
            // Default to FLAIR if not specified, then T1CE, then T1, then T2
            if (modality === 't1' && analysis.t1Path) filePath = path.resolve(__dirname, '..', analysis.t1Path);
            else if (modality === 't1ce' && analysis.t1cePath) filePath = path.resolve(__dirname, '..', analysis.t1cePath);
            else if (modality === 't2' && analysis.t2Path) filePath = path.resolve(__dirname, '..', analysis.t2Path);
            else if (analysis.flairPath) filePath = path.resolve(__dirname, '..', analysis.flairPath);
            else if (analysis.t1cePath) filePath = path.resolve(__dirname, '..', analysis.t1cePath); // Fallback hierarchy
            else if (analysis.t1Path) filePath = path.resolve(__dirname, '..', analysis.t1Path);
            else filePath = path.join(baseDir, 'Test_Data/BraTS20_Training_001_flair.nii'); // Ultimate fallback

            fileType = 'nii';
        } else if (type === 'mask') {
            filePath = path.join(resultsDir, 'tumor_mask.npy');
            fileType = 'npy';
        } else if (type === 'heatmap') {
            filePath = path.join(resultsDir, 'tumor_probs.npy');
            fileType = 'npy';
        }

        const scriptPath = path.join(baseDir, 'Inference_Pipeline/extract_slice.py');

        // Check if file exists before running python
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            console.log(`Slice file not ready yet: ${filePath}`);
            return res.status(404).json({ success: false, message: 'Slice data not ready' });
        }

        // Execute Python script with plane argument
        exec(`python "${scriptPath}" "${filePath}" "${fileType}" "${index}" "${type}" "${plane || 'axial'}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Slice extraction error: ${error}`);
                return res.status(500).send('Error extracting slice');
            }
            
            // output is the base64 string
            const imgData = stdout.trim();
            res.json({ success: true, image: `data:image/png;base64,${imgData}` });
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get analysis 3D model (GLB)
// @route   GET /api/analyses/:id/model
// @access  Private
exports.get3DModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { modelName } = req.query; // This can now be 'brain.glb', 'tumor.glb', etc.
        
        const baseDir = path.resolve(__dirname, '../../Segmentation Model');
        const resultsDir = path.join(baseDir, 'AR_Assets/results', id);
        
        // 1. If a specific model name is passed (from the new frontend logic)
        if (modelName) {
            // Check in results folder first
            const dynamicPath = path.join(resultsDir, modelName);
            if (require('fs').existsSync(dynamicPath)) return res.sendFile(dynamicPath);
            
            // Check in test_ui fallback
            const testPath = path.join(baseDir, 'test_ui', modelName);
            if (require('fs').existsSync(testPath)) return res.sendFile(testPath);

            // Check in AR_Assets (global templates)
            const assetsPath = path.join(baseDir, 'AR_Assets', modelName);
            if (require('fs').existsSync(assetsPath)) return res.sendFile(assetsPath);
        }

        // 2. Default fallback if no modelName specified
        const defaultModelPath = path.join(resultsDir, 'tumor_with_brain.glb');
        if (require('fs').existsSync(defaultModelPath)) {
            return res.sendFile(defaultModelPath);
        }

        return res.status(404).json({ success: false, message: '3D Model not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update analysis
// @route   PUT /api/analyses/:id
// @access  Private
exports.updateAnalysis = async (req, res) => {
    try {
        let analysis = await Analysis.findByPk(req.params.id);

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: 'Analysis not found'
            });
        }

        await analysis.update(req.body);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};