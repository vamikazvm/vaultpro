import {
  MOCK_LOGS,
  MOCK_CREDENTIALS,
  SECURITY_ALERTS
} from "../data/mockData";

export default function DashboardPage() { 
  return (
    <div>
      <div className="stats-grid">
        {[
          { label: 'Total Credentials', value: '142', sub: 'Across all categories', icon: '🔑', cls: 'blue', trend: '+8 this week', tCls: 'up' },
          { label: 'Vault Items', value: '23', sub: 'Encrypted & protected', icon: '🔐', cls: 'yellow', trend: '2 new', tCls: 'up' },
          { label: 'Active Users', value: '3', sub: '1 inactive account', icon: '👥', cls: 'green', trend: 'Alert', tCls: 'warn' },
          { label: 'Categories', value: '13', sub: 'Nested tree structure', icon: '📁', cls: 'purple', trend: '+2 this week', tCls: 'up' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="stat-sub">{s.sub}</span>
              <span className={`stat-trend ${s.tCls}`}>{s.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3">
        {/* Recent Activity */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Recent Activity</span>
            <span className="panel-action">View All →</span>
          </div>
          {MOCK_LOGS.slice(0, 6).map(log => (
            <div key={log.id} className="log-item">
              <div className={`log-action-type ${log.type}`} />
              <div className="log-text">
                <span className="log-user">{log.user}</span>
                <span className="log-action"> {log.action} </span>
                <span className="log-target">{log.target}</span>
              </div>
              <div className="log-time">{log.timestamp.split(' ')[1]} {log.timestamp.split(' ')[2]}</div>
            </div>
          ))}
        </div>

        {/* Security Alerts */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">🚨 Security Alerts</span>
            <span className={`badge ${SECURITY_ALERTS.filter(a=>a.severity==='high').length > 0 ? 'high' : 'active'}`}>
              {SECURITY_ALERTS.length}
            </span>
          </div>
          {SECURITY_ALERTS.map(a => (
            <div key={a.id} className="alert-item">
              <div className={`alert-dot ${a.severity}`} />
              <div>
                <div className="alert-msg">{a.message}</div>
                <div className="alert-time">{a.time}</div>
              </div>
              <span className={`badge ${a.severity}`}>{a.severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Credentials */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent Credentials</span>
          <span className="panel-action">View All →</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Username</th>
                <th>Category</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CREDENTIALS.slice(0, 4).map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cred-platform">
                      <div className="cred-favicon">
                        {c.platform.includes('Instagram') ? '📸' : c.platform.includes('AWS') ? '🔶' : c.platform.includes('Azure') ? '🔷' : '🌐'}
                      </div>
                      <div>
                        <div className="td-main">{c.platform}</div>
                        {c.isVault && <span className="badge vault">🔐 Vault</span>}
                      </div>
                    </div>
                  </td>
                  <td className="td-mono">{c.username}</td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.category}</span></td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td className="td-mono">{c.updatedAt}</td>
                  <td>
                    <div className="cred-actions">
                      <div className="icon-btn primary" title="View">👁</div>
                      <div className="icon-btn" title="Edit">✏️</div>
                      <div className="icon-btn" title="Copy Password">📋</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
