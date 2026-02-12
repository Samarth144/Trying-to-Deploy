import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Typography, TextField, Button, IconButton, Switch, Tooltip, Chip, Slider, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DownloadIcon from '@mui/icons-material/Download';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import LayersIcon from '@mui/icons-material/Layers';
import BiotechIcon from '@mui/icons-material/Biotech';
import OpacityIcon from '@mui/icons-material/Opacity';
import { useAuth } from '../context/AuthContext';
import './Tumor3DPage.css';

// --- THEME CONSTANTS ---
const colors = {
  bg: '#0B1221',
  teal: '#059789',
  cyan: '#00F0FF',
  amber: '#F59E0B',
  red: '#EF4444',
  text: '#F8FAFC',
  muted: '#64748B',
  border: 'rgba(5, 151, 137, 0.3)'
};

// --- SUB-COMPONENTS ---

const ControlToggle = ({ label, active, onToggle, disabled }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2,
    p: 1.5, borderRadius: '4px',
    bgcolor: 'rgba(255,255,255,0.02)',
    border: `1px solid rgba(255,255,255,0.05)`,
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto'
  }}>
    <Typography variant="body2" sx={{ fontFamily: '"Space Grotesk"', color: '#fff' }}>{label}</Typography>
    <Switch
      checked={active}
      onChange={onToggle}
      disabled={disabled}
      sx={{
        '& .MuiSwitch-switchBase.Mui-checked': { color: colors.cyan },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: colors.cyan },
      }}
    />
  </Box>
);

const MetricBox = ({ label, value, unit, highlight = false }) => (
  <Box sx={{
    p: 2, mb: 2, borderRadius: '4px',
    bgcolor: highlight ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.2)',
    border: `1px solid ${highlight ? colors.cyan : 'rgba(255,255,255,0.1)'}`,
    textAlign: 'center'
  }}>
    <Typography variant="h4" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: highlight ? colors.cyan : '#fff' }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: highlight ? colors.cyan : colors.muted, fontFamily: '"Space Grotesk"', display: 'block' }}>
      {label} {unit && <span style={{ opacity: 0.6 }}>({unit})</span>}
    </Typography>
  </Box>
);

