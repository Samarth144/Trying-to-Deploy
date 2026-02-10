import React, { useState } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, IconButton, Link, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import BoltIcon from '@mui/icons-material/Bolt';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// --- CUSTOM INPUT COMPONENT ---
// ... (rest of TechInput component remains same)
const TechInput = ({ label, type = "text", icon, endAdornment, placeholder, autoComplete, value, onChange }) => {
  const [focused, setFocused] = useState(false);

  return (
    <Box className="tech-input-group">
      <Box className="tech-label-row">
        <Typography variant="caption" className="tech-label">
          {label}
        </Typography>
        <Typography variant="caption" className={`tech-status ${focused ? 'active' : ''}`}>
          {focused ? 'INPUT_ACTIVE' : 'READY'}
        </Typography>
      </Box>

      <Box className="input-wrapper">
        <TextField
          fullWidth
          type={type}
          variant="standard"
          placeholder={focused ? '' : placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`tech-field ${focused ? 'tech-field-active' : ''}`}
          inputProps={{
            autoComplete: autoComplete
          }}
          InputProps={{
            disableUnderline: true,
            className: "tech-field-base",
            startAdornment: (
              <InputAdornment position="start">
                {React.cloneElement(icon, { sx: { color: focused ? '#00F0FF' : '#64748B', transition: 'color 0.3s' } })}
              </InputAdornment>
            ),
            endAdornment: endAdornment,
            style: { 
                border: `1px solid ${focused ? '#00F0FF' : 'rgba(255,255,255,0.1)'}`,
                padding: '12px 16px',
                borderRadius: '4px',
                backgroundColor: '#0B1221',
                color: '#fff'
            }
          }}
          sx={{
            "& .MuiInputBase-input::placeholder": {
              color: "rgba(255, 255, 255, 0.2)",
              opacity: 1,
              fontFamily: '"Space Grotesk"',
              fontSize: '0.9rem'
            },
            "& .MuiInputBase-input": {
              color: "#fff !important",
              backgroundColor: "transparent !important",
              WebkitTextFillColor: "#fff !important",
            },
            // Fix for Autocomplete background
            "& input:-webkit-autofill": {
              WebkitBoxShadow: "0 0 0 100px #0B1221 inset !important",
              WebkitTextFillColor: "#fff !important",
            }
          }}
        />
        
        {/* Animated Scan Line at Bottom */}
        <Box className="scan-line-container">
           <motion.div 
             className="scan-line"
             initial={{ x: '-100%' }}
             animate={focused ? { x: '100%' } : { x: '-100%' }}
             transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
           />
        </Box>
      </Box>
    </Box>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <Box className="login-root">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <Box className="login-card">

          {/* --- DECORATIVE CORNER BRACKETS --- */}
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-tr" />
          <div className="corner-bracket corner-bl" />
          <div className="corner-bracket corner-br" />

          {/* --- HEADER --- */}
          <Box className="login-header">
            <div className="security-badge">
               <FingerprintIcon sx={{ fontSize: 16, color: '#00F0FF' }} />
               <span className="security-text">
                 SECURE CLINICAL PORTAL
               </span>
            </div>
            
            <Typography variant="h4" className="system-title">
              RESONANCE
            </Typography>
            <Typography variant="body2" className="system-subtitle">
              Sign in to your account
            </Typography>
          </Box>

          {(error || localError) && (
            <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {localError || error}
            </Alert>
          )}

          {/* --- FORM --- */}
          <Box component="form" onSubmit={handleLogin}>
            <TechInput 
              label="Email Address" 
              icon={<EmailOutlinedIcon />} 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            <TechInput 
              label="Password" 
              type={showPassword ? "text" : "password"} 
              icon={<LockOutlinedIcon />}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: '#64748B' }}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />

            {/* --- ACTION BUTTON --- */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              className="btn-connect"
            >
              <div className="btn-connect-content">
                {loading ? <CircularProgress size={24} color="inherit" /> : <><BoltIcon /> Sign In</>}
              </div>
            </Button>
            
          </Box>


          {/* --- FOOTER --- */}
          <Box className="login-footer">
            <Link onClick={() => navigate('/register')} className="access-link" sx={{ cursor: 'pointer' }}>
              New user? <span className="link-highlight">Create an account</span>
            </Link>
          </Box>

        </Box>
      </motion.div>
    </Box>
  );
};

export default LoginPage;