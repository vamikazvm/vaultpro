import {
  MOCK_USERS,
  MOCK_LOGS
} from "../data/mockData";

export default function Activity() {
    function ActivityPage() {
  const typeLabels = { login: '🔓 Login', credential_access: '👁 Access', credential_update: '✏️ Update', credential_create: '＋ Create', vault_access: '🔐 Vault', category_create: '📁 Category' };
  return (
    <div>
      <div className="panel">
        <div className="filter-bar">
          <select className="filter-select"><option>All Actions</option><option>Login</option><option>Credential Access</option><option>Vault Access</option><option>Updates</option></select>
          <select className="filter-select"><option>All Users</option>{MOCK_USERS.map(u=><option key={u.id}>{u.name}</option>)}</select>
          <input className="form-input" style={{ width: 140 }} type="date" defaultValue="2026-03-20" />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
          <input className="form-input" style={{ width: 140 }} type="date" defaultValue="2026-03-20" />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>User</th><th>Action</th><th>Target</th><th>Type</th><th>Timestamp</th><th>IP Address</th></tr>
            </thead>
            <tbody>
              {MOCK_LOGS.map(log => (
                <tr key={log.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar sm">{log.user.split(' ').map(w=>w[0]).join('')}</div>
                      <span className="td-main" style={{ fontSize: 12 }}>{log.user}</span>
                    </div>
                  </td>
                  <td>{log.action}</td>
                  <td style={{ color: 'var(--accent-bright)', fontSize: 12 }}>{log.target}</td>
                  <td><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{typeLabels[log.type] || log.type}</span></td>
                  <td className="td-mono" style={{ fontSize: 11 }}>{log.timestamp}</td>
                  <td className="td-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

}