import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Typography, TextField, Button, InputAdornment, IconButton, LinearProgress, Slider, Chip, Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import TransgenderIcon from '@mui/icons-material/Transgender';
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import BiotechIcon from '@mui/icons-material/Biotech';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import './PatientIntake.css';

const GENOMIC_MARKERS = {
  Brain: [
    { id: 'idh1', label: 'IDH1 Status', sub: 'Isocitrate Dehydrogenase', icon: <BiotechIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'mgmt', label: 'MGMT Methylation', sub: 'Promoter Region', icon: <ScatterPlotIcon />, options: ['Methylated', 'Unmethylated', 'Unknown'] }
  ],
  Breast: [
    { id: 'er', label: 'ER (ESR1)', sub: 'Estrogen Receptor', icon: <FavoriteBorderIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'pr', label: 'PR (PGR)', sub: 'Progesterone Receptor', icon: <FavoriteBorderIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'her2', label: 'HER2 (ERBB2)', sub: 'Human Epidermal Growth Factor', icon: <BiotechIcon />, options: ['Positive', 'Negative', 'Equivocal', 'Unknown'] },
    { id: 'brca', label: 'BRCA Status', sub: 'Breast Cancer Gene', icon: <ScatterPlotIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'pdl1', label: 'PD-L1 (CD274)', sub: 'Programmed Death-Ligand 1', icon: <MedicalServicesIcon />, options: ['Positive', 'Negative', 'Not Tested', 'Unknown'] }
  ],
  Lung: [
    { id: 'egfr', label: 'EGFR Mutation', sub: 'Epidermal Growth Factor', icon: <BiotechIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'kras', label: 'KRAS Mutation', sub: 'Kirsten Rat Sarcoma', icon: <ScatterPlotIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'alk', label: 'ALK Translocation', sub: 'Anaplastic Lymphoma Kinase', icon: <ContentCutIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'ros1', label: 'ROS1 Rearrangement', sub: 'Proto-oncogene Tyrosine', icon: <RemoveCircleOutlineIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'pdl1', label: 'PD-L1 Expression', sub: 'Immune Checkpoint', icon: <MedicalServicesIcon />, options: ['<1%', '1–49%', '≥50%', 'Unknown'] }
  ],
  Liver: [
    { id: 'afp', label: 'AFP Biomarker', sub: 'Alpha-Fetoprotein', icon: <BiotechIcon />, options: ['Normal', 'Elevated', 'Very High', 'Unknown'] }
  ],
  Pancreas: [
    { id: 'brca', label: 'BRCA Status', sub: 'Breast Cancer Gene', icon: <ScatterPlotIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] }
  ]
};

const IMAGING_PROTOCOLS = {
  Brain: [
    { id: 'T1', label: 'T1-Weighted Sequence' },
    { id: 'T1ce', label: 'T1-Contrast Enhanced' },
    { id: 'T2', label: 'T2-Weighted Sequence' },
    { id: 'FLAIR', label: 'Fluid Attenuated Inversion Recovery' }
  ],
  Breast: [
    { id: 'T1', label: 'T1-Weighted' },
    { id: 'T1_Contrast', label: 'T1 with Contrast (Dynamic)' },
    { id: 'Fat_Suppressed', label: 'Fat-Suppressed Sequence' }
  ],
  Lung: [
    { id: 'CT_Scan', label: 'Chest CT Scan (Primary)' }
  ],
  Liver: [
    { id: 'T1', label: 'T1-Weighted' },
    { id: 'T2', label: 'T2-Weighted' },
    { id: 'DWI', label: 'Diffusion-Weighted Imaging' },
    { id: 'Contrast_Phases', label: 'Contrast Phases (Arterial/Venous)' }
  ],
  Pancreas: [
    { id: 'CT_Scan', label: 'Abdominal CT (Primary)' },
    { id: 'T1', label: 'T1-Weighted' },
    { id: 'T2', label: 'T2-Weighted' },
    { id: 'MRCP', label: 'MRCP Sequence' }
  ]
};

const getKPSColor = (val) => val >= 80 ? '#059789' : val >= 50 ? '#F59E0B' : '#EF4444';
const getECOGDescription = (val) => {
  const desc = [
    "Fully active, able to carry on all pre-disease performance without restriction.",
    "Restricted in physically strenuous activity but ambulatory and able to carry out work.",
    "Ambulatory and capable of all selfcare but unable to carry out any work activities.",
    "Capable of only limited selfcare, confined to bed or chair more than 50% of waking hours.",
    "Completely disabled. Cannot carry on any selfcare. Totally confined to bed or chair."
  ];
  return desc[val] || "";
};

