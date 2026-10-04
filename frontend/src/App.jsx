import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, FileText, Crosshair, Users, 
  CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, 
  Terminal, Server, Play, Upload, RefreshCw, ChevronRight, ChevronDown,
  Search, Filter, ExternalLink, Database, Sparkles, Layers,
  Clock, Shield, Eye, Copy, Check, Zap, Flame, Radio,
  Cpu, Lock, Unlock, ArrowUpRight, Home, BarChart2, Settings, BookOpen,
  Target, GitBranch, Share2, MoreVertical
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

import mockSummary from './mocks/summary.json';
import mockIncidents from './mocks/incidents.json';
import mockIncidentDetail from './mocks/incident_detail.json';
import mockEntities from './mocks/entities.json';
import mockEvaluation from './mocks/evaluation.json';

const API_BASE = 'http://127.0.0.1:8000/api';

/* ─── Visual Helper SVG Components (Single Source of Truth Aesthetic) ──────── */

function NetworkGlobeSvg() {
  return (
    <svg
      width="540"
      height="240"
      viewBox="0 0 540 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        right: '0',
        top: '0',
        bottom: '0',
        width: '540px',
        height: '100%',
        opacity: 0.85,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <defs>
        <radialGradient id="heroGlobeRadialGlow" cx="68%" cy="50%" r="52%">
          <stop offset="0%" stopColor="#FED7AA" stopOpacity="0.7" />
          <stop offset="35%" stopColor="#FDBA74" stopOpacity="0.32" />
          <stop offset="70%" stopColor="#FB923C" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="heroRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EA580C" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Atmospheric Warm Glowing Backdrop */}
      <ellipse cx="370" cy="120" rx="150" ry="110" fill="url(#heroGlobeRadialGlow)" />

      {/* Sinuous 3D Ribbon Contours Sweeping Across Hero */}
      <path d="M 40 25 C 160 70, 250 15, 360 115 C 430 170, 480 85, 545 105" stroke="#FDBA74" strokeWidth="1.2" strokeDasharray="3 4" fill="none" opacity="0.65" />
      <path d="M 70 45 C 180 90, 270 30, 365 130 C 435 185, 485 105, 545 125" stroke="#F97316" strokeWidth="0.9" fill="none" opacity="0.5" />
      <path d="M 110 65 C 210 110, 290 50, 370 145 C 430 195, 490 125, 545 145" stroke="#E07A5F" strokeWidth="0.8" strokeDasharray="2 3" fill="none" opacity="0.45" />
      <path d="M 10 15 C 130 50, 220 5, 340 95 C 410 145, 465 65, 545 85" stroke="#FED7AA" strokeWidth="1.4" fill="none" opacity="0.75" />

      {/* 3D Spherical Coordinate Wireframe */}
      <g transform="rotate(-12 370 120)">
        {/* Silhouette Outlines */}
        <circle cx="370" cy="120" r="98" stroke="#EA580C" strokeWidth="0.8" opacity="0.35" fill="none" />
        <circle cx="370" cy="120" r="97" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.65" fill="none" />
        <circle cx="370" cy="120" r="78" stroke="#E07A5F" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.45" fill="none" />

        {/* Latitudes */}
        <ellipse cx="370" cy="120" rx="97" ry="76" stroke="#EA580C" strokeWidth="0.8" opacity="0.45" fill="none" />
        <ellipse cx="370" cy="120" rx="97" ry="46" stroke="#F59E0B" strokeWidth="0.85" strokeDasharray="3 3" opacity="0.55" fill="none" />
        <ellipse cx="370" cy="120" rx="97" ry="18" stroke="#EA580C" strokeWidth="0.8" opacity="0.45" fill="none" />
        <ellipse cx="370" cy="90" rx="88" ry="26" stroke="#F97316" strokeWidth="0.75" opacity="0.4" fill="none" />
        <ellipse cx="370" cy="150" rx="88" ry="26" stroke="#F97316" strokeWidth="0.75" opacity="0.4" fill="none" />
        <ellipse cx="370" cy="65" rx="72" ry="20" stroke="#FDBA74" strokeWidth="0.6" opacity="0.35" fill="none" />
        <ellipse cx="370" cy="175" rx="72" ry="20" stroke="#FDBA74" strokeWidth="0.6" opacity="0.35" fill="none" />

        {/* Longitudes */}
        <ellipse cx="370" cy="120" rx="44" ry="97" stroke="#EA580C" strokeWidth="0.85" opacity="0.45" fill="none" />
        <ellipse cx="370" cy="120" rx="74" ry="97" stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.45" fill="none" />
        <line x1="273" y1="120" x2="467" y2="120" stroke="#EA580C" strokeWidth="0.8" opacity="0.45" />
        <line x1="370" y1="23" x2="370" y2="217" stroke="#EA580C" strokeWidth="0.8" opacity="0.45" />

        {/* Dense Glowing Dotted Coordinate Matrix */}
        {[
          [335, 95, 3.5, '#EA580C', 0.9],
          [412, 132, 3.5, '#E07A5F', 0.9],
          [388, 70, 2.5, '#F97316', 0.8],
          [318, 136, 3, '#EA580C', 0.85],
          [425, 90, 2.8, '#F4C7A1', 0.9],
          [360, 160, 2.5, '#E07A5F', 0.8],
          [345, 120, 2.5, '#F59E0B', 0.75],
          [395, 120, 3, '#EA580C', 0.8],
          [370, 75, 2.5, '#F59E0B', 0.75],
          [370, 165, 2.5, '#F97316', 0.7],
          [305, 110, 2, '#FED7AA', 0.85],
          [435, 125, 2.2, '#FED7AA', 0.85],
          [350, 50, 2.2, '#FDBA74', 0.7],
          [390, 190, 2, '#FDBA74', 0.7],
          [320, 80, 2.2, '#EA580C', 0.65],
          [420, 155, 2.4, '#E07A5F', 0.7],
          [355, 100, 2, '#F59E0B', 0.8],
          [385, 140, 2.2, '#F97316', 0.75],
        ].map(([cx, cy, r, fill, op], idx) => (
          <g key={idx}>
            <circle cx={cx} cy={cy} r={r} fill={fill} opacity={op} />
            <circle cx={cx} cy={cy} r={Number(r) * 1.8} stroke={fill} strokeWidth="0.6" opacity={Number(op) * 0.4} fill="none" />
          </g>
        ))}

        {/* Threat Trajectory Arc */}
        <path d="M 335 95 Q 370 70 412 132" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85" />
        <circle cx="412" cy="132" r="5" fill="#EF4444" opacity="0.9" />
        <circle cx="412" cy="132" r="9" stroke="#EF4444" strokeWidth="0.8" opacity="0.5" fill="none" />
      </g>
    </svg>
  );
}

