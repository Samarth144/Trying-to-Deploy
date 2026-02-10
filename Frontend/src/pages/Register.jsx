import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import './Register.css';

// --- CUSTOM INPUT COMPONENT ---
// ... (rest of TechInput component remains same)
const TechInput = ({ label, type = "text", icon, endAdornment, placeholder, autoComplete, value, onChange }) => {
  const [focused, setFocused] = useState(false);

  return (
    <Box className="tech-input-group">
      <Box className="tech-label-row">
        <Typography variant="caption" className="tech-label" sx={{ color: '#64748B', fontFamily: '"Space Grotesk"', fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          type={type}
          variant="standard"
          placeholder={focused ? '' : placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputProps={{
            autoComplete: autoComplete
          }}
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                {React.cloneElement(icon, { sx: { color: focused ? '#00F0FF' : '#64748B', transition: 'color 0.3s' } })}
              </InputAdornment>
            ),
            endAdornment: endAdornment,
            style: { 
              color: '#fff', 
              fontFamily: '"Space Grotesk"',
              fontSize: '1rem',
              padding: '12px 16px',
              backgroundColor: '#0B1221',
              borderRadius: '4px',
              border: `1px solid ${focused ? '#00F0FF' : 'rgba(255,255,255,0.1)'}`,
              transition: 'all 0.3s ease'
            }
          }}
          sx={{
            "& .MuiInputBase-input": {
              color: "#fff !important",
              backgroundColor: "transparent !important",
              WebkitTextFillColor: "#fff !important",
            },
            "& input:-webkit-autofill": {
              WebkitBoxShadow: "0 0 0 100px #0B1221 inset !important",
              WebkitTextFillColor: "#fff !important",
            }
          }}
        />
        {/* Animated Scan Line */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', bgcolor: 'transparent', overflow: 'hidden', pointerEvents: 'none', borderRadius: '0 0 4px 4px' }}>
           <motion.div 
             initial={{ x: '-100%' }} animate={focused ? { x: '100%' } : { x: '-100%' }}
             transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
             style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, #00F0FF, transparent)' }}
           />
        </Box>
      </Box>
    </Box>
  );
};

// --- ROLE CARD COMPONENT ---
// ... (rest of RoleCard component remains same)
const RoleCard = ({ label, icon, selected, onSelect, color, roleKey }) => (
  <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }}>
    <Box
      onClick={onSelect}
      className={`role-card-item ${selected ? `selected-${roleKey}` : ''}`}
    >
      <Box className="role-icon" sx={{ color: selected ? color : '#64748B' }}>
        {icon}
      </Box>
      <Typography variant="caption" className="role-card-text" sx={{ color: selected ? '#fff' : '#64748B' }}>
        {label}
      </Typography>
    </Box>
  </motion.div>
);

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, error, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('oncologist');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!name || !email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    const result = await register({ name, email, password, role });
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <Box className="reg-root">
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <Box className="reg-card">

          {/* --- TECH CORNERS --- */}
          <div className="corner-bracket corner-tl" />
          <div className="corner-bracket corner-br" />

          {/* --- HEADER --- */}
          <Box className="reg-header">
            <Typography variant="h4" className="reg-title" sx={{ fontWeight: 700, mb: 1 }}>
              Create Account
            </Typography>
            <Typography variant="body2" className="reg-subtitle" sx={{ color: '#94A3B8' }}>
              Register to access the medical portal.
            </Typography>
          </Box>

          {(error || localError) && (
            <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {localError || error}
            </Alert>
          )}

          {/* --- FORM --- */}
          <Box component="form" onSubmit={handleRegister}>
            
            <TechInput 
              label="FULL NAME" 
              icon={<PersonOutlineIcon />} 
              placeholder="Enter your full name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TechInput 
              label="EMAIL ADDRESS" 
              icon={<EmailOutlinedIcon />} 
              placeholder="Enter your email address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TechInput 
              label="PASSWORD" 
              type={showPassword ? "text" : "password"} 
              icon={<LockOutlinedIcon />}
              placeholder="Enter your password"
              autoComplete="new-password"
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
            
            {/* ROLE SELECTOR */}
            <Box className="role-grid-container">
              <Typography variant="caption" className="role-label">
                SELECT ROLE
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <RoleCard 
                    label="PATIENT" icon={<AssignmentIndIcon />} 
                    selected={role === 'patient'} onSelect={() => setRole('patient')} 
                    color="#10B981" roleKey="patient"
                  />
                </Grid>
                <Grid item xs={3}>
                  <RoleCard 
                    label="ONCOLOGIST" icon={<BadgeIcon />} 
                    selected={role === 'oncologist'} onSelect={() => setRole('oncologist')} 
                    color="#00F0FF" roleKey="oncologist"
                  />
                </Grid>
                <Grid item xs={3}>
                  <RoleCard 
                    label="RESEARCHER" icon={<ScienceIcon />} 
                    selected={role === 'researcher'} onSelect={() => setRole('researcher')} 
                    color="#8B5CF6" roleKey="researcher"
                  />
                </Grid>
                <Grid item xs={3}>
                  <RoleCard 
                    label="SYS ADMIN" icon={<SecurityIcon />} 
                    selected={role === 'admin'} onSelect={() => setRole('admin')} 
                    color="#F59E0B" roleKey="admin"
                  />
                </Grid>
              </Grid>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              className="btn-initialize"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, zIndex: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'CREATE ACCOUNT'}
              </Box>
            </Button>
            
          </Box>


          {/* --- FOOTER --- */}
          <Box className="reg-footer">
            <Link onClick={() => navigate('/login')} className="login-link" sx={{ cursor: 'pointer' }}>
              Existing operative detected? <span className="highlight-cyan">Log In</span>
            </Link>
          </Box>

        </Box>
      </motion.div>
    </Box>
  );
};

export default RegisterPage;