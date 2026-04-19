import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import Navbar from './components/Navbar';
import GlobalFooter from './components/GlobalFooter';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tumor3DPage from './pages/Tumor3DPage';
import PatientIntake from './pages/PatientIntake';
import GenomicAnalysis from './pages/GenomicAnalysis';
import MRIAnalysis from './pages/MRIAnalysis';
import Histopathology from './pages/Histopathology';
import TreatmentPlan from './pages/TreatmentPlan';
import OutcomePrediction from './pages/OutcomePrediction';
import PathwaySimulator from './pages/PathwaySimulator';
import PatientProfile from './pages/PatientProfile';
import KnowledgeKernel from './pages/KnowledgeKernel';
import ClinicalBaselineDemo from './pages/ClinicalBaselineDemo';
import AdminDashboard from './pages/AdminDashboard';
import AwarenessTab from './pages/AwarenessTab';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';

// Create a global theme instance
// ... (theme definition remains same)
const theme = createTheme({
  typography: {
    fontFamily: '"Space Grotesk", sans-serif', // Default for body/human text
    h1: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
    h4: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
    h5: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
    h6: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
    subtitle1: { fontFamily: '"Space Grotesk", sans-serif' },
    subtitle2: { fontFamily: '"Space Grotesk", sans-serif' },
    body1: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.02em' },
    body2: { fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.02em' },
    button: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }, // Primary Button -> Space Grotesk
    overline: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 600, letterSpacing: '0.1em' }, // Small labels
    caption: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 500 }, // Small tech text
  },
  palette: {
    mode: 'dark',
    background: {
      default: '#0B1221', // Void Navy from your palette
      paper: 'rgba(22, 32, 50, 0.7)',
    },
    primary: {
      main: '#059789', // Clinical Teal
    },
    secondary: {
      main: '#00F0FF', // Cyber Cyan
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <Box sx={{ pt: { xs: 8, md: 10 }, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes (All Roles) */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              
              {/* Clinical Overview (Restricted) */}
              <Route path="/patient-profile" element={
                <RoleBasedRoute allowedRoles={['oncologist', 'admin', 'researcher']}>
                  <PatientProfile />
                </RoleBasedRoute>
              } />
              
              {/* Admin Only */}
              <Route path="/admin" element={
                <RoleBasedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleBasedRoute>
              } />

              {/* Clinical/Research Routes (Oncologist, Admin, Researcher) */}
              <Route path="/tumor-3d" element={<ProtectedRoute><Tumor3DPage /></ProtectedRoute>} />
              <Route path="/genomic-analysis" element={<ProtectedRoute><GenomicAnalysis /></ProtectedRoute>} />
              <Route path="/mri-analysis" element={<ProtectedRoute><MRIAnalysis /></ProtectedRoute>} />
              <Route path="/histopathology" element={<ProtectedRoute><Histopathology /></ProtectedRoute>} />
              <Route path="/treatment-plan" element={<ProtectedRoute><TreatmentPlan /></ProtectedRoute>} />
              <Route path="/outcome-prediction" element={<ProtectedRoute><OutcomePrediction /></ProtectedRoute>} />
              <Route path="/awareness" element={<ProtectedRoute><AwarenessTab /></ProtectedRoute>} />
              
              {/* Restricted Write Routes (Oncologist, Admin) */}
              <Route path="/patients" element={
                <RoleBasedRoute allowedRoles={['oncologist', 'admin']}>
                  <PatientIntake />
                </RoleBasedRoute>
              } />
              
              <Route path="/pathway-simulator" element={<ProtectedRoute><PathwaySimulator /></ProtectedRoute>} />
              <Route path="/knowledge-kernel" element={<ProtectedRoute><KnowledgeKernel /></ProtectedRoute>} />
              <Route path="/baseline-demo" element={<ProtectedRoute><ClinicalBaselineDemo /></ProtectedRoute>} />
            </Routes>
          </Box>
        </Box>
        <GlobalFooter />
      </Router>
    </ThemeProvider>
  );
}

export default App;
