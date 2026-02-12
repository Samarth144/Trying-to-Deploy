import React, { useState, useEffect } from 'react';
import {
  Box, Container, Grid, Typography, Button, IconButton, Chip, TablePagination, CircularProgress,
  TextField, InputAdornment, Menu, MenuItem, Card, CardContent, Avatar
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import PersonIcon from '@mui/icons-material/Person';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DescriptionIcon from '@mui/icons-material/Description';
import MedicationIcon from '@mui/icons-material/Medication';

// ... (colors and StatItem, PatientRow remain the same)
const colors = {
  bg: '#0B1221',
  glass: 'rgba(22, 32, 50, 0.8)',
  glassHover: 'rgba(22, 32, 50, 1)',
  teal: '#059789',
  cyan: '#00F0FF',
  amber: '#F59E0B',
  green: '#10B981',
  text: '#F8FAFC',
  muted: '#64748B',
  border: 'rgba(5, 151, 137, 0.3)'
};

const StatItem = ({ label, value, unit }) => (
  <Box sx={{ px: { xs: 2, md: 6 }, borderRight: { xs: 'none', md: `1px solid ${colors.border}` }, '&:last-child': { borderRight: 'none' }, flex: 1, minWidth: '200px', mb: { xs: 2, md: 0 } }}>
    <Typography variant="h3" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
      {value}
    </Typography>
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1 }}>
      <Typography variant="caption" sx={{ color: colors.cyan, fontFamily: '"JetBrains Mono"', fontWeight: 700, fontSize: '0.8rem' }}>
        {unit}
      </Typography>
      <Typography variant="caption" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"', fontSize: '0.8rem' }}>
        {label}
      </Typography>
    </Box>
  </Box>
);

