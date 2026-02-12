import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScienceIcon from '@mui/icons-material/Science';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useAuth } from '../context/AuthContext';
import PrecisionCarousel from '../components/PrecisionSlide';
import ClearanceLevelSelection from '../components/ClearanceLevelSelection';
import Footer from '../components/Footer';
import './Home.css';

// --- DATA: Block 1 (Intelligence Pipeline) ---
const intelligenceData = [
  {
    id: "01",
    title: "Multimodal Staging",
    subtitle: "MRI · CT · PET Fusion",
    desc: "AI-driven tumor volume and staging analysis for Glioma (WHO), Breast (TNM), and Lung (I-IV) cancers using voxel-level precision.",
    img: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "02",
    title: "Uncertainty Engine",
    subtitle: "Confidence Intervals · Risk Flags",
    desc: "Calculates confidence levels for every prediction (95% CI). Automatically flags low-certainty outliers for manual Tumor Board review.",
    img: "https://plus.unsplash.com/premium_photo-1682124752476-40db22034a58?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "03",
    title: "Genomic Decoder",
    subtitle: "IDH1 · HER2 · EGFR · KRAS · HBV",
    desc: "Automated interpretation of VCF files to map mutations to targeted therapies, identifying drug sensitivity and resistance markers.",
    img: "https://images.unsplash.com/photo-1579165466741-7f35a4755657?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "04",
    title: "Resource Optimization",
    subtitle: "Cost-Utility Analysis",
    desc: "Recommends protocols balancing survival outcomes with QALYs, hospital resource availability, and patient financial constraints.",
    img: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
  }
];

// --- DATA: Block 2 (Clinical Workspace) ---
const featuresData = [
  {
    id: "01",
    title: "3D & AR/VR Digital Twin",
    subtitle: "Surgical Planning · Vascular Overlay",
    desc: "Interactive 3D organ and tumor reconstruction (Brain, Lung, Liver) with vascular overlay for surgical planning and patient education.",
    img: "https://images.unsplash.com/photo-1617791160505-6f00504e3519?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "02",
    title: "Multi-Disciplinary Board",
    subtitle: "Automated Reporting · PDF Generation",
    desc: "One-click generation of Tumor Board Summaries merging pathology, radiology, and genomic panels into a single meeting-ready PDF.",
    img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "03",
    title: "Adaptive Pathway Simulator",
    subtitle: "Longitudinal Projection · Decision Branching",
    desc: "Simulate complex treatment journeys over 18-24 months, modeling 'what-if' scenarios for response, recurrence, and toxicity management.",
    img: "https://images.unsplash.com/photo-1504868584819-f8e90526354c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "04",
    title: "Evidence-Anchored Reasoning Hub",
    subtitle: "Semantic Mapping · NCCN Guideline Citations",
    desc: "Every treatment protocol is anchored to live-retrieved NCCN guidelines and peer-reviewed journals, providing clinicians with a transparent, auditable reasoning chain.",
    img: "https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&w=1200&q=80",
  }
];

function Home() {
  const { user, isDoctor, isAdmin } = useAuth();

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid-overlay"></div>
        <div className="hero-content">
          <div className="hero-title-box">
            {/* The Glow Effect Heading */}
            <h2 className="hero-title-text">
              AI-Driven Personalized Cancer Treatment Planning System
            </h2>

            {/* The Technical Subheading */}
            <p className="hero-subtitle-text">
              <span className="hero-subtitle-highlight-tech">
                [MULTIMODAL]
              </span>
              {' '}AI-powered clinical decision support for optimized,<br />{' '}
              <span className="hero-subtitle-highlight-clinical">
                evidence-based
              </span>
              {' '}cancer treatment protocols.
            </p>
          </div>
          <div className="hero-cta">
            {/* BUTTON 1: THE "SCANNER" (Primary Action) - Available to all */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/patients" className="btn-scanner">
                <ScienceIcon />
                Initialize Analysis
              </Link>
            </motion.div>

            {/* BUTTON 2: THE "HUD LINK" (Secondary Action) */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to={isAdmin ? "/admin" : "/dashboard"} className="btn-hud">
                <DashboardIcon />
                Enter Dashboard
                {/* Decorative Corner Brackets */}
                <span className="hud-bracket hud-bracket-tl"></span>
                <span className="hud-bracket hud-bracket-br"></span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Precision Features Sections */}
      <section id="features" style={{ backgroundColor: 'var(--bg-primary)' }}>
        
        <PrecisionCarousel 
          title="Core Intelligence" 
          subtitle="Multimodal Data Processing & Clinical Synthesis"
          data={intelligenceData} 
          alignment="left" // Text Left, Image Right
        />

        {/* Spacer / Divider */}
        <div style={{ height: '100px', backgroundImage: 'linear-gradient(to right, #0B1221, rgba(5,151,137,0.2), #0B1221)' }}></div>

        <PrecisionCarousel 
          title="Clinical Workspace" 
          subtitle="Immersive Visualization & Workflow Tools"
          data={featuresData} 
          alignment="right" // Text Right, Image Left
        />
        
      </section>

      {/* Clearance Level Selection Section */}
      <ClearanceLevelSelection />

      <Footer />
    </>
  );
}

export default Home;