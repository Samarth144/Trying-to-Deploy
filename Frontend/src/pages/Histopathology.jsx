import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Box, Container, Typography, Button, IconButton, LinearProgress, Grid, Chip, Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Navbar from '../components/Navbar';
import './Histopathology.css';

// --- SUB-COMPONENTS FOR EXTRACTION MATRIX ---

const ReceptorBadge = ({ label, value, full, index, color = "#00F0FF" }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <Box sx={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      p: 2, mb: 1.5, borderRadius: '4px',
      bgcolor: 'rgba(255,255,255,0.02)', 
      border: `1px solid rgba(255,255,255,0.05)`,
      transition: 'all 0.3s',
      '&:hover': { borderColor: color, bgcolor: `${color}10` }
    }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontFamily: '"Space Grotesk"', fontSize: '0.85rem' }}>
            {full}
          </Typography>
        </Box>
      </Box>
      
      <Chip 
        label={value ? String(value).toUpperCase() : 'N/A'} 
        icon={<CheckCircleIcon style={{ fontSize: 14 }} />}
        size="small"
        sx={{ 
          bgcolor: (value?.toLowerCase() === 'positive' || value?.toLowerCase() === 'mutant' || value?.toLowerCase() === 'methylated' || value?.toLowerCase() === 'present') ? `${color}20` : 'rgba(255,255,255,0.1)', 
          color: (value?.toLowerCase() === 'positive' || value?.toLowerCase() === 'mutant' || value?.toLowerCase() === 'methylated' || value?.toLowerCase() === 'present') ? color : '#64748B', 
          border: `1px solid ${(value?.toLowerCase() === 'positive' || value?.toLowerCase() === 'mutant' || value?.toLowerCase() === 'methylated' || value?.toLowerCase() === 'present') ? color : 'transparent'}`,
          fontFamily: '"JetBrains Mono"', fontWeight: 700,
          height: '24px'
        }} 
      />
    </Box>
  </motion.div>
);

const ClinicalField = ({ label, value, icon, large = false, color = "#00F0FF" }) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      {icon && React.cloneElement(icon, { sx: { fontSize: 16, color: color } })}
      <Typography variant="caption" sx={{ color: '#64748B', fontFamily: '"Space Grotesk"', letterSpacing: '1px' }}>
        {label.toUpperCase()}
      </Typography>
    </Box>
    <Typography 
      variant={large ? "h4" : "h6"} 
      sx={{ 
        fontFamily: '"Rajdhani"', 
        fontWeight: 700, 
        color: '#fff',
        lineHeight: 1.1,
        textShadow: large ? `0 0 20px ${color}40` : 'none'
      }}
    >
      {value || '---'}
    </Typography>
  </Box>
);

