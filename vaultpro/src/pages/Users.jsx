import { MOCK_USERS } from "../data/mockData";

export default function Users() {
    function UsersPage() {
  const roleColors = { Admin: 'admin', Editor: 'editor', User: 'user' };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
        {MOCK_USERS.map(u => (
          <div key={u.id} className="user-card">
            <div className={`avatar ${u.role === 'Admin' ? '' : u.role === 'Editor' ? 'purple' : 'green'}`} style={{ width: 44, height: 44, fontSize: 15, borderRadius: 12 }}>{u.avatar}</div>
            <div className="user-info-main">
              <div className="user-card-name">{u.name}</div>
              <div className="user-card-email">{u.email}</div>
              <div className="user-card-meta">
                <span className={`badge ${roleColors[u.role]}`}>{u.role}</span>
                <span className={`badge ${u.status}`}>{u.status}</span>
              </div>
              <div className="user-card-login">Last login: {u.lastLogin}</div>
            </div>
            <div className="cred-actions" style={{ flexDirection: 'column' }}>
              <div className="icon-btn">✏️</div>
              <div className="icon-btn">⚙️</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header"><span className="panel-title">🛡 Role Permissions Matrix</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Permission</th>
                <th>Admin</th>
                <th>Editor</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Manage Users', '✅', '❌', '❌'],
                ['All Credentials Access', '✅', '❌', '❌'],
                ['Own Credentials CRUD', '✅', '✅', '✅'],
                ['Assigned Categories', '✅', '✅', '❌'],
                ['Create Subcategories', '✅', '✅', '❌'],
                ['Vault Access', '✅', '✅ (assigned)', '✅ (own)'],
                ['View Activity Logs', '✅', '❌', '❌'],
                ['Modify Roles', '✅', '❌', '❌'],
                ['Delete (Hard)', '❌', '❌', '❌'],
                ['Deactivate Records', '✅', '✅ (own)', '✅ (own)'],
              ].map(([perm, a, e, u]) => (
                <tr key={perm}>
                  <td className="td-main" style={{ fontSize: 12 }}>{perm}</td>
                  <td style={{ fontSize: 13 }}>{a}</td>
                  <td style={{ fontSize: 13 }}>{e}</td>
                  <td style={{ fontSize: 13 }}>{u}</td>
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