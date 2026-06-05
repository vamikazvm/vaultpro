import { useState } from "react";

export default function CategoryTree({
  categories,
  depth = 0,
  activeCategory,
  onSelect
}) {
function CategoryTree({ categories, depth = 0, activeCategory, onSelect }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <>
      {categories.map(cat => (
        <div key={cat.id}>
          <div
            className={`tree-item ${activeCategory === cat.id ? 'active' : ''}`}
            style={{ paddingLeft: 18 + depth * 14 }}
            onClick={() => { if (cat.children?.length) toggle(cat.id); onSelect(cat.id); }}
          >
            {cat.children?.length > 0 ? (
              <span className="tree-toggle">{expanded[cat.id] ? '▾' : '▸'}</span>
            ) : <span className="tree-toggle" />}
            <span className="tree-icon">{cat.icon}</span>
            <span className="tree-label">{cat.name}</span>
            {cat.children?.length > 0 && <span className="tree-count">{cat.children.length}</span>}
          </div>
          {expanded[cat.id] && cat.children?.length > 0 && (
            <div className="tree-children">
              <CategoryTree categories={cat.children} depth={depth + 1} activeCategory={activeCategory} onSelect={onSelect} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

}
