import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Logo from './Logo';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-root">
      {/* 1. THE LASER DIVIDER */}
      <div className="laser-divider"></div>

      <Container maxWidth="xl">
        <div className="footer-stack">
          
          {/* LEFT: Branding & Copyright */}
          <div className="footer-branding">
            <Logo size={50} showText={true} />
            <Typography variant="caption" className="branding-copyright">
              © 2026 Advanced Treatment Planning System
            </Typography>
          </div>

          {/* CENTER: The Disclaimer */}
          <div className="disclaimer-box">
            <WarningAmberRoundedIcon sx={{ color: '#F59E0B', fontSize: 20, mt: 0.3 }} />
            <Box>
              <Typography variant="body2" className="disclaimer-text">
                <strong>Research Prototype:</strong> For demonstration purposes only. 
                Not for clinical use without proper validation and regulatory approval (FDA/CE). 
                Always consult a qualified oncologist.
              </Typography>
            </Box>
          </div>

          {/* RIGHT: Live System Status */}
          <div className="system-status">
            <div style={{ textAlign: 'right' }}>
              <Typography variant="caption" className="status-label">
                SYSTEM STATUS
              </Typography>
              <Typography variant="caption" className="status-value">
                ONLINE v1.0
              </Typography>
            </div>
          </div>

        </div>

        {/* Bottom Metadata Line */}
        <div className="metadata-line">
          {['Privacy Policy', 'Terms of Service', 'GitHub'].map((text) => (
            <a key={text} href="#" className="metadata-link">
              {text}
            </a>
          ))}
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
