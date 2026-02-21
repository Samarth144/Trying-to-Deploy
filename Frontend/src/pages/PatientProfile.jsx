import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Grid, Typography, Avatar, Chip, IconButton, Button, CircularProgress, Divider, Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WcIcon from '@mui/icons-material/Wc'; 
import ScienceIcon from '@mui/icons-material/Science'; 
import BiotechIcon from '@mui/icons-material/Biotech'; 
import ViewInArIcon from '@mui/icons-material/ViewInAr'; 
import MedicationIcon from '@mui/icons-material/Medication'; 
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import './PatientProfile.css';

// --- THEME CONSTANTS ---
const colors = {
  bg: '#0B1221',
  teal: '#059789',
  cyan: '#00F0FF',
  amber: '#F59E0B', 
  purple: '#8B5CF6',
  muted: '#64748B'
};

// --- SUB-COMPONENTS ---

const ModuleCard = ({ label, icon, color, delay, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ delay: delay }}
    whileHover={{ y: -5 }}
    style={{ height: '100%' }}
  >
    <Box 
      onClick={onClick}
      className="module-card"
      sx={{ 
        '&:hover': { bgcolor: `${color}15`, borderColor: color, boxShadow: `0 0 20px ${color}20` }
      }}
    >
      <Box sx={{ color: color, mb: 1, '& svg': { fontSize: 40 } }}>{icon}</Box>
      <Typography variant="caption" className="module-label">
        {label}
      </Typography>
    </Box>
  </motion.div>
);

const KPSGauge = ({ value }) => (
  <Box className="kps-gauge-container" sx={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
      <motion.circle
        cx="60" cy="60" r="54"
        stroke={colors.teal}
        strokeWidth="8"
        fill="transparent"
        strokeDasharray="339"
        strokeDashoffset="339"
        animate={{ strokeDashoffset: 339 - (339 * (value || 0)) / 100 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
    <Box sx={{ position: 'absolute', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontFamily: '"Rajdhani"', fontWeight: 800, color: '#fff', lineHeight: 0.9 }}>
        {value || 0}%
      </Typography>
      <Typography variant="caption" sx={{ fontSize: '0.75rem', color: colors.muted, fontWeight: 700, letterSpacing: '1px' }}>KPS</Typography>
    </Box>
  </Box>
);

const ECOGBar = ({ value }) => {
  const score = parseInt(value) || 0;
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
        <Typography variant="caption" sx={{ color: colors.muted, fontWeight: 700, letterSpacing: '1px', fontSize: '0.75rem' }}>ECOG SCORE</Typography>
        <Typography variant="h4" sx={{ fontFamily: '"Rajdhani"', fontWeight: 800, color: score >= 3 ? colors.amber : colors.teal, lineHeight: 1 }}>
          {score}/5
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, height: 12 }}>
        {[0, 1, 2, 3, 4, 5].map((step) => (
          <Box key={step} sx={{ 
            flex: 1, 
            borderRadius: '2px',
            bgcolor: step <= score ? (score >= 3 ? colors.amber : colors.teal) : 'rgba(255,255,255,0.1)'
          }} />
        ))}
      </Box>
      <Typography variant="body2" sx={{ color: colors.muted, mt: 1.5, display: 'block', fontSize: '0.85rem', fontWeight: 500, fontFamily: '"Space Grotesk"' }}>
        {score === 3 ? "Limited self-care, confined >50% of waking hours" : score > 3 ? "Severely disabled" : "Active / Standard Activity"}
      </Typography>
    </Box>
  );
};

const PatientProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    
    if (pid) {
        const fetchPatient = async () => {
            try {
                const res = await apiClient.get(`/patients/${pid}`);
                if (res.data.success) {
                    setPatient(res.data.data);
                }
            } catch (err) {
                console.error("Error loading patient profile:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatient();
    }
  }, [location.search]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: colors.teal }} />
    </Box>
  );

  if (!patient) return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
        <Typography variant="h5" color="error">Patient profile not found or access denied.</Typography>
    </Box>
  );

  const pidQuery = `?patientId=${patient.id}`;
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();

  return (
    <Box className="patient-profile-root">
      <Container maxWidth="xl">
        
        {/* HEADER TITLE */}
        <Box className="profile-header">
          <Box className="header-title-box">
            <Box className="header-accent-bar" />
            <Box>
              <Typography variant="h4" className="header-title">
                PATIENT PROFILE
              </Typography>
              <Typography variant="caption" className="header-subtitle">
                CLINICAL OVERVIEW
              </Typography>
            </Box>
          </Box>
          <Button 
            onClick={() => navigate('/dashboard')} 
            startIcon={<ArrowBackIcon />}
            sx={{ color: colors.teal, fontFamily: '"Rajdhani"', fontWeight: 600 }}
          >
            Dashboard
          </Button>
        </Box>

        <Grid container spacing={4}>
          
          {/* --- LEFT COL: IDENTITY CARD (30%) --- */}
          <Grid xs={12} md={4}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Box className="identity-card">
                {/* ID Header */}
                <Box className="identity-header">
                  <Avatar className="patient-avatar">{initials}</Avatar>
                  <Box>
                    <Typography variant="h5" className="patient-name">
                      {patient.firstName} {patient.lastName}
                    </Typography>
                    <Box className="mrn-box">
                       <BadgeIcon sx={{ fontSize: 14, color: colors.cyan }} />
                       <Typography variant="caption" className="mrn-text">
                         MRN: {patient.mrn}
                       </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Details Grid */}
                <Grid container spacing={3} className="identity-details-grid">
                   <Grid xs={6}>
                     <Typography variant="caption" className="detail-label">
                       <CalendarMonthIcon sx={{ fontSize: 16 }} /> DOB
                     </Typography>
                     <Typography variant="body1" className="detail-value">
                        {new Date(patient.dateOfBirth).toLocaleDateString()}
                     </Typography>
                   </Grid>
                   <Grid xs={6}>
                     <Typography variant="caption" className="detail-label">
                       <WcIcon sx={{ fontSize: 16 }} /> SEX
                     </Typography>
                     <Typography variant="body1" className="detail-value" sx={{ textTransform: 'uppercase' }}>{patient.gender}</Typography>
                   </Grid>
                   <Grid xs={12}>
                     <Typography variant="caption" className="detail-label">
                       <PhoneIcon sx={{ fontSize: 16 }} /> CONTACT
                     </Typography>
                     <Typography variant="body1" className="detail-value-mono">{patient.phone || patient.email}</Typography>
                   </Grid>
                </Grid>

                {/* Status Badge */}
                <Box className="status-badge-box">
                   <Chip label="ACTIVE CASE" size="small" className="active-case-chip" />
                </Box>

              </Box>
            </motion.div>
          </Grid>

          {/* --- RIGHT COL: CLINICAL CONTEXT & MODULES (70%) --- */}
          <Grid xs={12} md={8}>
            
            {/* 1. DIAGNOSIS & METRICS ROW */}
            <Box className="clinical-overview-row">
              
              {/* Diagnosis Box */}
              <Box className="diagnosis-box">
                <Typography variant="overline" className="insight-title" sx={{ fontSize: '0.8rem' }}>PRIMARY DIAGNOSIS</Typography>
                <Typography variant="h3" className="diagnosis-title">
                  {patient.diagnosis.toUpperCase()}
                </Typography>
                <Chip 
                  label={`Type: ${patient.cancerType}`} 
                  className="type-chip"
                  sx={{ px: 1 }} 
                />
              </Box>

              {/* Performance Metrics Box */}
              <Box className="metrics-box">
                <KPSGauge value={patient.kps} />
                <Box sx={{ flex: 1 }}>
                   <ECOGBar value={patient.performanceStatus} />
                </Box>
              </Box>

            </Box>

            {/* 2. PATIENT MODULES GRID */}
            <Typography variant="h6" className="modules-section-title">
              CLINICAL MODULES & ANALYSIS
            </Typography>
            
            <Grid container spacing={2}>
              <Grid xs={6} sm={4} md={2.4}>
                <ModuleCard label="MRI ANALYSIS" icon={<ViewInArIcon />} color={colors.cyan} delay={0.1} onClick={() => navigate(`/mri-analysis${pidQuery}`)} />
              </Grid>
              <Grid xs={6} sm={4} md={2.4}>
                <ModuleCard label="PATHOLOGY" icon={<ScienceIcon />} color="#EC4899" delay={0.2} onClick={() => navigate(`/histopathology${pidQuery}`)} />
              </Grid>
              <Grid xs={6} sm={4} md={2.4}>
                <ModuleCard label="GENOMICS" icon={<BiotechIcon />} color={colors.purple} delay={0.3} onClick={() => navigate(`/genomic-analysis${pidQuery}`)} />
              </Grid>
              <Grid xs={6} sm={4} md={2.4}>
                <ModuleCard label="TREATMENT" icon={<MedicationIcon />} color="#10B981" delay={0.4} onClick={() => navigate(`/treatment-plan${pidQuery}`)} />
              </Grid>
              <Grid xs={6} sm={4} md={2.4}>
                <ModuleCard label="3D SCENE" icon={<PlayCircleOutlineIcon />} color={colors.amber} delay={0.5} onClick={() => navigate(`/tumor-3d${pidQuery}`)} />
              </Grid>
            </Grid>

            {/* 3. ADDITIONAL INSIGHTS */}
            <Box className="insights-section">
                <Grid container spacing={3}>
                    {/* Symptoms Column */}
                    <Grid xs={12} md={3}>
                        <Paper className="insight-card">
                            <Typography variant="overline" className="insight-title" sx={{ fontSize: '0.8rem' }}>Reported Symptoms</Typography>
                            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {patient.symptoms?.length > 0 ? (
                                    patient.symptoms.map(s => (
                                        <Chip 
                                            key={s} 
                                            label={s} 
                                            size="medium" 
                                            className="symptom-chip"
                                        />
                                    ))
                                ) : (
                                    <Typography variant="body1" sx={{ color: colors.muted, display: 'block', mt: 1, fontWeight: 500 }}>
                                        No acute symptoms reported
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Comorbidities Column */}
                    <Grid xs={12} md={3}>
                        <Paper className="insight-card">
                            <Typography variant="overline" className="insight-title" sx={{ fontSize: '0.8rem' }}>Comorbidities</Typography>
                            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {patient.comorbidities?.length > 0 ? (
                                    patient.comorbidities.map(c => (
                                        <Chip 
                                            key={c} 
                                            label={c} 
                                            size="medium" 
                                            variant="outlined"
                                            className="comorbidity-chip"
                                        />
                                    ))
                                ) : (
                                    <Typography variant="body1" sx={{ color: colors.muted, display: 'block', mt: 1, fontWeight: 500 }}>
                                        None documented
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Biomarkers Column */}
                    <Grid xs={12} md={6}>
                        <Paper className="insight-card">
                            <Box className="insight-header">
                                <Typography variant="overline" className="insight-title" sx={{ fontSize: '0.8rem' }}>Biomarker Status</Typography>
                                <BiotechIcon sx={{ color: colors.purple, fontSize: 24 }} />
                            </Box>
                            <Grid container spacing={2}>
                                {(() => {
                                    const allMarkers = {
                                        er: 'ER', pr: 'PR', her2: 'HER2', brca: 'BRCA', 
                                        pdl1: 'PD-L1', egfr: 'EGFR', alk: 'ALK', 
                                        ros1: 'ROS1', kras: 'KRAS', afp: 'AFP',
                                        idh1: 'IDH1', mgmt: 'MGMT'
                                    };

                                    const typeMarkers = {
                                        'Brain': ['idh1', 'mgmt'],
                                        'Breast': ['er', 'pr', 'her2', 'brca', 'pdl1'],
                                        'Lung': ['egfr', 'kras', 'alk', 'ros1', 'pdl1'],
                                        'Liver': ['afp'],
                                        'Pancreas': ['brca']
                                    };
                                    
                                    const cancerType = patient.cancerType || 'Brain';
                                    const displayKeys = typeMarkers[cancerType] || [];

                                    if (displayKeys.length === 0) {
                                        return (
                                            <Grid xs={12}>
                                                <Typography variant="body1" sx={{ color: colors.muted, fontWeight: 500 }}>
                                                    No specialized biomarkers defined for {cancerType}
                                                </Typography>
                                            </Grid>
                                        );
                                    }

                                    return displayKeys.map(key => (
                                        <Grid xs={4} key={key}>
                                            <Box className="biomarker-box">
                                                <Typography variant="caption" className="biomarker-label">
                                                    {allMarkers[key]}
                                                </Typography>
                                                <Typography variant="h6" className="biomarker-value" sx={{ 
                                                    color: (patient.genomicProfile?.[key] && patient.genomicProfile[key] !== 'Unknown') ? colors.cyan : colors.muted, 
                                                }}>
                                                    {patient.genomicProfile?.[key] || 'Unknown'}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ));
                                })()}
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default PatientProfile;
