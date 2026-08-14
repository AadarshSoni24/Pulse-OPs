import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Server,
  RefreshCw,
  Plus,
  Lock,
  Globe,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  XCircle,
  BarChart3,
  Bell,
  Search,
  Zap
} from 'lucide-react';

interface Monitor {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  status: 'healthy' | 'degraded' | 'down';
  statusCode: number;
  latencyMs: number;
  p50: number;
  p95: number;
  p99: number;
  uptime24h: number;
  ssrfProtected: boolean;
  sslExpiresDays: number;
  sslIssuer: string;
  lastChecked: string;
  interval: number;
  sparkline: number[];
  history: ('up' | 'degraded' | 'down')[];
}

const INITIAL_MONITORS: Monitor[] = [
  {
    id: 'mon-1',
    name: 'GitHub Status API',
    url: 'https://www.githubstatus.com/api/v2/status.json',
    method: 'GET',
    status: 'healthy',
    statusCode: 200,
    latencyMs: 42,
    p50: 38,
    p95: 85,
    p99: 140,
    uptime24h: 99.99,
    ssrfProtected: true,
    sslExpiresDays: 184,
    sslIssuer: "DigiCert SHA2 High Assurance Server CA",
    lastChecked: '3s ago',
    interval: 15,
    sparkline: [35, 40, 38, 45, 42, 39, 41, 44, 42],
    history: Array(24).fill('up')
  },
  {
    id: 'mon-2',
    name: 'Stripe Payments Gateway',
    url: 'https://api.stripe.com/v1/charges',
    method: 'GET',
    status: 'healthy',
    statusCode: 200,
    latencyMs: 88,
    p50: 76,
    p95: 142,
    p99: 290,
    uptime24h: 99.95,
    ssrfProtected: true,
    sslExpiresDays: 92,
    sslIssuer: "Sectigo RSA Domain Validation Secure Server CA",
    lastChecked: '8s ago',
    interval: 15,
    sparkline: [80, 85, 92, 88, 76, 94, 90, 84, 88],
    history: [...Array(20).fill('up'), 'degraded', 'up', 'up', 'up']
  },
  {
    id: 'mon-3',
    name: 'Auth Microservice (OAuth2)',
    url: 'https://auth.acme-internal.net/oauth/token',
    method: 'POST',
    status: 'degraded',
    statusCode: 200,
    latencyMs: 340,
    p50: 120,
    p95: 450,
    p99: 890,
    uptime24h: 98.40,
    ssrfProtected: true,
    sslExpiresDays: 12,
    sslIssuer: "Let's Encrypt Authority X3",
    lastChecked: '2s ago',
    interval: 30,
    sparkline: [120, 150, 240, 380, 420, 340, 310, 290, 340],
    history: [...Array(15).fill('up'), 'degraded', 'degraded', 'degraded', 'up', 'up', 'up', 'up', 'up']
  },
  {
    id: 'mon-4',
    name: 'Legacy Partner Webhook Node',
    url: 'https://partner-failing.acme.org/webhook',
    method: 'GET',
    status: 'down',
    statusCode: 502,
    latencyMs: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    uptime24h: 92.10,
    ssrfProtected: true,
    sslExpiresDays: 45,
    sslIssuer: "GTS CA 1C3",
    lastChecked: '12s ago',
    interval: 15,
    sparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    history: [...Array(18).fill('up'), 'down', 'down', 'down', 'down', 'down', 'down']
  }
];