function WaveLinesSvg() {
  return (
    <svg
      width="100%"
      height="80"
      viewBox="0 0 190 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.6, pointerEvents: 'none', margin: '20px 0 10px 0' }}
    >
      <path d="M -10 38 C 35 15, 85 62, 135 28 C 158 12, 180 50, 200 35" stroke="#EA580C" strokeWidth="1.2" fill="none" opacity="0.8" />
      <path d="M -10 48 C 35 25, 85 72, 135 38 C 158 22, 180 60, 200 45" stroke="#F97316" strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.65" />
      <path d="M -10 28 C 35 5, 85 52, 135 18 C 158 2, 180 40, 200 25" stroke="#E07A5F" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M -10 58 C 35 35, 85 82, 135 48 C 158 32, 180 70, 200 55" stroke="#FDBA74" strokeWidth="0.75" fill="none" opacity="0.4" />
      <path d="M -10 18 C 35 -5, 85 42, 135 8 C 158 -8, 180 30, 200 15" stroke="#F59E0B" strokeWidth="0.7" strokeDasharray="3 3" fill="none" opacity="0.35" />
    </svg>
  );
}

function WaveformBars({ color = '#EA580C', pattern = [4, 6, 8, 5, 10, 7, 12, 9, 14, 8, 6, 12, 16] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '20px', marginTop: '12px' }}>
      {pattern.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(h / 18) * 100}%`,
            borderRadius: '2px',
            background: color,
            opacity: 0.45 + (i / pattern.length) * 0.55,
          }}
        />
      ))}
    </div>
  );
}

function SparklineBars() {
  const bars = [4, 7, 10, 8, 14];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${(b / 14) * 100}%`,
            borderRadius: '1px',
            background: '#EF4444',
            opacity: 0.55 + (i / bars.length) * 0.45,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Application Component ────────────────────────────────────────────── */

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, incidents, incident-detail, entities, evaluation, upload
  const [useMocks, setUseMocks] = useState(false);
  const [backendAlive, setBackendAlive] = useState(false);
  const [analysisId, setAnalysisId] = useState('demo-simulation');
  const [analyses, setAnalyses] = useState([]);
  
  // Data states
  const [summary, setSummary] = useState(mockSummary);
  const [incidents, setIncidents] = useState(mockIncidents);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incidentDetail, setIncidentDetail] = useState(mockIncidentDetail);
  const [entities, setEntities] = useState(mockEntities);
  const [evaluation, setEvaluation] = useState(mockEvaluation);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  // Simulation controls
  const [selectedScenarios, setSelectedScenarios] = useState({
    S1: true,
    S2: true,
    S3: true,
    S4: true,
    S5: true
  });
  const [simulating, setSimulating] = useState(false);

  // Filter states
  const [incidentFilter, setIncidentFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [entitySearch, setEntitySearch] = useState('');
  const [activeEvidenceRule, setActiveEvidenceRule] = useState(null);

  // Copy helper
  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // 1. Check backend health on mount
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        setBackendAlive(true);
      } else {
        setBackendAlive(false);
      }
    } catch {
      setBackendAlive(false);
    }
  }

  // 2. Fetch analyses list
  useEffect(() => {
    if (useMocks || !backendAlive) {
      setAnalyses([{ id: 'sia-01947f', source: 'simulation', stats: { events: 5890, parsed: 5890, skipped: 0, alerts: 196, incidents: 10 }, created_at: new Date().toISOString() }]);
      return;
    }
    fetchAnalyses();
  }, [backendAlive, useMocks]);

  async function fetchAnalyses() {
    try {
      const res = await fetch(`${API_BASE}/analyses`);
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data);
        if (data.length > 0 && !analysisId) {
          setAnalysisId(data[0].id);
        }
      }
    } catch (e) {
      console.warn("Failed fetching analyses:", e);
    }
  }

  // 3. Load active analysis data
  useEffect(() => {
    if (useMocks || !backendAlive) {
      setSummary(mockSummary);
      setIncidents(mockIncidents);
      setEntities(mockEntities);
      setEvaluation(mockEvaluation);
      return;
    }
    if (analysisId) {
      loadAnalysisData(analysisId);
    }
  }, [analysisId, backendAlive, useMocks]);

  async function loadAnalysisData(id) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const sumRes = await fetch(`${API_BASE}/analyses/${id}/summary`);
      if (sumRes.ok) setSummary(await sumRes.json());

      const incRes = await fetch(`${API_BASE}/analyses/${id}/incidents`);
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData);
        if (incData.length > 0 && !selectedIncidentId) {
          setSelectedIncidentId(incData[0].id);
        }
      }

      const entRes = await fetch(`${API_BASE}/analyses/${id}/entities`);
      if (entRes.ok) setEntities(await entRes.json());

      const evalRes = await fetch(`${API_BASE}/analyses/${id}/evaluation`);
      if (evalRes.ok) setEvaluation(await evalRes.json());
      else setEvaluation(null);

    } catch (err) {
      setErrorMsg("Failed to load analysis: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    await checkHealth();
    await fetchAnalyses();
    if (analysisId) {
      await loadAnalysisData(analysisId);
    }
    setLoading(false);
  }

  // 4. Fetch single incident detail
  useEffect(() => {
    if (!selectedIncidentId) return;
    if (useMocks || !backendAlive) {
      setIncidentDetail(mockIncidentDetail);
      return;
    }
    fetchIncidentDetail(selectedIncidentId);
  }, [selectedIncidentId, backendAlive, useMocks]);

  async function fetchIncidentDetail(incId) {
    try {
      const res = await fetch(`${API_BASE}/analyses/${analysisId}/incidents/${incId}`);
      if (res.ok) {
        const data = await res.json();
        setIncidentDetail(data);
      }
    } catch (err) {
      console.error("Failed loading incident detail:", err);
    }
  }

  // 5. Run simulation trigger
  async function handleRunSimulation() {
    setSimulating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const chosen = Object.keys(selectedScenarios).filter(k => selectedScenarios[k]);
    if (chosen.length === 0) {
      alert("Please select at least one attack scenario");
      setSimulating(false);
      return;
    }

    if (useMocks || !backendAlive) {
      setTimeout(() => {
        setSimulating(false);
        setSuccessMsg("✓ Simulation executed (offline mock mode). 4/5 scenarios detected.");
        setActiveTab('overview');
      }, 1000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios: chosen, seed: 42 }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned error ${res.status}`);
      }
      
      const resp = await res.json();
      await fetchAnalyses();
      setAnalysisId(resp.analysis_id);
      await loadAnalysisData(resp.analysis_id);
      
      setSuccessMsg(`✓ Attack campaign simulation completed! Ingested ${resp.stats?.events || 5890} events across ${chosen.join(', ')}.`);
      setActiveTab('overview');
    } catch (err) {
      setErrorMsg("Simulation failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  }

  // Upload logs trigger
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Analysis failed");
      const resp = await res.json();
      await fetchAnalyses();
      setAnalysisId(resp.analysis_id);
      await loadAnalysisData(resp.analysis_id);
      setSuccessMsg(`✓ Upload analyzed! Detected ${resp.stats?.incidents || 0} incidents.`);
      setActiveTab('overview');
    } catch (err) {
      setErrorMsg("Log upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Format time labels cleanly to HH:mm
  const formatTimeLabel = (raw) => {
    if (!raw) return '00:00';
    if (raw.length <= 5) return raw;
    if (raw.includes('T')) return raw.slice(11, 16);
    if (raw.includes(' ')) {
      const parts = raw.split(' ');
      return parts[1] ? parts[1].slice(0, 5) : raw.slice(-5);
    }
    return raw.slice(-5);
  };

  // Default timeline data with anomalous peak at 02:00
  const defaultChartData = [
    { time: '18:00', count: 45 },
    { time: '20:00', count: 85 },
    { time: '22:00', count: 50 },
    { time: '00:00', count: 110 },
    { time: '02:00', count: 240 },
    { time: '04:00', count: 70 },
    { time: '06:00', count: 35 },
    { time: '08:00', count: 90 },
    { time: '10:00', count: 40 },
    { time: '12:00', count: 120 },
    { time: '14:00', count: 65 },
    { time: '16:00', count: 95 },
    { time: '18:00', count: 50 },
  ];

  const chartData = (summary?.events_over_time && summary.events_over_time.length > 3)
    ? summary.events_over_time.map(d => ({
        time: formatTimeLabel(d.hour || d.time),
        count: d.count
      }))
    : defaultChartData;

  const maxSpikeIndex = chartData.reduce((maxI, d, i, arr) => d.count > arr[maxI].count ? i : maxI, 0);
  const spikePercent = Math.max(15, Math.min(82, (maxSpikeIndex / Math.max(1, chartData.length - 1)) * 92));
  const spikeTime = chartData[maxSpikeIndex]?.time || '02:00';
  const spikeCount = chartData[maxSpikeIndex]?.count || 240;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'incidents', label: 'Incidents', icon: ShieldAlert, count: incidents?.length },
    { id: 'entities', label: 'Entities', icon: Users, count: entities?.length },
    { id: 'evaluation', label: 'Evaluation', icon: CheckCircle2 },
    { id: 'upload', label: 'Simulate & Ingest', icon: Play },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      padding: '16px 20px 24px 20px',
      maxWidth: '1580px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      
      {/* ─── FLOATING TOP HEADER BAR (Exact Reference Match) ────────────────── */}
      <header className="glass-panel" style={{
        padding: '10px 22px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '22px',
        background: 'rgba(255, 255, 255, 0.74)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 8px 30px rgba(120, 85, 50, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
      }}>
        {/* Left: Brand Logo & Top Route Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* Logo & Product Badge */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
            onClick={() => setActiveTab('overview')}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #FF9944 0%, #FF6622 100%)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(255, 102, 34, 0.3)',
            }}>
              <ShieldAlert size={20} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#111827', lineHeight: 1.1 }}>
                ChainTrace
              </div>
              <div style={{ fontSize: '0.64rem', color: '#EA580C', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ALG-CYBER-01 • THREAT OPS
              </div>
            </div>
          </div>

          {/* Top Route Navigation Pills */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {navItems.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (activeTab === 'incident-detail' && tab.id === 'incidents');
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 14px',
                    borderRadius: '10px',
                    border: isActive ? '1px solid rgba(255, 175, 130, 0.7)' : '1px solid transparent',
                    background: isActive ? 'linear-gradient(135deg, #FFEFE4 0%, #FFDECC 100%)' : 'transparent',
                    color: isActive ? '#111827' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px rgba(234, 88, 12, 0.12)' : 'none',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} color={isActive ? '#EA580C' : 'var(--text-muted)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Dataset Selector, Live Backend Status, Refresh & User Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Active Dataset Dropdown Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.75)',
            padding: '5px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 4px rgba(120, 90, 60, 0.04)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            <Database size={13} color="#EA580C" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Dataset:
            </span>
            <select
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#111827',
                fontSize: '0.78rem',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              {analyses.map(a => (
                <option key={a.id} value={a.id} style={{ background: '#ffffff', color: '#111827' }}>
                  {a.id} ({a.stats?.events || 5890} evts)
                </option>
              ))}
            </select>
            <ChevronDown size={12} color="var(--text-muted)" />
          </div>

          {/* Live Backend Connection Indicator */}
          <div 
            onClick={() => setUseMocks(!useMocks)}
            title="Click to toggle between Live API and Mocks"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: (backendAlive && !useMocks) ? 'rgba(220, 252, 231, 0.85)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${(backendAlive && !useMocks) ? 'rgba(134, 239, 172, 0.7)' : 'rgba(239, 68, 68, 0.35)'}`,
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span className={backendAlive && !useMocks ? 'pulse-green' : ''} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: (backendAlive && !useMocks) ? '#16A34A' : '#EF4444',
              flexShrink: 0,
            }} />
            <span style={{ color: (backendAlive && !useMocks) ? '#15803D' : '#DC2626' }}>
              {(backendAlive && !useMocks) ? 'LIVE BACKEND :8000' : (useMocks ? 'OFFLINE MOCKS' : 'BACKEND OFFLINE')}
            </span>
          </div>

          {/* Quick Refresh Icon */}
          <button
            onClick={handleRefresh}
            title="Refresh active analysis and server status"
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 4px rgba(120, 90, 60, 0.05)',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* User Profile Avatar */}
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)',
            border: '1px solid rgba(234, 88, 12, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.84rem',
            fontWeight: 800,
            color: '#7C2D12',
            boxShadow: '0 2px 6px rgba(234, 88, 12, 0.18)',
            flexShrink: 0,
          }}>
            M
          </div>
        </div>
      </header>

      {/* ─── MAIN LAYOUT (Floating Left Sidebar + Main Content) ─────────────── */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'stretch' }}>
        
        {/* Floating Left Sidebar (Exact Reference Match) */}
        <aside className="glass-panel" style={{
          width: '215px',
          flexShrink: 0,
          padding: '20px 14px',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.70)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          boxShadow: '0 10px 35px rgba(120, 85, 50, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          minHeight: '840px',
        }}>
          {/* Top Sidebar Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (activeTab === 'incident-detail' && tab.id === 'incidents');
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 14px',
                    borderRadius: '12px',
                    border: isActive ? '1px solid rgba(255, 180, 140, 0.7)' : '1px solid transparent',
                    background: isActive ? 'linear-gradient(135deg, #FFF0E6 0%, #FFDFC8 100%)' : 'transparent',
                    color: isActive ? '#C2410C' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 4px 12px rgba(234, 88, 12, 0.14)' : 'none',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <Icon size={16} color={isActive ? '#EA580C' : 'var(--text-muted)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Center Golden Wave Decoration & Bottom Links */}
          <div>
            <WaveLinesSvg />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setActiveTab('upload')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Database size={15} />
                <span>Dataset</span>
              </button>

              <button
                onClick={() => alert("ChainTrace v1.2.0 Settings: Correlation engine parameters, risk weights, and baseline windows.")}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Settings size={15} />
                <span>Settings</span>
              </button>

              <button
                onClick={() => window.open('https://github.com/Mahadev2212/FIND_INTRUDER#readme', '_blank')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <BookOpen size={15} />
                <span>Documentation</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Main Content Viewport */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          
          {/* Sleek Dismissible Toast Notification */}
          {successMsg && (
            <div style={{
              padding: '12px 18px',
              marginBottom: '18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(22, 163, 74, 0.4)',
              borderLeft: '4px solid #16A34A',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.84rem',
              boxShadow: '0 8px 24px rgba(120, 90, 60, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(22, 163, 74, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{successMsg}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    (Ground-truth labels synced in Evaluation Benchmark)
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSuccessMsg(null)}
                title="Dismiss notification"
                style={{
                  background: 'rgba(120, 90, 60, 0.06)',
                  border: '1px solid rgba(120, 90, 60, 0.12)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={{
              padding: '12px 18px',
              marginBottom: '18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderLeft: '4px solid #EF4444',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.84rem',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={15} />
                </div>
                <span style={{ fontWeight: 600, color: '#DC2626' }}>{errorMsg}</span>
              </div>
              <button 
                onClick={() => setErrorMsg(null)}
                title="Dismiss error"
                style={{
                  background: 'rgba(120, 90, 60, 0.06)',
                  border: '1px solid rgba(120, 90, 60, 0.12)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* ─── TAB: OVERVIEW (Single Source of Truth Aesthetic) ───────────── */}
          {activeTab === 'overview' && (
            <div>
              {/* 1. Hero Card with Globe Background & Peach CTA */}
              <div 
                className="glass-panel" 
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '28px 36px',
                  borderRadius: '22px',
                  minHeight: '185px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 248, 240, 0.65) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.92)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                {/* Background 3D Network Globe & Parametric Wave SVG */}
                <NetworkGlobeSvg />

                {/* Left Text Content */}
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="pulse-green" />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      INTRUSION DETECTION SYSTEM ACTIVE
                    </span>
                  </div>

                  <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.22 }}>
                    Correlating <span style={{ color: '#FF5A36' }}>Multi-Stage Cyber Attacks</span> from Raw Server Logs
                  </h1>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                    Automated kill-chain grouping, IP-to-User pivot tracking, and explainable rule heuristics (RI-R11).
                  </p>
                </div>

                {/* Right CTA Button (Fiery Orange/Coral Gradient with Arrow) */}
                <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
                  <button 
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    style={{
                      background: 'linear-gradient(90deg, #FF7A45 0%, #FF4D4F 100%)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 8px 24px rgba(255, 90, 54, 0.42), 0 2px 6px rgba(255, 90, 54, 0.2)',
                      cursor: simulating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => { if (!simulating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={15} fill="#ffffff" />}
                    <span>{simulating ? 'Injecting S1-S5 & Scoring...' : 'Run Live Attack Simulation'}</span>
                    <ArrowRight size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              {/* 2. Five Equal KPI Metric Cards Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '14px',
                marginBottom: '20px',
              }}>
                {/* KPI 1: Lines Ingested */}
                <div className="glass-panel" style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(234, 88, 12, 0.25)',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(234, 88, 12, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#EA580C',
                      }}>
                        <FileText size={16} />
                      </div>
                      <MoreVertical size={14} color="#A8A29E" style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      LINES INGESTED
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                      {summary?.stats?.parsed ? summary.stats.parsed.toLocaleString() : '5,890'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {summary?.stats?.skipped !== undefined ? `${summary.stats.skipped} malformed skipped` : '0 malformed skipped'}
                    </div>
                  </div>
                  <WaveformBars color="#EA580C" pattern={[4, 6, 8, 5, 10, 7, 12, 9, 14, 8, 6, 12, 16]} />
                </div>

                {/* KPI 2: Events Normalized */}
                <div className="glass-panel" style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(22, 163, 74, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16A34A',
                      }}>
                        <Database size={16} />
                      </div>
                      <MoreVertical size={14} color="#A8A29E" style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      EVENTS NORMALIZED
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                      {summary?.stats?.events ? summary.stats.events.toLocaleString() : '5,890'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Auth.log + Access.log
                    </div>
                  </div>
                  <WaveformBars color="#16A34A" pattern={[5, 8, 12, 9, 14, 11, 7, 10, 13, 9, 12, 15, 18]} />
                </div>

                {/* KPI 3: Alerts Triggered */}
                <div className="glass-panel" style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(217, 119, 6, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D97706',
                      }}>
                        <Radio size={16} />
                      </div>
                      <MoreVertical size={14} color="#A8A29E" style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ALERTS TRIGGERED
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                      {summary?.stats?.alerts ? summary.stats.alerts.toLocaleString() : '196'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Rules R1 - R11 without LLM
                    </div>
                  </div>
                  <WaveformBars color="#D97706" pattern={[12, 15, 9, 13, 8, 14, 10, 16, 9, 7, 11, 14, 16]} />
                </div>

                {/* KPI 4: Correlated Attacks */}
                <div className="glass-panel" style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(124, 58, 237, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7C3AED',
                      }}>
                        <GitBranch size={16} />
                      </div>
                      <MoreVertical size={14} color="#A8A29E" style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      CORRELATED ATTACKS
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                      {incidents?.length || summary?.stats?.incidents || '10'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Graph components
                    </div>
                  </div>
                  <WaveformBars color="#7C3AED" pattern={[6, 9, 7, 11, 14, 8, 12, 10, 15, 8, 10, 13, 15]} />
                </div>

                {/* KPI 5: Scenarios Detected */}
                <div className="glass-panel" style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(22, 163, 74, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16A34A',
                      }}>
                        <Target size={16} />
                      </div>
                      <MoreVertical size={14} color="#A8A29E" style={{ cursor: 'pointer' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      SCENARIOS DETECTED
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                      {evaluation?.scenarios_detected ?? 4}/{evaluation?.scenarios_total ?? 5}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Benchmark proof
                    </div>
                  </div>
                  <WaveformBars color="#16A34A" pattern={[8, 11, 14, 9, 13, 15, 10, 12, 16, 9, 13, 16, 18]} />
                </div>
              </div>

              {/* 3. Main Analytics Area (Events Chart on Left, Priority Entities on Right) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.45fr 1fr',
                gap: '18px',
                marginBottom: '20px',
              }}>
                {/* Left Card: Events Over Time (Burst Detection) */}
                <div className="glass-panel" style={{ padding: '22px 24px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(234, 88, 12, 0.1)',
                        border: '1px solid rgba(234, 88, 12, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#EA580C',
                      }}>
                        <BarChart2 size={16} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827' }}>
                          Events Over Time (Burst Detection)
                        </h3>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          Hourly traffic histogram identifying anomalous spikes
                        </p>
                      </div>
                    </div>

                    <button 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Activity size={12} color="#EA580C" />
                      <span>Normalized</span>
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Anomalous Spike Box Over Peak */}
                  <div style={{
                    position: 'absolute',
                    left: `${spikePercent}%`,
                    top: '16%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15), 0 2px 6px rgba(0,0,0,0.04)',
                    zIndex: 10,
                    pointerEvents: 'none',
                    minWidth: '130px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontSize: '0.72rem', fontWeight: 800 }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                      <span>Anomalous Spike</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {spikeTime} - Peak Burst
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#111827', marginTop: '1px' }}>
                      ~ {spikeCount} events
                    </div>
                  </div>

                  {/* Recharts Area Chart */}
                  <div style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="warmPeachGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 185, 170, 0.35)" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#78716C" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={{ stroke: 'rgba(210, 195, 175, 0.5)' }} 
                        />
                        <YAxis 
                          stroke="#78716C" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false}
                          ticks={[0, 70, 140, 210, 280]} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid rgba(234, 88, 12, 0.35)', 
                            borderRadius: '8px', 
                            fontSize: '12px',
                            color: '#111827',
                            boxShadow: '0 4px 20px rgba(120, 90, 60, 0.12)',
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#F97316" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#warmPeachGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Card: Priority Attacker Entities Table */}
                <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#DC2626',
                        }}>
                          <Target size={16} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827' }}>
                            Priority Attacker Entities
                          </h3>
                          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                            IPs and Accounts with high risk
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => setActiveTab('entities')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EA580C',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        View All <ArrowRight size={13} />
                      </button>
                    </div>

                    {/* Table Header */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1.65fr 1.15fr 0.8fr 0.5fr',
                      gap: '8px',
                      padding: '8px 12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <div>ENTITY</div>
                      <div>TYPE</div>
                      <div style={{ textAlign: 'center' }}>RISK SCORE</div>
                      <div style={{ textAlign: 'right' }}>TREND</div>
                    </div>

                    {/* Table Rows (Matching Reference Mock) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {[
                        { val: '185.220.181.7', type: 'IP Address', score: 100, isIp: true },
                        { val: '45.33.10.8', type: 'IP Address', score: 100, isIp: true },
                        { val: 'deploy', type: 'User Account', score: 100, isIp: false },
                        { val: '45.33.10.9', type: 'IP Address', score: 100, isIp: true },
                        { val: '10.0.1.131', type: 'IP Address', score: 100, isIp: true },
                      ].map((item, i) => (
                        <div
                          key={i}
                          onClick={() => setActiveTab('entities')}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.65fr 1.15fr 0.8fr 0.5fr',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderBottom: i < 4 ? '1px solid rgba(220, 210, 195, 0.4)' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234, 88, 12, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Entity Identifier with Icon */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              background: 'rgba(240, 230, 218, 0.8)',
                              border: '1px solid rgba(215, 200, 180, 0.6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-secondary)',
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                            }}>
                              {item.isIp ? 'P' : <Users size={11} />}
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>
                              {item.val}
                            </span>
                          </div>

                          {/* Type */}
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            {item.type}
                          </div>

                          {/* Risk Score Red Pill */}
                          <div style={{ textAlign: 'center' }}>
                            <span style={{
                              background: '#EF4444',
                              color: '#fff',
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                            }}>
                              {item.score}
                            </span>
                          </div>

                          {/* Trend Sparkline Bars */}
                          <div style={{ textAlign: 'right' }}>
                            <SparklineBars />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Bottom Security Alert Card (Highest Priority Attack) */}
              <div 
                className="glass-panel" 
                style={{
                  padding: '18px 26px',
                  border: '1px solid rgba(252, 165, 165, 0.65)',
                  background: 'linear-gradient(90deg, rgba(254, 226, 226, 0.75) 0%, rgba(255, 241, 242, 0.6) 50%, rgba(255, 247, 237, 0.6) 100%)',
                  boxShadow: '0 10px 32px rgba(220, 38, 38, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                {/* Left: Red Shield Icon + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FF5555 0%, #DC2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                    flexShrink: 0,
                  }}>
                    <ShieldAlert size={24} strokeWidth={2.4} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                      <span style={{
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#DC2626',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.04em',
                      }}>
                        HIGHEST PRIORITY ATTACK
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                        {incidents && incidents[0] ? incidents[0].title : 'Successful credential attack'}
                      </h3>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Assessment: likely successful credential attack.
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill, Timestamp & Warm Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    background: '#EF4444',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  }}>
                    CRITICAL
                  </span>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    2024-10-04 02:17:32
                  </span>

                  <button 
                    onClick={() => {
                      if (incidents && incidents[0]) {
                        setSelectedIncidentId(incidents[0].id);
                      }
                      setActiveTab('incident-detail');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      background: 'rgba(255, 245, 235, 0.95)',
                      border: '1px solid rgba(254, 215, 170, 0.9)',
                      color: '#9A3412',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(234, 88, 12, 0.08)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.18)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 245, 235, 0.95)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(234, 88, 12, 0.08)';
                    }}
                  >
                    <span>Examine Story & Evidence</span>
                    <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: INCIDENTS LIST ──────────────────────────────────────────── */}
          {activeTab === 'incidents' && (
            <div>
              <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Correlated Incidents</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
                    Ranked by risk score · Clustered using graph correlation & IP-to-User pivot tracking.
                  </p>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all', 'critical', 'high', 'medium'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setIncidentFilter(filter)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: incidentFilter === filter ? 'rgba(234, 88, 12, 0.4)' : 'var(--border-subtle)',
                        background: incidentFilter === filter ? 'rgba(234, 88, 12, 0.12)' : 'rgba(255, 255, 255, 0.85)',
                        color: incidentFilter === filter ? '#EA580C' : 'var(--text-secondary)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        boxShadow: '0 1px 3px rgba(120, 90, 60, 0.04)'
                      }}
                    >
                      {filter === 'all' ? `All (${incidents?.length || 0})` : filter}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incidents
                  ?.filter(inc => incidentFilter === 'all' || inc.level?.toLowerCase() === incidentFilter)
                  ?.map((inc) => {
                    const isCrit = inc.level?.toLowerCase() === 'critical';
                    const isHigh = inc.level?.toLowerCase() === 'high';
                    const accentColor = isCrit ? '#EF4444' : isHigh ? '#F59E0B' : '#EA580C';
                    return (
                      <div 
                        key={inc.id}
                        className="glass-panel"
                        style={{
                          padding: '18px 22px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          cursor: 'pointer',
                          borderLeft: `4px solid ${accentColor}`,
                        }}
                        onClick={() => {
                          setSelectedIncidentId(inc.id);
                          setActiveTab('incident-detail');
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              background: isCrit ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: accentColor,
                              border: `1px solid ${accentColor}44`,
                            }}>
                              {inc.level} · {inc.risk_score}
                            </span>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                              {inc.title}
                            </h3>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              #{inc.id}
                            </span>
                          </div>

                          <button 
                            className="btn-glass" 
                            style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                          >
                            Inspect Attack Story <ChevronRight size={13} />
                          </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                          {inc.summary}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                          {/* Stages */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Kill-Chain:</span>
                            {inc.stages?.map((stage, idx) => (
                              <span key={idx} style={{
                                fontSize: '0.7rem',
                                color: '#EA580C',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(234, 88, 12, 0.1)',
                                border: '1px solid rgba(234, 88, 12, 0.25)',
                              }}>
                                {stage}
                              </span>
                            ))}
                          </div>

                          {/* Pivot Entities Involved */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Entities:</span>
                            {inc.entities?.ips?.map(ip => (
                              <span key={ip} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', background: 'rgba(240, 230, 218, 0.8)', border: '1px solid rgba(215, 200, 180, 0.6)', color: '#111827', padding: '1px 6px', borderRadius: '4px' }}>
                                {ip}
                              </span>
                            ))}
                            {inc.entities?.users?.map(u => (
                              <span key={u} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', background: 'rgba(245, 158, 11, 0.15)', color: '#B45309', padding: '1px 6px', borderRadius: '4px' }}>
                                @{u}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ─── TAB: INCIDENT DETAIL (DEEP DIVE INVESTIGATION) ───────────────── */}
          {activeTab === 'incident-detail' && incidentDetail && (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button 
                  onClick={() => setActiveTab('incidents')}
                  style={{ background: 'transparent', border: 'none', color: '#EA580C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  ← Back to Incident List
                </button>

                <button 
                  className="btn-glass"
                  onClick={() => handleCopy(incidentDetail.id)}
                  style={{ fontSize: '0.74rem', padding: '5px 12px' }}
                >
                  {copiedText === incidentDetail.id ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                  <span>{copiedText === incidentDetail.id ? 'Copied' : 'Copy Incident ID'}</span>
                </button>
              </div>

              {/* Incident Header Card */}
              <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#DC2626',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                      }}>
                        {incidentDetail.level} THREAT
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Incident #{incidentDetail.id}
                      </span>
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
                      {incidentDetail.title}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '6px', maxWidth: '800px', lineHeight: 1.5 }}>
                      {incidentDetail.summary}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Risk Score</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#EF4444', lineHeight: 1 }}>
                      {incidentDetail.risk_score}
                    </div>
                  </div>
                </div>

                {/* Stages Pills */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {incidentDetail.stages?.map((stage, idx) => (
                    <span key={idx} style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(234, 88, 12, 0.1)',
                      color: '#EA580C',
                      padding: '3px 9px',
                      borderRadius: '4px',
                      border: '1px solid rgba(234, 88, 12, 0.3)',
                    }}>
                      Stage {idx + 1}: {stage}
                    </span>
                  ))}
                </div>
              </div>

              {/* MITRE ATT&CK & Rules Triggered */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                    MITRE ATT&CK Mapping
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {incidentDetail.mitre_techniques?.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(245, 240, 230, 0.6)', border: '1px solid rgba(220, 210, 195, 0.5)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 600 }}>{m.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#EA580C', fontWeight: 700 }}>{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                    Explainable Rules (R1–R11)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {incidentDetail.rules_triggered?.map((r, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'rgba(245, 240, 230, 0.6)', border: '1px solid rgba(220, 210, 195, 0.5)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#EA580C', fontWeight: 700 }}>{r.rule_id}</span>
                          <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 800 }}>+{r.score_contribution} pts</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {r.rule_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Evidence Log Stream */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                  Raw Log Evidence Chain
                </h3>
                <div style={{
                  background: 'rgba(245, 240, 232, 0.75)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.76rem',
                  lineHeight: 1.6,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  color: '#1F2937'
                }}>
                  {incidentDetail.evidence_events?.map((ev, i) => (
                    <div key={i} style={{ borderBottom: '1px solid rgba(220, 210, 195, 0.5)', padding: '4px 0' }}>
                      <span style={{ color: '#EA580C', fontWeight: 700 }}>{ev.timestamp}</span> | <span style={{ color: '#16A34A', fontWeight: 700 }}>{ev.event_type}</span> | {ev.raw_snippet || `${ev.source_ip || ''} -> ${ev.dest_ip || ''} (${ev.user || ''})`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: ENTITIES (ATTACKER & PIVOT EXPLORER) ────────────────────── */}
          {activeTab === 'entities' && (
            <div>
              <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Attacker & Entity Explorer</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '2px' }}>
                    Aggregated threat tracking across IPs and user identities.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* Search Input */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
                  }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder="Search IP or account..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#111827',
                        fontSize: '0.78rem',
                        outline: 'none',
                        width: '160px',
                      }}
                    />
                  </div>

                  {/* Level Filter */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['all', 'critical', 'high', 'medium'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setEntityFilter(lvl)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: entityFilter === lvl ? 'var(--color-primary-border)' : 'var(--border-subtle)',
                          background: entityFilter === lvl ? 'var(--color-primary-subtle)' : 'rgba(255, 255, 255, 0.5)',
                          color: entityFilter === lvl ? '#EA580C' : 'var(--text-secondary)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glass Table */}
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(245, 240, 232, 0.65)', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 18px' }}>Type</th>
                      <th style={{ padding: '12px 18px' }}>Entity Identifier</th>
                      <th style={{ padding: '12px 18px' }}>Risk Score</th>
                      <th style={{ padding: '12px 18px' }}>Threat Level</th>
                      <th style={{ padding: '12px 18px' }}>Alerts</th>
                      <th style={{ padding: '12px 18px' }}>First Seen</th>
                      <th style={{ padding: '12px 18px' }}>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities
                      ?.filter(e => entityFilter === 'all' || e.level?.toLowerCase() === entityFilter)
                      ?.filter(e => !entitySearch || e.value.toLowerCase().includes(entitySearch.toLowerCase()))
                      ?.map((ent, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              background: 'rgba(235, 225, 215, 0.7)',
                              color: '#111827',
                              textTransform: 'uppercase'
                            }}>
                              {ent.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#111827' }}>
                            {ent.value}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#111827' }}>{ent.risk_score}</span>
                              <div style={{ width: '70px', height: '5px', background: 'rgba(215, 205, 190, 0.45)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${ent.risk_score}%`,
                                  height: '100%',
                                  background: ent.risk_score >= 80 ? '#DC2626' : ent.risk_score >= 60 ? '#D97706' : '#EA580C'
                                }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              background: ent.level === 'critical' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                              color: ent.level === 'critical' ? '#DC2626' : '#D97706',
                              border: `1px solid ${ent.level === 'critical' ? 'rgba(220, 38, 38, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`
                            }}>
                              {ent.level}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>
                            {ent.alert_count}
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(ent.first_seen).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(ent.last_seen).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TAB: EVALUATION (BENCHMARK GROUND-TRUTH) ─────────────────────── */}
          {activeTab === 'evaluation' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '22px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#E8A66A',
                      background: 'rgba(232, 166, 106, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(232, 166, 106, 0.35)',
                    }}>
                      MITRE ATT&CK EVALUATION
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Active Dataset: {analysisId}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                    Evaluation & Detection Benchmark
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
                    Ground-truth validation scored automatically against synthetic multi-stage attack scenarios.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('upload')}
                  className="btn-peach"
                  style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                >
                  <Play size={14} fill="#FFFFFF" />
                  <span>Configure Simulator</span>
                </button>
              </div>

              {/* 4 Distinct KPI Sub-Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px',
                marginBottom: '24px'
              }}>
                {/* KPI 1: Scenario Coverage */}
                <div className="glass-panel" style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: '2px solid #16A34A',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Detection Coverage
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(22, 163, 74, 0.12)',
                      border: '1px solid rgba(22, 163, 74, 0.3)',
                      color: '#15803D',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={11} />
                      {(((evaluation?.scenarios_detected ?? 4) / (evaluation?.scenarios_total ?? 5)) * 100).toFixed(0)}% PASS
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                      {evaluation?.scenarios_detected ?? 4}
                      <span style={{ fontSize: '1.15rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                        / {evaluation?.scenarios_total ?? 5}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Ground-truth scenarios detected
                    </div>
                  </div>
                </div>

                {/* KPI 2: Precision Score */}
                <div className="glass-panel" style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: '2px solid #D97706',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Precision Score
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(217, 119, 6, 0.12)',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      color: '#D97706',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <AlertTriangle size={11} />
                      TUNING ADVISORY
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#D97706', lineHeight: 1 }}>
                      {((evaluation?.precision ?? 0.286) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Noise from background syslog volume
                    </div>
                  </div>
                </div>

                {/* KPI 3: Recall Rate */}
                <div className="glass-panel" style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: '2px solid #16A34A',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Recall Rate
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(22, 163, 74, 0.12)',
                      border: '1px solid rgba(22, 163, 74, 0.3)',
                      color: '#15803D',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={11} />
                      HIGH CAPTURE
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#15803D', lineHeight: 1 }}>
                      {(((evaluation?.recall ?? 0.727)) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      True positive attack entity retrieval
                    </div>
                  </div>
                </div>

                {/* KPI 4: Critical False Positives */}
                <div className="glass-panel" style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: '2px solid #EA580C',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                      Critical False Positives
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(234, 88, 12, 0.12)',
                      border: '1px solid rgba(234, 88, 12, 0.3)',
                      color: '#EA580C',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Flame size={11} />
                      NOISE METRIC
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#EA580C', lineHeight: 1 }}>
                      {evaluation?.critical_false_positives ?? 20}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Benign entities escalated to high/critical
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-Scenario Dynamic Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '16px'
              }}>
                {(evaluation?.per_scenario || [
                  { scenario_id: 'S1', detected: true, expected_entities: ['185.220.101.7', 'deploy', 'sysupdate'], found_entities: ['185.220.101.7', 'deploy', 'sysupdate'] },
                  { scenario_id: 'S2', detected: true, expected_entities: ['45.33.10.8', 'user05'], found_entities: ['45.33.10.8', 'user05'] },
                  { scenario_id: 'S3', detected: true, expected_entities: ['45.33.10.9'], found_entities: ['45.33.10.9'] },
                  { scenario_id: 'S4', detected: false, expected_entities: ['192.168.100.10', '192.168.100.11', '192.168.100.12'], found_entities: [] },
                  { scenario_id: 'S5', detected: true, expected_entities: ['172.16.5.20', 'user15'], found_entities: ['172.16.5.20', 'user15'] }
                ]).map((sc) => {
                  const metaMap = {
                    S1: { name: 'SSH Compromise & Cron Backdoor', mitre: 'T1110.001 · T1053.003', target: 'Bastion SSH -> /etc/cron.d/sysupdate' },
                    S2: { name: 'Distributed Password Spraying', mitre: 'T1110.003 · Spraying Campaign', target: 'Auth Subsystem -> Multi-Account Probe' },
                    S3: { name: 'Web Recon -> SQLi -> Exfiltration', mitre: 'T1190 · T1048.003 (Exfil)', target: 'NGINX Access Logs -> Outbound HTTPS' },
                    S4: { name: 'Low-and-Slow Subnet Distributed Pivot', mitre: 'T1018 · Low Threshold Lateral', target: 'Subnet 192.168.100.0/24 Workstations' },
                    S5: { name: 'Insider Off-Hours Sudo & Anomalous Egress', mitre: 'T1078 · Insider Threat', target: 'Finance Host -> Sudoers Escalation' },
                  };
                  const meta = metaMap[sc.scenario_id] || { name: `Scenario ${sc.scenario_id}`, mitre: 'T1000 · Cyber Kill Chain', target: 'Target Infrastructure' };

                  const expected = sc.expected_entities || [];
                  const found = sc.found_entities || [];
                  const expectedCount = expected.length;
                  const foundCount = found.length;
                  const isFullyMatched = foundCount >= expectedCount && expectedCount > 0;
                  const isZeroMatched = foundCount === 0;

                  return (
                    <div
                      key={sc.scenario_id}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        minHeight: '290px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(235, 225, 215, 0.7)',
                              color: '#111827',
                              border: '1px solid var(--border-subtle)'
                            }}>
                              {sc.scenario_id}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {meta.mitre}
                            </span>
                          </div>

                          {sc.detected ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              background: 'rgba(22, 163, 74, 0.12)',
                              border: '1px solid rgba(22, 163, 74, 0.3)',
                              color: '#15803D',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}>
                              <CheckCircle2 size={12} /> DETECTED
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              background: 'rgba(220, 38, 38, 0.12)',
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                              color: '#DC2626',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}>
                              <AlertTriangle size={12} /> MISSED
                            </span>
                          )}
                        </div>

                        <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                          {meta.name}
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          {meta.target}
                        </div>
                      </div>

                      <div style={{ flex: 1, padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            Entity Match Ratio
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isFullyMatched ? 'rgba(22, 163, 74, 0.12)' : (isZeroMatched ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)'),
                            border: `1px solid ${isFullyMatched ? 'rgba(22, 163, 74, 0.3)' : (isZeroMatched ? 'rgba(220, 38, 38, 0.3)' : 'rgba(217, 119, 6, 0.3)')}`,
                            color: isFullyMatched ? '#15803D' : (isZeroMatched ? '#DC2626' : '#D97706'),
                          }}>
                            {foundCount}/{expectedCount} matched
                          </span>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Expected Entities ({expectedCount}):
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {expected.map((e, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.73rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(240, 235, 226, 0.7)',
                                  border: '1px solid var(--border-subtle)',
                                  color: '#374151',
                                }}
                              >
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>
                            Captured Entities ({foundCount}):
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {found.length > 0 ? (
                              found.map((e, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.73rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(22, 163, 74, 0.12)',
                                    border: '1px solid rgba(22, 163, 74, 0.3)',
                                    color: '#15803D',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Check size={11} strokeWidth={2.8} />
                                  {e}
                                </span>
                              ))
                            ) : (
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                color: '#9CA3AF',
                                fontStyle: 'italic',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: 'rgba(240, 235, 226, 0.6)',
                                border: '1px dashed var(--border-subtle)',
                              }}>
                                None captured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)'
                      }}>
                        <span>Validation Status</span>
                        <span style={{ fontWeight: 600, color: sc.detected ? '#15803D' : '#6B7280' }}>
                          {sc.detected ? 'Verified by Correlation Graph' : 'Requires Subnet Correlation Rule'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── TAB: UPLOAD & SIMULATE ───────────────────────────────────────── */}
          {activeTab === 'upload' && (
            <div style={{ maxWidth: '840px', margin: '0 auto' }}>
              <div style={{ marginBottom: '22px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827' }}>Run Detection & Simulation</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Inject synthetic multi-stage attack scenarios into 3-day baseline traffic or upload logs.
                </p>
              </div>

              {/* Simulation Configuration Card */}
              <div className="glass-panel" style={{ padding: '26px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Crosshair size={20} color="#EA580C" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                    Interactive Attack Simulator (Ground-Truth Labels)
                  </h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '16px' }}>
                  Select scenarios to inject into 3-day baseline traffic. The engine will parse, build baselines, run detection rules, and generate evaluation metrics:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                  {[
                    { id: 'S1', title: 'SSH Compromise with Backdoor (S1)', desc: 'Brute-force SSH, deploy backdoor cron, exfiltrate data' },
                    { id: 'S2', title: 'Password Spraying Attack (S2)', desc: 'Distributed authentication attempts across multiple users' },
                    { id: 'S3', title: 'Web Recon -> SQLi -> Exfiltration (S3)', desc: 'Vulnerability scanning followed by SQL injection' },
                    { id: 'S4', title: 'Low-and-Slow Subnet Distributed (S4)', desc: 'Slow port-knocking and lateral movement under threshold' },
                    { id: 'S5', title: 'Insider Off-Hours Sudo & Download (S5)', desc: 'Authorized employee performing off-hours sudo elevation' },
                  ].map(s => (
                    <label 
                      key={s.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        background: selectedScenarios[s.id] ? 'rgba(234, 88, 12, 0.08)' : 'rgba(255, 255, 255, 0.6)', 
                        border: `1px solid ${selectedScenarios[s.id] ? 'rgba(234, 88, 12, 0.4)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!selectedScenarios[s.id]} 
                        onChange={(e) => setSelectedScenarios(prev => ({ ...prev, [s.id]: e.target.checked }))}
                        style={{ accentColor: '#EA580C', width: '16px', height: '16px' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>{s.title}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{s.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <button 
                  className="btn-peach" 
                  onClick={handleRunSimulation} 
                  disabled={simulating}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} fill="#FFFFFF" />}
                  <span>{simulating ? 'Generating & Analyzing Dataset...' : 'Generate Synthetic Traffic & Correlate Attack Chains'}</span>
                </button>
              </div>

              {/* Log Upload Card */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Upload size={18} color="#EA580C" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                    Upload Custom Server Logs
                  </h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '14px' }}>
                  Ingest raw Linux auth.log, NGINX access.log, or syslog files.
                </p>

                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileUpload}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px dashed var(--border-medium)',
                    color: 'var(--text-secondary)',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ─── FOOTER BAR (Minimal & Floating) ────────────────────────────────── */}
      <footer style={{
        padding: '16px 8px 4px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
      }}>
        <div>ChainTrace v1.2.0 · ALGOTHON'26 · Problem Statement ALG-CYBER-01</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Detection Engine: <strong>Bhanu Prasad</strong></span>
          <span>Frontend & Simulation: <strong>Mahadev H</strong></span>
        </div>
      </footer>
    </div>
  );
}
