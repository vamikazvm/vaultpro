import { MOCK_CATEGORIES } from "../data/mockData";

export default function Categories({ onAdd }) {
    function CategoriesPage({ onAdd }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Category tree — unlimited nesting depth</div>
        <button className="topbar-btn primary" onClick={onAdd}>＋ New Category</button>
      </div>
      {MOCK_CATEGORIES.map(cat => (
        <div key={cat.id} className="cat-node">
          <div className="cat-node-header">
            <div className="cat-node-icon">{cat.icon}</div>
            <div className="cat-node-name">{cat.name}</div>
            <div className="cat-node-meta">By {cat.createdBy}</div>
            <span className={`badge ${cat.status}`}>{cat.status}</span>
            {cat.children?.length > 0 && <span className="badge editor">{cat.children.length} sub</span>}
          </div>
          {cat.children?.length > 0 && (
            <div className="cat-children">
              {cat.children.map(child => (
                <div key={child.id}>
                  <div className="cat-child">
                    <div className="cat-child-icon">{child.icon}</div>
                    <div className="cat-child-name">{child.name}</div>
                    <span className={`badge ${child.status}`} style={{ fontSize: 9 }}>{child.status}</span>
                    {child.children?.length > 0 && (
                      <span className="badge editor" style={{ fontSize: 9 }}>{child.children.length} sub</span>
                    )}
                  </div>
                  {child.children?.map(sub => (
                    <div key={sub.id} className="cat-child" style={{ paddingLeft: 32 }}>
                      <div style={{ width: 12, color: 'var(--border-bright)' }}>└</div>
                      <div className="cat-child-icon">{sub.icon}</div>
                      <div className="cat-child-name" style={{ color: 'var(--text-muted)' }}>{sub.name}</div>
                      <span className={`badge ${sub.status}`} style={{ fontSize: 9 }}>{sub.status}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
}