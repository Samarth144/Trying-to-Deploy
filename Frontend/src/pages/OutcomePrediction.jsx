import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import './OutcomePrediction.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  Box, Grid, Typography, TextField, Button, InputAdornment, IconButton, LinearProgress, Slider, Chip, Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import TransgenderIcon from '@mui/icons-material/Transgender';
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import BiotechIcon from '@mui/icons-material/Biotech';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimelineIcon from '@mui/icons-material/Timeline';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';


const GENOMIC_MARKERS = {
  Brain: [
    { id: 'idh1', label: 'IDH1 Status', sub: 'Isocitrate Dehydrogenase', icon: <BiotechIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'mgmt', label: 'MGMT Methylation', sub: 'Promoter Region', icon: <ScatterPlotIcon />, options: ['Methylated', 'Unmethylated', 'Unknown'] }
  ],
  Breast: [
    { id: 'er', label: 'ER (ESR1)', sub: 'Estrogen Receptor', icon: <FavoriteBorderIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'pr', label: 'PR (PGR)', sub: 'Progesterone Receptor', icon: <FavoriteBorderIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'her2', label: 'HER2 (ERBB2)', sub: 'Human Epidermal Growth Factor', icon: <BiotechIcon />, options: ['Positive', 'Negative', 'Equivocal', 'Unknown'] },
    { id: 'brca', label: 'BRCA Status', sub: 'Breast Cancer Gene', icon: <ScatterPlotIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'pdl1', label: 'PD-L1 (CD274)', sub: 'Programmed Death-Ligand 1', icon: <MedicalServicesIcon />, options: ['Positive', 'Negative', 'Not Tested', 'Unknown'] }
  ],
  Lung: [
    { id: 'egfr', label: 'EGFR Mutation', sub: 'Epidermal Growth Factor', icon: <BiotechIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'kras', label: 'KRAS Mutation', sub: 'Kirsten Rat Sarcoma', icon: <ScatterPlotIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] },
    { id: 'alk', label: 'ALK Translocation', sub: 'Anaplastic Lymphoma Kinase', icon: <ContentCutIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'ros1', label: 'ROS1 Rearrangement', sub: 'Proto-oncogene Tyrosine', icon: <RemoveCircleOutlineIcon />, options: ['Positive', 'Negative', 'Unknown'] },
    { id: 'pdl1', label: 'PD-L1 Expression', sub: 'Immune Checkpoint', icon: <MedicalServicesIcon />, options: ['<1%', '1–49%', '≥50%', 'Unknown'] }
  ],
  Liver: [
    { id: 'afp', label: 'AFP Biomarker', sub: 'Alpha-Fetoprotein', icon: <BiotechIcon />, options: ['Normal', 'Elevated', 'Very High', 'Unknown'] }
  ],
  Pancreas: [
    { id: 'brca', label: 'BRCA Status', sub: 'Breast Cancer Gene', icon: <ScatterPlotIcon />, options: ['Mutated', 'Wild Type', 'Unknown'] }
  ]
};

const GenderTile = ({ icon, label, selected, onClick }) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="gender-tile-wrapper">
    <div className={`gender-tile ${selected ? 'selected' : ''}`} onClick={onClick}>
      {React.cloneElement(icon, { className: 'gender-icon' })}
      <span>{label}</span>
    </div>
  </motion.div>
);

