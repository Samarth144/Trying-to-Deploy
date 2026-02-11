import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, IconButton, Link, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import BoltIcon from '@mui/icons-material/Bolt';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  // State variables for login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, setAuthData } = useAuth(); // Assuming useAuth provides login and setAuthData functions

  // Face authentication states
  const [step, setStep] = useState('details'); // 'details' or 'face'
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const webcamRef = useRef(null);
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
    setLoading(true);
    setError('');
    try {
      // First, authenticate with email and password
      const result = await login(email, password);
      if (result.success) {
        // If email/password is correct, proceed to face authentication step
        setStep('face');
        setLoading(false); // Reset loading for face scan step
      } else {
        setError(result.message || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred during initial login.');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  const handleFaceCaptureAndLogin = async () => {
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

    setFaceMessage('Face detected. Verifying...');
    const capturedDescriptor = detection.descriptor;

    try {
      // Send email and face descriptor to backend for verification
      const { data } = await axios.post('/face-auth/login', {
        email,
        descriptor: Array.from(capturedDescriptor) // Convert Float32Array to regular array for JSON
      });
      
      // Assuming the backend returns auth data on success
      setAuthData(data.data);
      navigate('/dashboard');

    } catch (err) {
      setError(err.response?.data?.message || 'Face verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-root">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Box className="login-card">
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-br" />

          {step === 'details' && (
            <>
              <Box className="login-header">
                <Typography variant="h4" className="login-title">Login</Typography>
                <Typography variant="body2" className="login-subtitle">Access your personalized treatment plan.</Typography>
              </Box>

              {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleDetailsSubmit}>
                <TextField
                  fullWidth
                  label="Email Address"
                  variant="outlined"
                  margin="normal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
              </Box>

              <Box className="login-footer">
                <Link onClick={() => navigate('/register')} sx={{ cursor: 'pointer'}}>
                  New operative detected? Register
                </Link>
              </Box>
            </>
          )}

          {step === 'face' && (
            <>
              <Box className="login-header">
                <Typography variant="h4" className="login-title">Face Verification</Typography>
                <Typography variant="body2" className="login-subtitle">Please scan your face to complete login.</Typography>
              </Box>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width={400} height={400} videoConstraints={{ facingMode: 'user' }} style={{ borderRadius: '8px', border: '2px solid #00F0FF' }} />
                  <Typography variant="body2" sx={{ mt: 2, color: '#94A3B8' }}>{faceMessage}</Typography>
                  <Button fullWidth variant="contained" size="large" onClick={handleFaceCaptureAndLogin} disabled={loading || !modelsLoaded} className="btn-initialize" sx={{ mt: 2 }}>
                      {loading ? <CircularProgress size={24} /> : 'Scan Face & Login'}
                  </Button>
                  <Button fullWidth variant="text" onClick={() => setStep('details')} disabled={loading} sx={{ mt: 1 }}>Back to Email/Password</Button>
              </Box>
            </>
          )}
        </Box>
      </motion.div>
    </Box>
  );
};

export default Login;
