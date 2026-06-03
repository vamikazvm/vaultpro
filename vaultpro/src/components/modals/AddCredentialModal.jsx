import { useState } from "react";

export default function AddCredentialModal({ onClose }) {function AddCredentialModal({ onClose }) {
  const [isVault, setIsVault] = useState(false);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">🔑 New Credential</span>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Platform Name</label>
            <input className="form-input" placeholder="e.g. Instagram Business" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Username / Email</label>
              <input className="form-input" placeholder="user@corp.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">URL</label>
            <input className="form-input" placeholder="https://" />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input">
              <option>Social Media → Instagram</option>
              <option>Cloud Services → AWS → Production</option>
              <option>Websites → Conceptual Orthopedics</option>
              <option>Internal Tools</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional notes..." />
          </div>
          <div className="form-group">
            <div className="toggle-row">
              <div>
                <div className="toggle-label">🔐 Store in Vault</div>
                <div className="toggle-sub">Requires extra verification for access</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={isVault} onChange={e => setIsVault(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
          {isVault && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#f59e0b' }}>
              ⚠ Vault items are encrypted with AES-256 and require admin approval for access
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn cancel" onClick={onClose}>Cancel</button>
          <button className="btn save">Save Credential</button>
        </div>
      </div>
    </div>
  );
}

}