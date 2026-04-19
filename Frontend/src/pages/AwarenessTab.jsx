import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import './AwarenessTab.css';

/* CONSTANTS — emoji map, color map, title map, priority label map */
const CATEGORY_MAP = {
  red_flags:             { emoji: '⚠️', bg: 'rgba(239, 68, 68, 0.15)', title: 'Signs to never ignore' },
  medication_compliance: { emoji: '💊', bg: 'rgba(91, 111, 246, 0.15)', title: 'Taking your treatment' },
  nutrition:             { emoji: '🥗', bg: 'rgba(33, 212, 189, 0.15)', title: 'What to eat (and avoid)' },
  physical_activity:     { emoji: '🏃', bg: 'rgba(33, 212, 189, 0.15)', title: 'Moving your body' },
  sleep_rest:            { emoji: '😴', bg: 'rgba(124, 92, 255, 0.15)', title: 'Sleep like a healer' },
  mental_health:         { emoji: '🧘', bg: 'rgba(124, 92, 255, 0.15)', title: 'Taking care of your mind' }
};

const PRIORITY_MAP = {
  CRITICAL:  { label: 'Watch closely', color: '#EF4444' },
  IMPORTANT: { label: 'Daily habit',   color: '#F59E0B' },
  ROUTINE:   { label: 'Feel better',   color: '#21D4BD' }
};

function AwarenessTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  
  const [loadingData, setLoadingData] = useState(false);
  const [awarenessData, setAwarenessData] = useState(null);
  const [error, setError] = useState(null);

  // UI state
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  // Auto-rotate tips
  useEffect(() => {
    if (!awarenessData) return;
    const interval = setInterval(() => {
      setActiveTipIndex(prev => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(interval);
  }, [awarenessData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('patientId');
    if (pid && pid !== 'null' && pid !== 'undefined') {
      fetchPatientAndGenerate(pid);
    } else {
        setLoadingPatient(false);
        setError("Invalid or missing patient ID.");
    }
  }, [location.search]);

  const fetchPatientAndGenerate = async (pid) => {
    try {
        setLoadingPatient(true);
        const res = await apiClient.get(`/patients/${pid}`);
        if (res.data.success) {
            const p = res.data.data;
            setPatient(p);
            generateAwarenessPlan(p);
        } else {
            setError("Failed to load patient profile.");
        }
    } catch (err) {
        console.error("Error fetching patient", err);
        setError("Network error fetching patient.");
    } finally {
        setLoadingPatient(false);
    }
  };

  const generateAwarenessPlan = async (patientData, forceRetry = false) => {
    if (!patientData) return;
    if (awarenessData && !forceRetry) return;

    setLoadingData(true);
    setError(null);

    try {
      const response = await apiClient.get(`/patients/${patientData.id}/awareness`);
      if (response.data.success) {
          setAwarenessData(response.data.data);
      } else {
          throw new Error(response.data.message || "Failed to generate guidance.");
      }
    } catch (err) {
      console.error("AI Generation Error:", err);
      setError(err.response?.data?.message || err.message || "An unexpected error occurred during AI generation.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleExpand = (key) => {
    setExpandedCards(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    });
  };

  if (loadingPatient) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#071033' }}>
          <div style={{ color: '#21D4BD', fontFamily: 'Inter, sans-serif' }}>Loading patient profile...</div>
        </div>
      );
  }

  return (
    <div className="aw">
        <div className="aw-inner">
            
            <div className="controls-row">
                <button className="ctrl-btn" onClick={() => navigate(-1)}>Back</button>
                <button className="ctrl-btn" onClick={() => window.print()}>Print</button>
                <button className="ctrl-btn primary" onClick={() => generateAwarenessPlan(patient, true)} disabled={loadingData}>
                    {loadingData ? 'Analyzing...' : 'Refresh Intel'}
                </button>
            </div>

            {error && (
                <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ color: '#EF4444', fontWeight: 600 }}>Generation failed: {error}</div>
                </div>
            )}

            {!loadingData && awarenessData && !error && (() => {
                let totalTips = 0;
                let criticalCount = 0;
                const tipsArray = [];
                
                const entries = Object.entries(awarenessData);
                entries.forEach(([key, data], index) => {
                    const recs = data.recommendations || [];
                    totalTips += recs.length;
                    if (data.priority === 'CRITICAL') {
                        criticalCount += recs.length;
                    }
                    if (index < 4 && recs.length > 0) {
                        tipsArray.push(recs[0]);
                    }
                });

                return (
                    <div>
                        <div className="aw-hero">
                            <div className="hero-icon">🌟</div>
                            <div className="hero-text">
                            <h2>Your wellness plan, {patient?.firstName || 'Patient'}</h2>
                            <p>Small daily habits add up to big results. You're doing great — here's what to focus on today.</p>
                            </div>
                        </div>

                        {/* DAILY SNAPSHOT */}
                        <div className="snapshot-container">
                            <div className="snapshot-label">Daily routine snapshot</div>
                            <div className="snapshot-scroll">
                                <div className="snap-item">
                                    <div className="snap-emoji">🌅</div>
                                    <div className="snap-time">6–7 AM</div>
                                    <div className="snap-task">Light walk</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">🥗</div>
                                    <div className="snap-time">7–8 AM</div>
                                    <div className="snap-task">Breakfast</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">💊</div>
                                    <div className="snap-time">9 AM</div>
                                    <div className="snap-task">Medication</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">🧠</div>
                                    <div className="snap-time">12 PM</div>
                                    <div className="snap-task">Mindfulness</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">🥦</div>
                                    <div className="snap-time">1 PM</div>
                                    <div className="snap-task">Lunch</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">🚶</div>
                                    <div className="snap-time">4 PM</div>
                                    <div className="snap-task">Exercise</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">🌙</div>
                                    <div className="snap-time">9 PM</div>
                                    <div className="snap-task">Wind down</div>
                                </div>
                                <div className="snap-item">
                                    <div className="snap-emoji">😴</div>
                                    <div className="snap-time">10 PM</div>
                                    <div className="snap-task">Sleep</div>
                                </div>
                            </div>
                        </div>

                        <div className="progress-row">
                            <div className="prog-card">
                                <div className="prog-num" id="total-count">{totalTips}</div>
                                <div className="prog-label">Total tips</div>
                            </div>
                            <div className="prog-card">
                                <div className="prog-num" style={{ color: '#F59E0B' }}>{criticalCount}</div>
                                <div className="prog-label">Watch closely</div>
                            </div>
                            <div className="prog-card">
                                <div className="prog-num" style={{ color: '#5B6FF6' }}>6</div>
                                <div className="prog-label">Focus areas</div>
                            </div>
                        </div>

                        {tipsArray.length > 0 && (
                            <div className="tip-strip">
                                <div className="tip-bulb">💡</div>
                                <div className="tip-content">
                                    <div className="tip-eyebrow">Tip of the day</div>
                                    {tipsArray.map((tip, i) => (
                                        <div 
                                            key={i}
                                            className="tip-text" 
                                            style={{ display: i === activeTipIndex ? 'block' : 'none', animation: 'fadeIn 0.5s ease forwards' }}
                                        >
                                            {tip}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                    <div className="tip-nav">
                                        {tipsArray.map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`tip-dot ${i === activeTipIndex ? 'on' : ''}`} 
                                                onClick={() => setActiveTipIndex(i)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="section-label">Tap any area to expand</div>
                        <div className="cards-grid">
                            {entries.map(([key, data], index) => {
                                const mapConf = CATEGORY_MAP[key] || CATEGORY_MAP.mental_health;
                                const pConf = PRIORITY_MAP[data.priority] || PRIORITY_MAP.ROUTINE;
                                const isExpanded = expandedCards.has(key);

                                return (
                                    <div key={key} className={`acard ${isExpanded ? 'open' : ''}`} style={{ animationDelay: `${index * 0.08 + 0.1}s` }}>
                                        <div className="acard-head" onClick={() => handleToggleExpand(key)}>
                                            <div className="acard-emoji" style={{ background: mapConf.bg }}>{mapConf.emoji}</div>
                                            <div className="acard-meta">
                                                <div className="acard-tag" style={{ color: pConf.color }}>{pConf.label}</div>
                                                <div className="acard-title">{mapConf.title}</div>
                                                <div className="acard-why">{data.personalisation_reason}</div>
                                            </div>
                                            <div className="acard-expand">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                    <line x1="4" y1="0" x2="4" y2="8" stroke="#94A3B8" strokeWidth="1.5" />
                                                    <line x1="0" y1="4" x2="8" y2="4" stroke="#94A3B8" strokeWidth="1.5" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="acard-body">
                                            <div className="bullet-list">
                                                {data.recommendations && data.recommendations.map((rec, rIdx) => (
                                                    <div key={rIdx} className="bullet-item">
                                                        <div className="bullet-dot"></div>
                                                        <div className="bullet-text">{rec}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="disclaimer">
                            This plan is tailored specifically to {patient?.firstName ? `${patient.firstName}'s` : 'your'} clinical profile and is here to support — not replace — {patient?.oncologist?.name ? `Dr. ${patient.oncologist.name.split(' ').pop()}'s`  : "your doctor's"} advice. Always consult your Resonance care team before implementing changes.
                        </div>
                    </div>
                );
            })()}

        </div>
    </div>
  );
}

export default AwarenessTab;