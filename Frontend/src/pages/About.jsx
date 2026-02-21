import React from 'react';
import { Container, Typography, Grid, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import './About.css';

// --- DATA: The "Living" Metrics ---
const stats = [
  { 
    label: "Cancers Supported", 
    value: "5+", 
    sub: "Brain · Lung · Breast · Liver · Pancreas",
    color: "blue",
    icon: <BiotechOutlinedIcon />
  },
  { 
    label: "Data Modalities", 
    value: "3", 
    sub: "MRI/CT · Genomics · Pathology",
    color: "teal",
    icon: <AutoGraphOutlinedIcon />
  },
  { 
    label: "Data Integrity", 
    value: "100%", 
    sub: "Validated Clinical Evidence",
    color: "amber",
    icon: <VerifiedUserOutlinedIcon />
  },
];

function About() {
  return (
    <div className="about-page-root">
      {/* Background Tech Mesh */}
      <div className="about-mesh-bg"></div>

      <Container maxWidth="xl" style={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={8} alignItems="center">
          
          {/* LEFT: The Narrative (Animated Text) */}
          <Grid xs={12} md={8}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Typography variant="h2" className="manifesto-headline">
                <span className="dimmed">Bridging the Gap Between</span> <br />
                Data & Survival.
              </Typography>

              <div className="manifesto-body">
                <p>
                  RESONANCE is not just a tool; it is a <strong>Multi-Cancer Clinical Decision Support System (CDSS)</strong> that transcends human cognitive limits.
                </p>
                <p>
                  By fusing <strong>Radiomics</strong> (MRI/CT), <strong>Genomics</strong> (NGS markers like BRCA/IDH1), and <strong>Pathology</strong> into a unified patient profile, we empower Tumor Boards to generate evidence-based protocols with unprecedented accuracy.
                </p>
                <p>
                  From <strong>Glioma</strong> to <strong>Pancreatic Carcinoma</strong>, our engine delivers explainable insights backed by clinical evidence—ensuring that every decision is transparent, validated, and precise.
                </p>
              </div>

              {/* Trust Badges */}
              <div className="trust-badges">
                {['NCCN Guideline Compliant', 'HIPAA Ready Architecture', 'Explainable AI (XAI)'].map((text) => (
                  <Chip 
                    key={text} 
                    icon={<VerifiedUserOutlinedIcon style={{ color: '#059789' }} />} 
                    label={text} 
                    className="trust-chip"
                  />
                ))}
              </div>
            </motion.div>
          </Grid>

          {/* RIGHT: The "Live" Stats Grid */}
          <Grid xs={12} md={4}>
            <div className="stats-column">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="stat-card-wrapper"
                >
                  <div className={`stat-card-manifesto ${stat.color}`}>
                    {/* Background Icon Watermark */}
                    <div className="stat-watermark">
                      {stat.icon}
                    </div>

                    <Typography variant="h3" className="stat-value-text">
                      {stat.value}
                    </Typography>
                    <Typography variant="h6" className="stat-label-text">
                      {stat.label}
                    </Typography>
                    <Typography variant="caption" className="stat-sub-text">
                      {stat.sub}
                    </Typography>
                  </div>
                </motion.div>
              ))}
            </div>
          </Grid>

        </Grid>
      </Container>
    </div>
  );
}

export default About;
