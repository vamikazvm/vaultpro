export default function Architecture() {
    function ArchitecturePage() {
  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header"><span className="panel-title">🏗 System Architecture</span></div>
        <div style={{ padding: 20 }}>
          {[
            { title: 'Frontend Layer', color: 'var(--accent)', boxes: ['React / Next.js', 'Tailwind CSS', 'JWT Auth Context', 'AES-256 Client Decrypt', 'Role-Based UI Guards'], cls: 'accent' },
            { title: 'API Gateway / Middleware', color: 'var(--purple)', boxes: ['Express.js REST API', 'JWT Middleware', 'RBAC Middleware', 'Rate Limiter', 'Helmet.js (HTTPS)'], cls: 'editor' },
            { title: 'Business Logic Layer', color: 'var(--green)', boxes: ['Auth Service', 'Credential Service', 'Category Service', 'Vault Service', 'Activity Log Service', 'User/Role Service'], cls: 'green' },
            { title: 'Encryption Layer', color: 'var(--yellow)', boxes: ['AES-256-GCM (Credentials)', 'bcrypt (Passwords)', 'JWT Signing (RS256)', 'Vault Key (HSM)'], cls: 'yellow' },
            { title: 'Data Layer', color: '#10b981', boxes: ['PostgreSQL', 'Redis (Sessions)', 'pgcrypto Extension', 'Connection Pool'], cls: 'green' },
          ].map((layer, i) => (
            <div key={i}>
              <div className="arch-layer">
                <div className="arch-layer-title" style={{ color: layer.color }}>{layer.title}</div>
                <div className="arch-boxes">
                  {layer.boxes.map(b => <div key={b} className={`arch-box ${layer.cls}`}>{b}</div>)}
                </div>
              </div>
              {i < 4 && <div className="arch-arrow">↕</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header"><span className="panel-title">🗄 Database Schema</span></div>
          <div style={{ padding: 16 }}>
            {[
              { name: 'users', fields: ['id UUID PK', 'name VARCHAR', 'email VARCHAR UNIQUE', 'password_hash TEXT', 'role_id FK', 'status ENUM', 'created_at TIMESTAMP'] },
              { name: 'roles', fields: ['id UUID PK', 'name VARCHAR', 'permissions JSONB'] },
              { name: 'categories', fields: ['id UUID PK', 'name VARCHAR', 'parent_id FK (self)', 'icon VARCHAR', 'created_by FK', 'status ENUM', 'created_at TIMESTAMP'] },
              { name: 'credentials', fields: ['id UUID PK', 'platform VARCHAR', 'username_enc TEXT', 'password_enc TEXT', 'url_enc TEXT', 'notes_enc TEXT', 'category_id FK', 'is_vault BOOLEAN', 'created_by FK', 'status ENUM', 'created_at / updated_at'] },
              { name: 'activity_logs', fields: ['id UUID PK', 'user_id FK', 'action VARCHAR', 'target_type VARCHAR', 'target_id UUID', 'ip_address INET', 'created_at TIMESTAMP'] },
            ].map(t => (
              <div key={t.name} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>TABLE: {t.name}</div>
                <div className="schema-box" style={{ padding: '8px 12px' }}>
                  {t.fields.map(f => (
                    <div key={f} style={{ fontSize: 10 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.split(' ')[0]}</span>
                      <span style={{ color: 'var(--text-muted)' }}> {f.split(' ').slice(1).join(' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><span className="panel-title">🔌 API Routes</span></div>
          <div style={{ padding: 16 }}>
            {[
              { group: 'Auth', color: 'var(--green)', routes: ['POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/auth/refresh', 'POST /api/auth/reset-password'] },
              { group: 'Credentials', color: 'var(--accent)', routes: ['GET /api/credentials', 'POST /api/credentials', 'PUT /api/credentials/:id', 'PATCH /api/credentials/:id/status'] },
              { group: 'Categories', color: 'var(--purple)', routes: ['GET /api/categories/tree', 'POST /api/categories', 'PUT /api/categories/:id', 'PATCH /api/categories/:id/status'] },
              { group: 'Vault', color: 'var(--yellow)', routes: ['GET /api/vault', 'POST /api/vault/request-access/:id', 'POST /api/vault/approve/:id'] },
              { group: 'Users', color: '#10b981', routes: ['GET /api/users', 'POST /api/users', 'PUT /api/users/:id', 'PUT /api/users/:id/role'] },
              { group: 'Logs', color: '#94a3b8', routes: ['GET /api/logs', 'GET /api/logs/export'] },
            ].map(g => (
              <div key={g.group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: g.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 4 }}>{g.group.toUpperCase()}</div>
                {g.routes.map(r => (
                  <div key={r} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: '2px 0' }}>
                    <span style={{ color: r.startsWith('GET') ? 'var(--green)' : r.startsWith('POST') ? 'var(--accent)' : r.startsWith('PUT') ? 'var(--yellow)' : 'var(--purple)', fontWeight: 700 }}>{r.split(' ')[0]}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> {r.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
}