import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Grid, Typography, Button, Chip, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow 
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import BiotechIcon from '@mui/icons-material/Biotech';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; 
import './GenomicAnalysis.css';

ChartJS.register(RadialLinearScale, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, ChartTooltip, Legend, Filler);

const colors = {
  purple: '#8B5CF6', 
  cyan: '#00F0FF',
  teal: '#059789',
  amber: '#F59E0B',
  red: '#EF4444',
  muted: '#64748B',
};

const MARKER_CONFIG = {
  Brain: [
    { id: 'idh1', label: 'IDH1 Status', sub: 'Isocitrate Dehydrogenase' },
    { id: 'mgmt', label: 'MGMT Promoter', sub: 'Methylation Status' },
  ],
  Breast: [
    { id: 'er', label: 'ER (ESR1)', sub: 'Estrogen Receptor' },
    { id: 'pr', label: 'PR (PGR)', sub: 'Progesterone Receptor' },
    { id: 'her2', label: 'HER2 (ERBB2)', sub: 'Human Epidermal Growth Factor' },
    { id: 'brca', label: 'BRCA Status', sub: 'Breast Cancer Gene' },
    { id: 'pdl1', label: 'PD-L1 (CD274)', sub: 'Programmed Death-Ligand 1' },
  ],
  Lung: [
    { id: 'egfr', label: 'EGFR Mutation', sub: 'Epidermal Growth Factor' },
    { id: 'kras', label: 'KRAS Mutation', sub: 'Kirsten Rat Sarcoma' },
    { id: 'alk', label: 'ALK Translocation', sub: 'Anaplastic Lymphoma Kinase' },
    { id: 'ros1', label: 'ROS1 Rearrangement', sub: 'Proto-oncogene Tyrosine' },
    { id: 'pdl1', label: 'PD-L1 Expression', sub: 'Immune Checkpoint' },
  ],
  Liver: [
    { id: 'afp', label: 'AFP Biomarker', sub: 'Alpha-Fetoprotein' },
  ],
  Pancreas: [
    { id: 'brca', label: 'BRCA Status', sub: 'Breast Cancer Gene' },
  ]
};

