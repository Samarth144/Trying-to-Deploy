const express = require('express');
const router = express.Router();
const {
    getPatients,
    getPatient,
    createPatient,
    updatePatient,
    deletePatient,
    analyzePathology,
    getAwarenessGuidance
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getPatients)
    .post(protect, authorize('oncologist', 'admin'), createPatient);

router.route('/:id')
    .get(protect, getPatient)
    .put(protect, authorize('oncologist', 'admin'), updatePatient)
    .delete(protect, authorize('oncologist', 'admin'), deletePatient);

router.post('/:id/analyze-pathology', protect, analyzePathology);
router.get('/:id/awareness', protect, getAwarenessGuidance);

module.exports = router;
