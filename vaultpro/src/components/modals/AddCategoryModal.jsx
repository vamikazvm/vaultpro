export default function AddCategoryModal({ onClose }) {

function AddCategoryModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">📁 New Category</span>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input className="form-input" placeholder="e.g. Production Servers" />
          </div>
          <div className="form-group">
            <label className="form-label">Parent Category</label>
            <select className="form-input">
              <option value="">— Root Level —</option>
              <option>Websites</option>
              <option>Social Media</option>
              <option>Cloud Services → AWS</option>
              <option>Cloud Services → Azure</option>
              <option>Internal Tools</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['🌐','📱','☁️','🔧','🏥','🔶','🔷','💼','📸','🐦','🛒','⚡','🧪','🔐','💻','🗄'].map(ic => (
                <div key={ic} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>{ic}</div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <select className="form-input">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn cancel" onClick={onClose}>Cancel</button>
          <button className="btn save">Create Category</button>
        </div>
      </div>
    </div>
  );
}

}