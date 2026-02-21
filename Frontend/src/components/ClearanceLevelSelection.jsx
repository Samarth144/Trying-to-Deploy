import React from 'react';
import { Box, Container, Grid, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import MedicationIcon from '@mui/icons-material/Medication'; // Oncologist
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew'; // Patient
import ScienceIcon from '@mui/icons-material/Science'; // Researcher
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // Admin
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// --- THEME CONSTANTS ---
const colors = {
  bg: '#0B1221',
  glass: 'rgba(22, 32, 50, 0.6)',
  cyan: '#00F0FF',   // Oncologist
  purple: '#8B5CF6', // Researcher
  emerald: '#10B981', // Patient
  amber: '#F59E0B',  // Admin
  text: '#F8FAFC',
  muted: '#64748B',
  border: 'rgba(255, 255, 255, 0.1)'
};

const roles = [
  { 
    id: 'oncologist', 
    label: 'ONCOLOGIST', 
    desc: 'Access full clinical decision support tools and patient management.',
    icon: <MedicationIcon sx={{ fontSize: 40 }} />,
    color: colors.cyan,
    delay: 0.1
  },
  { 
    id: 'patient', 
    label: 'PATIENT', 
    desc: 'View personalized treatment pathways and educational resources.',
    icon: <AccessibilityNewIcon sx={{ fontSize: 40 }} />,
    color: colors.emerald,
    delay: 0.2
  },
  { 
    id: 'researcher', 
    label: 'RESEARCHER', 
    desc: 'Explore AI models, datasets, and immutable audit trails.',
    icon: <ScienceIcon sx={{ fontSize: 40 }} />,
    color: colors.purple,
    delay: 0.3
  },
  { 
    id: 'admin', 
    label: 'SYS ADMIN', 
    desc: 'Manage users, system logs, and security protocols.',
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 40 }} />,
    color: colors.amber,
    delay: 0.4
  }
];

// --- ROLE CARD COMPONENT ---
const RoleCard = ({ label, desc, icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: delay, duration: 0.5 }}
    whileHover={{ y: -10, scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
  >
    <Link to="/login" style={{ textDecoration: 'none', display: 'block' }}>
      <Box sx={{ 
        position: 'relative',
        width: { xs: '90vw', md: '40vw' },
        height: '280px',
        p: 4, 
        bgcolor: colors.glass, 
        borderRadius: '16px', 
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.4s ease',
        '&:hover': { 
          bgcolor: `${color}10`, // Very subtle tint
          borderColor: color,
          boxShadow: `0 20px 40px -10px ${color}30`
        }
      }}>
        
        {/* Top Accent Line */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', bgcolor: color, opacity: 0.7 }} />

        {/* Icon Circle */}
        <Box sx={{ 
          mb: 3, p: 2, borderRadius: '50%', 
          bgcolor: 'rgba(255,255,255,0.03)', 
          border: `1px solid rgba(255,255,255,0.05)`,
          color: color,
          display: 'flex',
          transition: 'all 0.3s',
          '.MuiBox-root:hover &': { bgcolor: color, color: '#000', boxShadow: `0 0 20px ${color}` }
        }}>
          {icon}
        </Box>

        {/* Text */}
        <Typography variant="h5" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff', letterSpacing: '2px', mb: 1.5, textTransform: 'uppercase' }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontFamily: '"Space Grotesk"', color: colors.muted, lineHeight: 1.6, px: 4, maxWidth: '400px' }}>
          {desc}
        </Typography>

        {/* Hover Arrow */}
        <Box sx={{ mt: 3, opacity: 0, transform: 'translateY(10px)', transition: 'all 0.3s', '.MuiBox-root:hover &': { opacity: 1, transform: 'translateY(0)' } }}>
          <ArrowForwardIcon sx={{ color: color }} />
        </Box>

      </Box>
    </Link>
  </motion.div>
);

const ClearanceLevelSelection = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: colors.bg, 
      display: 'flex', alignItems: 'center',
      backgroundImage: `radial-gradient(circle at 50% 0%, rgba(5,151,137,0.1) 0%, ${colors.bg} 70%)`, // Top spotlight
      py: 12, px: 2
    }}>
      <Container maxWidth="xl">
        
        {/* HEADER */}
        <Box sx={{ mb: 8, borderLeft: '4px solid #059789', pl: 3, maxWidth: '800px', textAlign: 'left' }}>
          <Typography variant="h3" sx={{ fontFamily: '"Space Grotesk"', fontWeight: 700, color: '#fff', fontSize: { xs: '2rem', md: '2.5rem' } }}>
            INITIATE SESSION
          </Typography>
          <Typography variant="h6" sx={{ color: '#64748B', fontFamily: '"Space Grotesk"', mt: 1, fontWeight: 400, fontSize: '1.1rem' }}>
            Select your role to access the secure clinical workspace and personalized tools
          </Typography>
        </Box>

        {/* ROLE GRID */}
        <Grid container spacing={4} justifyContent="center">
          {roles.map((role) => (
            <Grid key={role.id}>
              <RoleCard {...role} />
            </Grid>
          ))}
        </Grid>

      </Container>
    </Box>
  );
};

export default ClearanceLevelSelection;
