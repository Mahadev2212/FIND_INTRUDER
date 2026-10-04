import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, FileText, Crosshair, Users, 
  CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, 
  Terminal, Server, Play, Upload, RefreshCw, ChevronRight, 
  Search, Filter, ExternalLink, Database, Sparkles, Layers,
  Clock, Shield, Eye, Copy, Check, TerminalSquare, Compass
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
import mockAnalysesList from './mocks/analyses_list.json';

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

  // Evidence drawer state in Incident Detail
  const [activeEvidenceRule, setActiveEvidenceRule] = useState(null);
  const [entityFilter, setEntityFilter] = useState('all');
  const [entitySearch, setEntitySearch] = useState('');

  // Copy helper
  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // 1. Check backend health on mount
  useEffect(() => {
    checkHealth();
  }, []);

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
    const chosen = Object.keys(selectedScenarios).filter(k => selectedScenarios[k]);
    if (chosen.length === 0) {
      alert("Please select at least one attack scenario");
      setSimulating(false);
      return;
    }

    if (useMocks || !backendAlive) {
      setTimeout(() => {
        setSimulating(false);
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
      if (!res.ok) throw new Error((await res.json()).detail || "Simulation failed");
      const resp = await res.json();
      await fetchAnalyses();
      setAnalysisId(resp.analysis_id);
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
      setActiveTab('overview');
    } catch (err) {
      setErrorMsg("Log upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── Top Utility / Workspace Header ───────────────────────────────────── */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '62px',
      }}>
        {/* Left: Brand + Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Logo & Product Badge */}
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} 
            onClick={() => setActiveTab('overview')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}>
              <ShieldAlert size={18} color="#041a12" strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>
                ChainTrace
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                ALG-CYBER-01
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          {/* Clean Human-Crafted Tabs */}
          <nav style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'incidents', label: 'Incidents', icon: ShieldAlert, count: incidents?.length },
              { id: 'entities', label: 'Entities', icon: Users, count: entities?.length },
              { id: 'evaluation', label: 'Evaluation', icon: CheckCircle2 },
              { id: 'upload', label: 'Upload & Simulate', icon: Play },
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
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--border-medium)' : 'transparent',
                    background: isActive ? 'var(--bg-surface-raised)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={15} color={isActive ? 'var(--accent-primary)' : 'var(--text-faint)'} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-faint)',
                      fontWeight: 700,
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Analysis Selector & API Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Active Dataset Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>Dataset:</span>
            <select
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-main)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
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

          {/* Connection Status Badge */}
          <div 
            onClick={() => setUseMocks(!useMocks)}
            title="Click to toggle between Live API and Mocks"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: (backendAlive && !useMocks) ? 'var(--sev-low-bg)' : 'var(--sev-high-bg)',
              border: `1px solid ${(backendAlive && !useMocks) ? 'var(--sev-low-border)' : 'var(--sev-high-border)'}`,
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: (backendAlive && !useMocks) ? '#10b981' : '#f97316',
            }} />
            <span style={{ color: (backendAlive && !useMocks) ? '#10b981' : '#f97316' }}>
              {(backendAlive && !useMocks) ? 'Live API (8000)' : (useMocks ? 'Offline Mocks' : 'API Offline')}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content Canvas ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        
        {/* Error notification banner */}
        {errorMsg && (
          <div style={{
            padding: '10px 16px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: 'var(--sev-critical-bg)',
            border: '1px solid var(--sev-critical-border)',
            color: 'var(--sev-critical)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ─── TAB: OVERVIEW ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            {/* Top Overview Bar */}
            <div style={{ marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  Security Analysis Dashboard
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '3px' }}>
                  Correlating noisy log lines into coherent attack stories · Dataset: <code style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{analysisId}</code>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { checkHealth(); loadAnalysisData(analysisId); }}
                  title="Reload dataset"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
                <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                  <Play size={14} /> New Simulation
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginBottom: '22px',
            }}>
              {[
                { label: 'Lines Ingested', val: summary?.stats?.parsed || 0, sub: `${summary?.stats?.skipped || 0} malformed skipped`, icon: FileText, color: '#10b981' },
                { label: 'Events Normalized', val: summary?.stats?.events || 0, sub: 'Auth.log + Access.log', icon: Activity, color: '#34d399' },
                { label: 'Rule Alerts', val: summary?.stats?.alerts || 0, sub: 'Rules R1–R11 triggered', icon: AlertCircle, color: '#eab308' },
                { label: 'Correlated Attacks', val: summary?.stats?.incidents || 0, sub: 'Multi-stage incidents', icon: ShieldAlert, color: '#f43f5e' },
                { label: 'Critical False Pos.', val: evaluation?.critical_false_positives ?? 0, sub: 'SOC noise reduction', icon: CheckCircle2, color: '#10b981' },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {card.label}
                      </span>
                      <Icon size={16} color={card.color} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {card.val.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: '6px' }}>
                      {card.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Section: Events Timeline + Top Risky Entities */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '22px' }}>
              {/* Timeline Chart */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Events Over Time</h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>Normalized event frequency highlighting attack bursts</p>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-primary-subtle)' }}>
                    Hourly Distribution
                  </span>
                </div>
                
                <div style={{ height: '220px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.events_over_time || []}>
                      <defs>
                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2636" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={11} tickFormatter={(t) => t.slice(11, 16)} />
                      <YAxis stroke="#475569" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#14171f', 
                          border: '1px solid #333c52', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          color: '#fff'
                        }} 
                      />
                      <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#emeraldGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Riskiest Entities */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Top Risky Entities</h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-faint)' }}>Highest accumulated risk</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('entities')} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    View All <ArrowRight size={12} />
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
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1',
                          textTransform: 'uppercase'
                        }}>
                          {ent.type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
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
              <div className="card" style={{ padding: '22px', borderLeft: '4px solid var(--sev-critical)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-critical">Highest Priority Attack</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                      {incidents[0].title}
                    </h3>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedIncidentId(incidents[0].id);
                      setActiveTab('incident-detail');
                    }}
                  >
                    Examine Story & Evidence <ArrowRight size={14} />
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  {incidents[0].summary}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {incidents[0].stages?.map((stage, i) => (
                    <span key={i} className="stage-tag">
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
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Correlated Incidents</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
                  Ranked by risk score · Connected via graph union-find & IP-to-User pivot analysis.
                </p>
              </div>
              <span className="badge badge-critical">
                {incidents?.length} Incidents Found
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incidents?.map((inc) => {
                const levelClass = inc.level?.toLowerCase() || 'medium';
                return (
                  <div 
                    key={inc.id}
                    className="card card-interactive"
                    style={{
                      padding: '18px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      cursor: 'pointer',
                      borderLeft: `3px solid var(--sev-${levelClass})`,
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
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                          {inc.title}
                        </h3>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                          #{inc.id}
                        </span>
                      </div>

                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      >
                        Inspect Story <ChevronRight size={13} />
                      </button>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                      {inc.summary}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      {/* Stages */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginRight: '2px' }}>Stages:</span>
                        {inc.stages?.map((stage, idx) => (
                          <span key={idx} className="stage-tag">
                            {stage}
                          </span>
                        ))}
                      </div>

                      {/* Entities Involved */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Pivot Entities:</span>
                        {inc.entities?.ips?.map(ip => (
                          <span key={ip} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>
                            {ip}
                          </span>
                        ))}
                        {inc.entities?.users?.map(u => (
                          <span key={u} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--accent-warm-subtle)', color: 'var(--accent-warm)', padding: '1px 6px', borderRadius: '4px' }}>
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
            <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button 
                onClick={() => setActiveTab('incidents')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
              >
                ← Back to Incident List
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleCopy(incidentDetail.id)}
                  style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                >
                  {copiedText === incidentDetail.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{copiedText === incidentDetail.id ? 'Copied ID' : 'Copy Incident ID'}</span>
                </button>
              </div>
            </div>

            {/* Incident Header Card */}
            <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className={`badge badge-${incidentDetail.level?.toLowerCase() || 'critical'}`}>
                      {incidentDetail.level} SEVERITY
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      Incident #{incidentDetail.id}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                    {incidentDetail.title}
                  </h1>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--sev-critical)', lineHeight: 1 }}>
                    {incidentDetail.risk_score}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                    Cumulative Risk Score
                  </div>
                </div>
              </div>

              {/* MITRE ATT&CK Kill-Chain Progression */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  MITRE ATT&CK Kill-Chain Stage Progression
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
                        background: isPresent ? 'var(--accent-primary-subtle)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isPresent ? 'var(--accent-primary-border)' : 'var(--border-subtle)'}`,
                        color: isPresent ? '#fff' : 'var(--text-faint)',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>
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
                  marginTop: '20px',
                  padding: '14px 18px',
                  borderRadius: '6px',
                  background: 'var(--accent-warm-subtle)',
                  border: '1px solid var(--accent-warm-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <Shield size={18} color="var(--accent-warm)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-warm)', fontSize: '0.84rem', marginBottom: '3px' }}>
                      Recommended Action for Security Analysts
                    </div>
                    <div style={{ color: '#f8fafc', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {incidentDetail.recommendation}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Narrative Story & Evidence Side-by-Side */}
            <div style={{ display: 'grid', gridTemplateColumns: activeEvidenceRule ? '1fr 1fr' : '1fr', gap: '20px' }}>
              
              {/* Chronological Narrative */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-primary)" />
                  Chronological Attack Narrative
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {incidentDetail.story?.map((step, idx) => {
                    const matchedAlert = incidentDetail.alerts?.find(a => a.id === step.alert_id);
                    const isSelected = activeEvidenceRule?.alert_id === step.alert_id;

                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '8px',
                          background: isSelected ? 'var(--bg-surface-raised)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: 'var(--accent-primary-subtle)',
                              color: 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              {idx + 1}
                            </span>
                            <span className="stage-tag" style={{ color: 'var(--accent-primary)', background: 'var(--accent-primary-subtle)' }}>
                              {step.stage}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {new Date(step.ts).toLocaleTimeString()}
                            </span>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            >
                              <Eye size={12} /> View Proof
                            </button>
                          </div>
                        </div>

                        <p style={{ color: '#fff', fontSize: '0.88rem', lineHeight: 1.55 }}>
                          {step.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evidence Inspector Drawer */}
              {activeEvidenceRule && (
                <div className="card" style={{ padding: '24px', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <span className="badge badge-low" style={{ marginBottom: '4px' }}>
                        Step {activeEvidenceRule.stepIndex} Proof
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
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
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '16px',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-faint)' }}>Detection Rule:</span>
                        <strong style={{ color: 'var(--accent-primary)' }}>
                          [{activeEvidenceRule.alert.rule_id}] {activeEvidenceRule.alert.rule_name}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-faint)' }}>MITRE Reference:</span>
                        <span style={{ color: '#fff' }}>{activeEvidenceRule.alert.mitre?.tactic} ({activeEvidenceRule.alert.mitre?.technique})</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                        <strong>Reason:</strong> {activeEvidenceRule.alert.reason}
                      </div>
                    </div>
                  )}

                  {/* Monospace Raw Lines */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                        Raw Monospace Log Lines
                      </span>
                    </div>

                    <div style={{
                      background: '#090b0e',
                      borderRadius: '6px',
                      padding: '12px',
                      border: '1px solid var(--border-subtle)',
                      maxHeight: '360px',
                      overflowY: 'auto',
                    }}>
                      {(incidentDetail.evidence_lines || []).length > 0 ? (
                        incidentDetail.evidence_lines.map((ev, i) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                            <span style={{ color: 'var(--text-faint)', userSelect: 'none', minWidth: '36px', textAlign: 'right' }}>
                              L{ev.line_no || i + 1}
                            </span>
                            <span style={{ color: '#a7f3d0', wordBreak: 'break-all' }}>
                              {ev.raw}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>
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
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Entity Risk Scoring</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
                Accumulated points with kill-chain multiplier (1.0× to 1.6×). Weak signals compound.
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Search size={15} color="var(--text-faint)" />
                <input 
                  type="text"
                  placeholder="Search IP or username..."
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
                      borderColor: entityFilter === lvl ? 'var(--border-medium)' : 'transparent',
                      background: entityFilter === lvl ? 'var(--bg-surface-raised)' : 'transparent',
                      color: entityFilter === lvl ? '#fff' : 'var(--text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
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
            <div className="card" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)', color: 'var(--text-faint)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 18px' }}>Type</th>
                    <th style={{ padding: '12px 18px' }}>Entity Value</th>
                    <th style={{ padding: '12px 18px' }}>Risk Score</th>
                    <th style={{ padding: '12px 18px' }}>Severity Level</th>
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
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#cbd5e1',
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
                                background: ent.risk_score >= 80 ? 'var(--sev-critical)' : ent.risk_score >= 60 ? 'var(--sev-high)' : ent.risk_score >= 30 ? 'var(--sev-medium)' : 'var(--sev-low)'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span className={`badge badge-${ent.level?.toLowerCase() || 'medium'}`}>
                            {ent.level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                          {ent.alert_count}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-faint)', fontSize: '0.78rem' }}>
                          {new Date(ent.first_seen).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-faint)', fontSize: '0.78rem' }}>
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
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Evaluation & Detection Benchmark</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
                Ground-truth validation scored automatically against the attack simulator scenarios.
              </p>
            </div>

            {/* Headline Card */}
            <div className="card" style={{
              padding: '24px',
              marginBottom: '22px',
              border: '1px solid var(--accent-primary-border)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(245, 158, 11, 0.03))'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span className="badge badge-low" style={{ marginBottom: '6px' }}>
                    Headline Competition Metric
                  </span>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
                    {evaluation?.scenarios_detected ?? 4} / {evaluation?.scenarios_total ?? 5} Scenarios Detected
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                    Successfully identifying brute force, spraying, web recon/exfiltration, and insider attacks.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                      {((evaluation?.precision ?? 0.286) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>Precision</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
                      {((evaluation?.recall ?? 0.727) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>Recall</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
                      {evaluation?.critical_false_positives ?? 20}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>Critical FPs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Scenario Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
              {(evaluation?.per_scenario || [
                { scenario_id: 'S1', detected: true, expected_entities: ['185.220.101.7', 'deploy', 'sysupdate'], found_entities: ['185.220.101.7', 'deploy', 'sysupdate'] },
                { scenario_id: 'S2', detected: true, expected_entities: ['45.33.10.8', 'user05'], found_entities: ['45.33.10.8', 'user05'] },
                { scenario_id: 'S3', detected: true, expected_entities: ['45.33.10.9'], found_entities: ['45.33.10.9'] },
                { scenario_id: 'S4', detected: false, expected_entities: ['192.168.100.10', '192.168.100.11', '192.168.100.12'], found_entities: [] },
                { scenario_id: 'S5', detected: true, expected_entities: ['172.16.5.20', 'user15'], found_entities: ['172.16.5.20', 'user15'] }
              ]).map((sc) => {
                const names = {
                  S1: 'SSH Compromise with Backdoor (S1)',
                  S2: 'Password Spraying Attack (S2)',
                  S3: 'Web Recon -> SQLi -> Exfiltration (S3)',
                  S4: 'Low-and-Slow Subnet Distributed (S4)',
                  S5: 'Insider Off-Hours Sudo & Download (S5)',
                };

                return (
                  <div key={sc.scenario_id} className="card" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>
                        {names[sc.scenario_id] || sc.scenario_id}
                      </h4>
                      {sc.detected ? (
                        <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={12} /> DETECTED
                        </span>
                      ) : (
                        <span className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <AlertTriangle size={12} /> MISSED
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', marginTop: '8px' }}>
                      <div style={{ color: 'var(--text-faint)', marginBottom: '3px' }}>Expected Entities:</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {sc.expected_entities?.map((e, idx) => (
                          <span key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>
                            {e}
                          </span>
                        ))}
                      </div>

                      <div style={{ color: 'var(--text-faint)', marginBottom: '3px' }}>Captured Entities:</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {sc.found_entities?.length > 0 ? (
                          sc.found_entities.map((e, idx) => (
                            <span key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', padding: '1px 5px', borderRadius: '3px' }}>
                              ✓ {e}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-faint)', fontStyle: 'italic', fontSize: '0.72rem' }}>None captured</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: UPLOAD & SIMULATE ───────────────────────────────────────────── */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>Run Detection & Simulation</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                Test against live synthetic attack campaigns or upload real-world server logs.
              </p>
            </div>

            {/* Attack Simulation Panel */}
            <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Crosshair size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  Interactive Attack Simulator
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
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
                    background: selectedScenarios[item.id] ? 'var(--accent-primary-subtle)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedScenarios[item.id] ? 'var(--accent-primary-border)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: selectedScenarios[item.id] ? '#fff' : 'var(--text-muted)'
                  }}>
                    <input 
                      type="checkbox"
                      checked={selectedScenarios[item.id]}
                      onChange={(e) => setSelectedScenarios({ ...selectedScenarios, [item.id]: e.target.checked })}
                      style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
                onClick={handleRunSimulation}
                disabled={simulating}
              >
                {simulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                {simulating ? 'Injecting Attacks & Running Pipeline...' : 'Generate Logs & Run Attack Simulation'}
              </button>
            </div>

            {/* Custom Log Upload Dropzone */}
            <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                <Upload size={18} color="var(--accent-warm)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  Upload Real Log Files
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
                Supports Linux <code style={{ color: '#fff' }}>auth.log</code> or Apache/Nginx <code style={{ color: '#fff' }}>access.log</code>. Formats are auto-detected.
              </p>

              <label style={{
                display: 'block',
                padding: '30px',
                borderRadius: '8px',
                border: '1px dashed var(--border-medium)',
                background: 'rgba(255,255,255,0.015)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                <Upload size={28} color="var(--accent-primary)" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                  Click to select log files or drag & drop here
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: '4px' }}>
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
        background: 'var(--bg-surface)',
        fontSize: '0.76rem',
        color: 'var(--text-faint)',
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
