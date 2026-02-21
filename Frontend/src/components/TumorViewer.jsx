import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import './Tumor3D.css';

function Brain({ showBrain, showWireframe }) {
  const mesh = useRef();
  
  return (
    <mesh ref={mesh} visible={showBrain} scale={[1, 1.2, 0.9]}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshPhongMaterial 
        color="#888888" 
        transparent 
        opacity={0.3} 
        wireframe={showWireframe}
        shininess={30}
      />
    </mesh>
  );
}

function Tumor({ showTumor, showWireframe }) {
  return (
    <mesh position={[0.8, 0.5, 0.3]} visible={showTumor}>
      <sphereGeometry args={[0.6, 16, 16]} />
      <meshPhongMaterial 
        color="#ff0000" 
        transparent 
        opacity={0.8} 
        emissive="#ff0000"
        emissiveIntensity={0.2}
        wireframe={showWireframe}
      />
    </mesh>
  );
}

function Edema({ showEdema, showWireframe }) {
  return (
    <mesh position={[0.8, 0.5, 0.3]} visible={showEdema}>
      <sphereGeometry args={[0.9, 16, 16]} />
      <meshPhongMaterial 
        color="#ffff00" 
        transparent 
        opacity={0.3} 
        emissive="#ffff00"
        emissiveIntensity={0.1}
        wireframe={showWireframe}
      />
    </mesh>
  );
}

export default function TumorViewer() {
  const [showBrain, setShowBrain] = useState(true);
  const [showTumor, setShowTumor] = useState(true);
  const [showEdema, setShowEdema] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true); // New state for landmarks
  const [autoRotate, setAutoRotate] = useState(false);

  return (
    <div className="viewer-container">
      <div className="canvas-wrapper">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          
          <Brain showBrain={showBrain} showWireframe={showWireframe} />
          <Tumor showTumor={showTumor} showWireframe={showWireframe} />
          <Edema showEdema={showEdema} showWireframe={showWireframe} />
          
          <OrbitControls autoRotate={autoRotate} />
        </Canvas>

        <div className="viewer-overlay">
          <div className="overlay-label">Tumor Location</div>
          <div className="overlay-value">Right Frontal Lobe</div>
          <div className="overlay-subtitle">
            Volume: <strong>32.5 cm³</strong>
          </div>
        </div>

        <div className="viewer-controls">
           <button className="control-btn active" title="Rotate">🔄</button>
           <button className="control-btn" title="Pan">✋</button>
           <button className="control-btn" title="Zoom">🔍</button>
           <div className="divider"></div>
           <button 
             className={`control-btn ${autoRotate ? 'active' : ''}`}
             onClick={() => setAutoRotate(!autoRotate)}
             title="Auto-rotate"
           >
             {autoRotate ? '⏸️' : '▶️'}
           </button>
           <button className="control-btn" title="Screenshot">📷</button>
        </div>
      </div>

      <div className="view-options">
        <div className="option-group">
          <h4>Display Options</h4>
          
          <div className="toggle-switch">
            <span>Show Tumor</span>
            <div className={`switch ${showTumor ? 'active' : ''}`} onClick={() => setShowTumor(!showTumor)} />
          </div>

          <div className="toggle-switch">
            <span>Show Edema</span>
            <div className={`switch ${showEdema ? 'active' : ''}`} onClick={() => setShowEdema(!showEdema)} />
          </div>

          <div className="toggle-switch">
            <span>Show Brain</span>
            <div className={`switch ${showBrain ? 'active' : ''}`} onClick={() => setShowBrain(!showBrain)} />
          </div>

          <div className="toggle-switch">
            <span>Show Landmarks</span>
            <div className={`switch ${showLandmarks ? 'active' : ''}`} onClick={() => setShowLandmarks(!showLandmarks)} />
          </div>

          <div className="toggle-switch">
            <span>Wireframe Mode</span>
            <div className={`switch ${showWireframe ? 'active' : ''}`} onClick={() => setShowWireframe(!showWireframe)} />
          </div>
        </div>

        {/* Anatomical Landmarks Section */}
        <div className="option-group">
            <h4>Anatomical Landmarks</h4>
            <ul className="landmark-list">
                <li className="landmark-item"><div className="landmark-color bg-frontal"></div>Frontal Lobe</li>
                <li className="landmark-item"><div className="landmark-color bg-temporal"></div>Temporal Lobe</li>
                <li className="landmark-item"><div className="landmark-color bg-parietal"></div>Parietal Lobe</li>
                <li className="landmark-item"><div className="landmark-color bg-occipital"></div>Occipital Lobe</li>
                <li className="landmark-item"><div className="landmark-color bg-tumor"></div>Tumor Mass</li>
                <li className="landmark-item"><div className="landmark-color bg-edema"></div>Edema Region</li>
            </ul>
        </div>

        <div className="option-group">
           <h4>Tumor Metrics</h4>
           <div className="metric-row">
             <span className="text-secondary">Volume</span>
             <strong>32.5 cm³</strong>
           </div>
           <div className="metric-row">
             <span className="text-secondary">Max Diameter</span>
             <strong>4.2 cm</strong>
           </div>
           <div className="metric-row">
             <span className="text-secondary">Sphericity</span>
             <strong>0.78</strong>
           </div>
        </div>
      </div>
    </div>
  );
}
