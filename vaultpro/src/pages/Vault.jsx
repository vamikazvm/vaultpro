import { MOCK_CREDENTIALS } from "../data/mockData";

export default function Vault() {

    function VaultPage() {
  const vaultCreds = MOCK_CREDENTIALS.filter(c => c.isVault);
  return (
    <div>
      <div className="vault-header">
        <div className="vault-icon-large">🔐</div>
        <div>
          <div className="vault-title">Secure Vault</div>
          <div className="vault-sub">All vault credentials are encrypted with AES-256. Access requires elevated permissions.</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--vault-color)' }}>{vaultCreds.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Vault Items</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">🔐 Vault Credentials</span>
          <span className="badge vault">AES-256 Encrypted</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Platform</th><th>Username</th><th>Category</th><th>Created By</th><th>Last Accessed</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {vaultCreds.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cred-platform">
                      <div className="cred-favicon">🔐</div>
                      <div className="td-main">{c.platform}</div>
                    </div>
                  </td>
                  <td className="td-mono">{c.username}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.category}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar sm">{c.createdBy.split(' ').map(w=>w[0]).join('')}</div>
                      <span style={{ fontSize: 11 }}>{c.createdBy}</span>
                    </div>
                  </td>
                  <td className="td-mono">{c.updatedAt}</td>
                  <td>
                    <div className="cred-actions">
                      <div className="icon-btn" style={{ borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>🔓 Request</div>
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

}