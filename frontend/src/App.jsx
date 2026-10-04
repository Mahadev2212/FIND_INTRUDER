import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, FileText, Crosshair, Users, 
  CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, 
  Terminal, Server, Play, Upload, RefreshCw, ChevronRight, 
  Search, Filter, ExternalLink, Database, Sparkles, Layers,
  Clock, Shield, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid 
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
      setAnalyses([{ id: 'mock-1', source: 'simulation', stats: mockSummary.stats, created_at: new Date().toISOString() }]);
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
      // Summary
      const sumRes = await fetch(`${API_BASE}/analyses/${id}/summary`);
      if (sumRes.ok) setSummary(await sumRes.json());

      // Incidents
      const incRes = await fetch(`${API_BASE}/analyses/${id}/incidents`);
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData);
        if (incData.length > 0 && !selectedIncidentId) {
          setSelectedIncidentId(incData[0].id);
        }
      }

      // Entities
      const entRes = await fetch(`${API_BASE}/analyses/${id}/entities`);
      if (entRes.ok) setEntities(await entRes.json());

      // Evaluation
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── Top Navbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        background: 'rgba(11, 15, 29, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)',
            }}>
              <ShieldAlert size={22} color="#050b14" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ChainTrace
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ALG-CYBER-01 Intruder Detection
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
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
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      background: isActive ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#fff' : 'var(--text-muted)'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right status controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Analysis selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="var(--text-muted)" />
            <select
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {analyses.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} ({a.source} · {a.stats?.events || 0} evts)
                </option>
              ))}
            </select>
          </div>

          {/* Backend Status indicator */}
          <div 
            onClick={() => setUseMocks(!useMocks)}
            title="Click to toggle between Live API and Mocks"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: (backendAlive && !useMocks) ? 'rgba(0, 230, 153, 0.12)' : 'rgba(255, 140, 0, 0.15)',
              border: `1px solid ${(backendAlive && !useMocks) ? 'rgba(0, 230, 153, 0.3)' : 'rgba(255, 140, 0, 0.3)'}`,
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: (backendAlive && !useMocks) ? '#00e699' : '#ff8c00',
              boxShadow: `0 0 8px ${(backendAlive && !useMocks) ? '#00e699' : '#ff8c00'}`,
            }} />
            <span style={{ color: (backendAlive && !useMocks) ? '#00e699' : '#ff8c00' }}>
              {(backendAlive && !useMocks) ? 'Live API Connected' : (useMocks ? 'Mock Mode' : 'Backend Offline')}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px 36px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        
        {errorMsg && (
          <div style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '8px',
            background: 'var(--risk-critical-bg)',
            border: '1px solid rgba(255, 51, 102, 0.4)',
            color: 'var(--risk-critical)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ─── TAB: OVERVIEW ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  Intrusion Detection Overview
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Analysis ID: <code style={{ color: 'var(--accent-cyan)' }}>{analysisId}</code> · Source: {summary?.source}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => { checkHealth(); loadAnalysisData(analysisId); }}
                  title="Refresh Data"
                >
                  <RefreshCw size={15} /> Refresh
                </button>
                <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                  <Play size={15} /> Run Attack Simulation
                </button>
              </div>
            </div>

            {/* Stat Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}>
              {[
                { label: 'Lines Parsed', val: summary?.stats?.parsed || 0, sub: `${summary?.stats?.skipped || 0} skipped (never crashes)`, color: '#4facfe', icon: FileText },
                { label: 'Events Processed', val: summary?.stats?.events || 0, sub: 'Auth + Web Combined', color: '#00f2fe', icon: Activity },
                { label: 'Alerts Triggered', val: summary?.stats?.alerts || 0, sub: 'Rules R1–R11 (no LLM)', color: '#ffcc00', icon: AlertCircle },
                { label: 'Correlated Incidents', val: summary?.stats?.incidents || 0, sub: 'Multi-stage attacks', color: '#ff3366', icon: ShieldAlert },
                { label: 'Critical False Positives', val: evaluation?.critical_false_positives ?? 0, sub: 'Tuned for SOC efficiency', color: '#00e699', icon: CheckCircle2 },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {card.label}
                      </span>
                      <div style={{
                        padding: '6px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: card.color
                      }}>
                        <Icon size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                      {card.val.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {card.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Row: Events-Over-Time Chart + Top Entities */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
              {/* Chart */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Events Over Time</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Event distribution across timestamps showing burst attacks</p>
                  </div>
                  <span className="badge badge-low">Normalized</span>
                </div>
                
                <div style={{ height: '240px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.events_over_time || []}>
                      <defs>
                        <linearGradient id="eventColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickFormatter={(t) => t.slice(11, 16)} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#0f1424', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="count" stroke="#00f2fe" strokeWidth={2} fillOpacity={1} fill="url(#eventColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Risky Entities */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Top Risky Entities</h3>
                  <button 
                    onClick={() => setActiveTab('entities')} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    View All <ArrowRight size={13} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(summary?.top_entities || entities?.slice(0, 5) || []).map((ent, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: ent.type === 'ip' ? 'rgba(79, 172, 254, 0.2)' : 'rgba(138, 43, 226, 0.2)',
                          color: ent.type === 'ip' ? '#4facfe' : '#c084fc',
                          textTransform: 'uppercase'
                        }}>
                          {ent.type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                          {ent.value}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`badge badge-${ent.level?.toLowerCase() || 'medium'}`}>
                          {ent.risk_score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Attack Story Showcase */}
            {incidents?.length > 0 && (
              <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--risk-critical)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-critical">Highest Priority Attack</span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
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
                    Examine Story & Evidence <ArrowRight size={15} />
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {incidents[0].summary}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {incidents[0].stages?.map((stage, i) => (
                    <span key={i} className="stage-chip">
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
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>Correlated Incidents</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Ranked by risk score using union-find graph correlation & IP-to-User pivot analysis.
                </p>
              </div>
              <span className="badge badge-critical" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {incidents?.length} Incidents Discovered
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {incidents?.map((inc) => {
                const levelClass = inc.level?.toLowerCase() || 'medium';
                return (
                  <div 
                    key={inc.id}
                    className="glass-panel"
                    style={{
                      padding: '22px 26px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      cursor: 'pointer',
                      borderLeft: `4px solid var(--risk-${levelClass})`,
                    }}
                    onClick={() => {
                      setSelectedIncidentId(inc.id);
                      setActiveTab('incident-detail');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`badge badge-${levelClass}`}>
                          {inc.level} · {inc.risk_score}
                        </span>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                          {inc.title}
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          #{inc.id}
                        </span>
                      </div>

                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Inspect Attack Story <ChevronRight size={14} />
                      </button>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {inc.summary}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      {/* Stages */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Stages:</span>
                        {inc.stages?.map((stage, idx) => (
                          <span key={idx} className="stage-chip">
                            {stage}
                          </span>
                        ))}
                      </div>

                      {/* Entities Involved */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entities:</span>
                        {inc.entities?.ips?.map(ip => (
                          <span key={ip} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'rgba(79, 172, 254, 0.15)', color: '#4facfe', padding: '2px 8px', borderRadius: '4px' }}>
                            {ip}
                          </span>
                        ))}
                        {inc.entities?.users?.map(u => (
                          <span key={u} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px' }}>
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
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                onClick={() => setActiveTab('incidents')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}
              >
                ← Back to Incidents
              </button>
            </div>

            {/* Incident Header Card */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className={`badge badge-${incidentDetail.level?.toLowerCase() || 'critical'}`}>
                      {incidentDetail.level} RISK
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Incident #{incidentDetail.id}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                    {incidentDetail.title}
                  </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--risk-critical)', lineHeight: 1 }}>
                      {incidentDetail.risk_score}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Risk Score / 100
                    </div>
                  </div>
                </div>
              </div>

              {/* Kill Chain Stage Progress Bar */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  MITRE ATT&CK Kill-Chain Progression
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
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
                        padding: '10px 8px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        background: isPresent ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isPresent ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                        color: isPresent ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700 }}>
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
                  marginTop: '24px',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  background: 'rgba(255, 204, 0, 0.08)',
                  border: '1px solid rgba(255, 204, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <Shield size={20} color="#ffcc00" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#ffcc00', fontSize: '0.88rem', marginBottom: '4px' }}>
                      Recommended SOC Response
                    </div>
                    <div style={{ color: '#f1f5f9', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      {incidentDetail.recommendation}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attack Story & Evidence Split View */}
            <div style={{ display: 'grid', gridTemplateColumns: activeEvidenceRule ? '1fr 1fr' : '1fr', gap: '24px' }}>
              
              {/* Chronological Attack Story Steps */}
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={20} color="var(--accent-cyan)" />
                  Chronological Attack Narrative
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
                  {incidentDetail.story?.map((step, idx) => {
                    const matchedAlert = incidentDetail.alerts?.find(a => a.id === step.alert_id);
                    const isSelected = activeEvidenceRule?.alert_id === step.alert_id;

                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: '18px 20px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
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
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(0, 242, 254, 0.2)',
                              color: 'var(--accent-cyan)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {idx + 1}
                            </span>
                            <span className="stage-chip" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
                              {step.stage}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {new Date(step.ts).toLocaleTimeString()}
                            </span>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              <Eye size={12} /> View Raw Evidence
                            </button>
                          </div>
                        </div>

                        <p style={{ color: '#fff', fontSize: '0.92rem', lineHeight: 1.6 }}>
                          {step.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evidence Drawer Panel */}
              {activeEvidenceRule && (
                <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <span className="badge badge-low" style={{ marginBottom: '6px' }}>
                        Step {activeEvidenceRule.stepIndex} Evidence
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                        Raw Log Evidence & Detection Proof
                      </h3>
                    </div>
                    <button 
                      onClick={() => setActiveEvidenceRule(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Rule details */}
                  {activeEvidenceRule.alert && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      marginBottom: '18px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Triggered Rule:</span>
                        <strong style={{ color: 'var(--accent-cyan)' }}>
                          [{activeEvidenceRule.alert.rule_id}] {activeEvidenceRule.alert.rule_name}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>MITRE ATT&CK:</span>
                        <span>{activeEvidenceRule.alert.mitre?.tactic} ({activeEvidenceRule.alert.mitre?.technique})</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                        <strong>Reason:</strong> {activeEvidenceRule.alert.reason}
                      </div>
                    </div>
                  )}

                  {/* Monospace Raw Lines */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Exact Raw Log Lines (Monospace with Line Numbers)
                    </div>
                    <div style={{
                      background: '#060911',
                      borderRadius: '8px',
                      padding: '14px',
                      border: '1px solid var(--border-subtle)',
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}>
                      {(incidentDetail.evidence_lines || []).length > 0 ? (
                        incidentDetail.evidence_lines.map((ev, i) => (
                          <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                            <span style={{ color: 'var(--text-muted)', userSelect: 'none', minWidth: '40px', textAlign: 'right' }}>
                              L{ev.line_no || i + 1}
                            </span>
                            <span style={{ color: '#00e699', wordBreak: 'break-all' }}>
                              {ev.raw}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>Entity Risk Scoring</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Risk score = sum(alert points) × kill-chain stage multiplier (1.0× to 1.6×).
                </p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <Search size={16} color="var(--text-muted)" />
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
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {['all', 'critical', 'high', 'medium', 'low'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setEntityFilter(lvl)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: entityFilter === lvl ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: entityFilter === lvl ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
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

            {/* Entities Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px' }}>Type</th>
                    <th style={{ padding: '14px 20px' }}>Entity Value</th>
                    <th style={{ padding: '14px 20px' }}>Risk Score</th>
                    <th style={{ padding: '14px 20px' }}>Risk Level</th>
                    <th style={{ padding: '14px 20px' }}>Alert Count</th>
                    <th style={{ padding: '14px 20px' }}>First Seen</th>
                    <th style={{ padding: '14px 20px' }}>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {entities
                    ?.filter(e => entityFilter === 'all' || e.level?.toLowerCase() === entityFilter)
                    ?.filter(e => !entitySearch || e.value.toLowerCase().includes(entitySearch.toLowerCase()))
                    ?.map((ent, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: ent.type === 'ip' ? 'rgba(79, 172, 254, 0.15)' : 'rgba(192, 132, 252, 0.15)',
                            color: ent.type === 'ip' ? '#4facfe' : '#c084fc',
                            textTransform: 'uppercase'
                          }}>
                            {ent.type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff' }}>
                          {ent.value}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 800, color: '#fff' }}>{ent.risk_score}</span>
                            <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${ent.risk_score}%`,
                                height: '100%',
                                background: ent.risk_score >= 80 ? 'var(--risk-critical)' : ent.risk_score >= 60 ? 'var(--risk-high)' : ent.risk_score >= 30 ? 'var(--risk-medium)' : 'var(--risk-low)'
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span className={`badge badge-${ent.level?.toLowerCase() || 'medium'}`}>
                            {ent.level}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                          {ent.alert_count}
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(ent.first_seen).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
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
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>Evaluation Metrics & Proof</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Benchmark against simulator ground truth labels. Evaluates precision, recall, and detection of simulated attack campaigns.
              </p>
            </div>

            {/* Headline Card */}
            <div className="glass-panel" style={{
              padding: '28px',
              marginBottom: '28px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08), rgba(79, 172, 254, 0.04))',
              border: '1px solid rgba(0, 242, 254, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <span className="badge badge-low" style={{ marginBottom: '8px' }}>
                    Headline Benchmark Metric
                  </span>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>
                    {evaluation?.scenarios_detected ?? 4} / {evaluation?.scenarios_total ?? 5} Scenarios Detected
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '6px' }}>
                    Demonstrating multi-stage attack recognition across brute force, web recon, SQLi, and insider threats.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {((evaluation?.precision ?? 0.286) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precision</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00e699' }}>
                      {((evaluation?.recall ?? 0.727) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recall</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffcc00' }}>
                      {evaluation?.critical_false_positives ?? 20}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Critical FPs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Scenario Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {(evaluation?.per_scenario || [
                { scenario_id: 'S1', detected: true, expected_entities: ['185.220.101.7', 'deploy', 'sysupdate'], found_entities: ['185.220.101.7', 'deploy', 'sysupdate'] },
                { scenario_id: 'S2', detected: true, expected_entities: ['45.33.10.8', 'user05'], found_entities: ['45.33.10.8', 'user05'] },
                { scenario_id: 'S3', detected: true, expected_entities: ['45.33.10.9'], found_entities: ['45.33.10.9'] },
                { scenario_id: 'S4', detected: false, expected_entities: ['192.168.100.10', '192.168.100.11', '192.168.100.12'], found_entities: [] },
                { scenario_id: 'S5', detected: true, expected_entities: ['172.16.5.20', 'user15'], found_entities: ['172.16.5.20', 'user15'] }
              ]).map((sc) => {
                const names = {
                  S1: 'SSH Compromise with Backdoor (S1)',
                  S2: 'Password Spraying Campaign (S2)',
                  S3: 'Web Recon -> SQLi -> Exfiltration (S3)',
                  S4: 'Low-and-Slow Subnet Distributed (S4)',
                  S5: 'Insider Off-Hours Sudo & Download (S5)',
                };

                return (
                  <div key={sc.scenario_id} className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                        {names[sc.scenario_id] || sc.scenario_id}
                      </h4>
                      {sc.detected ? (
                        <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> DETECTED
                        </span>
                      ) : (
                        <span className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={13} /> MISSED
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', marginTop: '10px' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Expected Entities:</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {sc.expected_entities?.map((e, idx) => (
                          <span key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                            {e}
                          </span>
                        ))}
                      </div>

                      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Captured Entities:</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {sc.found_entities?.length > 0 ? (
                          sc.found_entities.map((e, idx) => (
                            <span key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px' }}>
                              ✓ {e}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>None captured</span>
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
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div style={{ marginBottom: '28px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>Run Detection & Simulation</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
                Analyze real production log files or run interactive attack scenarios with ground-truth validation.
              </p>
            </div>

            {/* Attack Simulation Panel */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Crosshair size={22} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  Interactive Attack Simulator (Ground-Truth Labels)
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Choose which attack scenarios to inject into 3-day baseline traffic. Evaluator will automatically score precision and recall against ground truth:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
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
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: selectedScenarios[item.id] ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedScenarios[item.id] ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    color: selectedScenarios[item.id] ? '#fff' : 'var(--text-secondary)'
                  }}>
                    <input 
                      type="checkbox"
                      checked={selectedScenarios[item.id]}
                      onChange={(e) => setSelectedScenarios({ ...selectedScenarios, [item.id]: e.target.checked })}
                      style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                onClick={handleRunSimulation}
                disabled={simulating}
              >
                {simulating ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                {simulating ? 'Injecting Attacks & Running Pipeline...' : 'Generate Logs & Run Attack Simulation'}
              </button>
            </div>

            {/* Custom Log Upload Dropzone */}
            <div className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
                <Upload size={22} color="#4facfe" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  Upload Real Log Files
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Upload Linux <code style={{ color: 'var(--accent-cyan)' }}>auth.log</code> or Apache/Nginx <code style={{ color: 'var(--accent-cyan)' }}>access.log</code>. Formats are auto-detected and malformed lines are handled gracefully.
              </p>

              <label style={{
                display: 'block',
                padding: '36px',
                borderRadius: '12px',
                border: '2px dashed var(--border-subtle)',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                <Upload size={32} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>
                  Click to select log files or drag & drop here
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
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
        padding: '20px 36px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          ChainTrace v1.2.0 · ALGOTHON'26 · ALG-CYBER-01: Find the Intruder
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>Detection: <strong>Bhanu Prasad</strong></span>
          <span>Frontend & Baseline: <strong>Mahadev H</strong></span>
        </div>
      </footer>

    </div>
  );
}