const MolecularSwitch = ({ label, sub, icon, options, value, onChange }) => {
  return (
    <div className="molecular-switch">
      <div className="switch-header">
        <div className="switch-icon-box">{React.cloneElement(icon, { sx: { fontSize: 20 } })}</div>
        <div>
          <Typography className="switch-title">{label}</Typography>
          <Typography className="switch-sub">{sub}</Typography>
        </div>
      </div>
      <div className="switch-options">
        {options.map((option) => {
          const isSelected = value === option;
          let type = 'standard';
          if (['Mutant', 'Methylated', 'Present', 'Lost'].includes(option)) type = 'actionable';
          if (option === 'Unknown') type = 'warning';

          return (
            <motion.div key={option} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`switch-option ${isSelected ? `selected-${type}` : ''}`}
              onClick={() => onChange(option)}
            >
              <Typography variant="caption">{option}</Typography>
              <div className="status-dot"></div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const TagInput = ({ label, icon, tags, onAdd, onDelete }) => {
  const [input, setInput] = useState('');
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
  };
  return (
    <div className="tag-input-terminal">
      <div className="tag-header">
        {React.cloneElement(icon, { className: 'tag-icon' })}
        <Typography variant="subtitle2">{label}</Typography>
      </div>
      <div className="tag-container">
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.div key={tag} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
              <Chip label={tag} onDelete={() => onDelete(tag)} className="tech-chip" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <TextField fullWidth placeholder="Type and press Enter..." value={input}
        onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
        variant="standard" className="tag-text-field" InputProps={{ disableUnderline: true }}
      />
    </div>
  );
};

const getKPSColor = (val) => val >= 80 ? '#059789' : val >= 50 ? '#F59E0B' : '#EF4444';
const getECOGDescription = (val) => {
  const desc = [
    "Fully active, able to carry on all pre-disease performance without restriction.",
    "Restricted in physically strenuous activity but ambulatory and able to carry out work.",
    "Ambulatory and capable of all selfcare but unable to carry out any work activities.",
    "Capable of only limited selfcare, confined to bed or chair more than 50% of waking hours.",
    "Completely disabled. Cannot carry on any selfcare. Totally confined to bed or chair."
  ];
  return desc[val] || "";
};

const PredictionGaugeCard = ({ title, value, unit, rangeText, color, icon, confidence = 92, maxScale = 60 }) => {
  const percentage = Math.min(100, (value / maxScale) * 100);
  const strokeDasharray = 440; // Approx circumference for r=70
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <Box className="prediction-card-gauge">
      {/* Background Decorator */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', bgcolor: color }} />

      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {React.cloneElement(icon, { sx: { color: color, fontSize: 20 } })}
        <Typography variant="overline" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#94A3B8', letterSpacing: '2px', fontSize: '0.85rem' }}>
          {title}
        </Typography>
      </Box>

      {/* --- THE GAUGE --- */}
      <Box sx={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
        
        {/* 1. Outer Static Ring */}
        <Box sx={{ 
          position: 'absolute', inset: 0, borderRadius: '50%', 
          border: '10px solid rgba(255,255,255,0.03)' 
        }} />

        {/* 2. Dynamic Progress Ring (SVG) */}
        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <motion.circle
            cx="80" cy="80" r="70"
            stroke={color}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset: strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>

        {/* 3. The Number Display */}
        <Box sx={{ textAlign: 'center', zIndex: 2 }}>
          <Typography variant="h2" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff', lineHeight: 0.8, fontSize: '3.5rem' }}>
            {value || '--'}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: '"Space Grotesk"', color: '#64748B', display: 'block', mt: 0.5, fontWeight: 600, letterSpacing: '1px' }}>
            {unit}
          </Typography>
        </Box>

        {/* 4. Pulse Animation (The Heartbeat) */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            zIndex: 1
          }}
        />
      </Box>

      {/* RANGE / CONTEXT */}
      <Typography sx={{ fontFamily: '"Space Grotesk"', fontSize: '0.85rem', color: '#94A3B8', textAlign: 'center', mb: 2 }}>
        {rangeText}
      </Typography>

      {/* FOOTER METRIC */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        px: 2, 
        py: 0.5, 
        borderRadius: '20px', 
        bgcolor: 'rgba(255, 255, 255, 0.03)', 
        border: `1px solid rgba(255, 255, 255, 0.05)` 
      }}>
        <AccessTimeIcon sx={{ fontSize: 14, color: color }} />
        <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: '"Rajdhani"', fontWeight: 700, fontSize: '0.75rem' }}>
          CONFIDENCE: {confidence}%
        </Typography>
      </Box>
    </Box>
  );
};


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
);

