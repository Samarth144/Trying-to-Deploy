const pdf = require('pdf-parse');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const uploadMRI = async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }

  const uploadedFiles = {};
  
  // Iterate through the uploaded fields
  Object.keys(req.files).forEach(key => {
      const file = req.files[key][0];
      const relativePath = path.relative(path.join(__dirname, '..'), file.path);
      uploadedFiles[key] = relativePath.replace(/\\/g, '/'); // Normalize path
  });

  res.status(200).json({
      message: 'MRI scans uploaded successfully.',
      files: uploadedFiles
  });
};

const uploadHistopathologyReport = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  res.status(200).json({
    message: 'File uploaded successfully.',
    filename: req.file.filename
  });
};

module.exports = {
  uploadHistopathologyReport,
  uploadMRI
};