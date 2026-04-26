import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Typography, TextField, Button, IconButton, Switch, Tooltip, Chip, Slider, Divider, Modal, CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import LayersIcon from '@mui/icons-material/Layers';
import BiotechIcon from '@mui/icons-material/Biotech';
import OpacityIcon from '@mui/icons-material/Opacity';
import { useAuth } from '../context/AuthContext';
import { decryptFromStorage } from '../utils/encryption';
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

const ThreeDViewport = ({ volume, location, analysisId, layers, brainOpacity, setBrainOpacity, realisticView, margins, status }) => {
  const viewerRef = useRef(null);
  const [isRotating, setIsRotating] = useState(true);

  const updateMaterials = () => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.model) return;
    const model = viewer.model;

    model.materials.forEach((mat) => {
      const name = (mat.name || "").toLowerCase();
      const pbr = mat.pbrMetallicRoughness;

      // Detection based on our Python forced naming
      const isTumor = name.includes('tumormaterial');
      const isEdema = name.includes('edemamaterial');
      const isBrain = name.includes('brainpart');

      mat.setAlphaMode("BLEND");

      if (isTumor) {
        // Tumor: Force Vibrant Neon Red with Emissive Glow
        mat.setAlphaMode(layers.tumor ? "OPAQUE" : "BLEND");
        pbr.setBaseColorFactor([1.0, 0.05, 0.05, layers.tumor ? 1 : 0]);
        mat.setEmissiveFactor([0.5, 0, 0]);
      } else if (isEdema) {
        // Edema: Force Bright Purple with Emissive Glow
        mat.setAlphaMode("BLEND");
        pbr.setBaseColorFactor([0.8, 0, 1.0, layers.edema ? 0.6 : 0]);
        mat.setEmissiveFactor([0.3, 0, 0.4]);
      } else if (isBrain) {
        // Brain: Handle visibility and Opacity Slider
        if (realisticView) {
          // REALISTIC: Show original textures perfectly
          const isVisible = layers.brain;
          mat.setAlphaMode(isVisible ? "OPAQUE" : "BLEND");
          pbr.setBaseColorFactor([1, 1, 1, isVisible ? 1 : 0]);
        } else {
          // SCHEMATIC: White + Opacity Slider (Capped at 0.5 for visibility)
          mat.setAlphaMode("BLEND");
          const targetOpacity = layers.brain ? (brainOpacity * 0.5) : 0;
          pbr.setBaseColorFactor([1, 1, 1, targetOpacity]);
        }
      }
    });
  };

  // Run update whenever these props change
  useEffect(() => {
    updateMaterials();
  }, [layers.tumor, layers.edema, layers.brain, brainOpacity, realisticView, analysisId]);

  const handleFullscreen = () => {
    if (viewerRef.current) {
      if (viewerRef.current.requestFullscreen) viewerRef.current.requestFullscreen();
      else if (viewerRef.current.webkitRequestFullscreen) viewerRef.current.webkitRequestFullscreen();
    }
  };

  const getModelUrl = () => {
    if (!analysisId) {
      return null; // Don't try to load a model if there's no analysis ID
    }
    const pid = analysisId;
    const name = 'tumor_with_brain.glb'; // This is the name the backend generates
    // Use the base URL from the configured API client
    return `${apiClient.defaults.baseURL}/analyses/${pid}/model?modelName=${name}`;
  };

  const modelUrl = getModelUrl();

  return (
    <Box className="viewport-3d" sx={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="viewport-grid-bg"></div>

      {(status === 'processing' || status === 'pending') ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <CircularProgress sx={{ color: colors.cyan }} size={48} thickness={5} />
          <Typography variant="h6" sx={{ color: colors.cyan, fontFamily: '"Rajdhani"', fontWeight: 700, letterSpacing: '1px' }}>
            ⚙️ COMPILING 3D SURGICAL MODEL...
          </Typography>
          <Typography variant="caption" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"' }}>
            Processing AI Segmentation and Margins (this may take ~45s)
          </Typography>
        </Box>
      ) : modelUrl && status === 'completed' ? (
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
          onLoad={updateMaterials}
          style={{ width: '100%', flex: 1, background: 'transparent' }}
        >
          {margins && layers.margins && Object.entries(margins).map(([dir, info]) => {
             if (info.status === 'not_measurable' || !info.distance_mm) return null;
             const distances = Object.values(margins).filter(m => m.status !== 'not_measurable').map(m => m.distance_mm);
             const shortest = distances.length > 0 ? Math.min(...distances) : Infinity;
             const isShortest = info.distance_mm === shortest;
             
             const mid = info.midpoint_glb;
             const norm = info.direction_normal;
             
             // 3-letter clinical abbreviations — Brainlab/Medtronic standard
             const abbr = { superior: 'SUP', inferior: 'INF', left: 'LFT', right: 'RGT', anterior: 'ANT', posterior: 'PST' };
             const label = abbr[dir] || dir.slice(0, 3).toUpperCase();
             
             const extraClass = (isShortest && info.priority === 'critical') ? 'pulse-active' : '';
             
             return (
               <button
                 key={dir}
                 slot={`hotspot-margin-${dir}`}
                 data-position={`${mid[0]} ${mid[1]} ${mid[2]}`}
                 data-normal={`${norm[0]} ${norm[1]} ${norm[2]}`}
                 style={{ pointerEvents: 'none' }}
                 className={`margin-label margin-label--${info.priority} ${extraClass}`}
               >
                 {label}&nbsp;&nbsp;{info.distance_mm.toFixed(1)}
               </button>
             );
          })}
        </model-viewer>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ color: colors.muted }}>Surgical view inactive</Typography>
        </Box>
      )}

      {/* BRAIN OPACITY SLIDER OVERLAY (Only show in schematic mode) */}
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

      {/* HUD OVERLAY: LOCATION LABEL */}
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
  const { isPatient, isDoctor } = useAuth();
  const [layers, setLayers] = useState({ tumor: true, edema: true, brain: true, margins: true });
  const [realisticView, setRealisticView] = useState(true);
  const [brainOpacity, setBrainOpacity] = useState(0.25);
  const [patientData, setPatientData] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [analysisMetrics, setAnalysisMetrics] = useState({
    volume: null, edema: null, necrosis: null, enhancing: null, location: 'SCANNING...', sphericity: null
  });
  const [margins, setMargins] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState(null);

  const toggleLayer = (key) => setLayers({ ...layers, [key]: !layers[key] });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    if (pid && pid !== 'null' && pid !== 'undefined') fetchPatientAndAnalysis(pid);
  }, [location.search]);

  useEffect(() => {
    let interval;
    if (analysisStatus === 'processing' || analysisStatus === 'pending') {
      interval = setInterval(() => {
        const pid = new URLSearchParams(location.search).get('patientId');
        if (pid) fetchPatientAndAnalysis(pid);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analysisStatus, location.search]);

  const fetchPatientAndAnalysis = async (pid) => {
    try {
      const [pRes, aRes] = await Promise.all([
        apiClient.get(`/patients/${pid}`),
        apiClient.get(`/analyses/patient/${pid}`)
      ]);

      if (pRes.data.success) setPatientData(pRes.data.data);
      if (aRes.data.success && aRes.data.data.length > 0) {
        const latest = aRes.data.data[0];
        setAnalysisId(latest.id);
        setAnalysisStatus(latest.status);
        const data = latest.data;
        const newMetrics = {};
        if (data.volumetricAnalysis?.tumorVolume) newMetrics.volume = data.volumetricAnalysis.tumorVolume;
        if (data.volumetricAnalysis?.edemaVolume) newMetrics.edema = data.volumetricAnalysis.edemaVolume;
        if (data.volumetricAnalysis?.necrosisVolume) newMetrics.necrosis = data.volumetricAnalysis.necrosisVolume;
        if (data.volumetricAnalysis?.enhancingVolume) newMetrics.enhancing = data.volumetricAnalysis.enhancingVolume;
        if (data.tumorLocation) newMetrics.location = data.tumorLocation;
        if (data.shapeFeatures?.sphericity) newMetrics.sphericity = data.shapeFeatures.sphericity;
        setAnalysisMetrics(prev => ({ ...prev, ...newMetrics }));
        if (data.margin_distances) setMargins(data.margin_distances);
      }
    } catch (err) { console.error("Error fetching data:", err); }
  };

  const handleGenerateQrCode = async () => {
    if (!analysisId) return;
    try {
      const res = await apiClient.get(`/analyses/${analysisId}/qr`);
      if (res.data.success) {
        setQrCodeUrl(res.data.data.qrCodeUrl);
        setIsQrModalOpen(true);
      }
    } catch (err) {
      console.error("Error generating QR code:", err);
    }
  };

  return (
    <Box className="tumor-3d-root">
      <Modal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        aria-labelledby="qr-code-modal-title"
        aria-describedby="qr-code-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}>
          <Typography id="qr-code-modal-title" variant="h6" component="h2">
            Scan to View in AR
          </Typography>
          <img src={qrCodeUrl} alt="AR QR Code" style={{ width: '100%' }} />
        </Box>
      </Modal>
      <Box sx={{ px: 4, py: 2, borderBottom: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: '"Rajdhani"', fontWeight: 700, color: '#fff' }}>SURGICAL DIGITAL TWIN</Typography>
          <Typography variant="caption" sx={{ color: colors.muted, fontFamily: '"Space Grotesk"' }}>
            {patientData ? `CASE: ${patientData.firstName} ${patientData.lastName} | MRN: ${patientData.mrn}` : 'Interactive 3D Surgical Planning Station'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isDoctor && (
            <Button variant="contained" startIcon={<QrCode2Icon />} sx={{ bgcolor: colors.cyan, color: '#000', '&:hover': { bgcolor: colors.teal } }} onClick={handleGenerateQrCode}>
              View in AR
            </Button>
          )}
          <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ color: colors.muted, borderColor: 'rgba(255,255,255,0.1)' }}>EXPORT MESH (.GLB)</Button>
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
            <ControlToggle label="Show Margins" active={layers.margins} onToggle={() => toggleLayer('margins')} disabled={realisticView} />

            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />

            <ControlToggle
              label="Realistic Rendering"
              active={realisticView}
              onToggle={() => {
                const nextMode = !realisticView;
                setRealisticView(nextMode);
                if (nextMode) {
                  setLayers({ tumor: true, edema: true, brain: true, margins: true });
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

        <ThreeDViewport
          volume={analysisMetrics.volume} location={analysisMetrics.location} analysisId={analysisId}
          layers={layers} brainOpacity={brainOpacity} setBrainOpacity={setBrainOpacity} realisticView={realisticView} margins={margins} status={analysisStatus}
        />

        <Box sx={{ width: '300px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box className="glass-panel">
            <Typography variant="overline" sx={{ color: colors.cyan, letterSpacing: '2px', fontWeight: 700, display: 'block', mb: 2 }}>VOLUMETRIC DATA</Typography>
            {analysisMetrics.volume && <MetricBox label="Tumor Volume" value={analysisMetrics.volume} unit="cm³" highlight />}
            {analysisMetrics.edema && <MetricBox label="Edema Volume" value={analysisMetrics.edema} unit="cm³" highlight />}
            {analysisMetrics.enhancing && <MetricBox label="Active Core" value={analysisMetrics.enhancing} unit="cm³" highlight />}
            {analysisMetrics.necrosis && <MetricBox label="Necrosis" value={analysisMetrics.necrosis} unit="cm³" highlight />}
            {analysisMetrics.sphericity && <MetricBox label="Sphericity Index" value={analysisMetrics.sphericity} highlight />}
          </Box>
          
          <Box className="glass-panel">
            <Typography variant="overline" sx={{ color: colors.cyan, letterSpacing: '2px', fontWeight: 700, display: 'block', mb: 2 }}>SURGICAL MARGINS</Typography>
            {margins ? (
              <Box>
                {Object.entries(margins).sort((a,b) => (a[1].distance_mm || Infinity) - (b[1].distance_mm || Infinity)).map(([dir, info]) => {
                  if (info.status === 'margin_not_measurable') return null;
                  const distances = Object.values(margins).filter(m => m.status !== 'margin_not_measurable').map(m => m.distance_mm);
                  const isShortest = info.distance_mm === Math.min(...distances);
                  let dotIcon = '🟢';
                  if (info.distance_mm < 10) dotIcon = '🔴';
                  else if (info.distance_mm < 25) dotIcon = '🟡';
                  
                  return (
                    <Box key={dir} className="margin-item">
                      <Typography className="sidebar-margin-label" sx={{ color: '#fff' }}>
                        {dir}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontFamily: '"Space Grotesk"', fontSize: '14px', fontWeight: isShortest ? 700 : 400, color: isShortest ? colors.red : colors.text }}>
                          {info.distance_mm.toFixed(1)} mm
                        </Typography>
                        <span title={info.distance_mm < 10 ? 'Critical' : info.distance_mm < 25 ? 'Caution' : 'Safe'}>{dotIcon}</span>
                      </Box>
                    </Box>
                  );
                })}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.muted, fontFamily: '"Space Grotesk"' }}>
                  <span>🔴 &lt;10mm</span>
                  <span>🟡 10-25mm</span>
                  <span>🟢 &gt;25mm</span>
                </Box>
              </Box>
            ) : (
             <Typography variant="caption" sx={{ color: colors.muted, textAlign: 'center', display: 'block' }}>MARGIN DATA UNAVAILABLE</Typography>
            )}
          </Box>
        </Box>
      </Box>

      {!isPatient && (
        <Box sx={{ p: 2, borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between', bgcolor: colors.bg }}>
          <Button onClick={() => navigate(-1)} startIcon={<ArrowBackIcon />} sx={{ color: colors.muted, fontFamily: '"Space Grotesk"', '&:hover': { color: '#fff' } }}>Return to Analysis</Button>
          <Button onClick={() => navigate(`/genomic-analysis?patientId=${new URLSearchParams(location.search).get('patientId')}`)} endIcon={<ArrowForwardIcon />} variant="contained" sx={{ bgcolor: colors.teal, color: '#fff', fontFamily: '"Rajdhani"', fontWeight: 700, px: 4, '&:hover': { bgcolor: colors.cyan, color: '#000' } }}>PROCEED TO GENOMICS</Button>
        </Box>
      )}
    </Box>
  );
};

export default Tumor3DPage;