function OutcomePrediction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPatient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [outcomeData, setOutcomeData] = useState(null);
  const [formattedSideEffects, setFormattedSideEffects] = useState('');
  const [confidence, setConfidence] = useState(92);
  const [formData, setFormData] = useState({ 
    name: '', dob: '', gender: '', mrn: '', contact: '', diagnosisDate: '', pathologyReport: '', pathologyFile: null,
    cancerType: 'Brain',
    idh1: 'Unknown', mgmt: 'Unknown',
    er: 'Unknown', pr: 'Unknown', her2: 'Unknown', brca: 'Unknown', pdl1: 'Unknown',
    egfr: 'Unknown', alk: 'Unknown', ros1: 'Unknown', kras: 'Unknown', afp: 'Unknown',
    kps: 100, ecog: 0, symptoms: '', comorbidities: '' 
  });

  const handleChange = (field, value) => setFormData({ ...formData, [field]: value });

  const generatePredictions = useCallback(async (customData = null, forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh || !outcomeData) {
        setOutcomeData(null);
        setFormattedSideEffects('');
    }
    try {
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams(location.search);
      const pid = params.get('patientId');

      const payload = customData || { ...formData, patientId: pid, forceRefresh };
      const response = await axios.post('http://localhost:8000/api/outcomes/predict-formatted', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const resData = response.data.data;
      setOutcomeData(resData);
      setFormattedSideEffects(resData.formattedSideEffects || '');
      setConfidence(resData.confidence || 92);
    } catch (error) {
      console.error('Error generating predictions:', error);
    } finally {
      setLoading(false);
    }
  }, [formData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    
    if (pid) {
        const fetchPatient = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:8000/api/patients/${pid}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.data.success) {
                    const p = res.data.data;
                    const pathData = p.pathologyAnalysis?.extracted_data || {};
                    const type = p.cancerType || 'Brain';
                    
                    const newData = {
                        ...formData,
                        name: `${p.firstName} ${p.lastName}`,
                        mrn: p.mrn,
                        dob: p.dob ? p.dob.split('T')[0] : '',
                        gender: p.gender?.toLowerCase() || '',
                        cancerType: type,
                        kps: p.kps || 100,
                        ecog: p.ecog || 0,
                        symptoms: Array.isArray(p.symptoms) ? p.symptoms.join(',') : (p.symptoms || ''),
                        comorbidities: Array.isArray(p.comorbidities) ? p.comorbidities.join(',') : (p.comorbidities || '')
                    };

                    // Map Genomic Markers
                    if (type === 'Brain') {
                        if (pathData.MGMT) newData.mgmt = pathData.MGMT;
                        if (pathData.IDH1) newData.idh1 = pathData.IDH1;
                    } else if (type === 'Breast') {
                        if (pathData.ER) newData.er = pathData.ER;
                        if (pathData.PR) newData.pr = pathData.PR;
                        if (pathData.HER2) newData.her2 = pathData.HER2;
                        if (pathData.BRCA) newData.brca = pathData.BRCA;
                    } else if (type === 'Lung') {
                        if (pathData.EGFR) newData.egfr = pathData.EGFR;
                        if (pathData.ALK) newData.alk = pathData.ALK;
                        if (pathData.PDL1) newData.pdl1 = pathData.PDL1;
                        if (pathData.KRAS) newData.kras = pathData.KRAS;
                    } else if (type === 'Liver') {
                        if (pathData.AFP) newData.afp = pathData.AFP;
                    }
                    
                    setFormData(newData);
                    // Automatically trigger predictions
                    generatePredictions(newData);
                }
            } catch (err) {
                console.error("Error loading patient data:", err);
            }
        };
        fetchPatient();
    }
  }, [location.search]);

  const formatMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      let trimmedLine = line.trim();
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        return (
          <li key={index} style={{ marginBottom: '0.5rem', listStyleType: 'disc', marginLeft: '1.5rem', color: '#cbd5e1' }}>
            {parseBold(trimmedLine.substring(2))}
          </li>
        );
      }
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          return <h5 key={index} style={{ color: '#00F0FF', marginTop: '1rem', marginBottom: '0.5rem' }}>{trimmedLine.replace(/\*\*/g, '')}</h5>;
      }
      return (
        <p key={index} style={{ marginBottom: '1rem', color: '#cbd5e1' }}>
          {parseBold(trimmedLine)}
        </p>
      );
    });
  };

  const parseBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#fff' }}>{part.replace(/\*\*/g, '')}</strong>;
      }
      return part;
    });
  };

  const downloadReport = () => {
    alert("Report downloaded! (Simulation)");
  };

  // Chart Data Configurations
  const monthsArr = Array.from({ length: 61 }, (_, i) => i);
  
  const survivalChartData = useMemo(() => {
    // Standard decay formula: S(t) = exp(-k * t)
    // k = ln(2) / median
    const osMedian = outcomeData?.overallSurvival?.median || 24;
    const pfsMedian = outcomeData?.progressionFreeSurvival?.median || 12;
    
    const k_os = 0.693 / osMedian;
    const k_pfs = 0.693 / pfsMedian;

    return {
      labels: monthsArr,
      datasets: [
        {
          label: 'Overall Survival',
          data: monthsArr.map(m => 100 * Math.exp(-k_os * m)),
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: 'Progression-Free Survival',
          data: monthsArr.map(m => 100 * Math.exp(-k_pfs * m)),
          borderColor: '#14B8A6',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }
      ]
    };
  }, [outcomeData, monthsArr]);

  const survivalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: 'Months', color: 'hsl(0, 0%, 75%)' },
        ticks: { color: 'hsl(0, 0%, 75%)' },
        grid: { color: 'hsla(0, 0%, 100%, 0.05)' }
      },
      y: {
        title: { display: true, text: 'Survival Probability (%)', color: 'hsl(0, 0%, 75%)' },
        ticks: { color: 'hsl(0, 0%, 75%)' },
        grid: { color: 'hsla(0, 0%, 100%, 0.05)' },
        min: 0,
        max: 100
      }
    },
    plugins: {
      legend: { labels: { color: 'hsl(0, 0%, 75%)' } }
    }
  };

  const riskChartData = useMemo(() => {
    const risk = outcomeData?.riskStratification || { low: 25, moderate: 45, high: 30 };
    return {
      labels: ['Low Risk', 'Moderate Risk', 'High Risk'],
      datasets: [{
        data: [risk.low, risk.moderate, risk.high],
        backgroundColor: [
          'hsla(142, 70%, 55%, 0.8)',
          'hsla(45, 95%, 60%, 0.8)',
          'hsla(0, 75%, 60%, 0.8)'
        ]
      }]
    };
  }, [outcomeData]);

  const factorsChartData = useMemo(() => {
    const factors = outcomeData?.prognosticFactors || { "Age": 65, "KPS": 85, "Biomarkers": 90, "Clinical Data": 75 };
    
    return {
      labels: Object.keys(factors),
      datasets: [{
        label: 'Impact on Prognosis',
        data: Object.values(factors),
        backgroundColor: 'hsla(270, 70%, 60%, 0.8)',
        borderRadius: 8
      }]
    };
  }, [outcomeData]);

  const timelineChartData = useMemo(() => {
    const projection = outcomeData?.timelineProjection || {
        "months": ["Baseline", "3 mo", "6 mo", "12 mo", "18 mo", "24 mo"],
        "response_indicator": [100, 40, 35, 45, 55, 65],
        "quality_of_life": [75, 70, 73, 67, 63, 60]
    };

    return {
      labels: projection.months,
      datasets: [
        {
          label: 'Response Indicator',
          data: projection.response_indicator,
          borderColor: 'hsl(0, 75%, 60%)',
          backgroundColor: 'hsla(0, 75%, 60%, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Quality of Life',
          data: projection.quality_of_life,
          borderColor: 'hsl(142, 70%, 55%)',
          backgroundColor: 'hsla(142, 70%, 55%, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [outcomeData]);

  return (
    <>
      <div className="container outcome-container">
        <div className="flex justify-between items-center mb-xl" style={{ marginTop: '2rem' }}>
          <div>
            <Typography variant="h4" className="page-title">
              Outcome & Toxicity Prediction
            </Typography>
            <Typography variant="body2" className="page-subtitle">
              Multimodal AI-powered survival forecasting and toxicity modeling.
            </Typography>
          </div>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {loading && <div className="text-secondary" style={{ fontFamily: '"Space Grotesk"' }}>Engine is calculating projections...</div>}
            {outcomeData && !isPatient && (
              <Button 
                variant="outlined" 
                startIcon={<AutoAwesomeIcon />}
                onClick={() => generatePredictions(null, true)}
                disabled={loading}
                sx={{ color: '#00F0FF', borderColor: 'rgba(0, 240, 255, 0.3)', fontFamily: 'Rajdhani', fontWeight: 700 }}
              >
                {loading ? 'CALCULATING...' : 'RE-CALCULATE OUTCOMES'}
              </Button>
            )}
          </Box>
        </div>

        {!outcomeData && !loading && (
            <div className="card-glass text-center" style={{ padding: '4rem' }}>
                <ErrorOutlineIcon sx={{ fontSize: 48, color: '#64748B', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#94A3B8' }}>No Patient Data Linked</Typography>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Please access this page from a valid patient profile to view predictions.</Typography>
            </div>
        )}

        {outcomeData && (
          <>
            {/* Key Predictions */}
            <div className="prediction-grid">
              <PredictionGaugeCard 
                title="OVERALL SURVIVAL"
                value={loading ? 0 : (outcomeData?.overallSurvival?.median || 0)}
                unit="MONTHS"
                rangeText={loading ? "Calculating..." : `Typical Range: ${outcomeData?.overallSurvival?.range[0]}-${outcomeData?.overallSurvival?.range[1]} months`}
                color="#6366F1"
                icon={<TimelineIcon />}
                confidence={confidence}
                maxScale={60}
              />

              <PredictionGaugeCard 
                title="PROGRESSION-FREE SURVIVAL"
                value={loading ? 0 : (outcomeData?.progressionFreeSurvival?.median || 0)}
                unit="MONTHS"
                rangeText={loading ? "Calculating..." : `Typical Range: ${outcomeData?.progressionFreeSurvival?.range[0]}-${outcomeData?.progressionFreeSurvival?.range[1]} months`}
                color="#14B8A6"
                icon={<TimelineIcon />}
                confidence={Math.round(confidence * 0.96)}
                maxScale={48}
              />

              <PredictionGaugeCard 
                title="QUALITY OF LIFE"
                value={loading ? 0 : (outcomeData?.qualityOfLife || 0)}
                unit="SCORE"
                rangeText="Projected Patient-Reported Score"
                color="#F59E0B"
                icon={<FavoriteBorderIcon />}
                confidence={Math.round(confidence * 0.92)}
                maxScale={100}
              />
            </div>

            {/* Survival Curves */}
            <div className="survival-curves">
              <h3 className="mb-lg">Survival Probability Curves</h3>
              <div className="chart-wrapper-survival">
                <Line data={survivalChartData} options={survivalChartOptions} />
              </div>
            </div>

            {/* Side Effects Prediction */}
            <div className="card-glass mb-xl">
              <h3>Predicted Side Effects & Toxicity</h3>

              {loading ? (
                  <div className="text-secondary">Calculating risks...</div>
              ) : formattedSideEffects ? (
                  <div className="side-effects-summary-box">
                      {formatMarkdown(formattedSideEffects)}
                  </div>
              ) : (
                <div className="side-effects-grid">
                    {outcomeData && Object.entries(outcomeData.sideEffects || {}).map(([name, risk]) => (
                        <div key={name} className="side-effect-card">
                            <div className="flex justify-between items-center mb-sm">
                                <strong>{name.replace(/([A-Z])/g, ' $1').trim()}</strong>
                                <span className="badge badge-warning">{risk}%</span>
                            </div>
                            <div className="risk-meter">
                                <div className="risk-fill" style={{ width: `${risk}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
              )}
            </div>

            {/* Risk Stratification */}
            <div className="grid-2 mb-xl">
              <div className="card-glass">
                <h3>Risk Stratification</h3>
                <div className="chart-wrapper-risk">
                  <Doughnut data={riskChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'hsl(0, 0%, 75%)' } } } }} />
                </div>
              </div>

              <div className="card-glass">
                <h3>Prognostic Factors</h3>
                <div className="chart-wrapper-risk">
                  <Bar 
                    data={factorsChartData} 
                    options={{ 
                        indexAxis: 'y', 
                        maintainAspectRatio: false,
                        scales: {
                            x: { ticks: { color: 'hsl(0, 0%, 75%)' }, grid: { color: 'hsla(0, 0%, 100%, 0.05)' } },
                            y: { ticks: { color: 'hsl(0, 0%, 75%)' }, grid: { color: 'hsla(0, 0%, 100%, 0.05)' } }
                        },
                        plugins: { legend: { labels: { color: 'hsl(0, 0%, 75%)' } } }
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Timeline Visualization */}
        <div className="card-glass mb-xl">
          <h3>Predicted Treatment Timeline & Outcomes</h3>
          <p className="text-secondary mb-lg">Expected progression over time</p>

          <div className="chart-wrapper-risk">
             <Line 
                data={timelineChartData} 
                options={{
                    maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: 'hsl(0, 0%, 75%)' }, grid: { color: 'hsla(0, 0%, 100%, 0.05)' } },
                        y: { ticks: { color: 'hsl(0, 0%, 75%)' }, grid: { color: 'hsla(0, 0%, 100%, 0.05)' } }
                    },
                    plugins: { legend: { labels: { color: 'hsl(0, 0%, 75%)' } } }
                }}
             />
          </div>
        </div>

        {/* Action Buttons */}
          </>
        )}

        {/* Action Buttons */}
        {!isPatient && (
          <div className="flex gap-md justify-center">
            <button className="btn btn-secondary" onClick={() => navigate(`/treatment-plan${location.search}`)}>
              ← Back to Treatment Plan
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/pathway-simulator${location.search}`)}>
              Simulate Treatment Pathway →
            </button>
            <button className="btn btn-outline" onClick={downloadReport}>
              Download Report
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default OutcomePrediction;