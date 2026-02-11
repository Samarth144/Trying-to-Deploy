import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, IconButton, Link, Grid, Alert, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BadgeIcon from '@mui/icons-material/Badge'; 
import ScienceIcon from '@mui/icons-material/Science'; 
import SecurityIcon from '@mui/icons-material/Security'; 
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Register.css';

// --- Re-usable components from the original file ---
const TechInput = ({ label, type = "text", icon, endAdornment, placeholder, autoComplete, value, onChange, disabled }) => {
  const [focused, setFocused] = useState(false);
  return (
    <Box className="tech-input-group">
      <Box className="tech-label-row"><Typography variant="caption" className="tech-label">{label}</Typography></Box>
      <Box sx={{ position: 'relative' }}>
        <TextField fullWidth type={type} variant="standard" placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} disabled={disabled}
          InputProps={{
            disableUnderline: true, startAdornment: (<InputAdornment position="start">{React.cloneElement(icon, { sx: { color: focused ? '#00F0FF' : '#64748B' } })}</InputAdornment>), endAdornment: endAdornment,
            style: { padding: '12px 16px', backgroundColor: '#0B1221', borderRadius: '4px', border: `1px solid ${focused ? '#00F0FF' : 'rgba(255,255,255,0.1)'}` }
          }}
        />
      </Box>
    </Box>
  );
};

const RoleCard = ({ label, icon, selected, onSelect, color, roleKey }) => (
  <motion.div whileHover={{ y: -5 }}><Box onClick={onSelect} className={`role-card-item ${selected ? `selected-${roleKey}` : ''}`}>
    <Box className="role-icon" sx={{ color: selected ? color : '#64748B' }}>{icon}</Box>
    <Typography variant="caption" className="role-card-text">{label}</Typography>
  </Box></motion.div>
);


  const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient'); // Default role
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('details'); // 'details' or 'face'
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const { register, setAuthData } = useAuth(); // Assuming useAuth provides setAuthData

  const [faceMessage, setFaceMessage] = useState('Please wait, loading models...');

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
      console.log('Loading models from:', MODEL_URL);
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        setFaceMessage('Position your face in the frame.');
        console.log('Models loaded successfully.');
      } catch (e) {
        setError('Could not load face recognition models. Please refresh the page.');
        console.error('Model loading error:', e);
      }
    };
    loadModels();
  }, []);

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    // If not a doctor, use the normal registration flow
    if (role !== 'oncologist') {
      setLoading(true);
      const result = await register({ name, email, password, role });
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Registration failed');
      }
      setLoading(false);
    } else {
      // If doctor, proceed to face registration step
      setStep('face');
    }
  };

  const handleFaceCaptureAndRegister = async () => {
    if (!webcamRef.current || !modelsLoaded) {
      setError('Webcam not ready or models are still loading.');
      return;
    }
    setLoading(true);
    setError('');
    setFaceMessage('Detecting face...');

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError('Could not capture image.');
      setLoading(false);
      return;
    }

    const img = await faceapi.fetchImage(imageSrc);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      setError('No face detected. Please try again.');
      setLoading(false);
      return;
    }

    setFaceMessage('Face detected. Registering account...');
    const capturedDescriptor = detection.descriptor;

    try {
      const { data } = await axios.post('/face-auth/register-doctor', {
        name, email, password, descriptor: capturedDescriptor
      });
      
      // Manually log the user in
      setAuthData(data.data);
      navigate('/dashboard');

    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="reg-root">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box className="reg-card">
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-br" />

          {step === 'details' && (
            <>
              <Box className="reg-header">
                <Typography variant="h4" className="reg-title">Create Account</Typography>
                <Typography variant="body2" className="reg-subtitle">Register to access the medical portal.</Typography>
              </Box>

              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleDetailsSubmit}>
                <TechInput label="FULL NAME" icon={<PersonOutlineIcon />} value={name} onChange={(e) => setName(e.target.value)} />
                <TechInput label="EMAIL ADDRESS" icon={<EmailOutlinedIcon />} value={email} onChange={(e) => setEmail(e.target.value)} />
                <TechInput label="PASSWORD" type={showPassword ? "text" : "password"} icon={<LockOutlinedIcon />} value={password} onChange={(e) => setPassword(e.target.value)} endAdornment={<IconButton onClick={() => setShowPassword(!showPassword)}><VisibilityOff /></IconButton>} />
                
                <Box className="role-grid-container">
                  <Typography variant="caption" className="role-label">SELECT ROLE</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={3}><RoleCard label="PATIENT" icon={<AssignmentIndIcon />} selected={role === 'patient'} onSelect={() => setRole('patient')} color="#10B981" roleKey="patient" /></Grid>
                    <Grid item xs={3}><RoleCard label="ONCOLOGIST" icon={<BadgeIcon />} selected={role === 'oncologist'} onSelect={() => setRole('oncologist')} color="#00F0FF" roleKey="oncologist" /></Grid>
                    <Grid item xs={3}><RoleCard label="RESEARCHER" icon={<ScienceIcon />} selected={role === 'researcher'} onSelect={() => setRole('researcher')} color="#8B5CF6" roleKey="researcher" /></Grid>
                    <Grid item xs={3}><RoleCard label="SYS ADMIN" icon={<SecurityIcon />} selected={role === 'admin'} onSelect={() => setRole('admin')} color="#F59E0B" roleKey="admin" /></Grid>
                  </Grid>
                </Box>

                <Button fullWidth variant="contained" size="large" type="submit" disabled={loading} className="btn-initialize">
                  {loading ? <CircularProgress size={24} /> : (role === 'oncologist' ? 'Proceed to Face Scan' : 'Create Account')}
                </Button>
              </Box>

              <Box className="reg-footer">
                <Link onClick={() => navigate('/login')} sx={{ cursor: 'pointer' }}>Existing operative detected? <span className="highlight-cyan">Log In</span></Link>
              </Box>
            </>
          )}

          {step === 'face' && (
            <>
              <Box className="reg-header">
                <Typography variant="h4" className="reg-title">Doctor Face Scan</Typography>
                <Typography variant="body2" className="reg-subtitle">A face scan is required for enhanced security.</Typography>
              </Box>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width={400} height={400} videoConstraints={{ facingMode: 'user' }} style={{ borderRadius: '8px', border: '2px solid #00F0FF' }} />
                  <Typography variant="body2" sx={{ mt: 2, color: '#94A3B8' }}>{faceMessage}</Typography>
                  <Button fullWidth variant="contained" size="large" onClick={handleFaceCaptureAndRegister} disabled={loading || !modelsLoaded} className="btn-initialize" sx={{ mt: 2 }}>
                      {loading ? <CircularProgress size={24} /> : 'Scan Face & Complete Registration'}
                  </Button>
                  <Button fullWidth variant="text" onClick={() => setStep('details')} disabled={loading} sx={{ mt: 1 }}>Back to Details</Button>
              </Box>
            </>
          )}
        </Box>
      </motion.div>
    </Box>
  );
};

export default RegisterPage;