const ThreeDViewport = ({ volume, location, analysisId, layers, brainOpacity, setBrainOpacity, realisticView, simScale, simMode }) => {
  const viewerRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);

  const applySimulation = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Use internal Three.js scene for direct control if model-viewer API is slow/limited
    const scene = viewer.scene; 
    if (!scene) return;

    // 1. UPDATE MATERIALS & SCALING DIRECTLY IN THE THREE.JS TREE
    scene.traverse((obj) => {
      if (obj.isMesh) {
        const name = (obj.material?.name || obj.name || "").toLowerCase();
        
        const isTumor = name.includes('tumor');
        const isEdema = name.includes('edema');
        const isBrain = name.includes('brain');

        // Apply Scaling to Tumor and Edema
        if (isTumor || isEdema) {
            obj.scale.set(simScale, simScale, simScale);
        }

        // Handle Material Styles
        if (isTumor) {
            obj.visible = layers.tumor;
            if (obj.material) {
                obj.material.color.set(simMode === 'treated' ? 0x3388ff : 0xcc0000);
                obj.material.opacity = 1;
                obj.material.transparent = false;
            }
        } else if (isEdema) {
            obj.visible = layers.edema;
            if (obj.material) {
                obj.material.color.set(0x9900ff);
                obj.material.opacity = 0.5;
                obj.material.transparent = true;
            }
        } else if (isBrain) {
            obj.visible = layers.brain;
            if (obj.material) {
                if (realisticView) {
                    obj.material.opacity = 1;
                    obj.material.transparent = false;
                } else {
                    obj.material.color.set(0xffffff);
                    obj.material.opacity = brainOpacity;
                    obj.material.transparent = true;
                }
            }
        }
      }
    });
  };

  // Run update whenever these props change
  useEffect(() => {
    // Slight delay to ensure scene is reactive
    const t = setTimeout(applySimulation, 100);
    return () => clearTimeout(t);
  }, [layers.tumor, layers.edema, layers.brain, brainOpacity, realisticView, analysisId, simScale, simMode]);

  const handleFullscreen = () => {
    if (viewerRef.current) {
      if (viewerRef.current.requestFullscreen) viewerRef.current.requestFullscreen();
      else if (viewerRef.current.webkitRequestFullscreen) viewerRef.current.webkitRequestFullscreen();
    }
  };

  const getModelUrl = () => {
    const pid = analysisId || 'test';
    const name = analysisId ? 'tumor_with_brain.glb' : 'tumor_with_brain_new1.glb';
    return `http://localhost:8000/api/analyses/${pid}/model?modelName=${name}&token=${localStorage.getItem('token')}`;
  };

  const modelUrl = getModelUrl();

  return (
    <Box className="viewport-3d" sx={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="viewport-grid-bg"></div>

      {modelUrl ? (
        <model-viewer
          key={`viewer-${realisticView}-${analysisId}`}
          ref={viewerRef}
          src={modelUrl}
          camera-controls
          auto-rotate={isRotating}
          ar
          ar-modes="scene-viewer webxr quick-look"
          exposure="1.0"
          shadow-intensity="1"
          onLoad={applySimulation}
          style={{ width: '100%', flex: 1, background: 'transparent' }}
        >
        </model-viewer>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ color: colors.muted }}>Surgical view inactive</Typography>
        </Box>
      )}

      {/* BRAIN OPACITY SLIDER OVERLAY */}
      {!realisticView && (
        <Box sx={{
          position: 'absolute', bottom: 85, left: '50%', transform: 'translateX(-50%)',
          bgcolor: 'rgba(22, 32, 50, 0.85)', px: 3, py: 1, borderRadius: '50px',
          border: `1px solid ${colors.border}`, width: '300px',
          display: 'flex', alignItems: 'center', gap: 2
        }}>
          <Tooltip title="Brain Opacity" placement="top">
            <OpacityIcon sx={{ color: colors.cyan, fontSize: 20 }} />
          </Tooltip>
          <Slider
            value={brainOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(_, v) => setBrainOpacity(v)}
            sx={{
              color: colors.cyan,
              '& .MuiSlider-thumb': {
                width: 12, height: 12,
                '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 8px ${colors.cyan}33` },
              },
              '& .MuiSlider-track': { border: 'none' },
              '& .MuiSlider-rail': { opacity: 0.3, backgroundColor: colors.muted },
            }}
          />
        </Box>
      )}

      {/* HUD OVERLAY */}
      <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <Chip
          icon={<BiotechIcon style={{ color: colors.cyan }} />}
          label={location || "LOADING MODEL..."}
          className="hud-chip"
        />
        <Typography variant="caption" sx={{ display: 'block', color: colors.muted, mt: 0.5, fontFamily: '"JetBrains Mono"' }}>
          VOL: {volume || "---"} cm³
        </Typography>
      </Box>

      {/* BOTTOM TOOLBAR */}
      <Box sx={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        bgcolor: 'rgba(22, 32, 50, 0.9)', border: `1px solid ${colors.border}`, borderRadius: '50px',
        p: 1, display: 'flex', gap: 1
      }}>
        <IconButton sx={{ color: '#fff' }} onClick={handleFullscreen}>
          <FullscreenIcon />
        </IconButton>
        <IconButton sx={{ color: '#fff' }} onClick={() => setIsRotating(!isRotating)}>
          {isRotating ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton sx={{ color: '#fff' }}><CameraAltIcon /></IconButton>
      </Box>
    </Box>
  );
};

