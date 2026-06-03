import { useState } from "react";
import {
  MOCK_CREDENTIALS,
  MOCK_USERS,
  MOCK_CATEGORIES
} from "../data/mockData";

export default function Credentials({ onAdd }) {

    function CredentialsPage({ onAdd }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = MOCK_CREDENTIALS.filter(c => {
    if (filter === 'vault') return c.isVault;
    const q = search.toLowerCase();
    if (!q) return true;
    return c.platform.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="panel">
        <div className="filter-bar">
          <input
            className="form-input" style={{ width: 220 }}
            placeholder="🔍 Search credentials..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Credentials</option>
            <option value="vault">Vault Only</option>
          </select>
          <select className="filter-select">
            <option>All Categories</option>
            {MOCK_CATEGORIES.map(c => <option key={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select className="filter-select">
            <option>All Users</option>
            {MOCK_USERS.map(u => <option key={u.id}>{u.name}</option>)}
          </select>
          <div style={{ marginLeft: 'auto' }}>
            <button className="topbar-btn primary" onClick={onAdd}>＋ Add Credential</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Username</th>
                <th>Password</th>
                <th>Category</th>
                <th>Created By</th>
                <th>Updated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="cred-platform">
                      <div className="cred-favicon">
                        {c.isVault ? '🔐' : c.platform.includes('Instagram') ? '📸' : c.platform.includes('AWS') ? '🔶' : c.platform.includes('Azure') ? '🔷' : c.platform.includes('LinkedIn') ? '💼' : c.platform.includes('Twitter') ? '🐦' : '🌐'}
                      </div>
                      <div>
                        <div className="td-main">{c.platform}</div>
                        {c.isVault && <span className="badge vault" style={{ marginTop: 2 }}>Vault</span>}
                      </div>
                    </div>
                  </td>
                  <td className="td-mono">{c.username}</td>
                  <td>
                    <div className="pw-field">
                      <span className="pw-dots">••••••••</span>
                      <div className="icon-btn" style={{ width: 22, height: 22, fontSize: 11 }} title="Reveal">👁</div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.category}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar sm">{c.createdBy.split(' ').map(w=>w[0]).join('')}</div>
                      <span style={{ fontSize: 11 }}>{c.createdBy.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="td-mono">{c.updatedAt}</td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td>
                    <div className="cred-actions">
                      <div className="icon-btn primary">👁</div>
                      <div className="icon-btn">✏️</div>
                      <div className="icon-btn">📋</div>
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