const ConnectionBadge = ({ patientId }) => (
  <Box sx={{ 
    display: 'inline-flex', alignItems: 'center', gap: '8px', 
    background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00F0FF', 
    borderRadius: '4px', padding: '4px 12px', marginTop: '8px' 
  }}>
    {patientId ? <LinkIcon sx={{ fontSize: 16, color: '#00F0FF' }} /> : <LinkOffIcon sx={{ fontSize: 16, color: '#64748B' }} />}
    <span style={{ color: '#00F0FF', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem', fontWeight: 600 }}>
      LINKED PATIENT CASE: {patientId ? patientId.split('-')[0].toUpperCase() : 'NULL'}
    </span>
  </Box>
);

function Histopathology() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [patientId, setPatientId] = useState(null);

  const getThemeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'brain': return '#A855F7';
      case 'breast': return '#00F0FF';
      case 'lung': return '#F59E0B';
      case 'liver': return '#10B981';
      case 'pancreas': return '#EC4899';
      default: return '#00F0FF';
    }
  };

  const renderMarkers = (type, data) => {
    const color = getThemeColor(type);
    switch (type?.toLowerCase()) {
      case 'breast':
        return (
          <>
            <ReceptorBadge label="ER" value={data.ER} full="Estrogen Receptor" index={0} color={color} />
            <ReceptorBadge label="PR" value={data.PR} full="Progesterone Receptor" index={1} color={color} />
            <ReceptorBadge label="HER2" value={data.HER2} full="Human Epidermal Growth Factor" index={2} color={color} />
            <ReceptorBadge label="BRCA" value={data.BRCA} full="BRCA1/2 Mutation" index={3} color={color} />
            <ReceptorBadge label="KI-67" value={data.ki67 ? `${data.ki67}%` : 'N/A'} full="Proliferation Index" index={4} color={color} />
          </>
        );
      case 'brain':
        return (
          <>
            <ReceptorBadge label="IDH1" value={data.IDH1} full="Isocitrate Dehydrogenase" index={0} color={color} />
            <ReceptorBadge label="MGMT" value={data.MGMT} full="Promoter Methylation" index={1} color={color} />
            <ReceptorBadge label="RESECTION" value={data.resection} full="Extent of Resection" index={2} color={color} />
            <ReceptorBadge label="RADIATION" value={data.prior_radiation} full="Prior Radiotherapy" index={3} color={color} />
          </>
        );
      case 'lung':
        return (
          <>
            <ReceptorBadge label="EGFR" value={data.EGFR} full="Epidermal Growth Factor" index={0} color={color} />
            <ReceptorBadge label="ALK" value={data.ALK} full="Anaplastic Lymphoma" index={1} color={color} />
            <ReceptorBadge label="PD-L1" value={data.PDL1} full="Immune Checkpoint" index={2} color={color} />
            <ReceptorBadge label="KRAS" value={data.KRAS} full="KRAS G12C Mutation" index={3} color={color} />
          </>
        );
      case 'liver':
        return (
          <>
            <ReceptorBadge label="AFP" value={data.AFP} full="Alpha-Fetoprotein" index={0} color={color} />
            <ReceptorBadge label="CIRRHOSIS" value={data.cirrhosis} full="Liver Cirrhosis" index={1} color={color} />
            <ReceptorBadge label="THROMBOSIS" value={data.pv_thrombosis} full="Portal Vein Thrombosis" index={2} color={color} />
          </>
        );
      default:
        return <Typography variant="body2" sx={{ color: '#64748B' }}>No biomarkers mapped for this cancer type.</Typography>;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    if (pid && pid !== 'null' && pid !== 'undefined') {
      setPatientId(pid);
      fetchAndAnalyzeReport(pid);
    }
  }, [location.search]);

  const fetchAndAnalyzeReport = async (pid, forceRefresh = false) => {
      setUploading(true);
      try {
          const token = localStorage.getItem('token');
          
          if (!forceRefresh) {
            // 1. First fetch the patient to check if they already have analysis data
            const patientRes = await axios.get(`http://localhost:8000/api/patients/${pid}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (patientRes.data.success) {
                const p = patientRes.data.data;
                // If analysis already exists, use it and don't re-run
                if (p.pathologyAnalysis && Object.keys(p.pathologyAnalysis).length > 0) {
                    console.log("Using existing pathology analysis from database.");
                    setAnalysisResult(p.pathologyAnalysis);
                    setUploading(false);
                    return;
                }
            }
          }

          // 2. If no analysis or forceRefresh, then run the engine
          const response = await axios.post(`http://localhost:8000/api/patients/${pid}/analyze-pathology`, { forceRefresh }, {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
              setAnalysisResult(response.data);
          }
      } catch (error) {
          console.error("Auto-analysis failed:", error);
      } finally {
          setUploading(false);
      }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setAnalysisResult(null); 
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('histopathology_pdf', selectedFile);
    setUploading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/uploads/histopathology', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAnalysisResult(response.data);
      alert('File uploaded and analyzed successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error.response?.data?.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box className="histo-container">
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 6, mt: 4 }}>
        <div className="histo-header">
          <div className="flex justify-between items-center mb-xl histo-header-content">
            <div>
              <h1 className="histo-title">HISTOPATHOLOGY REPORT ANALYSIS</h1>
              <ConnectionBadge patientId={patientId} />
            </div>
            {analysisResult && (
              <Button 
                variant="outlined" 
                startIcon={<AutoAwesomeIcon />}
                onClick={() => fetchAndAnalyzeReport(patientId, true)}
                disabled={uploading}
                sx={{ color: '#00F0FF', borderColor: 'rgba(0, 240, 255, 0.3)', fontFamily: 'Rajdhani', fontWeight: 700 }}
              >
                {uploading ? 'ANALYZING...' : 'RE-RUN AI EXTRACTION'}
              </Button>
            )}
          </div>

          {patientId && !analysisResult && (
              <div className="card-glass mb-xl processing-card">
                  <div className="spinner-icon" />
                  <h3 className="processing-title">ANALYZING LINKED PATIENT RECORD</h3>
                  <p className="processing-text">
                    Retrieving pathology document from secure storage and running NLP extraction...
                  </p>
              </div>
          )}

          {!patientId && !analysisResult && (
              <div className="card-glass mb-xl upload-card">
                <h3 style={{ fontFamily: '"Rajdhani", sans-serif' }}>Upload Histopathology PDF</h3>
                <p className="text-secondary mb-lg">The AI will analyze the report and suggest a treatment plan.</p>
                <div className="flex items-center gap-md">
                    <input type="file" accept="application/pdf" onChange={handleFileChange} className="file-input" />
                    <button className="btn btn-primary" onClick={handleFileUpload} disabled={uploading || !selectedFile}>
                      {uploading ? 'Uploading...' : 'Upload & Analyze'}
                    </button>
                </div>
              </div>
          )}

          {analysisResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <Box className="card-glass mb-xl results-card" sx={{ borderColor: `${getThemeColor(analysisResult.extracted_data?.cancer_type)}50` }}>
                <Box className="results-header" sx={{ bgcolor: `${getThemeColor(analysisResult.extracted_data?.cancer_type)}10`, borderBottomColor: `${getThemeColor(analysisResult.extracted_data?.cancer_type)}30` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AutoAwesomeIcon sx={{ color: getThemeColor(analysisResult.extracted_data?.cancer_type) }} />
                    <Typography className="results-title">AI-EXTRACTED STRUCTURED DATA</Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 4 }}>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={5}>
                      <Typography variant="overline" sx={{ color: getThemeColor(analysisResult.extracted_data?.cancer_type), display: 'block', mb: 2, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px' }}>
                        {analysisResult.extracted_data?.cancer_type?.toUpperCase()} BIOMARKERS
                      </Typography>
                      {renderMarkers(analysisResult.extracted_data?.cancer_type, analysisResult.extracted_data)}
                    </Grid>

                    <Grid item xs={false} md={1} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                      <Divider orientation="vertical" sx={{ borderColor: 'rgba(255,255,255,0.1)', height: '100%' }} />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Chip label={(analysisResult.extracted_data?.cancer_type || 'UNKNOWN').toUpperCase()} sx={{ bgcolor: getThemeColor(analysisResult.extracted_data?.cancer_type), color: '#000', fontFamily: '"Rajdhani"', fontWeight: 800, px: 1.5 }} />
                      </Box>
                      <ClinicalField label="Primary Diagnosis" value={analysisResult.extracted_data?.diagnosis} icon={<LocalHospitalIcon />} large color={getThemeColor(analysisResult.extracted_data?.cancer_type)} />
                      
                      <Grid container spacing={3}>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, fontWeight: 700 }}>
                            {analysisResult.extracted_data?.cancer_type?.toLowerCase() === 'liver' ? 'BCLC STAGE' : 'TNM STAGE'}
                          </Typography>
                          <Typography variant="h3" sx={{ fontFamily: '"Rajdhani"', fontWeight: 800, color: '#fff', fontSize: '2.5rem' }}>
                            {analysisResult.extracted_data?.stage || '---'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, fontWeight: 700 }}>
                            {analysisResult.extracted_data?.cancer_type?.toLowerCase() === 'brain' ? 'WHO GRADE' : 'GRADE'}
                          </Typography>
                          <Typography variant="h2" sx={{ fontFamily: '"Rajdhani"', fontWeight: 800, color: getThemeColor(analysisResult.extracted_data?.cancer_type), fontSize: '3rem' }}>{analysisResult.extracted_data?.grade || 'N/A'}</Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </motion.div>
          )}

          {!analysisResult && !uploading && (
            <div className="report-viewer report-viewer-card">
              <h3 className="mb-lg" style={{ color: '#fff' }}>Pathology Report</h3>
              <div className="report-content">
                <h2 className="report-header">SURGICAL PATHOLOGY REPORT</h2>
                <hr className="report-divider" />
                <p><i>Upload a report to begin analysis.</i></p>
              </div>
            </div>
          )}

          <div className="flex gap-md justify-center action-buttons">
            <button className="btn btn-back" onClick={() => navigate(`/genomic-analysis?patientId=${patientId}`)}>← Back to Genomic Analysis</button>
            <button className="btn btn-view-plan" onClick={() => navigate(`/treatment-plan?patientId=${patientId}`)} disabled={!analysisResult}>View Full Treatment Plan →</button>
          </div>
        </div>
      </Container>
    </Box>
  );
}

export default Histopathology;