const TechStepper = ({ activeStep = 1 }) => {
  const steps = ["Identity", "MRI Scan", "Genomics", "History", "Review"];
  return (
    <Box className="stepper-container">
      <div className="stepper-track"></div>
      <div className="stepper-progress" style={{ width: `${(activeStep - 1) * 25}%` }}></div>
      <div className="stepper-nodes">
        {steps.map((label, index) => {
          const isActive = index + 1 === activeStep;
          return (
            <div key={label} className={`stepper-node ${isActive ? 'active' : ''}`}>
              <div className="node-dot"></div>
              <span className="node-label">{label}</span>
            </div>
          );
        })}
      </div>
    </Box>
  );
};

const GenderTile = ({ icon, label, selected, onClick }) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="gender-tile-wrapper">
    <div className={`gender-tile ${selected ? 'selected' : ''}`} onClick={onClick}>
      {React.cloneElement(icon, { className: 'gender-icon' })}
      <span>{label}</span>
    </div>
  </motion.div>
);

const MolecularSwitch = ({ label, sub, icon, options, value, onChange }) => {
  return (
    <div className="molecular-switch">
      <div className="switch-header">
        <div className="switch-icon-box">{React.cloneElement(icon, { sx: { fontSize: 20 } })}</div>
        <div>
          <Typography className="switch-title">{label}</Typography>
          <Typography className="switch-sub">{sub}</Typography>
        </div>
      </div>
      <div className="switch-options">
        {options.map((option) => {
          const isSelected = value === option;
          let type = 'standard';
          if (['Mutant', 'Methylated', 'Present', 'Lost'].includes(option)) type = 'actionable';
          if (option === 'Unknown') type = 'warning';

          return (
            <motion.div key={option} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`switch-option ${isSelected ? `selected-${type}` : ''}`}
              onClick={() => onChange(option)}
            >
              <Typography variant="caption">{option}</Typography>
              <div className="status-dot"></div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const TagInput = ({ label, icon, tags, onAdd, onDelete }) => {
  const [input, setInput] = useState('');
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
  };
  return (
    <div className="tag-input-terminal">
      <div className="tag-header">
        {React.cloneElement(icon, { className: 'tag-icon' })}
        <Typography variant="subtitle2">{label}</Typography>
      </div>
      <div className="tag-container">
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.div key={tag} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <Chip label={tag} onDelete={() => onDelete(tag)} className="tech-chip" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <TextField fullWidth placeholder="Type and press Enter..." value={input}
        onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
        variant="standard" className="tag-text-field" InputProps={{ disableUnderline: true }}
      />
    </div>
  );
};

const UploadZone = ({ type, label, file, onUpload, onDelete, index }) => {
  const [isScanning, setIsScanning] = useState(false);
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        onUpload(type, e.target.files[0]);
      }, 1500);
    }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
      <Box className={`upload-zone ${file ? 'has-file' : ''}`} component="label">
        {!file && <input type="file" hidden onChange={handleFileSelect} />}
        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div key="scanning" className="scanning-container">
              <Typography variant="caption" className="scanning-text">PARSING DICOM HEADERS...</Typography>
              <LinearProgress className="tech-progress" />
            </motion.div>
          ) : file ? (
            <motion.div key="file" className="file-info-container">
              <CheckCircleIcon className="success-icon" />
              <Typography variant="h6">{type} READY</Typography>
              <Box className="file-name-box">
                <DescriptionIcon className="file-icon" />
                <Typography variant="caption">{file.name.substring(0, 15)}...</Typography>
              </Box>
              <IconButton className="delete-btn" onClick={(e) => { e.preventDefault(); onDelete(type); }}><DeleteOutlineIcon /></IconButton>
            </motion.div>
          ) : (
            <motion.div key="idle" className="idle-container">
              <div className="upload-icon-box"><CloudUploadIcon /></div>
              <Typography variant="h5">{type}</Typography>
              <Typography variant="caption">{label}</Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </motion.div>
  );
};

