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

/* Hero Waves SVG — matches reference image exactly: warm orange wave terrain in bottom-right of hero */
function HeroWavesSvg() {
  return (
    <svg
      viewBox="0 0 900 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMaxYMax meet"
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: '65%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <defs>
        {/* Warm orange ambient glow */}
        <radialGradient id="hglow" cx="70%" cy="65%" r="50%">
          <stop offset="0%" stopColor="#FFD49A" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#FFBA70" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
        {/* Wave fill — orange warm */}
        <linearGradient id="wf1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF9944" stopOpacity="0" />
          <stop offset="25%" stopColor="#FF8833" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF6611" stopOpacity="0.20" />
        </linearGradient>
        <linearGradient id="wf2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFAA55" stopOpacity="0" />
          <stop offset="30%" stopColor="#FF9933" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FF7722" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="wf3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFCC88" stopOpacity="0" />
          <stop offset="35%" stopColor="#FFB366" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FF9944" stopOpacity="0.10" />
        </linearGradient>
        <linearGradient id="wf4" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFE0B2" stopOpacity="0" />
          <stop offset="40%" stopColor="#FFD080" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FFBB55" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Warm glow backdrop */}
      <ellipse cx="620" cy="160" rx="300" ry="160" fill="url(#hglow)" />

      {/* Wave layer 1 — deepest (bottom-most), coral-orange, fills entire bottom */}
      <path
        d="M 0 240 C 100 200, 180 235, 290 195 C 380 160, 450 210, 550 172 C 650 134, 740 185, 900 148 L 900 260 L 0 260 Z"
        fill="url(#wf1)" opacity="0.95"
      />
      <path
        d="M 0 240 C 100 200, 180 235, 290 195 C 380 160, 450 210, 550 172 C 650 134, 740 185, 900 148"
        stroke="#FF8833" strokeWidth="2.0" fill="none" opacity="0.60"
      />

      {/* Wave layer 2 — amber, slightly higher */}
      <path
        d="M 0 214 C 90 174, 175 210, 280 170 C 368 138, 440 185, 540 148 C 640 110, 728 162, 900 122 L 900 260 L 0 260 Z"
        fill="url(#wf2)" opacity="0.85"
      />
      <path
        d="M 0 214 C 90 174, 175 210, 280 170 C 368 138, 440 185, 540 148 C 640 110, 728 162, 900 122"
        stroke="#FFAA44" strokeWidth="1.6" fill="none" opacity="0.55"
      />

      {/* Wave layer 3 — warm gold */}
      <path
        d="M 0 188 C 80 148, 165 184, 268 145 C 356 112, 428 158, 528 122 C 628 86, 718 138, 900 98 L 900 260 L 0 260 Z"
        fill="url(#wf3)" opacity="0.75"
      />
      <path
        d="M 0 188 C 80 148, 165 184, 268 145 C 356 112, 428 158, 528 122 C 628 86, 718 138, 900 98"
        stroke="#FFCC66" strokeWidth="1.3" fill="none" opacity="0.50"
      />

      {/* Wave layer 4 — pale peach, near upper */}
      <path
        d="M 0 162 C 72 122, 155 158, 255 120 C 344 86, 414 132, 514 96 C 614 60, 704 112, 900 74 L 900 260 L 0 260 Z"
        fill="url(#wf4)" opacity="0.60"
      />
      <path
        d="M 0 162 C 72 122, 155 158, 255 120 C 344 86, 414 132, 514 96 C 614 60, 704 112, 900 74"
        stroke="#FFE099" strokeWidth="1.1" fill="none" opacity="0.42"
      />

      {/* Wave layer 5 — lightest crest line */}
      <path
        d="M 0 136 C 65 96, 145 132, 242 96 C 332 62, 400 106, 500 72 C 600 36, 690 88, 900 52"
        stroke="#FFF2CC" strokeWidth="0.9" fill="none" opacity="0.35"
      />

      {/* Fine ripple details */}
      <path d="M 0 226 C 85 186, 168 222, 272 182 C 358 148, 430 196, 530 160 C 630 122, 720 172, 900 134"
        stroke="#FF9955" strokeWidth="0.8" fill="none" opacity="0.30" strokeDasharray="4 5" />
      <path d="M 0 200 C 78 160, 160 196, 260 158 C 348 124, 420 170, 520 134 C 620 98, 710 148, 900 110"
        stroke="#FFBB77" strokeWidth="0.7" fill="none" opacity="0.25" strokeDasharray="3 4" />
      <path d="M 0 174 C 70 134, 150 170, 248 132 C 338 98, 408 144, 506 108 C 606 72, 698 122, 900 86"
        stroke="#FFD4A3" strokeWidth="0.6" fill="none" opacity="0.20" strokeDasharray="2 4" />
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
  const [analysisId, setAnalysisId] = useState(() => localStorage.getItem('chaintrace_analysis_id') || '');
  const [analyses, setAnalyses] = useState([]);
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incidentDetail, setIncidentDetail] = useState(null);
  const [entities, setEntities] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Helper: Apply offline mock data
  const applyMockData = () => {
    setSummary(mockSummary);
    setIncidents(mockIncidents);
    setSelectedIncidentId(mockIncidents[0]?.id || 'inc-001');
    setIncidentDetail(mockIncidentDetail);
    setEntities(mockEntities);
    setEvaluation(mockEvaluation);
    setAnalyses([{
      id: 'demo-simulation',
      source: 'simulation',
      stats: mockSummary.stats || { events: 5890, parsed: 5890, skipped: 0, alerts: 196, incidents: 10 },
      created_at: new Date().toISOString()
    }]);
    setAnalysisId('demo-simulation');
  };

  // 1. Initial boot & periodic backend health check
  useEffect(() => {
    initApp();
    const interval = setInterval(async () => {
      await checkHealth();
    }, 5000);
    return () => clearInterval(interval);
  }, [useMocks]);

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
        return true;
      } else {
        setBackendAlive(false);
        return false;
      }
    } catch {
      setBackendAlive(false);
      return false;
    }
  }

  // App initialization on mount or mode change
  async function initApp() {
    setLoading(true);
    const alive = await checkHealth();
    if (alive && !useMocks) {
      await fetchAnalyses();
    } else {
      applyMockData();
    }
    setLoading(false);
  }

  // 2. Fetch analyses list from backend and restore active analysis
  async function fetchAnalyses(preferredId = null) {
    try {
      const res = await fetch(`${API_BASE}/analyses`);
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data);
        if (data.length > 0) {
          const storedId = preferredId || localStorage.getItem('chaintrace_analysis_id') || analysisId;
          const matched = data.find(a => a.id === storedId);
          const targetId = matched ? matched.id : data[0].id;
          setAnalysisId(targetId);
          localStorage.setItem('chaintrace_analysis_id', targetId);
          await loadAnalysisData(targetId);
        } else {
          // Backend is alive, but 0 analyses yet
          setAnalysisId('');
          setSummary(null);
          setIncidents([]);
          setSelectedIncidentId(null);
          setIncidentDetail(null);
          setEntities([]);
          setEvaluation(null);
        }
      }
    } catch (e) {
      console.warn("Failed fetching analyses:", e);
      if (!useMocks) applyMockData();
    }
  }

  // 3. Load active analysis data by ID
  async function loadAnalysisData(id) {
    if (!id || id === 'demo-simulation') {
      if (useMocks || !backendAlive) {
        applyMockData();
      }
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const sumRes = await fetch(`${API_BASE}/analyses/${id}/summary`);
      if (sumRes.ok) {
        setSummary(await sumRes.json());
      } else {
        throw new Error(`Summary not found (${sumRes.status})`);
      }

      const incRes = await fetch(`${API_BASE}/analyses/${id}/incidents`);
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData);
        if (incData.length > 0) {
          const firstId = incData[0].id;
          setSelectedIncidentId(firstId);
          await fetchIncidentDetail(id, firstId);
        } else {
          setSelectedIncidentId(null);
          setIncidentDetail(null);
        }
      } else {
        setIncidents([]);
        setSelectedIncidentId(null);
        setIncidentDetail(null);
      }

      const entRes = await fetch(`${API_BASE}/analyses/${id}/entities`);
      if (entRes.ok) setEntities(await entRes.json());
      else setEntities([]);

      const evalRes = await fetch(`${API_BASE}/analyses/${id}/evaluation`);
      if (evalRes.ok) {
        setEvaluation(await evalRes.json());
      } else {
        setEvaluation(null);
      }

    } catch (err) {
      setErrorMsg("Failed to load analysis: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 4. Fetch single incident detail
  async function fetchIncidentDetail(aid, incId) {
    const targetAid = aid || analysisId;
    const targetIncId = incId || selectedIncidentId;
    if (!targetAid || !targetIncId) return;

    if (useMocks || !backendAlive || targetAid === 'demo-simulation') {
      setIncidentDetail(mockIncidentDetail);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/analyses/${targetAid}/incidents/${targetIncId}`);
      if (res.ok) {
        const data = await res.json();
        setIncidentDetail(data);
      } else {
        console.warn(`Incident ${targetIncId} not found in analysis ${targetAid}`);
      }
    } catch (err) {
      console.error("Failed loading incident detail:", err);
    }
  }

  // Handle manual dataset selection from dropdown
  async function handleSelectAnalysis(newId) {
    setAnalysisId(newId);
    localStorage.setItem('chaintrace_analysis_id', newId);
    setSelectedIncidentId(null);
    setIncidentDetail(null);
    await loadAnalysisData(newId);
  }

  // Handle manual refresh button
  async function handleRefresh() {
    setLoading(true);
    const alive = await checkHealth();
    if (alive && !useMocks) {
      await fetchAnalyses(analysisId);
    } else {
      applyMockData();
    }
    setLoading(false);
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
        applyMockData();
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
      localStorage.setItem('chaintrace_analysis_id', resp.analysis_id);
      setAnalysisId(resp.analysis_id);
      setSelectedIncidentId(null);
      setIncidentDetail(null);
      await fetchAnalyses(resp.analysis_id);
      
      setSuccessMsg(`✓ Attack campaign simulation completed! Ingested ${resp.stats?.events ?? 5890} events across ${chosen.join(', ')}.`);
      setActiveTab('overview');
    } catch (err) {
      setErrorMsg("Simulation failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  }

  // 6. Upload logs trigger
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Analysis failed");
      }
      const resp = await res.json();
      localStorage.setItem('chaintrace_analysis_id', resp.analysis_id);
      setAnalysisId(resp.analysis_id);
      setSelectedIncidentId(null);
      setIncidentDetail(null);
      await fetchAnalyses(resp.analysis_id);
      setSuccessMsg(`✓ Upload analyzed! Detected ${resp.stats?.incidents ?? 0} incidents across ${resp.stats?.events ?? 0} events.`);
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

  const chartData = (summary?.events_over_time && summary.events_over_time.length > 0)
    ? summary.events_over_time.map(d => ({
        time: formatTimeLabel(d.hour || d.time),
        count: d.count
      }))
    : (useMocks ? defaultChartData : [{ time: '00:00', count: 0 }]);

  const maxSpikeIndex = chartData.reduce((maxI, d, i, arr) => d.count > arr[maxI].count ? i : maxI, 0);
  const spikePercent = Math.max(15, Math.min(82, (maxSpikeIndex / Math.max(1, chartData.length - 1)) * 92));
  const spikeTime = chartData[maxSpikeIndex]?.time || '00:00';
  const spikeCount = chartData[maxSpikeIndex]?.count || 0;

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
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(28px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
        boxShadow: '0 8px 32px rgba(160, 100, 40, 0.08), inset 0 1.5px 0 rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.82)',
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
            background: 'rgba(255, 255, 255, 0.65)',
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
              onChange={(e) => handleSelectAnalysis(e.target.value)}
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
                  {a.id.slice(0, 8)}... ({a.source === 'simulation' ? 'Sim' : 'Upload'} · {a.stats?.events ?? 0} evts · {a.stats?.incidents ?? 0} inc)
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
              background: 'rgba(255, 255, 255, 0.75)',
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
          background: 'rgba(255, 255, 255, 0.52)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          boxShadow: '0 10px 35px rgba(160, 100, 40, 0.08), inset 0 1.5px 0 rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.82)',
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
              {/* 1. Hero Card — Exact Reference Match: warm wave background, left text, right CTA */}
              <div
                className="glass-panel"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '30px 36px',
                  borderRadius: '22px',
                  minHeight: '188px',
                  marginBottom: '16px',
                  background: 'linear-gradient(105deg, rgba(255,255,255,0.58) 0%, rgba(255,248,240,0.46) 42%, rgba(255,236,218,0.32) 75%, rgba(255,225,195,0.22) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 12px 36px rgba(180, 100, 40, 0.12), inset 0 1.5px 0 rgba(255,255,255,0.98)',
                  backdropFilter: 'blur(30px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                {/* Wave pattern SVG fills right portion of hero */}
                <HeroWavesSvg />

                {/* Left Text Content */}
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '580px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span className="pulse-green" />
                    <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      INTRUSION DETECTION SYSTEM ACTIVE
                    </span>
                  </div>

                  <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.20 }}>
                    Correlating{' '}
                    <span style={{ color: '#E8440A' }}>Multi-Stage Cyber Attacks</span>
                    {' '}from Raw Server Logs
                  </h1>

                  <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '10px', lineHeight: 1.55 }}>
                    Automated kill-chain grouping, IP-to-User pivot tracking, and explainable rule heuristics (RI-R11).
                  </p>
                </div>

                {/* Right CTA Button — pill shape with play icon, matches reference */}
                <div style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
                  <button
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    style={{
                      background: 'linear-gradient(135deg, #FF7733 0%, #EE3311 100%)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.90rem',
                      padding: '13px 26px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.35)',
                      boxShadow: '0 8px 28px rgba(238, 68, 24, 0.40), 0 2px 6px rgba(238, 68, 24, 0.18)',
                      cursor: simulating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { if (!simulating) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(238,68,24,0.52), 0 4px 10px rgba(238,68,24,0.22)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(238, 68, 24, 0.40), 0 2px 6px rgba(238, 68, 24, 0.18)'; }}
                  >
                    {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={15} fill="#ffffff" />}
                    <span>{simulating ? 'Running Simulation...' : 'Run Live Attack Simulation'}</span>
                    <ArrowRight size={15} strokeWidth={2.5} />
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
                      {summary?.stats?.parsed !== undefined ? summary.stats.parsed.toLocaleString() : (summary?.stats?.lines_total !== undefined ? summary.stats.lines_total.toLocaleString() : (useMocks ? '5,890' : '0'))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {summary?.stats?.skipped !== undefined ? `${summary.stats.skipped} malformed skipped` : (useMocks ? '0 malformed skipped' : '0 skipped')}
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
                      {summary?.stats?.events !== undefined ? summary.stats.events.toLocaleString() : (useMocks ? '5,890' : '0')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {summary?.files && summary.files.length > 0 ? summary.files.join(' + ') : 'Auth.log + Access.log'}
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
                      {summary?.stats?.alerts !== undefined ? summary.stats.alerts.toLocaleString() : (useMocks ? '196' : '0')}
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
                      {(incidents && incidents.length !== undefined) ? incidents.length : (summary?.stats?.incidents !== undefined ? summary.stats.incidents : (useMocks ? 10 : 0))}
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
                    {evaluation ? (
                      <>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                          {evaluation.scenarios_detected}/{evaluation.scenarios_total}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Ground-truth verified
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16A34A', letterSpacing: '-0.02em', marginTop: '2px', lineHeight: 1 }}>
                          Live Logs
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Real traffic ingest
                        </div>
                      </>
                    )}
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

                  {/* Anomalous Spike Box Over Peak (shown only when peak count > 0) */}
                  {spikeCount > 0 && (
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
                        <span>Peak Activity</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {spikeTime} - Peak Window
                      </div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#111827', marginTop: '1px' }}>
                        ~ {spikeCount.toLocaleString()} events
                      </div>
                    </div>
                  )}

                  {/* Recharts Area Chart */}
                  <div style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="warmPeachGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={0.75} />
                            <stop offset="30%" stopColor="#FB923C" stopOpacity={0.48} />
                            <stop offset="70%" stopColor="#FED7AA" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#FFF7ED" stopOpacity={0.04} />
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

                    {/* Table Rows (Dynamically rendered from top_entities / entities) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {(() => {
                        const topEntities = (summary?.top_entities && summary.top_entities.length > 0)
                          ? summary.top_entities.slice(0, 5).map(e => ({
                              val: e.value,
                              type: e.type === 'ip' ? 'IP Address' : 'User Account',
                              score: e.risk_score ?? 100,
                              isIp: e.type === 'ip',
                              level: e.level,
                            }))
                          : (entities && entities.length > 0)
                            ? entities.slice(0, 5).map(e => ({
                                val: e.value,
                                type: e.type === 'ip' ? 'IP Address' : 'User Account',
                                score: e.risk_score ?? 100,
                                isIp: e.type === 'ip',
                                level: e.level,
                              }))
                            : (useMocks
                              ? [
                                  { val: '185.220.101.7', type: 'IP Address', score: 100, isIp: true },
                                  { val: '45.33.10.8', type: 'IP Address', score: 100, isIp: true },
                                  { val: 'deploy', type: 'User Account', score: 100, isIp: false },
                                  { val: '45.33.10.9', type: 'IP Address', score: 100, isIp: true },
                                  { val: '172.16.5.20', type: 'IP Address', score: 100, isIp: true },
                                ]
                              : []);

                        if (topEntities.length === 0) {
                          return (
                            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              No high-risk entities identified in current dataset.
                            </div>
                          );
                        }

                        return topEntities.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setEntitySearch(item.val);
                              setActiveTab('entities');
                            }}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.65fr 1.15fr 0.8fr 0.5fr',
                              gap: '8px',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderBottom: i < topEntities.length - 1 ? '1px solid rgba(220, 210, 195, 0.4)' : 'none',
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
                                background: item.score >= 80 ? '#EF4444' : item.score >= 50 ? '#F59E0B' : '#16A34A',
                                color: '#fff',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                boxShadow: item.score >= 80 ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none',
                              }}>
                                {item.score}
                              </span>
                            </div>

                            {/* Trend Sparkline Bars */}
                            <div style={{ textAlign: 'right' }}>
                              <SparklineBars />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Bottom Security Alert Card (Highest Priority Attack) */}
              <div 
                className="glass-panel" 
                style={{
                  padding: '18px 26px',
                  border: `1px solid ${incidents && incidents.length > 0 ? 'rgba(252, 165, 165, 0.70)' : 'rgba(134, 239, 172, 0.70)'}`,
                  background: incidents && incidents.length > 0 
                    ? 'linear-gradient(90deg, rgba(254, 226, 226, 0.55) 0%, rgba(255, 241, 242, 0.42) 50%, rgba(255, 247, 237, 0.42) 100%)'
                    : 'linear-gradient(90deg, rgba(240, 253, 244, 0.65) 0%, rgba(240, 253, 250, 0.5) 100%)',
                  boxShadow: '0 10px 32px rgba(220, 38, 38, 0.09), inset 0 1.5px 0 rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(28px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                {/* Left: Shield Icon + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: incidents && incidents.length > 0 
                      ? 'linear-gradient(135deg, #FF5555 0%, #DC2626 100%)'
                      : 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: incidents && incidents.length > 0 ? '0 4px 14px rgba(220, 38, 38, 0.35)' : '0 4px 14px rgba(5, 150, 105, 0.35)',
                    flexShrink: 0,
                  }}>
                    {incidents && incidents.length > 0 ? <ShieldAlert size={24} strokeWidth={2.4} /> : <Shield size={24} strokeWidth={2.4} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                      <span style={{
                        border: `1px solid ${incidents && incidents.length > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                        background: incidents && incidents.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: incidents && incidents.length > 0 ? '#DC2626' : '#059669',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        letterSpacing: '0.04em',
                      }}>
                        {incidents && incidents.length > 0 ? 'HIGHEST PRIORITY ATTACK' : 'BASELINE VERIFIED'}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                        {incidents && incidents[0] ? incidents[0].title : 'No Active Threat Incidents'}
                      </h3>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {incidents && incidents[0] 
                        ? (incidents[0].summary || 'Assessment: likely security threat.') 
                        : 'All parsed log records processed without triggering correlated multi-stage attack chains.'}
                    </div>
                  </div>
                </div>

                {/* Right: Status Pill, Timestamp & Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    background: incidents && incidents[0] 
                      ? (incidents[0].level === 'high' ? '#F59E0B' : incidents[0].level === 'medium' ? '#EA580C' : '#EF4444') 
                      : '#10B981',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}>
                    {incidents && incidents[0] ? (incidents[0].level ? incidents[0].level.toUpperCase() : 'CRITICAL') : 'CLEAN'}
                  </span>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {incidents && incidents[0]?.start ? new Date(incidents[0].start).toLocaleString() : 'Live Baseline'}
                  </span>

                  {incidents && incidents.length > 0 ? (
                    <button 
                      onClick={() => {
                        setSelectedIncidentId(incidents[0].id);
                        fetchIncidentDetail(analysisId, incidents[0].id);
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
                  ) : (
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className="btn-peach"
                      style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                    >
                      <span>Simulate Attack</span>
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </button>
                  )}
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
          {activeTab === 'incident-detail' && !incidentDetail && (
            <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', maxWidth: '640px', margin: '40px auto' }}>
              <ShieldAlert size={36} color="#EA580C" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                No Incident Selected
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '20px' }}>
                No correlated incidents found for the active analysis dataset.
              </p>
              <button 
                onClick={() => setActiveTab('incidents')}
                className="btn-peach"
                style={{ padding: '8px 18px', fontSize: '0.84rem' }}
              >
                ← View Incidents List
              </button>
            </div>
          )}

          {activeTab === 'incident-detail' && incidentDetail && (() => {
            const mitreTechniques = (incidentDetail.alerts && incidentDetail.alerts.length > 0)
              ? incidentDetail.alerts
                  .filter(a => a.mitre?.technique)
                  .map(a => ({ id: a.mitre.technique, name: `${a.stage} · ${a.mitre.tactic || ''}` }))
                  .filter((v, i, arr) => arr.findIndex(t => t.id === v.id) === i)
              : (incidentDetail.mitre_techniques || []);

            const rulesTriggered = (incidentDetail.alerts && incidentDetail.alerts.length > 0)
              ? incidentDetail.alerts.map(a => ({
                  rule_id: a.rule_id,
                  rule_name: a.rule_name,
                  score_contribution: a.points,
                  severity: a.severity,
                  reason: a.reason,
                }))
              : (incidentDetail.rules_triggered || []);

            const evidenceLines = (incidentDetail.evidence_lines && incidentDetail.evidence_lines.length > 0)
              ? incidentDetail.evidence_lines
              : (incidentDetail.evidence ? Object.values(incidentDetail.evidence) : (incidentDetail.evidence_events || []));

            return (
              <div>
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <button 
                    onClick={() => setActiveTab('incidents')}
                    style={{ background: 'transparent', border: 'none', color: '#EA580C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    ← Back to Incident List
                  </button>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <a
                      href={`${API_BASE}/analyses/${analysisId}/incidents/${incidentDetail.id}/report?format=md`}
                      download={`chaintrace-${incidentDetail.id}.md`}
                      className="btn-glass"
                      style={{ fontSize: '0.74rem', padding: '5px 12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#111827' }}
                      title="Download Incident Report (Markdown)"
                    >
                      <FileText size={12} color="#EA580C" />
                      <span>Report (MD)</span>
                    </a>
                    <a
                      href={`${API_BASE}/analyses/${analysisId}/incidents/${incidentDetail.id}/report?format=json`}
                      download={`chaintrace-${incidentDetail.id}.json`}
                      className="btn-glass"
                      style={{ fontSize: '0.74rem', padding: '5px 12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#111827' }}
                      title="Download Full JSON"
                    >
                      <ExternalLink size={12} color="#EA580C" />
                      <span>JSON</span>
                    </a>
                    <button 
                      className="btn-glass"
                      onClick={() => handleCopy(incidentDetail.id)}
                      style={{ fontSize: '0.74rem', padding: '5px 12px' }}
                    >
                      {copiedText === incidentDetail.id ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                      <span>{copiedText === incidentDetail.id ? 'Copied' : 'Copy Incident ID'}</span>
                    </button>
                  </div>
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
                          background: incidentDetail.level === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: incidentDetail.level === 'critical' ? '#DC2626' : '#D97706',
                          border: `1px solid ${incidentDetail.level === 'critical' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
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

                  {/* Remediation Recommendation Box */}
                  {incidentDetail.recommendation && (
                    <div style={{
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: 'rgba(234, 88, 12, 0.08)',
                      border: '1px solid rgba(234, 88, 12, 0.25)',
                      marginTop: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EA580C', fontWeight: 800, fontSize: '0.74rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                        <Shield size={14} /> Actionable Remediation Guidance
                      </div>
                      <p style={{ fontSize: '0.84rem', color: '#1F2937', lineHeight: 1.5, margin: 0 }}>
                        {incidentDetail.recommendation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Kill-Chain Chronological Attack Story */}
                {incidentDetail.story && incidentDetail.story.length > 0 && (
                  <div className="glass-panel" style={{ padding: '20px', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Flame size={16} color="#EA580C" /> Chronological Kill-Chain Attack Story
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {incidentDetail.story.map((st, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.7)',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FF9944 0%, #FF6622 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            flexShrink: 0,
                          }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase' }}>
                                {st.stage}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {st.ts ? new Date(st.ts).toLocaleString() : ''}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: '#1F2937', lineHeight: 1.5, margin: 0 }}>
                              {st.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MITRE ATT&CK & Rules Triggered */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                      MITRE ATT&CK Mapping
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mitreTechniques.length > 0 ? (
                        mitreTechniques.map((m, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(245, 240, 230, 0.6)', border: '1px solid rgba(220, 210, 195, 0.5)', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 600 }}>{m.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#EA580C', fontWeight: 700 }}>{m.id}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No MITRE techniques mapped.</div>
                      )}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                      Explainable Rules (R1–R11)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {rulesTriggered.length > 0 ? (
                        rulesTriggered.map((r, i) => (
                          <div key={i} style={{ padding: '8px 12px', background: 'rgba(245, 240, 230, 0.6)', border: '1px solid rgba(220, 210, 195, 0.5)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', color: '#EA580C', fontWeight: 700 }}>{r.rule_id} · {r.rule_name}</span>
                              <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 800 }}>+{r.score_contribution} pts</span>
                            </div>
                            {r.reason && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {r.reason}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No detection rules recorded.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence Log Stream */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#111827' }}>
                      Raw Log Evidence Chain ({evidenceLines.length} events)
                    </h3>
                  </div>
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
                    {evidenceLines.length > 0 ? (
                      evidenceLines.map((ev, i) => (
                        <div key={i} style={{ borderBottom: '1px solid rgba(220, 210, 195, 0.5)', padding: '5px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#EA580C', fontWeight: 700 }}>{ev.ts ? new Date(ev.ts).toLocaleTimeString() : (ev.timestamp || '00:00')}</span>
                          <span style={{ color: '#16A34A', fontWeight: 700 }}>[{ev.type || ev.event_type || 'event'}]</span>
                          <span style={{ color: '#6B7280' }}>({ev.file ? `${ev.file}:${ev.line_no}` : ''})</span>
                          <span style={{ color: '#111827' }}>{ev.raw || ev.raw_snippet || `${ev.src_ip || ''} -> ${ev.user || ''}`}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text-muted)' }}>No raw evidence records attached to this incident.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

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
                      Active Dataset: {analysisId || 'None'}
                    </span>
                    {evaluation && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#15803D',
                        background: 'rgba(22, 163, 74, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(22, 163, 74, 0.3)'
                      }}>
                        BENCHMARK VALIDATED
                      </span>
                    )}
                  </div>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                    Evaluation & Detection Benchmark
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
                    Ground-truth validation scored automatically against synthetic multi-stage attack scenarios.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {analyses.filter(a => a.source === 'simulation').length > 0 && !evaluation && (
                    <button
                      onClick={() => {
                        const sim = analyses.find(a => a.source === 'simulation');
                        if (sim) handleSelectAnalysis(sim.id);
                      }}
                      className="btn-peach-outline"
                      style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                    >
                      <Target size={14} />
                      <span>Switch to Simulated Dataset</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="btn-peach"
                    style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                  >
                    <Play size={14} fill="#FFFFFF" />
                    <span>Run Attack Simulator</span>
                  </button>
                </div>
              </div>

              {!evaluation ? (
                /* Informative State for Uploaded Log Dataset */
                <div className="glass-panel" style={{ padding: '36px 32px', textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(232, 166, 106, 0.18)',
                    border: '1px solid rgba(232, 166, 106, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#E8A66A'
                  }}>
                    <Database size={26} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
                    Uploaded Log Dataset Active ({analysisId || 'Custom Upload'})
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '640px', margin: '0 auto 20px', lineHeight: 1.55 }}>
                    This dataset was ingested from a live syslog file. Ground-truth benchmark metrics (Precision, Recall, and Multi-Stage Scenario Matching) require known simulation targets. 
                    Your live incidents, alerts, and correlation stories are fully accessible in the <strong>Overview</strong> and <strong>Incidents</strong> tabs.
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    maxWidth: '680px',
                    margin: '0 auto 24px',
                    textAlign: 'left'
                  }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ingested Events</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111827' }}>{summary?.stats?.events?.toLocaleString() ?? 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Correlated Incidents</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#DC2626' }}>{summary?.stats?.incidents ?? incidents.length}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Triggered Alerts</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#D97706' }}>{summary?.stats?.alerts ?? 0}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setActiveTab('incidents')}
                      className="btn-peach-outline"
                      style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                    >
                      <ShieldAlert size={15} />
                      <span>Explore Ingested Incidents ({incidents.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="btn-peach"
                      style={{ padding: '9px 20px', fontSize: '0.85rem' }}
                    >
                      <Play size={15} fill="#FFFFFF" />
                      <span>Run Attack Simulation to Score Benchmark</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Full Benchmark Scoring View when evaluation data exists */
                <>
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
                          {(((evaluation.scenarios_detected) / (evaluation.scenarios_total || 1)) * 100).toFixed(0)}% PASS
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                          {evaluation.scenarios_detected}
                          <span style={{ fontSize: '1.15rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '4px' }}>
                            / {evaluation.scenarios_total}
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
                      borderTop: `2px solid ${evaluation.precision >= 0.8 ? '#16A34A' : '#D97706'}`,
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
                          background: evaluation.precision >= 0.8 ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                          border: `1px solid ${evaluation.precision >= 0.8 ? 'rgba(22, 163, 74, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
                          color: evaluation.precision >= 0.8 ? '#15803D' : '#D97706',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {evaluation.precision >= 0.8 ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                          {evaluation.precision >= 0.8 ? 'HIGH PRECISION' : 'TUNING ADVISORY'}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '2.1rem', fontWeight: 900, color: evaluation.precision >= 0.8 ? '#15803D' : '#D97706', lineHeight: 1 }}>
                          {(evaluation.precision * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          {evaluation.precision === 1 ? 'Zero false positives across campaign' : 'Evaluated against background volume'}
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
                          {(evaluation.recall * 100).toFixed(1)}%
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
                      borderTop: `2px solid ${evaluation.critical_false_positives === 0 ? '#16A34A' : '#EA580C'}`,
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
                          background: evaluation.critical_false_positives === 0 ? 'rgba(22, 163, 74, 0.12)' : 'rgba(234, 88, 12, 0.12)',
                          border: `1px solid ${evaluation.critical_false_positives === 0 ? 'rgba(22, 163, 74, 0.3)' : 'rgba(234, 88, 12, 0.3)'}`,
                          color: evaluation.critical_false_positives === 0 ? '#15803D' : '#EA580C',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {evaluation.critical_false_positives === 0 ? <CheckCircle2 size={11} /> : <Flame size={11} />}
                          {evaluation.critical_false_positives === 0 ? 'CLEAN BASELINE' : 'NOISE METRIC'}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '2.1rem', fontWeight: 900, color: evaluation.critical_false_positives === 0 ? '#15803D' : '#EA580C', lineHeight: 1 }}>
                          {evaluation.critical_false_positives}
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
                    {(evaluation.per_scenario || []).map((sc) => {
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

                            {sc.found_stages && sc.found_stages.length > 0 && (
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                  Kill Chain Stages:
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {sc.found_stages.map((st, sIdx) => (
                                    <span key={sIdx} style={{
                                      fontSize: '0.67rem',
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      background: 'rgba(232, 166, 106, 0.15)',
                                      color: '#9A4E11',
                                      border: '1px solid rgba(232, 166, 106, 0.3)',
                                    }}>
                                      {st}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
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
                            {sc.incident_id ? (
                              <button
                                onClick={() => {
                                  setSelectedIncidentId(sc.incident_id);
                                  fetchIncidentDetail(analysisId, sc.incident_id);
                                  setActiveTab('incidents');
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#15803D',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: 0,
                                  textDecoration: 'underline',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                View {sc.incident_id} →
                              </button>
                            ) : (
                              <span style={{ fontWeight: 600, color: sc.detected ? '#15803D' : '#6B7280' }}>
                                {sc.detected ? 'Verified by Correlation Graph' : 'Requires Subnet Correlation Rule'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
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