export function App() {
  const [monitors, setMonitors] = useState<Monitor[]>(INITIAL_MONITORS);
  const [activeTab, setActiveTab] = useState<'monitors' | 'incidents' | 'ssl' | 'status-page'>('monitors');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'degraded' | 'down'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('Acme Corp (Production)');

  // Form State
  const [newMonitorName, setNewMonitorName] = useState('');
  const [newMonitorUrl, setNewMonitorUrl] = useState('');
  const [newMonitorInterval, setNewMonitorInterval] = useState(15);
  const [ssrfGuardEnabled, setSsrfGuardEnabled] = useState(true);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualCheck = (id?: string) => {
    setIsRefreshing(true);
    showToast(id ? 'Executing instant health check...' : 'Refreshed all 18 monitors across worker nodes!');
    
    setTimeout(() => {
      setMonitors(prev =>
        prev.map(m => {
          if (!id || m.id === id) {
            const jitter = Math.floor(Math.random() * 10) - 5;
            const newLatency = m.status === 'down' ? 0 : Math.max(15, m.latencyMs + jitter);
            return {
              ...m,
              latencyMs: newLatency,
              lastChecked: 'Just now',
              sparkline: [...m.sparkline.slice(1), newLatency]
            };
          }
          return m;
        })
      );
      setIsRefreshing(false);
    }, 600);
  };

  const handleAddMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonitorUrl) return;

    const newMon: Monitor = {
      id: `mon-${Date.now()}`,
      name: newMonitorName || new URL(newMonitorUrl).hostname,
      url: newMonitorUrl,
      method: 'GET',
      status: 'healthy',
      statusCode: 200,
      latencyMs: 45,
      p50: 40,
      p95: 88,
      p99: 130,
      uptime24h: 100.0,
      ssrfProtected: ssrfGuardEnabled,
      sslExpiresDays: 90,
      sslIssuer: "DigiCert Global Root CA",
      lastChecked: 'Just now',
      interval: newMonitorInterval,
      sparkline: [40, 42, 45, 41, 46, 44, 45, 43, 45],
      history: Array(24).fill('up')
    };

    setMonitors([newMon, ...monitors]);
    setShowAddModal(false);
    setNewMonitorName('');
    setNewMonitorUrl('');
    showToast(`Added monitor "${newMon.name}" to ${selectedWorkspace}`);
  };

  const filteredMonitors = monitors.filter(m => {
    const matchesFilter = filterStatus === 'all' || m.status === filterStatus;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const countHealthy = monitors.filter(m => m.status === 'healthy').length;
  const countDegraded = monitors.filter(m => m.status === 'degraded').length;
  const countDown = monitors.filter(m => m.status === 'down').length;

  return (
    <div className="dashboard-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 200,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #3b82f6',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backdropFilter: 'blur(10px)'
        }}>
          <Zap size={18} color="#3b82f6" />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* Header Navigation */}
      <header className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
            }}>
              <Activity size={24} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>PulseOps</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Distributed Monitoring Engine</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          {/* Workspace Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Server size={15} color="#3b82f6" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <select
              value={selectedWorkspace}
              onChange={e => {
                setSelectedWorkspace(e.target.value);
                showToast(`Switched workspace to: ${e.target.value}`);
              }}
              className="glass-button"
              style={{
                paddingLeft: '2.1rem',
                paddingRight: '1.8rem',
                fontSize: '0.85rem',
                appearance: 'none',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <option value="Acme Corp (Production)" style={{ background: '#0f172a' }}>Acme Corp (Production)</option>
              <option value="Staging Cluster" style={{ background: '#0f172a' }}>Staging Cluster</option>
              <option value="Fintech Services" style={{ background: '#0f172a' }}>Fintech Services</option>
            </select>
            <ChevronDown size={14} color="var(--text-muted)" style={{ position: 'absolute', right: '10px', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="badge badge-success" style={{ padding: '0.4rem 0.8rem', gap: '0.5rem' }}>
            <div className="status-pulse-dot success" />
            <span>99.98% System Operational</span>
          </div>

          <button className="glass-button" onClick={() => handleManualCheck()} disabled={isRefreshing}>
            <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
            <span>Check Now</span>
          </button>

          <button className="glass-button glass-button-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            <span>Add Monitor</span>
          </button>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="metrics-row">
        <div className="glass-panel metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Monitors</span>
            <Activity size={18} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{monitors.length} Total</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: 'var(--success)' }}>● {countHealthy} Up</span>
              <span style={{ color: 'var(--warning)' }}>● {countDegraded} Degraded</span>
              <span style={{ color: 'var(--danger)' }}>● {countDown} Down</span>
            </div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Latency Percentiles</span>
            <BarChart3 size={18} color="var(--cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>38ms</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 600 }}>P50 Median</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span className="mono" style={{ color: 'var(--warning)' }}>P95: 112ms</span> | <span className="mono" style={{ color: 'var(--danger)' }}>P99: 340ms</span>
            </div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Incidents</span>
            <AlertTriangle size={18} color="var(--danger)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: countDown > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {countDown} Outage
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Deduplicated: 1 incident = 1 continuous outage
            </div>
          </div>
        </div>

        <div className="glass-panel metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>SSL / TLS Inspector</span>
            <ShieldCheck size={18} color="var(--purple)" />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>4/4 Secure</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.25rem', fontWeight: 500 }}>
              ⚠️ Auth Service cert expires in 12 days
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'monitors', label: 'API Monitors', icon: Activity },
            { id: 'incidents', label: 'Incident Log (1)', icon: Bell },
            { id: 'ssl', label: 'SSL Inspector', icon: ShieldCheck },
            { id: 'status-page', label: 'Public Status Page', icon: Globe }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} color={isActive ? '#3b82f6' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'monitors' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search monitors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2rem', height: '36px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              {(['all', 'healthy', 'degraded', 'down'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    background: filterStatus === st ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    border: 'none',
                    color: filterStatus === st ? '#fff' : 'var(--text-muted)',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '7px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENT: API MONITORS */}
      {activeTab === 'monitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMonitors.map(mon => (
            <div key={mon.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: mon.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : mon.status === 'degraded' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${mon.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' : mon.status === 'degraded' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {mon.status === 'healthy' && <CheckCircle2 size={22} color="var(--success)" />}
                    {mon.status === 'degraded' && <AlertTriangle size={22} color="var(--warning)" />}
                    {mon.status === 'down' && <XCircle size={22} color="var(--danger)" />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{mon.name}</h3>
                      <span className="mono" style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                        {mon.method}
                      </span>
                      {mon.ssrfProtected && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(6, 182, 212, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '99px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                          <Lock size={11} /> SSRF Safe
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <a href={mon.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {mon.url}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  {/* Status pill */}
                  <div className={`badge ${mon.status === 'healthy' ? 'badge-success' : mon.status === 'degraded' ? 'badge-warning' : 'badge-danger'}`}>
                    <span>HTTP {mon.statusCode}</span>
                    <span>•</span>
                    <span className="mono">{mon.latencyMs}ms</span>
                  </div>

                  <button className="glass-button" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleManualCheck(mon.id)}>
                    <RefreshCw size={12} />
                    <span>Check</span>
                  </button>
                </div>
              </div>

              {/* Sparkline & Percentiles Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1.1rem', borderRadius: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <span>24h Latency History</span>
                    <span className="mono" style={{ color: 'var(--cyan)' }}>P50: {mon.p50}ms | P95: {mon.p95}ms | P99: {mon.p99}ms</span>
                  </div>
                  <svg className="sparkline-svg" viewBox="0 0 180 40">
                    <defs>
                      <linearGradient id={`grad-${mon.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {mon.sparkline.length > 1 && (
                      <>
                        <polygon
                          points={`0,40 ${mon.sparkline.map((val, idx) => `${idx * 22.5},${val === 0 ? 38 : 35 - (val / 500) * 30}`).join(' ')} 180,40`}
                          fill={`url(#grad-${mon.id})`}
                        />
                        <polyline
                          fill="none"
                          stroke={mon.status === 'down' ? '#ef4444' : '#3b82f6'}
                          strokeWidth="2"
                          points={mon.sparkline.map((val, idx) => `${idx * 22.5},${val === 0 ? 38 : 35 - (val / 500) * 30}`).join(' ')}
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <span>24-Hour SLA Uptime Bar</span>
                    <span className="mono" style={{ fontWeight: 600, color: mon.uptime24h > 99 ? 'var(--success)' : 'var(--warning)' }}>{mon.uptime24h}%</span>
                  </div>
                  <div className="uptime-bar">
                    {mon.history.map((h, i) => (
                      <div
                        key={i}
                        className={`uptime-segment ${h}`}
                        title={`Hour ${i + 1}: ${h.toUpperCase()}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Incident Management & Outage Timeline</h2>
            <span className="badge badge-warning">1 Continuous Outage Active</span>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>INC-2026-0814: Legacy Partner Webhook Node Down</h4>
                <span className="badge badge-danger">CRITICAL OUTAGE</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                HTTP 502 Bad Gateway response received consecutively for 14 minutes.
                <strong> Anti-Spam Incident Engine:</strong> 56 health check failures deduplicated into 1 active incident ticket to prevent email alert spam.
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', gap: '1rem' }}>
                <span>Started: 2026-08-14 23:10:00 UTC</span>
                <span>Affected Endpoint: https://partner-failing.acme.org/webhook</span>
                <span>Email & Webhook Dispatched</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SSL INSPECTOR */}
      {activeTab === 'ssl' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>TLS / SSL Certificate Health Inspector</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {monitors.map(m => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>{m.name}</h4>
                  <span className={`badge ${m.sslExpiresDays < 30 ? 'badge-warning' : 'badge-success'}`}>
                    {m.sslExpiresDays} days left
                  </span>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>Issuer: <span style={{ color: '#fff' }}>{m.sslIssuer}</span></div>
                  <div>Protocol: <span className="mono" style={{ color: 'var(--cyan)' }}>TLS v1.3 (ECDHE-RSA-AES128-GCM-SHA256)</span></div>
                  <div>Status: <span style={{ color: 'var(--success)' }}>Valid & Authenticated</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PUBLIC STATUS PAGE PREVIEW */}
      {activeTab === 'status-page' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Public Status Page Preview</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Publicly visible SLA dashboard hosted at <code>https://status.pulseops.io/acme-corp</code></p>
            </div>
            <button className="glass-button glass-button-primary">
              <ExternalLink size={14} />
              <span>Open Public Page</span>
            </button>
          </div>
          <div style={{ background: '#05070d', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Acme Corp System Status</div>
              <div className="badge badge-success">All Systems Operational</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {monitors.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 500 }}>{m.name}</span>
                  <span style={{ color: m.status === 'healthy' ? 'var(--success)' : m.status === 'degraded' ? 'var(--warning)' : 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>
                    {m.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD MONITOR MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>Add New API Monitor</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddMonitor}>
              <div className="form-group">
                <label className="form-label">Monitor Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Payment Microservice"
                  value={newMonitorName}
                  onChange={e => setNewMonitorName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Endpoint URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://api.yourdomain.com/health"
                  required
                  value={newMonitorUrl}
                  onChange={e => setNewMonitorUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Check Interval</label>
                <select className="form-select" value={newMonitorInterval} onChange={e => setNewMonitorInterval(Number(e.target.value))}>
                  <option value={15}>Every 15 seconds (High Frequency)</option>
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 60 seconds</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                <input
                  type="checkbox"
                  id="ssrf"
                  checked={ssrfGuardEnabled}
                  onChange={e => setSsrfGuardEnabled(e.target.checked)}
                />
                <label htmlFor="ssrf" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Enable SSRF Protection Guard (Validate Public IP DNS hop)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="glass-button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="glass-button glass-button-primary">Add Endpoint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