const ReviewBlock = ({ title, icon, onEdit, children, status = 'valid' }) => {
  const isError = status === 'error';
  return (
    <div className={`review-block ${isError ? 'error' : ''}`}>
      <div className="review-block-header">
        <div className="review-block-title-box">
          {React.cloneElement(icon, { className: 'review-block-icon' })}
          <Typography variant="subtitle2">{title}</Typography>
        </div>
        <Button startIcon={<EditIcon />} className="edit-btn" onClick={onEdit}>EDIT</Button>
      </div>
      <div className="review-block-content">{children}</div>
      <div className="review-block-watermark">{icon}</div>
    </div>
  );
};

const StatusChip = ({ label, type }) => {
  let statusClass = 'muted';
  if (['Mutant', 'Methylated', 'Present', 'Lost'].includes(type)) statusClass = 'cyan';
  if (['Wild-type', 'Unmethylated', 'Retained', 'Absent'].includes(type)) statusClass = 'teal';
  if (['Unknown', 'NONE'].includes(type)) statusClass = 'red';

  return (
    <div className={`status-chip status-chip-${statusClass}`}>
      <div className="status-chip-dot"></div>
      <Typography variant="caption">{label}</Typography>
    </div>
  );
};

const PatientIntake = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ 
    name: '', dob: '', gender: '', mrn: '', contact: '', email: '', diagnosisDate: '', pathologyReport: '', pathologyFile: null,
    cancerType: 'Brain',
    idh1: 'Unknown', mgmt: 'Unknown',
    er: 'Unknown', pr: 'Unknown', her2: 'Unknown', brca: 'Unknown', pdl1: 'Unknown',
    egfr: 'Unknown', alk: 'Unknown', ros1: 'Unknown', kras: 'Unknown', afp: 'Unknown',
    kps: 100, ecog: 0, symptoms: '', comorbidities: '' 
  });
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => setFormData({ ...formData, [field]: value });
  const handleMRIUpload = (type, file) => setUploadedFiles(prev => ({ ...prev, [`mri_${type}`]: file }));
  const handleMRIDelete = (type) => setUploadedFiles(prev => {
    const newFiles = { ...prev };
    delete newFiles[`mri_${type}`];
    return newFiles;
  });

  const handleCompleteIntake = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Authentication required. Please login.");
            navigate('/login');
            return;
        }

        let reportPath = null;
        let mriPaths = {};

        // 1. Upload Pathology Report if selected
        if (formData.pathologyFile) {
            const reportData = new FormData();
            reportData.append('histopathology_pdf', formData.pathologyFile);
            
            try {
                const uploadRes = await axios.post('http://localhost:8000/api/uploads/histopathology', reportData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}` 
                    }
                });
                if (uploadRes.data.filename) {
                    reportPath = `uploads/reports/${uploadRes.data.filename}`;
                }
            } catch (uploadErr) {
                console.error("Report upload failed:", uploadErr);
                alert("Failed to upload pathology report. Proceeding without it.");
            }
        }

        // 2. Upload MRI Files if present
        const mriFiles = Object.keys(uploadedFiles).filter(key => key.startsWith('mri_'));
        if (mriFiles.length > 0) {
            const mriData = new FormData();
            // Pass MRN to create a specific folder
            if (formData.mrn) {
                mriData.append('mrn', formData.mrn);
            }
            
            // The key in uploadedFiles is like 'mri_T1', but the backend expects 't1', 't2', etc.
            // We need to map 'mri_T1' -> 't1', 'mri_T1ce' -> 't1ce', etc.
            mriFiles.forEach(key => {
                const backendField = key.replace('mri_', '').toLowerCase();
                mriData.append(backendField, uploadedFiles[key]);
            });

            try {
                const mriUploadRes = await axios.post('http://localhost:8000/api/uploads/mri', mriData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                
                if (mriUploadRes.data.files) {
                    mriPaths = mriUploadRes.data.files;
                }
            } catch (mriErr) {
                console.error("MRI upload failed:", mriErr);
                alert("Failed to upload MRI scans. Proceeding without them.");
            }
        }

        // 3. Save Patient Data
        const payload = { ...formData, pathologyReportPath: reportPath, mriPaths };
        delete payload.pathologyFile; // Remove file object

        const response = await axios.post('http://localhost:8000/api/patients', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            const patientId = response.data.data.id;
            navigate(`/mri-analysis?patientId=${patientId}`);
        } else {
            throw new Error(response.data.message || 'Failed to save patient record');
        }

    } catch (err) {
        console.error("Intake Error:", err);
        alert("Error saving patient record: " + (err.response?.data?.message || err.message));
    } finally {
        setLoading(false);
    }
  };

  return (
    <Box className="intake-container">
      <Grid container spacing={4} className="intake-grid">
        {currentStep === 1 && (
          <Grid item xs={12} className="preview-column">
            <div className="preview-layout-row">
              <Box className="preview-wrapper">
                <Typography variant="h3" className="page-title">NEW CASE</Typography>
                <Typography variant="body1" className="page-subtitle">Initialize multimodal data collection.</Typography>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  <div className="id-card">
                    <div className="holo-bar"></div>
                    <div className="id-header">
                      <div className="id-avatar"><BadgeOutlinedIcon /></div>
                      <div>
                        <span className="id-label">PATIENT PREVIEW</span>
                        <h4 className="id-name">{formData.name || "ENTER NAME..."}</h4>
                      </div>
                    </div>
                    <div className="id-details">
                      <div className="id-field"><span>MRN</span><p>{formData.mrn || "---"}</p></div>
                      <div className="id-field"><span>EMAIL</span><p>{formData.email || "---"}</p></div>
                      <div className="id-field"><span>DOB</span><p>{formData.dob || "--/--/--"}</p></div>
                      <div className="id-field"><span>CONTACT</span><p>{formData.contact || "---"}</p></div>
                    </div>
                  </div>
                </motion.div>
              </Box>
            </div>
          </Grid>
        )}

        <Grid item xs={12}>
          <TechStepper activeStep={currentStep} />
          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              <motion.div key="step1" className="step-motion-wrapper" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                <div className="form-terminal">
                  <div className="terminal-header">
                    <Typography variant="h5">01 // PATIENT INFORMATION</Typography>
                    <span className="req-badge">REQ_FIELDS: ALL</span>
                  </div>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={9}>
                      <div className="form-inputs-col">
                        <TextField fullWidth label="Full Legal Name" variant="outlined" className="tech-input fixed-width"
                          value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start"><BadgeOutlinedIcon /></InputAdornment> }}
                        />
                        <TextField fullWidth label="Patient Email Address" placeholder="Used for patient portal access" className="tech-input fixed-width"
                          value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon /></InputAdornment> }}
                        />
                        <TextField fullWidth label="Medical Record Number (MRN)" placeholder="e.g. MR-2026-X" className="tech-input fixed-width"
                          value={formData.mrn} onChange={(e) => handleChange('mrn', e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start"><NumbersOutlinedIcon /></InputAdornment> }}
                        />
                        <TextField fullWidth label="Contact Number" placeholder="e.g. 9876543210" className="tech-input fixed-width"
                          value={formData.contact} onChange={(e) => handleChange('contact', e.target.value)}
                          InputProps={{ startAdornment: <InputAdornment position="start"><LocalPhoneOutlinedIcon /></InputAdornment> }}
                        />
                        <Grid container spacing={3}>
                          <Grid item xs={6}>
                            <TextField fullWidth type="date" label="Date of Birth" className="tech-input fixed-width"
                              value={formData.dob} onChange={(e) => handleChange('dob', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthOutlinedIcon /></InputAdornment> }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField fullWidth type="date" label="Date of Diagnosis" className="tech-input fixed-width"
                              value={formData.diagnosisDate} onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ startAdornment: <InputAdornment position="start"><EventAvailableOutlinedIcon /></InputAdornment> }}
                            />
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2 }}>
                          <Typography className="field-label">Clinical Pathology Report (PDF/IMG)</Typography>
                          <UploadZone 
                            type="PATHOLOGY" 
                            label="Upload biopsy or surgical report" 
                            file={formData.pathologyFile} 
                            onUpload={(_, file) => handleChange('pathologyFile', file)} 
                            onDelete={() => handleChange('pathologyFile', null)} 
                            index={4} 
                          />
                        </Box>
                      </div>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography className="field-label">Biological Sex / Gender</Typography>
                      <div className="gender-selection-col">
                        <GenderTile label="MALE" icon={<MaleIcon />} selected={formData.gender === 'male'} onClick={() => handleChange('gender', 'male')} />
                        <GenderTile label="FEMALE" icon={<FemaleIcon />} selected={formData.gender === 'female'} onClick={() => handleChange('gender', 'female')} />
                        <GenderTile label="OTHER" icon={<TransgenderIcon />} selected={formData.gender === 'other'} onClick={() => handleChange('gender', 'other')} />
                      </div>
                    </Grid>
                  </Grid>
                  <div className="terminal-footer">
                    <Button variant="contained" className="tech-btn" onClick={() => setCurrentStep(2)}>PROCEED TO MRI UPLOAD</Button>
                  </div>
                </div>
              </motion.div>
            ) : currentStep === 2 ? (
              <motion.div key="step2" className="step-motion-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="form-terminal">
                  <div className="terminal-header">
                    <Typography variant="h5">02 // MRI ACQUISITION</Typography>
                    <span className="req-badge">SUPPORTED: .NII, .DCM, .GZ</span>
                  </div>

                  <Box sx={{ mb: 4 }}>
                    <Typography className="field-label" sx={{ mb: 2 }}>SELECT CANCER TYPE FOR SPECIALIZED SEGMENTATION</Typography>
                    <div className="cancer-type-selector">
                      {['Brain', 'Breast', 'Liver', 'Pancreas', 'Lung'].map((type) => (
                        <motion.div key={type} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant={formData.cancerType === type ? "contained" : "outlined"}
                            onClick={() => handleChange('cancerType', type)}
                            className={`tech-btn-choice ${formData.cancerType === type ? 'active' : ''}`}
                            sx={{ minWidth: '120px' }}
                          >
                            {type}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </Box>

                  <Grid container spacing={4} className="mri-grid">
                    {formData.cancerType === 'Brain' ? (
                      (IMAGING_PROTOCOLS[formData.cancerType] || IMAGING_PROTOCOLS.Brain).map((protocol, index) => (
                        <Grid item xs={12} className="mri-grid-item" key={protocol.id}>
                          <UploadZone 
                            type={protocol.id.replace('_', ' ')} 
                            label={protocol.label} 
                            file={uploadedFiles[`mri_${protocol.id}`]} 
                            onUpload={(_, file) => handleMRIUpload(protocol.id, file)} 
                            onDelete={() => handleMRIDelete(protocol.id)} 
                            index={index} 
                          />
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12}>
                        <Box sx={{ 
                          textAlign: 'center', py: 10, border: '2px dashed rgba(255,255,255,0.1)', 
                          borderRadius: '20px', background: 'rgba(255,255,255,0.02)' 
                        }}>
                          <FileUploadOutlinedIcon sx={{ fontSize: 60, color: '#64748B', mb: 2 }} />
                          <Typography variant="h5" sx={{ color: '#fff', mb: 1 }}>{formData.cancerType.toUpperCase()} MRI SEGMENTATION</Typography>
                          <Typography variant="body1" sx={{ color: '#F59E0B', fontWeight: 600 }}>FEATURE COMING SOON</Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1 }}>
                            Our AI engineers are currently training specialized models for this cancer type.
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                  <div className="terminal-footer">
                    <Button variant="text" className="tech-btn-text" onClick={() => setCurrentStep(1)}>BACK</Button>
                    <Button variant="contained" className="tech-btn" onClick={() => setCurrentStep(3)}>PROCEED TO GENOMICS</Button>
                  </div>
                </div>
              </motion.div>
            ) : currentStep === 3 ? (
              <motion.div key="step3" className="step-motion-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="form-terminal">
                  <div className="terminal-header">
                    <div>
                      <Typography variant="h5">03 // GENOMIC DECODER</Typography>
                      <span className="req-badge">MOLECULAR MARKERS</span>
                    </div>
                    <Button startIcon={<FileUploadOutlinedIcon />} className="vcf-import-btn" variant="outlined" size="small">
                      IMPORT .VCF FILE
                    </Button>
                  </div>
                  <Grid container spacing={3}>
                    {(GENOMIC_MARKERS[formData.cancerType] || GENOMIC_MARKERS.Brain).map((m) => (
                      <Grid item xs={12} key={m.id}>
                        <MolecularSwitch 
                          label={m.label} sub={m.sub} icon={m.icon} options={m.options} 
                          value={formData[m.id]} onChange={(val) => handleChange(m.id, val)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <div className="decoder-footer">
                    <HelpOutlineIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                    <Typography variant="caption">
                      Marking "Unknown" will trigger the Uncertainty Quantification Engine for this parameter.
                    </Typography>
                  </div>
                  <div className="terminal-footer">
                    <Button variant="text" className="tech-btn-text" onClick={() => setCurrentStep(2)}>BACK</Button>
                    <Button variant="contained" className="tech-btn" onClick={() => setCurrentStep(4)}>PROCEED TO HISTORY</Button>
                  </div>
                </div>
              </motion.div>
            ) : currentStep === 4 ? (
              <motion.div key="step4" className="step-motion-wrapper" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="form-terminal">
                  <div className="terminal-header">
                    <Typography variant="h5">04 // CLINICAL HISTORY</Typography>
                    <span className="req-badge">PATIENT PERFORMANCE</span>
                  </div>
                                                      <Grid container spacing={2} className="performance-grid">
                                                        <Grid item xs={12} md={3}>
                                                          <div className="performance-terminal-box" style={{ '--kps-color': getKPSColor(formData.kps) }}>
                                                            <div className="score-header">
                                                              <Typography className="kps-label">KPS Score</Typography>
                                                              <Typography className="kps-value">{formData.kps}%</Typography>
                                                            </div>
                                                            <Slider
                                                              value={formData.kps}
                                                              onChange={(_, val) => handleChange('kps', val)}
                                                              step={10} marks min={0} max={100}
                                                              className="tech-slider"
                                                            />
                                                            <Typography variant="caption" className="score-desc">
                                                              <span>{formData.kps >= 80 ? "Normal" : formData.kps >= 50 ? "Assisted" : "Hosp."}</span>
                                                            </Typography>
                                                          </div>
                                                        </Grid>
                                    
                                                        <Grid item xs={12} md={3}>
                                                          <div className="performance-terminal-box">
                                                            <Typography className="ecog-label">ECOG Score (0-4)</Typography>
                                                            <div className="ecog-selector">
                                                              {[0, 1, 2, 3, 4].map((score) => (
                                                                <Button key={score} onClick={() => handleChange('ecog', score)}
                                                                  className={`ecog-btn ${formData.ecog === score ? 'active' : ''}`}>
                                                                  {score}
                                                                </Button>
                                                              ))}
                                                            </div>
                                                            <Typography variant="caption" className="ecog-desc-text">
                                                              {getECOGDescription(formData.ecog).substring(0, 30)}...
                                                            </Typography>
                                                          </div>
                                                        </Grid>
                                    
                                                        <Grid item xs={12} md={3}>
                                                          <TagInput 
                                                            label="SYMPTOMS" icon={<MedicalServicesIcon />}
                                                            tags={formData.symptoms ? formData.symptoms.split(',').filter(s => s) : []}
                                                            onAdd={(t) => handleChange('symptoms', formData.symptoms ? `${formData.symptoms},${t}` : t)}
                                                            onDelete={(t) => handleChange('symptoms', formData.symptoms.split(',').filter(x => x !== t).join(','))}
                                                          />
                                                        </Grid>
                                                        <Grid item xs={12} md={3}>
                                                          <TagInput 
                                                            label="COMORBIDITIES" icon={<FavoriteBorderIcon />}
                                                            tags={formData.comorbidities ? formData.comorbidities.split(',').filter(s => s) : []}
                                                            onAdd={(t) => handleChange('comorbidities', formData.comorbidities ? `${formData.comorbidities},${t}` : t)}
                                                            onDelete={(t) => handleChange('comorbidities', formData.comorbidities.split(',').filter(x => x !== t).join(','))}
                                                          />
                                                        </Grid>
                                                      </Grid>                  <div className="terminal-footer">
                    <Button variant="text" className="tech-btn-text" onClick={() => setCurrentStep(3)}>BACK</Button>
                    <Button variant="contained" className="tech-btn" onClick={() => setCurrentStep(5)}>REVIEW CASE</Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="step5" className="step-motion-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="form-terminal">
                  <div className="terminal-header">
                    <div>
                      <Typography variant="h5">05 // PROTOCOL VERIFICATION</Typography>
                      <span className="req-badge">CONFIRM DATA INTEGRITY</span>
                    </div>
                  </div>

                  <Grid container spacing={3}>
                    {/* 1. IDENTITY BLOCK */}
                    <Grid item xs={12} md={4}>
                      <ReviewBlock title="PATIENT IDENTITY" icon={<FingerprintIcon />} onEdit={() => setCurrentStep(1)}>
                        <div className="review-data-stack">
                          <div>
                            <span className="data-label">FULL NAME</span>
                            <Typography className="data-value-lg">{formData.name || '---'}</Typography>
                          </div>
                          <div>
                            <span className="data-label">EMAIL</span>
                            <Typography className="data-value">{formData.email || '---'}</Typography>
                          </div>
                          <div className="data-row">
                            <div>
                              <span className="data-label">MRN</span>
                              <Typography className="data-value-mono">{formData.mrn || '---'}</Typography>
                            </div>
                            <div>
                              <span className="data-label">DIAGNOSIS</span>
                              <Typography className="data-value">{formData.diagnosisDate || '---'}</Typography>
                            </div>
                          </div>
                        </div>
                      </ReviewBlock>
                    </Grid>

                    {/* 2. MRI ACQUISITION BLOCK */}
                    <Grid item xs={12} md={4}>
                      <ReviewBlock 
                        title="IMAGING DATA" 
                        icon={<ViewInArIcon />} 
                        status={Object.keys(uploadedFiles).filter(k => k.startsWith('mri_')).length === 0 ? 'error' : 'valid'}
                        onEdit={() => setCurrentStep(2)}
                      >
                        <Box sx={{ mb: 2 }}>
                          <span className="data-label">CANCER TYPE</span>
                          <Typography className="data-value" style={{ color: '#00F0FF', fontWeight: 700 }}>{formData.cancerType.toUpperCase()}</Typography>
                        </Box>
                        {Object.keys(uploadedFiles).filter(k => k.startsWith('mri_')).length === 0 ? (
                          <div className="error-display">
                            <ErrorOutlineIcon className="error-icon-big" />
                            <Typography variant="body2">NO SEQUENCES DETECTED</Typography>
                            <span className="error-sub">Required: {(IMAGING_PROTOCOLS[formData.cancerType] || []).map(p => p.id).join(', ')}</span>
                          </div>
                        ) : (
                          <div className="mri-review-list">
                            {(IMAGING_PROTOCOLS[formData.cancerType] || []).map(seq => (
                              <div key={seq.id} className={`mri-seq-badge ${uploadedFiles[`mri_${seq.id}`] ? 'active' : 'inactive'}`}>
                                {seq.id.replace('_', ' ')}
                              </div>
                            ))}
                          </div>
                        )}
                      </ReviewBlock>
                    </Grid>

                    {/* 3. MOLECULAR PROFILE BLOCK */}
                    <Grid item xs={12} md={4}>
                      <ReviewBlock title="GENOMIC PROFILE" icon={<BiotechIcon />} onEdit={() => setCurrentStep(3)}>
                        <div className="genomic-review-stack">
                          {(GENOMIC_MARKERS[formData.cancerType] || GENOMIC_MARKERS.Brain).map((m, index, arr) => (
                            <React.Fragment key={m.id}>
                              <div className="review-item-between">
                                <Typography variant="body2">{m.label}</Typography>
                                <StatusChip label={formData[m.id]} type={formData[m.id]} />
                              </div>
                              {index < arr.length - 1 && <Divider className="review-divider" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </ReviewBlock>
                    </Grid>
                  </Grid>

                  <div className="terminal-footer-final">
                    {formData.cancerType === 'Brain' && Object.keys(uploadedFiles).filter(k => k.startsWith('mri_')).length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Typography className="critical-error-text">
                          [!] CRITICAL ERROR: INSUFFICIENT IMAGING DATA. ANALYSIS LOCKED.
                        </Typography>
                      </motion.div>
                    )}
                    <Button
                      variant="contained"
                      className="tech-btn-launch"
                      disabled={(formData.cancerType === 'Brain' && Object.keys(uploadedFiles).filter(k => k.startsWith('mri_')).length === 0) || loading}
                      endIcon={<PlayArrowIcon />}
                      onClick={handleCompleteIntake}
                    >
                      {loading ? 'SAVING DATA...' : (formData.cancerType === 'Brain' && Object.keys(uploadedFiles).filter(k => k.startsWith('mri_')).length === 0 ? 'AWAITING DATA...' : 'INITIALIZE TREATMENT ENGINE')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PatientIntake;