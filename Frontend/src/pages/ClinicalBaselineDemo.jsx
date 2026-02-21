import React from 'react';
import { Box, Container, Typography, Grid, Paper } from '@mui/material';
import PatientClinicalBanner from '../components/PatientClinicalBanner';
import { motion } from 'framer-motion';

const ClinicalBaselineDemo = () => {
  const patientData = {
    fullName: "hogit gkiridv",
    dob: "6/9/1967",
    gender: "FEMALE",
    contact: "9786054123",
    diagnosis: "Brain",
    cancerType: "Brain",
    kps: "70%",
    ecog: "3"
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0B1221', pb: 10 }}>
      {/* Full Width Banner */}
      <PatientClinicalBanner patientData={patientData} />

      <Container maxWidth="xl">
        <Grid container spacing={4}>
          <Grid xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Paper sx={{ 
                p: 4, 
                bgcolor: 'rgba(22, 32, 50, 0.7)', 
                border: '1px solid rgba(5, 151, 137, 0.3)',
                borderRadius: '16px',
                backdropFilter: 'blur(12px)'
              }}>
                <Typography variant="h4" sx={{ color: '#00F0FF', mb: 3, fontFamily: '"Rajdhani"' }}>
                  Clinical Baseline Overview
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4, maxWidth: '800px' }}>
                  The patient presents with a primary diagnosis of Brain Cancer. 
                  Performance status indicates moderate impairment (KPS 70%, ECOG 3), 
                  requiring specialized care coordination and intensive monitoring.
                </Typography>

                <Grid container spacing={3}>
                  <Grid xs={12} md={6}>
                    <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Typography variant="overline" sx={{ color: '#059789', fontWeight: 700 }}>Vital Signs & Status</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                          Status: Stable but symptomatic
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                          Neurological status: Assessed
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid xs={12} md={6}>
                    <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Typography variant="overline" sx={{ color: '#F59E0B', fontWeight: 700 }}>Next Clinical Steps</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                          1. Multi-disciplinary tumor board review
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                          2. Baseline MRI and Genomic Profiling
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ClinicalBaselineDemo;