const PatientRow = ({ p, index, onClick }) => {
  const status = p.pathologyAnalysis && Object.keys(p.pathologyAnalysis).length > 0 ? 'Analyzed' : 'Intake';
  const isComplete = status === 'Analyzed';
  const statusColor = isComplete ? colors.green : colors.amber;

  const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }) : 'N/A';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2.5,
          mb: 1.5,
          bgcolor: colors.glass,
          borderRadius: '4px',
          borderLeft: `4px solid ${statusColor}`,
          transition: 'all 0.2s',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: colors.glassHover,
            transform: 'translateX(5px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '25%' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontFamily: '"Space Grotesk"', fontWeight: 700 }}>
              {p.firstName} {p.lastName}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.muted, fontFamily: '"JetBrains Mono"' }}>
              MRN: {p.mrn}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ width: '30%' }}>
          <Typography variant="body2" sx={{ color: isComplete ? colors.cyan : colors.muted, fontFamily: '"Space Grotesk"' }}>
            {p.diagnosis
              ? (p.diagnosis.toLowerCase().includes('cancer') ? p.diagnosis : `${p.diagnosis} Cancer`)
              : 'Pending Analysis'}
          </Typography>
        </Box>

        <Box sx={{ width: '20%' }}>
          <Typography variant="caption" sx={{ color: '#fff', fontFamily: '"Space Grotesk"' }}>
            {formattedDate}
          </Typography>
        </Box>

        <Box sx={{ width: '15%' }}>
          <Chip
            label={status.toUpperCase()}
            size="small"
            sx={{
              bgcolor: `${statusColor}20`,
              color: statusColor,
              fontFamily: '"Rajdhani"',
              fontWeight: 700,
              border: `1px solid ${statusColor}40`,
              letterSpacing: '1px'
            }}
          />
        </Box>

        <Box sx={{ width: '10%', textAlign: 'right' }}>
          <IconButton size="small" sx={{ color: colors.teal }}>
            <ArrowForwardIosIcon fontSize="inherit" />
          </IconButton>
        </Box>
      </Box>
    </motion.div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isPatient, isDoctor, isAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState([]);
  const [dbPatients, setDbPatients] = useState([]);
  const [patientData, setPatientData] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const statsRes = await apiClient.get('/dashboard/stats');
        if (statsRes.data.success) {
          const s = statsRes.data.data.overview;
          setDbStats([
            { label: isPatient ? 'Records Found' : 'Total Patients', value: String(s.totalPatients).padStart(2, '0'), unit: isPatient ? 'IDENTITY' : 'CASES' },
            { label: 'Analyses', value: String(s.totalAnalyses).padStart(2, '0'), unit: 'COMPLETED' },
            { label: isPatient ? 'Active Plans' : 'Avg Confidence', value: isPatient ? String(s.activeTreatments).padStart(2, '0') : `${s.avgConfidence}%`, unit: isPatient ? 'TREATMENT' : 'AI SCORE' },
          ]);

          if (isPatient && statsRes.data.data.patientId) {
            const p = statsRes.data.data.patientRecord;
            setPatientData({
              id: statsRes.data.data.patientId,
              mrn: p?.mrn,
              dob: p?.dob,
              gender: p?.gender,
              phone: p?.phone
            });
          }
        }

        if (!isPatient) {
          const patientsRes = await apiClient.get('/dashboard/recent-patients?limit=100');
          if (patientsRes.data.success) {
            setDbPatients(patientsRes.data.data);
          }
        }
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [isPatient]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Dynamic Filtering Logic
  const filteredPatients = dbPatients.filter(p => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const mrn = p.mrn.toLowerCase();
    const diagnosis = (p.diagnosis || '').toLowerCase();
    const searchMatch = fullName.includes(searchTerm.toLowerCase()) || mrn.includes(searchTerm.toLowerCase()) || diagnosis.includes(searchTerm.toLowerCase());

    const filterMatch = activeFilter === 'All' || p.cancerType === activeFilter;

    return searchMatch && filterMatch;
  });

  const displayedPatients = filteredPatients.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleFilterClick = (event) => setFilterAnchor(event.currentTarget);
  const handleFilterClose = (type) => {
    if (type) setActiveFilter(type);
    setFilterAnchor(null);
    setPage(0);
  };

  // --- RENDER PATIENT VIEW ---
  if (isPatient) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: 6, px: { xs: 2, md: 6 } }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 6 }}>
            <Typography variant="h3" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>
              PATIENT HUB
            </Typography>
            <Typography variant="body1" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"', mt: 1 }}>
              Welcome back, {user?.name}. Monitor your clinical progress and AI analysis results.
            </Typography>
          </Box>

          <Box sx={{
            bgcolor: 'rgba(22, 32, 50, 0.6)',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            p: 4,
            mb: 6,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 4,
            backdropFilter: 'blur(10px)'
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', px: 3, gap: 2 }}>
                <CircularProgress size={20} sx={{ color: colors.teal }} />
                <Typography variant="caption" sx={{ color: colors.muted }}>Loading your health metrics...</Typography>
              </Box>
            ) : dbStats.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </Box>

          <Grid container spacing={4}>
            {/* NEW: PERSONAL IDENTITY CARD */}
            <Grid item xs={12}>
              <Card sx={{
                bgcolor: 'rgba(5, 151, 137, 0.1)',
                border: `1px solid ${colors.teal}`,
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Avatar sx={{ width: 80, height: 80, bgcolor: colors.teal, fontSize: '2rem', fontFamily: 'Rajdhani', fontWeight: 700 }}>
                        {user?.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="h4" sx={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#fff' }}>
                          {user?.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Chip label={`MRN: ${patientData?.mrn || '---'}`} size="small" sx={{ bgcolor: `${colors.cyan}20`, color: colors.cyan, borderRadius: '4px', fontFamily: 'JetBrains Mono' }} />
                          <Chip label="ACTIVE CASE" size="small" sx={{ bgcolor: `${colors.green}20`, color: colors.green, borderRadius: '4px', fontWeight: 700 }} />
                        </Box>
                      </Box>
                    </Box>

                    <Grid container spacing={4} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: '400px' } }}>
                      <Grid item xs={6} md={4}>
                        <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 0.5 }}>DATE OF BIRTH</Typography>
                        <Typography sx={{ color: '#fff', fontWeight: 600 }}>{patientData?.dob ? new Date(patientData.dob).toLocaleDateString() : '---'}</Typography>
                      </Grid>
                      <Grid item xs={6} md={4}>
                        <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 0.5 }}>GENDER</Typography>
                        <Typography sx={{ color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>{patientData?.gender || '---'}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 0.5 }}>CONTACT</Typography>
                        <Typography sx={{ color: '#fff', fontWeight: 600 }}>{patientData?.phone || user?.email}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
                <Box sx={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05 }}>
                  <PersonIcon sx={{ fontSize: 150 }} />
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: colors.glass, border: `1px solid ${colors.border}`, height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <AnalyticsIcon sx={{ color: colors.amber }} />
                    <Typography variant="h5" sx={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>AI ANALYSIS</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: colors.muted, mb: 4, fontFamily: 'Space Grotesk' }}>
                    Review your latest MRI segmentations and histopathology reports generated by the AI engine.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!patientData}
                    onClick={() => navigate(`/tumor-3d?patientId=${patientData.id}`)}
                    sx={{ color: colors.amber, borderColor: colors.amber, fontFamily: 'Rajdhani', fontWeight: 700 }}
                  >
                    EXPLORE 3D MODELS
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: colors.glass, border: `1px solid ${colors.border}`, height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <DescriptionIcon sx={{ color: colors.green }} />
                    <Typography variant="h5" sx={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>TREATMENT PLAN</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: colors.muted, mb: 4, fontFamily: 'Space Grotesk' }}>
                    Your personalized treatment protocols and evidence-based clinical recommendations.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!patientData}
                    onClick={() => navigate(`/treatment-plan?patientId=${patientData.id}`)}
                    sx={{ color: colors.green, borderColor: colors.green, fontFamily: 'Rajdhani', fontWeight: 700 }}
                  >
                    VIEW PROTOCOLS
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: colors.glass, border: `1px solid ${colors.border}`, height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <MedicationIcon sx={{ color: colors.teal }} />
                    <Typography variant="h5" sx={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>OUTCOMES</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: colors.muted, mb: 4, fontFamily: 'Space Grotesk' }}>
                    Predicted survival rates, side-effect profiles, and quality-of-life projections.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!patientData}
                    onClick={() => navigate(`/outcome-prediction?patientId=${patientData.id}`)}
                    sx={{ color: colors.teal, borderColor: colors.teal, fontFamily: 'Rajdhani', fontWeight: 700 }}
                  >
                    VIEW PREDICTIONS
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  // --- RENDER CLINICIAN VIEW ---
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.bg, py: 6, px: { xs: 2, md: 6 } }}>
      <Container maxWidth="xl">

        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>
            {isAdmin ? 'SYSTEM ADMINISTRATION' : 'CLINICAL DASHBOARD'}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"', mt: 1 }}>
            {isAdmin
              ? 'Oversee system-wide clinical data and platform users.'
              : 'Manage patient cohorts and view AI-driven analysis results.'}
          </Typography>
        </Box>

        <Box sx={{
          bgcolor: 'rgba(22, 32, 50, 0.6)',
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          p: 4,
          mb: 6,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 4,
          backdropFilter: 'blur(10px)',
          minHeight: '120px'
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', px: 3, gap: 2 }}>
              <CircularProgress size={20} sx={{ color: colors.teal }} />
              <Typography variant="caption" sx={{ color: colors.muted }}>Synchronizing Clinical Metrics...</Typography>
            </Box>
          ) : dbStats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>
              PATIENT CASES
            </Typography>
            {activeFilter !== 'All' && (
              <Chip
                label={activeFilter}
                onDelete={() => setActiveFilter('All')}
                size="small"
                sx={{ bgcolor: `${colors.cyan}20`, color: colors.cyan, fontFamily: '"Rajdhani"', fontWeight: 700 }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 250, opacity: 1 }} exit={{ width: 0, opacity: 0 }}>
                  <TextField
                    size="small"
                    placeholder="Search Name, MRN..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    autoFocus
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.muted, fontSize: 20 }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => { setSearchTerm(''); setShowSearch(false); }}>
                            <CloseIcon sx={{ fontSize: 16, color: colors.muted }} />
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        borderRadius: '4px',
                        fontFamily: '"Space Grotesk"',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {!showSearch && (
              <IconButton onClick={() => setShowSearch(true)} sx={{ color: colors.muted, border: '1px solid rgba(255,255,255,0.1)' }}>
                <SearchIcon />
              </IconButton>
            )}

            <IconButton onClick={handleFilterClick} sx={{ color: activeFilter !== 'All' ? colors.cyan : colors.muted, border: `1px solid ${activeFilter !== 'All' ? colors.cyan : 'rgba(255,255,255,0.1)'}` }}>
              <FilterListIcon />
            </IconButton>

            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => handleFilterClose()} PaperProps={{ sx: { bgcolor: colors.bg, border: `1px solid ${colors.border}`, color: '#fff' } }}>
              <MenuItem onClick={() => handleFilterClose('All')} sx={{ fontFamily: '"Rajdhani"', fontWeight: 600 }}>ALL TYPES</MenuItem>
              {['Brain', 'Breast', 'Lung', 'Liver', 'Pancreas'].map(type => (
                <MenuItem key={type} onClick={() => handleFilterClose(type)} sx={{ fontFamily: '"Rajdhani"', fontWeight: 600 }}>{type.toUpperCase()}</MenuItem>
              ))}
            </Menu>

            {isDoctor && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/patients')}
                sx={{
                  bgcolor: colors.teal,
                  color: '#fff',
                  fontFamily: '"Space Grotesk"',
                  fontWeight: 700,
                  '&:hover': { bgcolor: colors.cyan, color: '#000' }
                }}
              >
                ADD NEW PATIENT
              </Button>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', px: 3, mb: 1 }}>
          <Typography variant="caption" sx={{ width: '25%', color: colors.muted }}>PATIENT IDENTITY</Typography>
          <Typography variant="caption" sx={{ width: '30%', color: colors.muted }}>PRIMARY DIAGNOSIS</Typography>
          <Typography variant="caption" sx={{ width: '20%', color: colors.muted }}>DATE ADDED</Typography>
          <Typography variant="caption" sx={{ width: '15%', color: colors.muted }}>STATUS</Typography>
          <Typography variant="caption" sx={{ width: '10%', textAlign: 'right', color: colors.muted }}>ACTION</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minHeight: '200px' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: colors.teal }} />
            </Box>
          ) : displayedPatients.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <Typography sx={{ color: colors.muted }}>No clinical records match your search criteria.</Typography>
            </Box>
          ) : (
            displayedPatients.map((p, index) => (
              <PatientRow
                key={p.id}
                p={p}
                index={index}
                onClick={() => navigate(`/patient-profile?patientId=${p.id}`)}
              />
            ))
          )}
        </Box>

        <TablePagination
          component="div"
          count={filteredPatients.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{
            color: colors.muted,
            borderTop: `1px solid ${colors.border}`,
            '.MuiTablePagination-select': { color: colors.text, fontFamily: '"Space Grotesk"' },
            '.MuiTablePagination-selectIcon': { color: colors.teal },
            '.MuiTablePagination-displayedRows': { fontFamily: '"Space Grotesk"' },
            '.MuiTablePagination-actions': { color: colors.teal },
            '.MuiIconButton-root': { color: colors.teal, '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' } }
          }}
        />
      </Container>
    </Box>
  );
};

export default Dashboard;