const Tumor3DPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPatient } = useAuth();
  const [layers, setLayers] = useState({ tumor: true, edema: true, brain: true });
  const [realisticView, setRealisticView] = useState(true);
  const [brainOpacity, setBrainOpacity] = useState(0.25);
  const [patientData, setPatientData] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // SIMULATION STATE
  const [simMode, setSimMode] = useState('none'); // 'none', 'natural', 'treated'
  const [timeStep, setTimeStep] = useState(0); // 0, 3, 6, 12 months
  const [simScale, setSimScale] = useState(1);
  const [simStatus, setSimStatus] = useState('Baseline');

  const [analysisMetrics, setAnalysisMetrics] = useState({
    volume: null, edema: null, necrosis: null, enhancing: null, location: 'SCANNING...', sphericity: null
  });

  const toggleLayer = (key) => setLayers({ ...layers, [key]: !layers[key] });

  // Calculate Simulation Effects (Clinically Realistic Logic)
  useEffect(() => {
    if (simMode === 'none') {
      setSimScale(1);
      setSimStatus('Baseline');
      return;
    }

    let factor = 1;
    const pathData = patientData?.pathologyAnalysis?.extracted_data || {};
    const grade = pathData.grade || 'II';
    const isHighGrade = grade.includes('IV') || grade.includes('III');
    const isIDHWildtype = pathData.IDH1 === 'Wild Type';
    const isMGMTUnmethylated = pathData.MGMT === 'Unmethylated';

    if (simMode === 'natural') {
      let monthlyRate = isHighGrade ? 0.15 : 0.05;
      if (isIDHWildtype) monthlyRate += 0.05;
      if (isMGMTUnmethylated) monthlyRate += 0.03;

      factor = Math.pow(1 + monthlyRate, timeStep);
      if (factor > 1.8) factor = 1.8; // Safety Cap
      setSimStatus(timeStep === 0 ? 'Baseline' : (isHighGrade ? 'Rapid Progression' : 'Slow Progression'));
    } else {
      if (timeStep === 0) {
        factor = 1.0;
        setSimStatus('Pre-Operative');
      } else {
        const surgeryDrop = 0.2; 
        const responseEfficacy = pathData.MGMT === 'Methylated' ? 0.08 : 0.04;
        const adjuvantEffect = Math.pow(1 - responseEfficacy, timeStep);
        factor = surgeryDrop * adjuvantEffect;
        if (factor < 0.05) factor = 0.05;
        setSimStatus('Partial Response');
      }
    }
    setSimScale(factor);
  }, [simMode, timeStep, patientData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    if (pid && pid !== 'null' && pid !== 'undefined') fetchPatientAndAnalysis(pid);
  }, [location.search]);

  const pollAnalysisStatus = (id, pid) => {
    const token = localStorage.getItem('token');
    const interval = setInterval(async () => {
        try {
            const res = await axios.get(`http://localhost:8000/api/analyses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.data.status === 'completed') {
                setIsProcessing(false);
                fetchPatientAndAnalysis(pid);
                clearInterval(interval);
            }
        } catch (err) {
            clearInterval(interval);
        }
    }, 3000);
  };

  const fetchPatientAndAnalysis = async (pid) => {
    try {
      const token = localStorage.getItem('token');
      const [pRes, aRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/patients/${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:8000/api/analyses/patient/${pid}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (pRes.data.success) setPatientData(pRes.data.data);
      if (aRes.data.success && aRes.data.data.length > 0) {
        const latest = aRes.data.data[0];
        setAnalysisId(latest.id);
        
        if (latest.status === 'processing' || latest.status === 'pending') {
            setIsProcessing(true);
            pollAnalysisStatus(latest.id, pid);
        }

        const data = latest.data;
        const newMetrics = {};
        if (data.volumetricAnalysis?.tumorVolume) newMetrics.volume = data.volumetricAnalysis.tumorVolume;
        if (data.volumetricAnalysis?.edemaVolume) newMetrics.edema = data.volumetricAnalysis.edemaVolume;
        if (data.volumetricAnalysis?.necrosisVolume) newMetrics.necrosis = data.volumetricAnalysis.necrosisVolume;
        if (data.volumetricAnalysis?.enhancingVolume) newMetrics.enhancing = data.volumetricAnalysis.enhancingVolume;
        if (data.tumorLocation) newMetrics.location = data.tumorLocation;
        if (data.shapeFeatures?.sphericity) newMetrics.sphericity = data.shapeFeatures.sphericity;
        setAnalysisMetrics(prev => ({ ...prev, ...newMetrics }));
      }
    } catch (err) { console.error("Error fetching data:", err); }
  };

  return (
    <Box className="tumor-3d-root">
      <Box sx={{ px: 4, py: 2, borderBottom: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>SURGICAL DIGITAL TWIN</Typography>
          <Typography variant="caption" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"' }}>
            {patientData ? `CASE: ${patientData.firstName} ${patientData.lastName} | MRN: ${patientData.mrn}` : 'Interactive 3D Surgical Planning Station'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" sx={{ color: colors.muted, borderColor: 'rgba(255,255,255,0.1)' }}>EXPORT MESH (.GLB)</Button>
        </Box>
      </Box>

      <Box className="cockpit-container">
        <Box sx={{ width: '300px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box className="glass-panel">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <LayersIcon sx={{ color: colors.teal }} />
              <Typography variant="subtitle2" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>DISPLAY LAYERS</Typography>
            </Box>
            <ControlToggle label="Show Tumor" active={layers.tumor} onToggle={() => toggleLayer('tumor')} disabled={realisticView} />
            <ControlToggle label="Show Edema" active={layers.edema} onToggle={() => toggleLayer('edema')} disabled={realisticView} />
            <ControlToggle label="Show Brain" active={layers.brain} onToggle={() => toggleLayer('brain')} disabled={realisticView} />

            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

            <ControlToggle
              label="Realistic Rendering"
              active={realisticView}
              onToggle={() => {
                const nextMode = !realisticView;
                setRealisticView(nextMode);
                if (nextMode) {
                  setLayers({ tumor: true, edema: true, brain: true });
                }
              }}
            />
          </Box>
          <Box className="glass-panel" sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff', mb: 2 }}>ANATOMICAL STRUCTURES</Typography>
            {['Frontal Lobe', 'Temporal Lobe', 'Parietal Lobe', 'Motor Cortex', 'Tumor Mass', 'Vascular Bundle'].map(item => (
              <Chip key={item} label={item} sx={{ m: 0.5, bgcolor: 'rgba(255,255,255,0.05)', color: colors.muted, border: '1px solid rgba(255,255,255,0.1)', fontFamily: '"Space Grotesk"', fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
          {isProcessing && (
            <Box sx={{ 
              position: 'absolute', inset: 0, zIndex: 100, 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(11, 18, 33, 0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px'
            }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ marginBottom: '20px', display: 'flex' }}>
                <PrecisionManufacturingIcon sx={{ fontSize: 60, color: colors.cyan }} />
              </motion.div>
              <Typography variant="h5" sx={{ fontFamily: 'Rajdhani', fontWeight: 700, color: '#fff', mb: 1 }}>SYNTHESIZING DIGITAL TWIN</Typography>
              <Typography variant="caption" sx={{ color: colors.muted, letterSpacing: '2px' }}>GENERATING 3D VOLUMETRIC MESH...</Typography>
              <LinearProgress sx={{ width: '200px', mt: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: colors.cyan } }} />
            </Box>
          )}
          <ThreeDViewport
            volume={analysisMetrics.volume} location={analysisMetrics.location} analysisId={analysisId}
            layers={layers} brainOpacity={brainOpacity} setBrainOpacity={setBrainOpacity} realisticView={realisticView}
            simScale={simScale} simMode={simMode}
          />
        </Box>

        <Box sx={{ width: '300px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box className="glass-panel">
            <Typography variant="overline" sx={{ color: colors.cyan, letterSpacing: '2px', fontWeight: 700, display: 'block', mb: 2 }}>
              {simMode !== 'none' ? 'SIMULATED METRICS' : 'VOLUMETRIC DATA'}
            </Typography>
            <MetricBox label="Tumor Volume" value={analysisMetrics.volume ? (analysisMetrics.volume * simScale).toFixed(2) : '---'} unit="cm³" highlight />
            {simMode !== 'none' && (
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 1.5, borderRadius: '4px', textAlign: 'center', mb: 2 }}>
                <Typography variant="caption" sx={{ color: simMode === 'natural' ? colors.red : colors.green, fontWeight: 700, display: 'block' }}>{simStatus.toUpperCase()}</Typography>
                <Typography variant="h6" sx={{ color: '#fff', fontFamily: 'Rajdhani' }}>
                  {simMode === 'natural' ? '+' : '-'}{Math.abs((1 - simScale) * 100).toFixed(0)}% CHANGE
                </Typography>
              </Box>
            )}
            {analysisMetrics.edema && <MetricBox label="Edema Volume" value={(analysisMetrics.edema * simScale).toFixed(2)} unit="cm³" highlight />}
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', flexDirection: 'column', bgcolor: colors.bg }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, gap: 4 }}>
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" sx={{ color: colors.muted }}>MODE:</Typography>
              <Button size="small" onClick={() => setSimMode('none')} variant={simMode === 'none' ? 'contained' : 'outlined'} sx={{ borderRadius: '20px', fontSize: '0.7rem' }}>STATIC</Button>
              <Button size="small" onClick={() => setSimMode('natural')} variant={simMode === 'natural' ? 'contained' : 'outlined'} sx={{ borderRadius: '20px', fontSize: '0.7rem', color: colors.red, borderColor: colors.red }}>NATURAL PROGRESSION</Button>
              <Button size="small" onClick={() => setSimMode('treated')} variant={simMode === 'treated' ? 'contained' : 'outlined'} sx={{ borderRadius: '20px', fontSize: '0.7rem', color: colors.green, borderColor: colors.green }}>TREATMENT RESPONSE</Button>
           </Box>
           {simMode !== 'none' && (
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: '400px' }}>
                <Typography variant="caption" sx={{ color: colors.muted }}>TIMELINE:</Typography>
                <Slider
                  value={timeStep} min={0} max={12} step={3}
                  marks={[{ value: 0, label: 'DIAGNOSIS' }, { value: 3, label: '3M' }, { value: 6, label: '6M' }, { value: 12, label: '12M' }]}
                  onChange={(_, v) => setTimeStep(v)}
                  sx={{ color: simMode === 'natural' ? colors.red : colors.green, '& .MuiSlider-markLabel': { color: colors.muted, fontSize: '0.6rem' } }}
                />
             </Box>
           )}
        </Box>
        <Divider sx={{ mb: 2, opacity: 0.1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {!isPatient && <Button onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />} sx={{ color: colors.muted, fontFamily: '"Space Grotesk"', '&:hover': { color: '#fff' } }}>Return to Analysis</Button>}
          {!isPatient && <Button onClick={() => navigate(`/genomic-analysis?patientId=${new URLSearchParams(location.search).get('patientId')}`)} endIcon={<ArrowForwardIcon />} variant="contained" sx={{ bgcolor: colors.teal, color: '#fff', fontFamily: '"Rajdhani"', fontWeight: 700, px: 4, '&:hover': { bgcolor: colors.cyan, color: '#000' } }}>PROCEED TO GENOMICS</Button>}
        </Box>
      </Box>
    </Box>
  );
};

export default Tumor3DPage;