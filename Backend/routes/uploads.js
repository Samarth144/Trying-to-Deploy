const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadHistopathologyReport, uploadMRI, uploadVCF } = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = '';
    
    // Check for MRI modality fields
    const mriFields = ['t1', 't1ce', 't2', 'flair', 'mri_scan'];
    
    if (mriFields.includes(file.fieldname)) {
      uploadPath = path.join(__dirname, '..', 'uploads', 'mri');
      
      // If MRN is provided, create a subfolder for that patient
      if (req.body.mrn) {
        // Sanitize MRN to be safe for filesystem
        const safeMrn = req.body.mrn.replace(/[^a-zA-Z0-9-_]/g, '_');
        uploadPath = path.join(uploadPath, safeMrn);
      }
    } else if (file.fieldname === 'vcf_file') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'genomics');
    } else {
      // Default to reports for histopathology_pdf
      uploadPath = path.join(__dirname, '..', 'uploads', 'reports');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/histopathology', upload.single('histopathology_pdf'), uploadHistopathologyReport);
router.post('/vcf', upload.single('vcf_file'), uploadVCF);

// Update route to handle multiple fields
const mriUpload = upload.fields([
  { name: 't1', maxCount: 1 },
  { name: 't1ce', maxCount: 1 },
  { name: 't2', maxCount: 1 },
  { name: 'flair', maxCount: 1 }
]);

router.post('/mri', mriUpload, uploadMRI);

module.exports = router;