import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, FileText, Crosshair, Users, 
  CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, 
  Terminal, Server, Play, Upload, RefreshCw, ChevronRight, 
  Search, Filter, ExternalLink, Database, Sparkles, Layers,
  Clock, Shield, Eye, Copy, Check, Zap, Flame, Radio,
  Cpu, Lock, Unlock, ArrowUpRight
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
      setAnalyses([{ id: 'demo-simulation', source: 'simulation', stats: mockSummary.stats, created_at: new Date().toISOString() }]);
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
        setActiveEvidenceRule(null);
      }
    } catch (e) {
      console.warn("Failed to load incident detail:", e);
    }
  }

  // Run simulation trigger
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
      
      setSuccessMsg(`✓ Attack campaign simulation completed! Ingested ${resp.stats?.events || 0} events across ${chosen.join(', ')}.`);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── Top Military/Tactical Header Bar ─────────────────────────────────── */}
      <header style={{
        background: '#0d1015',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        {/* Left: Brand + Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          {/* Logo & Product Badge */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
            onClick={() => setActiveTab('overview')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'var(--accent-lime)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(188, 252, 0, 0.35)',
            }}>
              <Zap size={18} color="#080a0c" strokeWidth={2.8} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.12rem', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>
                ChainTrace
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--accent-lime)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ALG-CYBER-01 · Threat Ops
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)' }} />

          {/* Clean High-Tech Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'incidents', label: 'Incidents', icon: ShieldAlert, count: incidents?.length },
              { id: 'entities', label: 'Entities', icon: Users, count: entities?.length },
              { id: 'evaluation', label: 'Evaluation', icon: CheckCircle2 },
              { id: 'upload', label: 'Simulate & Ingest', icon: Play },
            ].map(tab => {
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
                    padding: '7px 14px',
                    borderRadius: '5px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--border-strong)' : 'transparent',
                    background: isActive ? 'var(--bg-card-raised)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} color={isActive ? 'var(--accent-lime)' : 'var(--text-muted)'} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(188, 252, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? 'var(--accent-lime)' : 'var(--text-muted)',
                      fontWeight: 800,
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Dataset Selector & Live API Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Subtle Vertical Divider */}
          <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)' }} />

          {/* Active Dataset Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}>
            <Database size={13} color="var(--accent-lime)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dataset:
            </span>
            <select
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {analyses.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} ({a.source} · {a.stats?.events || 0} evts)
                </option>
              ))}
            </select>
          </div>

          {/* Live Sync / Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Refresh active analysis and server status"
            disabled={loading}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-medium)',
              borderRadius: '5px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Connection Indicator */}
          <div 
            onClick={() => setUseMocks(!useMocks)}
            title="Click to toggle between Live API and Mocks"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: (backendAlive && !useMocks) ? 'var(--accent-lime-subtle)' : 'var(--threat-high-bg)',
              border: `1px solid ${(backendAlive && !useMocks) ? 'var(--accent-lime-border)' : 'var(--threat-high-border)'}`,
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
            }}
          >
            <span className={backendAlive && !useMocks ? 'pulse-lime' : ''} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: (backendAlive && !useMocks) ? 'var(--accent-lime)' : 'var(--threat-high)',
            }} />
            <span style={{ color: (backendAlive && !useMocks) ? 'var(--accent-lime)' : 'var(--threat-high)' }}>
              {(backendAlive && !useMocks) ? 'LIVE BACKEND: 8000' : (useMocks ? 'OFFLINE MOCKS' : 'BACKEND OFFLINE')}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Viewport ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        
        {/* Sleek Dismissible Toast / Simulation Banner */}
        {successMsg && (
          <div style={{
            padding: '12px 18px',
            marginBottom: '18px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(188, 252, 0, 0.3)',
            borderLeft: '4px solid var(--accent-lime)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(188, 252, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-lime)',
                flexShrink: 0
              }}>
                <CheckCircle2 size={15} />
              </div>
              <div>
                <span style={{ fontWeight: 700, color: '#fff' }}>{successMsg}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  (Ground-truth labels synced in Evaluation Benchmark)
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSuccessMsg(null)}
              title="Dismiss notification"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
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

        {/* Error notification banner */}
        {errorMsg && (
          <div style={{
            padding: '12px 18px',
            marginBottom: '18px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 45, 85, 0.3)',
            borderLeft: '4px solid var(--threat-critical)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.84rem',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 45, 85, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--threat-critical)',
                flexShrink: 0
              }}>
                <AlertTriangle size={15} />
              </div>
              <span style={{ fontWeight: 600, color: 'var(--threat-critical)' }}>{errorMsg}</span>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              title="Dismiss error"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
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

        {/* ─── TAB: OVERVIEW ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            {/* Unique Interactive Live Command Banner */}
            <div className="card-solar" style={{
              padding: '18px 24px',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, rgba(188, 252, 0, 0.08) 0%, rgba(255, 119, 51, 0.04) 100%)',
              border: '1px solid var(--accent-lime-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="pulse-lime" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-lime)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    INTRUSION DETECTION SYSTEM ACTIVE
                  </span>
                  <span className="tag" style={{ fontSize: '0.66rem' }}>DATASET: {analysisId}</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  Correlating Multi-Stage Cyber Attacks from Raw Server Logs
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Automated kill-chain grouping, IP-to-User pivot tracking, and explainable rule heuristics (R1–R11).
                </div>
              </div>

              {/* Instant Simulation Action Button right on Overview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  className="btn-lime" 
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  style={{ padding: '9px 18px', fontSize: '0.84rem' }}
                >
                  {simulating ? <RefreshCw className="animate-spin" size={15} /> : <Play size={15} />}
                  <span>{simulating ? 'Injecting S1-S5 & Scoring...' : 'Run Live Attack Simulation'}</span>
                </button>
                <button 
                  className="btn-dark"
                  onClick={() => { checkHealth(); loadAnalysisData(analysisId); }}
                  title="Reload dataset"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}>
              {[
                { label: 'Lines Ingested', val: summary?.stats?.parsed || 0, sub: `${summary?.stats?.skipped || 0} malformed skipped`, icon: FileText, color: '#bcfc00' },
                { label: 'Events Normalized', val: summary?.stats?.events || 0, sub: 'Auth.log + Access.log', icon: Activity, color: '#00f0a0' },
                { label: 'Alerts Triggered', val: summary?.stats?.alerts || 0, sub: 'Rules R1–R11 without LLM', icon: AlertCircle, color: '#ffcc00' },
                { label: 'Correlated Attacks', val: summary?.stats?.incidents || 0, sub: 'Graph components', icon: ShieldAlert, color: '#ff2d55' },
                { label: 'Scenarios Detected', val: `${evaluation?.scenarios_detected ?? 4}/${evaluation?.scenarios_total ?? 5}`, sub: 'Benchmark proof', icon: CheckCircle2, color: '#bcfc00' },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="card-solar" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {card.label}
                      </span>
                      <Icon size={16} color={card.color} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {typeof card.val === 'number' ? card.val.toLocaleString() : card.val}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {card.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart + Top Entities */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Timeline Chart with Lime/Solar Gradient */}
              <div className="card-solar" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Events Over Time (Burst Detection)</h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Hourly traffic histogram identifying anomalous spikes</p>
                  </div>
                  <span className="badge badge-low">Normalized</span>
                </div>
                
                <div style={{ height: '210px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.events_over_time || []}>
                      <defs>
                        <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#bcfc00" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#bcfc00" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1d222e" vertical={false} />
                      <XAxis dataKey="time" stroke="#5e6878" fontSize={11} tickFormatter={(t) => t.slice(11, 16)} />
                      <YAxis stroke="#5e6878" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#13171e', 
                          border: '1px solid #2e374a', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          color: '#fff'
                        }} 
                      />
                      <Area type="monotone" dataKey="count" stroke="#bcfc00" strokeWidth={2} fillOpacity={1} fill="url(#limeGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Riskiest Entities */}
              <div className="card-solar" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Priority Attacker Entities</h3>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>IPs and Accounts with high risk</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('entities')} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-lime)', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    All <ArrowRight size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(summary?.top_entities || entities?.slice(0, 5) || []).map((ent, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 5px',
                          borderRadius: '3px',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          textTransform: 'uppercase'
                        }}>
                          {ent.type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
                          {ent.value}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge badge-${ent.level?.toLowerCase() || 'medium'}`}>
                          {ent.risk_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Critical Incident */}
            {incidents?.length > 0 && (
              <div className="card-solar" style={{ padding: '20px 24px', borderLeft: '4px solid var(--threat-critical)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-critical">Highest Priority Attack</span>
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#fff' }}>
                      {incidents[0].title}
                    </h3>
                  </div>
                  <button 
                    className="btn-lime"
                    onClick={() => {
                      setSelectedIncidentId(incidents[0].id);
                      setActiveTab('incident-detail');
                    }}
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    Examine Story & Evidence <ArrowRight size={13} />
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {incidents[0].summary}
                </p>
                <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {incidents[0].stages?.map((stage, i) => (
                    <span key={i} className="tag" style={{ color: 'var(--accent-lime)', borderColor: 'var(--accent-lime-border)' }}>
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: INCIDENTS LIST ──────────────────────────────────────────────── */}
        {activeTab === 'incidents' && (
          <div>
            <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Correlated Incidents</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
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
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: incidentFilter === filter ? 'var(--accent-lime)' : 'var(--border-subtle)',
                      background: incidentFilter === filter ? 'var(--accent-lime-subtle)' : 'var(--bg-card-raised)',
                      color: incidentFilter === filter ? 'var(--accent-lime)' : 'var(--text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
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
                  const levelClass = inc.level?.toLowerCase() || 'medium';
                  return (
                    <div 
                      key={inc.id}
                      className="card-solar card-interactive"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        cursor: 'pointer',
                        borderLeft: `3px solid var(--threat-${levelClass})`,
                      }}
                      onClick={() => {
                        setSelectedIncidentId(inc.id);
                        setActiveTab('incident-detail');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`badge badge-${levelClass}`}>
                            {inc.level} · {inc.risk_score}
                          </span>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                            {inc.title}
                          </h3>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            #{inc.id}
                          </span>
                        </div>

                        <button 
                          className="btn-dark" 
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
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
                            <span key={idx} className="tag" style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>
                              {stage}
                            </span>
                          ))}
                        </div>

                        {/* Pivot Entities Involved */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Entities:</span>
                          {inc.entities?.ips?.map(ip => (
                            <span key={ip} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>
                              {ip}
                            </span>
                          ))}
                          {inc.entities?.users?.map(u => (
                            <span key={u} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', background: 'var(--accent-solar-subtle)', color: 'var(--accent-solar)', padding: '1px 6px', borderRadius: '4px' }}>
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

        {/* ─── TAB: INCIDENT DETAIL (THE CENTERPIECE) ─────────────────────────── */}
        {activeTab === 'incident-detail' && incidentDetail && (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button 
                onClick={() => setActiveTab('incidents')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
              >
                ← Back to Incident List
              </button>

              <button 
                className="btn-dark"
                onClick={() => handleCopy(incidentDetail.id)}
                style={{ fontSize: '0.74rem', padding: '4px 10px' }}
              >
                {copiedText === incidentDetail.id ? <Check size={12} color="var(--accent-lime)" /> : <Copy size={12} />}
                <span>{copiedText === incidentDetail.id ? 'Copied' : 'Copy Incident ID'}</span>
              </button>
            </div>

            {/* Incident Header Card */}
            <div className="card-solar" style={{ padding: '22px 26px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className={`badge badge-${incidentDetail.level?.toLowerCase() || 'critical'}`}>
                      {incidentDetail.level} THREAT
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Incident #{incidentDetail.id}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                    {incidentDetail.title}
                  </h1>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--threat-critical)', lineHeight: 1 }}>
                    {incidentDetail.risk_score}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Risk Score / 100
                  </div>
                </div>
              </div>

              {/* MITRE ATT&CK Kill-Chain Progression Pathway */}
              <div style={{ marginTop: '18px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Kill-Chain Stage Progression Track
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                  {[
                    "Reconnaissance",
                    "Credential Access",
                    "Initial Access",
                    "Privilege Escalation",
                    "Persistence",
                    "Exfiltration"
                  ].map((stage, idx) => {
                    const isPresent = incidentDetail.stages?.includes(stage);
                    return (
                      <div key={idx} style={{
                        padding: '8px 6px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        background: isPresent ? 'var(--accent-lime-subtle)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isPresent ? 'var(--accent-lime)' : 'var(--border-subtle)'}`,
                        color: isPresent ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                          {stage}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendation Banner */}
              {incidentDetail.recommendation && (
                <div style={{
                  marginTop: '18px',
                  padding: '14px 18px',
                  borderRadius: '6px',
                  background: 'var(--accent-solar-subtle)',
                  border: '1px solid var(--accent-solar-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <Shield size={18} color="var(--accent-solar)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-solar)', fontSize: '0.82rem', marginBottom: '3px' }}>
                      Recommended Action for Security Analysts
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.84rem', lineHeight: 1.5 }}>
                      {incidentDetail.recommendation}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Narrative Story & Evidence Side-by-Side */}
            <div style={{ display: 'grid', gridTemplateColumns: activeEvidenceRule ? '1fr 1fr' : '1fr', gap: '18px' }}>
              
              {/* Chronological Narrative */}
              <div className="card-solar" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="var(--accent-lime)" />
                  Chronological Attack Narrative
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {incidentDetail.story?.map((step, idx) => {
                    const matchedAlert = incidentDetail.alerts?.find(a => a.id === step.alert_id);
                    const isSelected = activeEvidenceRule?.alert_id === step.alert_id;

                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--bg-card-raised)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${isSelected ? 'var(--accent-lime)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onClick={() => {
                          setActiveEvidenceRule({
                            stepIndex: idx + 1,
                            stage: step.stage,
                            text: step.text,
                            alert_id: step.alert_id,
                            alert: matchedAlert,
                          });
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              background: 'var(--accent-lime)',
                              color: '#080a0c',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 900
                            }}>
                              {idx + 1}
                            </span>
                            <span className="tag" style={{ color: 'var(--accent-lime)', borderColor: 'var(--accent-lime-border)', fontSize: '0.68rem' }}>
                              {step.stage}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} /> {new Date(step.ts).toLocaleTimeString()}
                            </span>
                            <button 
                              className="btn-dark" 
                              style={{ padding: '2px 7px', fontSize: '0.7rem' }}
                            >
                              <Eye size={11} /> Evidence
                            </button>
                          </div>
                        </div>

                        <p style={{ color: '#fff', fontSize: '0.86rem', lineHeight: 1.55 }}>
                          {step.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evidence Inspector Drawer */}
              {activeEvidenceRule && (
                <div className="card-solar" style={{ padding: '22px', borderLeft: '3px solid var(--accent-lime)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <span className="badge badge-low" style={{ marginBottom: '4px' }}>
                        Step {activeEvidenceRule.stepIndex} Proof
                      </span>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                        Raw Log Evidence & Rule Inspection
                      </h3>
                    </div>
                    <button 
                      onClick={() => setActiveEvidenceRule(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Triggered Rule Card */}
                  {activeEvidenceRule.alert && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '6px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '14px',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Detection Rule:</span>
                        <strong style={{ color: 'var(--accent-lime)' }}>
                          [{activeEvidenceRule.alert.rule_id}] {activeEvidenceRule.alert.rule_name}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>MITRE Reference:</span>
                        <span style={{ color: '#fff' }}>{activeEvidenceRule.alert.mitre?.tactic} ({activeEvidenceRule.alert.mitre?.technique})</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                        <strong>Reason:</strong> {activeEvidenceRule.alert.reason}
                      </div>
                    </div>
                  )}

                  {/* Monospace Raw Lines */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Monospace Raw Log Lines
                      </span>
                    </div>

                    <div className="terminal-box" style={{
                      padding: '12px',
                      maxHeight: '340px',
                      overflowY: 'auto',
                    }}>
                      {(incidentDetail.evidence_lines || []).length > 0 ? (
                        incidentDetail.evidence_lines.map((ev, i) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '0.76rem' }}>
                            <span style={{ color: 'var(--text-muted)', userSelect: 'none', minWidth: '34px', textAlign: 'right' }}>
                              L{ev.line_no || i + 1}
                            </span>
                            <span style={{ color: '#bcfc00', wordBreak: 'break-all' }}>
                              {ev.raw}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Evidence lines recorded for alert {activeEvidenceRule.alert_id}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: ENTITIES ────────────────────────────────────────────────────── */}
        {activeTab === 'entities' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Entity Risk Scoring</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
                Accumulated points with kill-chain multiplier (1.0× to 1.6×). Weak signals compound.
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="card-solar" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Search size={15} color="var(--text-muted)" />
                <input 
                  type="text"
                  placeholder="Search IP address or username..."
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', 'critical', 'high', 'medium', 'low'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setEntityFilter(lvl)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: entityFilter === lvl ? 'var(--accent-lime)' : 'transparent',
                      background: entityFilter === lvl ? 'var(--accent-lime-subtle)' : 'var(--bg-card-raised)',
                      color: entityFilter === lvl ? 'var(--accent-lime)' : 'var(--text-secondary)',
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

            {/* Table */}
            <div className="card-solar" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
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
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            textTransform: 'uppercase'
                          }}>
                            {ent.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                          {ent.value}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#fff' }}>{ent.risk_score}</span>
                            <div style={{ width: '70px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${ent.risk_score}%`,
                                height: '100%',
                                background: ent.risk_score >= 80 ? 'var(--threat-critical)' : ent.risk_score >= 60 ? 'var(--threat-high)' : ent.risk_score >= 30 ? 'var(--threat-medium)' : 'var(--threat-low)'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span className={`badge badge-${ent.level?.toLowerCase() || 'medium'}`}>
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

        {/* ─── TAB: EVALUATION (JUDGE-READY) ────────────────────────────────────── */}
        {activeTab === 'evaluation' && (
          <div>
            {/* Header & Benchmark Controls */}
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
                    color: 'var(--accent-lime)',
                    background: 'var(--accent-lime-subtle)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--accent-lime-border)',
                  }}>
                    MITRE ATT&CK EVALUATION
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Active Dataset: {analysisId}
                  </span>
                </div>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  Evaluation & Detection Benchmark
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
                  Ground-truth validation scored automatically against synthetic multi-stage attack scenarios.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="btn-lime"
                  style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                >
                  <Play size={14} />
                  <span>Configure Simulator</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics: 4 Distinct Bordered Sub-Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}>
              {/* KPI 1: Scenario Coverage */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid #1e293b',
                borderTop: '2px solid var(--accent-lime)',
                borderRadius: '8px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
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
                    background: 'rgba(188, 252, 0, 0.12)',
                    border: '1px solid rgba(188, 252, 0, 0.3)',
                    color: 'var(--accent-lime)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={11} />
                    {(((evaluation?.scenarios_detected ?? 4) / (evaluation?.scenarios_total ?? 5)) * 100).toFixed(0)}% PASS
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
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

              {/* KPI 2: Precision Score (with semantic warning indicator) */}
              {(() => {
                const prec = evaluation?.precision ?? 0.286;
                const isLowPrec = prec < 0.5;
                return (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid #1e293b',
                    borderTop: `2px solid ${isLowPrec ? '#f59e0b' : '#10b981'}`,
                    borderRadius: '8px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                        Precision Score
                      </span>
                      {isLowPrec ? (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fbbf24',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <AlertTriangle size={11} />
                          TUNING ADVISORY
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#34d399',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <CheckCircle2 size={11} />
                          OPTIMAL
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '2.1rem', fontWeight: 900, color: isLowPrec ? '#fbbf24' : '#fff', lineHeight: 1 }}>
                        {(prec * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {isLowPrec ? 'Noise from background syslog volume' : 'High confidence detection accuracy'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* KPI 3: Recall Rate */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid #1e293b',
                borderTop: '2px solid #00f0a0',
                borderRadius: '8px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
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
                    background: 'rgba(0, 240, 160, 0.12)',
                    border: '1px solid rgba(0, 240, 160, 0.3)',
                    color: '#00f0a0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={11} />
                    HIGH CAPTURE
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#00f0a0', lineHeight: 1 }}>
                    {(((evaluation?.recall ?? 0.727)) * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    True positive attack entity retrieval
                  </div>
                </div>
              </div>

              {/* KPI 4: Critical False Positives */}
              {(() => {
                const fps = evaluation?.critical_false_positives ?? 20;
                return (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid #1e293b',
                    borderTop: '2px solid var(--accent-solar)',
                    borderRadius: '8px',
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
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
                        background: 'rgba(255, 119, 51, 0.12)',
                        border: '1px solid rgba(255, 119, 51, 0.3)',
                        color: 'var(--accent-solar)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Flame size={11} />
                        NOISE METRIC
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--accent-solar)', lineHeight: 1 }}>
                        {fps}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Benign entities escalated to high/critical
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Scenario Breakdown Matrix Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              paddingBottom: '10px',
              borderBottom: '1px solid #1e293b',
            }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                  Ground-Truth Scenario Validation Matrix
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  Synthetic multi-stage injection scenarios scored by entity extraction completeness.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid #334155'
                }}>
                  5 Scenarios Evaluated
                </span>
              </div>
            </div>

            {/* Per-Scenario Dynamic Grid: Balanced 3-column wrap with equalized card heights */}
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
                const scenarioMeta = {
                  S1: {
                    name: 'SSH Compromise & Cron Backdoor',
                    mitre: 'T1110.001 · T1053.003',
                    target: 'Bastion SSH -> /etc/cron.d/sysupdate',
                  },
                  S2: {
                    name: 'Distributed Password Spraying',
                    mitre: 'T1110.003 · Spraying Campaign',
                    target: 'Auth Subsystem -> Multi-Account Probe',
                  },
                  S3: {
                    name: 'Web Recon -> SQLi -> Exfiltration',
                    mitre: 'T1190 · T1048.003 (Exfil)',
                    target: 'NGINX Access Logs -> Outbound HTTPS',
                  },
                  S4: {
                    name: 'Low-and-Slow Subnet Distributed Pivot',
                    mitre: 'T1018 · Low Threshold Lateral',
                    target: 'Subnet 192.168.100.0/24 Workstations',
                  },
                  S5: {
                    name: 'Insider Off-Hours Sudo & Anomalous Egress',
                    mitre: 'T1078 · Insider Threat',
                    target: 'Finance Host -> Sudoers Escalation',
                  },
                };

                const meta = scenarioMeta[sc.scenario_id] || {
                  name: `Scenario ${sc.scenario_id}`,
                  mitre: 'T1000 · Cyber Kill Chain',
                  target: 'Target Infrastructure',
                };

                const expected = sc.expected_entities || [];
                const found = sc.found_entities || [];
                const expectedCount = expected.length;
                const foundCount = found.length;
                const isFullyMatched = foundCount >= expectedCount && expectedCount > 0;
                const isZeroMatched = foundCount === 0;

                return (
                  <div
                    key={sc.scenario_id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      minHeight: '290px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1e293b';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.25)';
                    }}
                  >
                    {/* Top Section: Scenario ID, Status Pill & Title */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary)',
                            border: '1px solid #334155'
                          }}>
                            {sc.scenario_id}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)'
                          }}>
                            {meta.mitre}
                          </span>
                        </div>

                        {/* Semantic Status Badge: Subtle modern border instead of neon */}
                        {sc.detected ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#34d399',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em'
                          }}>
                            <CheckCircle2 size={12} />
                            DETECTED
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            background: 'rgba(244, 63, 94, 0.12)',
                            border: '1px solid rgba(244, 63, 94, 0.25)',
                            color: '#f43f5e',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em'
                          }}>
                            <AlertTriangle size={12} />
                            MISSED
                          </span>
                        )}
                      </div>

                      <h4 style={{
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1.3,
                        marginBottom: '4px'
                      }}>
                        {meta.name}
                      </h4>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        {meta.target}
                      </div>
                    </div>

                    {/* Middle Section: Entity Match Ratio & Monospace Badges */}
                    <div style={{ flex: 1, padding: '10px 0', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
                      {/* Entity Match Ratio Pill */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                          Entity Match Ratio
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isFullyMatched ? 'rgba(16, 185, 129, 0.12)' : (isZeroMatched ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
                          border: `1px solid ${isFullyMatched ? 'rgba(16, 185, 129, 0.25)' : (isZeroMatched ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)')}`,
                          color: isFullyMatched ? '#34d399' : (isZeroMatched ? '#f43f5e' : '#fbbf24'),
                        }}>
                          {foundCount}/{expectedCount} matched
                        </span>
                      </div>

                      {/* Expected Entities */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>
                          Expected Entities ({expectedCount}):
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {expected.map((e, idx) => (
                            <span
                              key={idx}
                              className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-200"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.73rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(30, 41, 59, 0.85)',
                                border: '1px solid #334155',
                                color: '#e2e8f0',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Captured Entities */}
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>
                          Captured Entities ({foundCount}):
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {found.length > 0 ? (
                            found.map((e, idx) => (
                              <span
                                key={idx}
                                className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-200"
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.73rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  color: '#34d399',
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
                              color: '#64748b',
                              fontStyle: 'italic',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(15, 23, 42, 0.4)',
                              border: '1px dashed #334155',
                            }}>
                              None captured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Footer with Status Summary */}
                    <div style={{
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(51, 65, 85, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)'
                    }}>
                      <span>Validation Status</span>
                      <span style={{
                        fontWeight: 600,
                        color: sc.detected ? '#34d399' : '#94a3b8'
                      }}>
                        {sc.detected ? 'Verified by Correlation Graph' : 'Requires Subnet Correlation Rule'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: UPLOAD & SIMULATE ───────────────────────────────────────────── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ marginBottom: '22px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>Run Detection & Simulation</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
                Test against live synthetic attack campaigns or upload real-world server logs.
              </p>
            </div>

            {/* Attack Simulation Panel */}
            <div className="card-solar" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Crosshair size={18} color="var(--accent-lime)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  Interactive Attack Simulator (Ground-Truth Labels)
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '16px' }}>
                Select scenarios to inject into 3-day baseline traffic. The engine will parse, build baselines, run detection rules, and generate evaluation metrics:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {[
                  { id: 'S1', label: 'S1: Loud SSH Brute Force -> Deploy Compromise -> Sudo -> Useradd sysupdate' },
                  { id: 'S2', label: 'S2: Password Spraying across 25 accounts -> Success as user05' },
                  { id: 'S3', label: 'S3: Gobuster Web Recon -> SQL Injection on /login -> 80MB Exfiltration' },
                  { id: 'S4', label: 'S4: Low-and-Slow Distributed Brute Force across /24 subnet (over 6 hours)' },
                  { id: 'S5', label: 'S5: Insider Threat (user15 off-hours login -> sudo -> data export)' },
                ].map(item => (
                  <label key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: selectedScenarios[item.id] ? 'var(--accent-lime-subtle)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedScenarios[item.id] ? 'var(--accent-lime-border)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: selectedScenarios[item.id] ? '#fff' : 'var(--text-secondary)'
                  }}>
                    <input 
                      type="checkbox"
                      checked={selectedScenarios[item.id]}
                      onChange={(e) => setSelectedScenarios({ ...selectedScenarios, [item.id]: e.target.checked })}
                      style={{ accentColor: 'var(--accent-lime)', width: '15px', height: '15px' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <button 
                className="btn-lime" 
                style={{ width: '100%', padding: '13px', fontSize: '0.92rem' }}
                onClick={handleRunSimulation}
                disabled={simulating}
              >
                {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                <span>{simulating ? 'Injecting Attacks & Running Detection Pipeline...' : 'Run Attack Simulation & Evaluate'}</span>
              </button>
            </div>

            {/* Custom Log Upload Dropzone */}
            <div className="card-solar" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                <Upload size={18} color="var(--accent-solar)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  Upload Real Log Files
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '16px' }}>
                Supports Linux <code style={{ color: '#fff' }}>auth.log</code> or Apache/Nginx <code style={{ color: '#fff' }}>access.log</code>. Formats are auto-detected.
              </p>

              <label style={{
                display: 'block',
                padding: '28px',
                borderRadius: '8px',
                border: '1px dashed var(--border-medium)',
                background: 'rgba(255,255,255,0.015)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <Upload size={28} color="var(--accent-lime)" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>
                  Click to select log files or drag & drop here
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Accepts .log, .txt files
                </div>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        )}

      </main>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: '16px 32px',
        borderTop: '1px solid var(--border-subtle)',
        background: '#0d1015',
        fontSize: '0.76rem',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          ChainTrace v1.2.0 · ALGOTHON'26 · Problem Statement ALG-CYBER-01
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Detection Engine: <strong>Bhanu Prasad</strong></span>
          <span>Frontend & Simulation: <strong>Mahadev H</strong></span>
        </div>
      </footer>

    </div>
  );
}