const VARIANT_LIBRARY = {
  Brain: {
    idh1: {
      Mutated: { gene: 'IDH1', variant: 'R132H', type: 'Missense', freq: '85%', action: 'HIGH', sig: 'Favorable prognosis (Grade 4 Astrocytoma)' },
      'Wild Type': { gene: 'IDH1', variant: 'Wild-Type', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Aggressive GBM phenotype' }
    },
    mgmt: {
      Methylated: { gene: 'MGMT', variant: 'Promoter Meth', type: 'Epigenetic', freq: '45%', action: 'HIGH', sig: 'Predicts TMZ sensitivity' },
      Unmethylated: { gene: 'MGMT', variant: 'Unmethylated', type: 'Epigenetic', freq: '55%', action: 'LOW', sig: 'TMZ Resistance likely' }
    }
  },
  Breast: {
    her2: {
      Positive: { gene: 'ERBB2', variant: 'Amplification', type: 'CNV', freq: '20%', action: 'HIGH', sig: 'Target for Trastuzumab/Pertuzumab' },
      Negative: { gene: 'ERBB2', variant: 'Normal', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Non-HER2 driven' }
    },
    er: {
      Positive: { gene: 'ESR1', variant: 'Expression', type: 'Protein', freq: '70%', action: 'HIGH', sig: 'Endocrine Therapy Sensitive' },
      Negative: { gene: 'ESR1', variant: 'Negative', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Endocrine Resistant' }
    },
    brca: {
      Mutated: { gene: 'BRCA1/2', variant: 'g.Mut', type: 'Germline', freq: '5%', action: 'HIGH', sig: 'PARP Inhibitor Sensitivity' },
      'Wild Type': { gene: 'BRCA1/2', variant: 'Wild-Type', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Standard Risk' }
    }
  },
  Lung: {
    egfr: {
      Mutated: { gene: 'EGFR', variant: 'L858R / Ex19Del', type: 'Missense', freq: '15%', action: 'HIGH', sig: 'Osimertinib Sensitive' },
      'Wild Type': { gene: 'EGFR', variant: 'Wild-Type', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Standard Chemo/IO' }
    },
    kras: {
      Mutated: { gene: 'KRAS', variant: 'G12C', type: 'Missense', freq: '25%', action: 'HIGH', sig: 'Sotorasib Sensitive' },
      'Wild Type': { gene: 'KRAS', variant: 'Wild-Type', type: 'None', freq: 'N/A', action: 'LOW', sig: 'N/A' }
    },
    alk: {
      Positive: { gene: 'ALK', variant: 'EML4-ALK Fusion', type: 'Translocation', freq: '5%', action: 'HIGH', sig: 'Alectinib Sensitive' },
      Negative: { gene: 'ALK', variant: 'Negative', type: 'None', freq: 'N/A', action: 'LOW', sig: 'N/A' }
    }
  },
  Liver: {
    afp: {
      'Very High': { gene: 'AFP', variant: 'Overexpression', type: 'Protein', freq: 'High', action: 'MEDIUM', sig: 'Poor Prognosis / Aggressive' },
      Elevated: { gene: 'AFP', variant: 'Elevated', type: 'Protein', freq: 'Mod', action: 'LOW', sig: 'HCC Diagnostic' },
      Normal: { gene: 'AFP', variant: 'Normal', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Standard Risk' }
    }
  },
  Pancreas: {
    brca: {
      Mutated: { gene: 'BRCA2', variant: 'Germline Mut', type: 'Frameshift', freq: '7%', action: 'HIGH', sig: 'POLO Trial (Olaparib)' },
      'Wild Type': { gene: 'BRCA2', variant: 'Wild-Type', type: 'None', freq: 'N/A', action: 'LOW', sig: 'Standard FOLFIRINOX' }
    }
  }
};

const BiomarkerNode = ({ data, index }) => {
  const isUnknown = data.status === 'Unknown';
  const isPositive = ['Mutated', 'Methylated', 'Positive', 'Present', 'Elevated', '≥50%'].includes(data.status);
  const statusColor = isUnknown ? colors.muted : isPositive ? colors.cyan : colors.purple;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} style={{ height: '100%' }}>
      <Box className="biomarker-node-card" sx={{ border: `1px solid ${isUnknown ? 'rgba(255,255,255,0.1)' : statusColor}`, boxShadow: isUnknown ? 'none' : `0 0 20px ${statusColor}20` }}>
        <Box className="node-connection-line" sx={{ bgcolor: statusColor }} />
        <Box className="node-header">
          <Typography variant="h6" className="node-title">{data.id.toUpperCase()}</Typography>
          <BiotechIcon sx={{ color: statusColor, opacity: 0.8 }} />
        </Box>
        <Typography variant="body2" className="node-sub">{data.sub}</Typography>
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 0.5 }}>STATUS</Typography>
          <Box className="node-status-badge" sx={{ bgcolor: `${statusColor}20`, border: `1px solid ${statusColor}40`, color: statusColor }}>
            {data.status.toUpperCase()}
          </Box>
        </Box>
        <Box>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
             <Typography variant="caption" sx={{ color: colors.muted }}>SENSITIVITY</Typography>
             <Typography variant="caption" sx={{ color: '#fff' }}>{isUnknown ? '0' : data.sens}%</Typography>
           </Box>
           <LinearProgress variant="determinate" value={isUnknown ? 0 : data.sens} sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: statusColor } }} />
        </Box>
      </Box>
    </motion.div>
  );
};

const ActionBadge = ({ level }) => {
  let color = colors.muted;
  if (level === 'HIGH') color = colors.red; 
  if (level === 'MEDIUM') color = colors.amber;
  if (level === 'LOW') color = colors.purple;

  return (
    <Chip label={level} size="small" icon={<AutoFixHighIcon style={{ fontSize: 14 }} />} sx={{ bgcolor: `${color}20`, color: color, border: `1px solid ${color}40`, fontFamily: '"Rajdhani"', fontWeight: 700, height: '24px' }} />
  );
};

const GenomicAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyzing, setAnalyzing] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [variantsList, setVariantsList] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);

  const [classificationData, setClassificationData] = useState({
    labels: ['Mesenchymal', 'Proneural', 'Classical', 'Neural'],
    datasets: [{
      label: 'Subtype Probability',
      data: [75, 10, 10, 5],
      backgroundColor: [
        'rgba(139, 92, 246, 0.7)', 
        'rgba(0, 240, 255, 0.7)',  
        'rgba(245, 158, 11, 0.7)', 
        'rgba(148, 163, 184, 0.7)' 
      ],
      borderColor: '#fff',
      borderWidth: 2,
    }],
  });

  const [sensitivityData, setSensitivityData] = useState({
    labels: ['Temozolomide', 'Radiotherapy', 'Bevacizumab', 'Lomustine', 'Immunotherapy'],
    datasets: [{
      label: 'Predicted Efficacy (%)',
      data: [12, 85, 45, 60, 30],
      backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(5, 151, 137, 0.6)', 'rgba(245, 158, 11, 0.6)', 'rgba(0, 240, 255, 0.6)', 'rgba(139, 92, 246, 0.6)'],
    }],
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    if (pid) {
      setPatientId(pid);
      fetchPatientData(pid);
    }
  }, [location.search]);

  const fetchPatientData = async (pid) => {
    try {
      const res = await apiClient.get(`/patients/${pid}`);
      if (res.data.success) {
        const p = res.data.data;
        setPatientData(p);
        console.log("Fetched Patient Data:", p); // Debugging line
        const config = MARKER_CONFIG[p.cancerType] || MARKER_CONFIG.Brain;
        setMarkers(config.map(m => ({ ...m, status: 'Unknown', sens: 0 })));
      }
    } catch (err) {
      console.error("Error fetching patient:", err);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const config = [...(MARKER_CONFIG[patientData.cancerType] || MARKER_CONFIG.Brain)];
      
      // Use vcfAnalysis markers if available, else fallback to genomicProfile
      const vcfMarkers = patientData.vcfAnalysis?.markers || {};
      
      // Add extra markers found in VCF that are not in the standard config
      Object.keys(vcfMarkers).forEach(vKey => {
        if (!config.some(m => m.id === vKey)) {
          config.push({
            id: vKey,
            label: vcfMarkers[vKey].label || vKey.toUpperCase(),
            sub: vcfMarkers[vKey].sub || 'Extracted from VCF'
          });
        }
      });
      
      const results = config.map(m => {
        let status = 'Unknown';
        if (vcfMarkers[m.id]) {
            status = vcfMarkers[m.id].value;
        } else {
            status = patientData.genomicProfile[m.id] || 'Unknown';
        }
        
        return {
          ...m,
          status: status,
          sens: 85 + Math.floor(Math.random() * 10)
        };
      });
      setMarkers(results);

      const typeLib = VARIANT_LIBRARY[patientData.cancerType] || VARIANT_LIBRARY.Brain;
      let calculatedVariants = [];
      
      // 1. Add variants from VCF analysis if they exist (highest priority)
      if (patientData.vcfAnalysis?.variants && patientData.vcfAnalysis.variants.length > 0) {
        patientData.vcfAnalysis.variants.forEach(v => {
            calculatedVariants.push({
                gene: v.gene,
                variant: v.change,
                type: v.type || 'Somatic',
                freq: v.depth ? `${v.depth}x` : '---',
                action: v.clinical_significance === 'Pathogenic' ? 'HIGH' : 'MEDIUM',
                sig: v.impact || 'Variant of interest'
            });
        });
      }

      // 2. Add specific markers from VCF analysis (from hotspot map) that are not already in variants
      const vcfMarkersAsVariants = Object.entries(patientData.vcfAnalysis?.markers || {}).map(([markerId, markerData]) => {
          return {
              gene: markerData.gene || markerId.toUpperCase(),
              variant: markerData.value, // e.g., 'R132H', 'Promoter Meth'
              type: 'Biomarker',
              freq: markerData.allele_freq ? `${Math.round(markerData.allele_freq * 100)}%` : '---',
              action: markerData.significance === 'Pathogenic' ? 'HIGH' : (markerData.significance === 'VUS (Low Frequency)' ? 'MEDIUM' : 'LOW'),
              sig: markerData.significance || 'Clinical Biomarker'
          };
      });

      vcfMarkersAsVariants.forEach(vcv => {
          if (!calculatedVariants.some(cv => cv.gene === vcv.gene && cv.variant === vcv.variant)) {
              calculatedVariants.push(vcv);
          }
      });
      
      // 3. Add variants from genomicProfile (legacy/manual), avoiding duplicates from VCF
      if (patientData.genomicProfile) {
        Object.entries(patientData.genomicProfile).forEach(([key, status]) => {
            const geneEntry = typeLib[key.toLowerCase()]; 
            if (geneEntry && geneEntry[status]) {
                // Check if already added from VCF (either variants or markers) to avoid duplicates
                const isDuplicate = calculatedVariants.some(v => 
                    v.gene.toLowerCase() === geneEntry[status].gene.toLowerCase() && 
                    v.variant.toLowerCase() === geneEntry[status].variant.toLowerCase()
                );
                if (!isDuplicate) {
                    calculatedVariants.push(geneEntry[status]);
                }
            }
        });
      }

      if (calculatedVariants.length === 0) {
          calculatedVariants.push({ gene: '---', variant: 'No specific pathogenic variants found', type: 'N/A', freq: '---', action: 'LOW', sig: 'Standard Protocol' });
      }
      setVariantsList(calculatedVariants);

      const birthDate = new Date(patientData.dateOfBirth);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const kps = patientData.kps || 100;

      let newSubtypeData = [];
      let newSubtypeLabels = [];
      let newDrugData = [];
      let newDrugLabels = [];

      if (patientData.cancerType === 'Brain') {
          newSubtypeLabels = ['Mesenchymal', 'Proneural', 'Classical', 'Neural'];
          newDrugLabels = ['Temozolomide', 'Radiotherapy', 'Bevacizumab', 'Lomustine', 'Immunotherapy'];
          
          let mesenchymal = 25, proneural = 25, classical = 25, neural = 25;

          if (patientData.genomicProfile.idh1 === 'Mutated') {
              proneural = 70; mesenchymal = 10; classical = 10; neural = 10;
              newDrugData = [85, 90, 40, 75, 50]; 
          } else {
              mesenchymal = 60; proneural = 10; classical = 20; neural = 10;
              newDrugData = [15, 95, 50, 60, 20]; 
          }

          if (patientData.genomicProfile.mgmt === 'Methylated') {
              newDrugData[0] = 95; 
          } else if (patientData.genomicProfile.mgmt === 'Unmethylated') {
              newDrugData[0] = 15; 
          }

          if (age < 50) { proneural += 15; mesenchymal -= 15; } 
          else { mesenchymal += 10; proneural -= 10; }

          if (kps < 70) { mesenchymal += 15; classical -= 15; }

          const total = mesenchymal + proneural + classical + neural;
          newSubtypeData = [
              Math.round((mesenchymal / total) * 100),
              Math.round((proneural / total) * 100),
              Math.round((classical / total) * 100),
              Math.round((neural / total) * 100)
          ];
      } 
      else if (patientData.cancerType === 'Breast') {
          newSubtypeLabels = ['Luminal A', 'Luminal B', 'HER2-Enriched', 'Basal-like'];
          newDrugLabels = ['Trastuzumab', 'Tamoxifen', 'Doxorubicin', 'Paclitaxel', 'Pembrolizumab'];

          const vcfHer2 = patientData.vcfAnalysis?.markers?.her2?.value;
          const vcfEr = patientData.vcfAnalysis?.markers?.er?.value;
          
          if (vcfHer2 === 'Positive' || patientData.genomicProfile.her2 === 'Positive') {
             newSubtypeData = [10, 10, 75, 5]; 
             newDrugData = [98, 30, 85, 80, 45]; 
          } else if (vcfEr === 'Positive' || patientData.genomicProfile.er === 'Positive') {
             newSubtypeData = [65, 25, 5, 5]; 
             newDrugData = [5, 95, 45, 50, 20]; 
          } else {
             newSubtypeData = [10, 10, 10, 70]; // Triple Negative like
             newDrugData = [5, 10, 92, 90, 85]; 
          }
      }
      else if (patientData.cancerType === 'Lung') {
          newSubtypeLabels = ['Adenocarcinoma', 'Squamous Cell', 'Large Cell', 'Neuroendocrine'];
          newDrugLabels = ['Osimertinib', 'Cisplatin', 'Pembrolizumab', 'Docetaxel', 'Bevacizumab'];

          const vcfEgfr = patientData.vcfAnalysis?.markers?.egfr?.value;
          const vcfAlk = patientData.vcfAnalysis?.markers?.alk?.value;

          if (vcfEgfr === 'Mutated' || patientData.genomicProfile.egfr === 'Mutated') {
              newSubtypeData = [85, 5, 5, 5]; 
              newDrugData = [96, 45, 30, 50, 65]; 
          } else if (vcfAlk === 'Positive' || patientData.genomicProfile.alk === 'Positive') {
              newSubtypeData = [80, 10, 5, 5];
              newDrugLabels[0] = 'Alectinib'; 
              newDrugData = [95, 50, 40, 55, 60];
          } else {
              newSubtypeData = [40, 40, 10, 10]; 
              newDrugData = [10, 85, 90, 80, 55]; 
          }
      }
      else if (patientData.cancerType === 'Liver') {
          newSubtypeLabels = ['Proliferative', 'Non-Proliferative', 'Stem-Cell', 'Unclassified'];
          newDrugLabels = ['Sorafenib', 'Lenvatinib', 'Atezolizumab', 'Bevacizumab', 'Gemcitabine'];

          const vcfAfp = patientData.vcfAnalysis?.markers?.afp?.value;
          if (vcfAfp === 'Very High' || vcfAfp === 'Elevated' || patientData.genomicProfile.afp === 'Very High' || patientData.genomicProfile.afp === 'Elevated') {
              newSubtypeData = [75, 10, 10, 5]; 
              newDrugData = [50, 60, 90, 85, 40]; 
          } else {
              newSubtypeData = [20, 70, 5, 5]; 
              newDrugData = [75, 70, 60, 50, 30]; 
          }
      }
      else if (patientData.cancerType === 'Pancreas') {
          newSubtypeLabels = ['Basal-like', 'Classical', 'Exocrine', 'Unclassified'];
          newDrugLabels = ['Olaparib', 'Gemcitabine', 'FOLFIRINOX', 'Paclitaxel', 'Erlotinib'];

          const vcfBrca = patientData.vcfAnalysis?.markers?.brca?.value;
          if (vcfBrca === 'Mutated' || patientData.genomicProfile.brca === 'Mutated') {
              newSubtypeData = [20, 60, 15, 5]; 
              newDrugData = [95, 75, 80, 45, 30]; 
          } else {
              newSubtypeData = [65, 20, 10, 5]; 
              newDrugData = [10, 85, 92, 80, 15]; 
          }
      }

      setClassificationData({
          labels: newSubtypeLabels,
          datasets: [{
              label: 'Subtype Probability',
              data: newSubtypeData,
              backgroundColor: [
                'rgba(139, 92, 246, 0.7)', 
                'rgba(0, 240, 255, 0.7)',  
                'rgba(245, 158, 11, 0.7)', 
                'rgba(148, 163, 184, 0.7)' 
              ],
              borderColor: '#fff',
              borderWidth: 2,
          }]
      });

      setSensitivityData({
          labels: newDrugLabels,
          datasets: [{
              label: 'Predicted Efficacy (%)',
              data: newDrugData,
              backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(5, 151, 137, 0.6)', 'rgba(245, 158, 11, 0.6)', 'rgba(0, 240, 255, 0.6)', 'rgba(139, 92, 246, 0.6)'],
          }]
      });

      setAnalyzing(false);
      setShowResults(true);
    }, 2000);
  };

  return (
    <Box className="genomic-analysis-root">
      <Container maxWidth={false} sx={{ width: '100%', px: 0 }}>

        <Box className="genomic-header-row" sx={{ px: { xs: 2, md: 6 } }}>
          <Box>
            <Box className="genomic-subtitle-row">
               <ScienceIcon sx={{ color: colors.purple }} />
               <Typography variant="overline" sx={{ color: colors.purple, letterSpacing: '2px', fontWeight: 700 }}>MOLECULAR PATHOLOGY</Typography>
            </Box>
            <Typography variant="h3" className="genomic-page-title">GENOMIC BIOMARKER ANALYSIS</Typography>
          </Box>
                              <Button 
                                variant="contained" 
                                size="large" 
                                disabled={analyzing || showResults} 
                                onClick={handleAnalyze} 
                                className="genomic-analyze-btn" 
                                sx={{ height: '56px' }}
                                startIcon={
                                  analyzing ? (
                                    <div className="spinner-icon" style={{ verticalAlign: 'middle' }} />
                                  ) : showResults ? (
                                    <CheckCircleIcon />
                                  ) : (
                                    <PlayArrowIcon />
                                  )
                                }
                              >
                                {analyzing ? 'SEQUENCING DNA...' : showResults ? 'ANALYSIS COMPLETE' : 'ANALYZE BIOMARKERS'}
                              </Button>
        </Box>

        <Grid container spacing={3} sx={{ mb: 6, px: { xs: 2, md: 6 } }}>
           {markers.map((m, i) => (
             <Grid xs={12} sm={6} md={3} lg={markers.length > 4 ? 2.4 : 3} key={m.id}>
               <BiomarkerNode data={m} index={i} />
             </Grid>
           ))}
        </Grid>

        <AnimatePresence>
          {showResults && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              
              {/* VCF DATA SUMMARY SECTION - NOW INSIDE showResults */}
              {patientData?.vcfAnalysis && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ marginBottom: '48px', padding: '0px 0px' }}>
                        <Box className="variant-panel" sx={{ p: 4, bgcolor: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                            <Grid container spacing={4} alignItems="center">
                                <Grid xs={12} md={3}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="overline" sx={{ color: colors.cyan, fontWeight: 700, letterSpacing: '2px' }}>VCF INSIGHTS</Typography>
                                        <Typography variant="h3" sx={{ color: '#fff', fontFamily: 'Rajdhani', fontWeight: 800 }}>
                                            {patientData.vcfAnalysis.stats?.actionable_found || 0}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: colors.muted }}>Actionable Variants</Typography>
                                    </Box>
                                </Grid>
                                <Grid xs={12} md={9}>
                                    <Grid container spacing={2}>
                                                                        <Grid xs={6} sm={3}>
                                                                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                                                                                <Typography variant="h6" sx={{ color: colors.purple }}>{patientData.vcfAnalysis.stats?.total_vcf_rows || 0}</Typography>
                                                                                <Typography variant="caption" sx={{ color: colors.muted }}>Total Variants</Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                        <Grid xs={6} sm={3}>
                                                                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                                                                                <Typography variant="h6" sx={{ color: colors.cyan }}>{patientData.vcfAnalysis.stats?.high_impact || 0}</Typography>
                                                                                <Typography variant="caption" sx={{ color: colors.muted }}>High Impact</Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                        <Grid xs={6} sm={3}>
                                                                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                                                                                <Typography variant="h6" sx={{ color: colors.amber }}>{patientData.vcfAnalysis.stats?.med_impact || 0}</Typography>
                                                                                <Typography variant="caption" sx={{ color: colors.muted }}>Med Impact</Typography>
                                                                            </Box>
                                                                        </Grid>
                                                                        <Grid xs={6} sm={3}>
                                                                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px', textAlign: 'center' }}>
                                                                                <Typography variant="h6" sx={{ color: colors.muted }}>{patientData.vcfAnalysis.stats?.low_impact || 0}</Typography>
                                                                                <Typography variant="caption" sx={{ color: colors.muted }}>Low Impact</Typography>
                                                                            </Box>
                                                                        </Grid>                                    </Grid>
                                    <Box sx={{ mt: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="caption" sx={{ color: colors.muted }}>GENOMIC SEQUENCING PROGRESS</Typography>
                                            <Typography variant="caption" sx={{ color: colors.cyan }}>COMPLETE</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={100} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: colors.cyan } }} />
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                  </motion.div>
              )}
              
              <Grid container sx={{ mb: 4, justifyContent: 'center' }}>
                <Grid>
                  <Box className="variant-panel" sx={{ p: 4, height: '450px', position: 'relative' }}>
                    <Typography variant="h6" sx={{ fontFamily: '"Rajdhani"', color: '#fff', mb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1, letterSpacing: '1px' }}>
                      MOLECULAR SUBTYPE DISTRIBUTION (CLINICAL PHENOTYPING)
                    </Typography>
                    <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', paddingBottom: '1%' }}>
                      <Doughnut 
                        data={classificationData} 
                        options={{ 
                          cutout: '75%',
                          maintainAspectRatio: false, 
                          plugins: { 
                            legend: { 
                              position: 'right', 
                              labels: { 
                                color: '#94A3B8', 
                                font: { family: 'Space Grotesk', size: 14 }, 
                                boxWidth: 15, 
                                padding: 30 
                              } 
                            } 
                          },
                        }} 
                      />
                    </div>
                  </Box>
                </Grid>
              </Grid>

              <Grid container sx={{ mb: 4, justifyContent: 'center' }}>
                <Grid>
                  <Box className="variant-panel" sx={{ p: 4, height: '450px' }}>
                    <Typography variant="h6" sx={{ fontFamily: '"Rajdhani"', color: '#fff', mb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1, letterSpacing: '1px' }}>
                      TREATMENT SENSITIVITY PREDICTIONS (DRUG EFFICACY)
                    </Typography>
                    <div style={{ height: '350px' }}>
                      <Bar 
                        data={sensitivityData} 
                        options={{ 
                          maintainAspectRatio: false, 
                          scales: { 
                            y: { 
                              grid: { color: 'rgba(255,255,255,0.1)' }, 
                              ticks: { color: '#94A3B8', font: { family: 'Space Grotesk' } } 
                            }, 
                            x: { 
                              grid: { display: false }, 
                              ticks: { color: '#fff', font: { family: 'Rajdhani', size: 14, weight: 700 } } 
                            } 
                          },
                          plugins: {
                            legend: { display: false },
                            tooltip: { 
                              backgroundColor: 'rgba(11, 18, 33, 0.9)', 
                              titleFont: { family: 'Rajdhani' }, 
                              bodyFont: { family: 'Space Grotesk' },
                              borderColor: '#8B5CF6',
                              borderWidth: 1
                            }
                          }
                        }} 
                      />
                    </div>
                  </Box>
                </Grid>
              </Grid>

              <Grid container sx={{ mb: 4, justifyContent: 'center' }}>
                <Grid xs={12}>
                  <Box className="variant-panel">
                    <Box className="variant-panel-header">
                      <Typography variant="h6" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>DETECTED VARIANTS & ACTIONABILITY</Typography>
                    </Box>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell className="variant-table-th">GENE</TableCell>
                            <TableCell className="variant-table-th">VARIANT</TableCell>
                            <TableCell className="variant-table-th">TYPE</TableCell>
                            <TableCell className="variant-table-th">FREQ</TableCell>
                            <TableCell className="variant-table-th">ACTIONABILITY</TableCell>
                            <TableCell className="variant-table-th">SIGNIFICANCE</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {variantsList.map((row, idx) => (
                            <TableRow key={idx} className="table-row-hover">
                              <TableCell className="variant-table-cell variant-gene-cell">{row.gene}</TableCell>
                              <TableCell className="variant-table-cell">{row.variant}</TableCell>
                              <TableCell className="variant-table-cell">{row.type}</TableCell>
                              <TableCell className="variant-table-cell">{row.freq}</TableCell>
                              <TableCell className="variant-table-cell"><ActionBadge level={row.action} /></TableCell>
                              <TableCell className="variant-table-cell" sx={{ color: colors.muted + '!important' }}>{row.sig}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Grid>
              </Grid>

              <Grid container sx={{ mb: 4, justifyContent: 'center' }}>
                <Grid xs={12}>
                  <Box className="variant-panel summary-panel" sx={{ border: `1px solid ${colors.purple}`, bgcolor: `${colors.purple}05`, p: 4 }}>
                    <Box className="summary-classification-row">
                      <WarningAmberIcon sx={{ color: colors.purple }} />
                      <Typography variant="overline" sx={{ color: colors.purple, fontWeight: 700, letterSpacing: '1px' }}>MOLECULAR CLASSIFICATION</Typography>
                    </Box>
                    
                    <Typography variant="h4" className="summary-diagnosis-title">
                      {patientData.cancerType === 'Brain' ? (
                          (patientData.vcfAnalysis?.markers?.idh1?.value === 'Mutated' || patientData.genomicProfile.idh1 === 'Mutated') ? 'IDH-Mutant Astrocytoma' : 'IDH-Wildtype Glioblastoma'
                      ) : patientData.cancerType === 'Breast' ? (
                          (patientData.vcfAnalysis?.markers?.her2?.value === 'Positive' || patientData.genomicProfile.her2 === 'Positive') ? 'HER2-Positive Carcinoma' : 'Invasive Ductal Carcinoma'
                      ) : patientData.cancerType === 'Lung' ? (
                          (patientData.vcfAnalysis?.markers?.egfr?.value === 'Mutated' || patientData.genomicProfile.egfr === 'Mutated') ? 'EGFR-Mutant NSCLC' : 'Non-Small Cell Lung Ca'
                      ) : `${patientData.cancerType} Malignancy`}
                    </Typography>

                    <Typography variant="body2" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"', mb: 4, fontWeight: 600 }}>
                      {patientData.cancerType === 'Brain' ? 'WHO CNS5 GRADE 4 • ' : 'MOLECULAR SUBTYPE • '}
                      {(patientData.vcfAnalysis?.markers?.idh1?.value === 'Mutated' || patientData.genomicProfile.idh1 === 'Mutated') ? 'FAVORABLE PROGNOSIS' : 'AGGRESSIVE PHENOTYPE'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 2, fontSize: '0.9rem', fontWeight: 700 }}>KEY FINDINGS</Typography>
                        <Box>
                          {markers.map((m) => (
                             <Box key={m.id} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                               <Box sx={{ minWidth: '4px', bgcolor: m.status === 'Unknown' ? colors.muted : ['Mutated', 'Methylated', 'Positive', 'Present'].includes(m.status) ? colors.cyan : colors.purple, borderRadius: '2px' }} />
                               <Box>
                                 <Typography variant="subtitle2" sx={{ color: '#fff', fontFamily: '"Space Grotesk"', fontSize: '1.1rem', fontWeight: 600 }}>{m.label}: <span style={{ color: m.status === 'Unknown' ? colors.muted : '#fff' }}>{m.status}</span></Typography>
                                 <Typography variant="caption" sx={{ color: colors.muted, fontSize: '0.85rem' }}>{m.sub}</Typography>
                               </Box>
                             </Box>
                          ))}
                        </Box>
                      </Box>
                      
                      <Box sx={{ flex: 1 }}>
                        <Box className="summary-implication-box" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 3 }}>
                          <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 1, fontSize: '0.9rem', fontWeight: 700 }}>TREATMENT IMPLICATION</Typography>
                          <Typography variant="body2" sx={{ color: '#fff', fontFamily: '"Space Grotesk"', lineHeight: 1.5, fontSize: '1rem' }}>
                             {(() => {
                                 const age = new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear();
                                 const kps = patientData.kps || 100;
                                 
                                 const idh1Status = patientData.vcfAnalysis?.markers?.idh1?.value || patientData.genomicProfile.idh1;
                                 const mgmtStatus = patientData.vcfAnalysis?.markers?.mgmt?.value || patientData.genomicProfile.mgmt;
                                 const egfrStatus = patientData.vcfAnalysis?.markers?.egfr?.value || patientData.genomicProfile.egfr;
                                 const alkStatus = patientData.vcfAnalysis?.markers?.alk?.value || patientData.genomicProfile.alk;
                                 const her2Status = patientData.vcfAnalysis?.markers?.her2?.value || patientData.genomicProfile.her2;
                                 const erStatus = patientData.vcfAnalysis?.markers?.er?.value || patientData.genomicProfile.er;

                                 if (patientData.cancerType === 'Brain') {
                                     if (mgmtStatus === 'Unknown') return "Biomarker status pending. Provisional Standard Stupp Protocol advised pending methylation results.";
                                     if (mgmtStatus === 'Unmethylated') return "TMZ resistance likely. Prioritize clinical trials or consider Regorafenib/Lomustine based on progression.";
                                     if (age > 70 && mgmtStatus === 'Methylated') return "Due to advanced age, consider Hypofractionated Radiotherapy + TMZ (Perry Regimen) to minimize toxicity while maintaining efficacy.";
                                     return "Standard Stupp Protocol (TMZ + Radiotherapy) highly recommended. Favorable methylation status predicts good response.";
                                 }
                                 
                                 if (patientData.cancerType === 'Lung') {
                                     if (egfrStatus === 'Mutated') return "Osimertinib (Tagrisso) is the preferred 1st-line therapy. Avoid Immunotherapy as monotherapy due to low efficacy in EGFR+.";
                                     if (alkStatus === 'Positive') return "Alectinib or Brigatinib indicated. Superior CNS penetration required for ALK+ neuro-protection.";
                                     return "Standard Chemo-Immunotherapy (Pembrolizumab + Chemo) indicated in absence of driver mutations.";
                                 }

                                 if (patientData.cancerType === 'Breast') {
                                     if (her2Status === 'Positive') return "Trastuzumab + Pertuzumab (Dual blockade) + Chemo is standard of care. Monitor cardiac function.";
                                     if (erStatus === 'Positive') return "Endocrine Therapy (Tamoxifen/AI) + CDK4/6 Inhibitor indicated. Chemo may be spared based on Oncotype DX.";
                                     return "Triple Negative: Aggressive Chemo-Immunotherapy required. Consider Platinum agents if BRCA+.";
                                 }

                                 return "Standard protocol based on stage and performance status. Genomic targets not yet identified.";
                             })()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </motion.div>
          )}
        </AnimatePresence>

        <Box className="genomic-footer" sx={{ px: { xs: 2, md: 6 } }}>
           <Button 
             startIcon={<ArrowBackIcon />} 
             className="footer-nav-btn" 
             onClick={() => navigate(`/mri-analysis?patientId=${patientId}`)}
           >
             Back to MRI Analysis
           </Button>
           <Box sx={{ display: 'flex', gap: 2 }}>
             <Button startIcon={<ScienceIcon />} variant="outlined" className="footer-secondary-btn" onClick={() => navigate(`/histopathology?patientId=${patientId}`)}>VIEW HISTOPATHOLOGY</Button>
             <Button endIcon={<ArrowForwardIcon />} variant="contained" className="footer-action-btn" onClick={() => navigate(`/treatment-plan?patientId=${patientId}`)}>PROCEED TO PLANNING</Button>
           </Box>
        </Box>
      </Container>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spinner-icon { width: 16px; height: 16px; border: 2px solid #000; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
      `}</style>
    </Box>
  );
};

export default GenomicAnalysis;
