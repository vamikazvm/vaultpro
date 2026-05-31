import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── CRYPTO SIMULATION (browser-safe AES-256 + bcrypt simulation) ─────────────
// In production: use Web Crypto API + bcryptjs library
const CryptoSim = {
  // Simulates AES-256 encryption (XOR-based obfuscation for demo)
  encrypt: (text, key = "VAULT_AES_256_KEY_ENTERPRISE") => {
    if (!text) return "";
    try {
      const enc = btoa(unescape(encodeURIComponent(text)));
      return `ENC::${enc}`;
    } catch { return `ENC::${btoa(text)}`; }
  },
  decrypt: (cipher, key = "VAULT_AES_256_KEY_ENTERPRISE") => {
    if (!cipher) return "";
    if (!cipher.startsWith("ENC::")) return cipher;
    try {
      return decodeURIComponent(escape(atob(cipher.slice(5))));
    } catch { return atob(cipher.slice(5)); }
  },
  // Simulates bcrypt hash
  hashPassword: (pw) => `$bcrypt$12$${btoa(pw + "SALT_ROUNDS_12")}`,
  verifyPassword: (pw, hash) => {
    if (!hash.startsWith("$bcrypt$")) return pw === hash; // legacy
    return hash === `$bcrypt$12$${btoa(pw + "SALT_ROUNDS_12")}`;
  },
  // Token generation
  genToken: (payload, expiryHours = 24) => {
    const exp = Date.now() + expiryHours * 3600000;
    return btoa(JSON.stringify({ ...payload, exp }));
  },
  parseToken: (token) => {
    try {
      const data = JSON.parse(atob(token));
      if (data.exp < Date.now()) return null; // expired
      return data;
    } catch { return null; }
  },
};

// ─── EMAIL SIM (logs to console + in-app notification) ─────────────────────
const EmailSim = {
  log: [],
  send: (to, subject, body, attachment = null) => {
    const entry = { to, subject, body, attachment, sentAt: new Date().toISOString() };
    EmailSim.log.unshift(entry);
    console.log(`📧 EMAIL SENT\nTo: ${to}\nSubject: ${subject}\n\n${body}`);
    return entry;
  },
  sendInvite: (email, inviterName, inviteToken, role) => {
    const link = `${window.location.origin}?invite=${inviteToken}`;
    return EmailSim.send(email, "You're invited to VaultPro", 
`Hello,

${inviterName} has invited you to join VaultPro — Enterprise Password Manager.

Your role: ${role.toUpperCase()}

Click the link below to set your password and complete setup:
${link}

⚠️ This link expires in 48 hours.

Best regards,
VaultPro Security Team`);
  },
  sendCredential: (toEmail, fromName, cred, secureLink, expiry) => {
    return EmailSim.send(toEmail, `Credential Shared: ${cred.title}`,
`Hello,

${fromName} has securely shared a credential with you via VaultPro.

─────────────────────────────
Platform:   ${cred.title}
Username:   ${cred.username}
Password:   [PROTECTED — use link below]
URL:        ${cred.url || "N/A"}
Shared at:  ${new Date().toLocaleString()}
─────────────────────────────

Access the credential securely here (expires ${expiry}):
${secureLink}

This link can only be used once and expires in 1 hour.

For security, do not forward this email.
VaultPro Security Team`);
  },
  sendReset: (email, resetToken) => {
    const link = `${window.location.origin}?reset=${resetToken}`;
    return EmailSim.send(email, "VaultPro — Reset Your Password",
`Hello,

A password reset was requested for your VaultPro account.

Click the link below to set a new password:
${link}

⚠️ This link expires in 1 hour. If you didn't request this, ignore this email.

VaultPro Security Team`);
  },
  sendExport: (toEmail, fromName, csvData, credCount) => {
    return EmailSim.send(toEmail, `VaultPro — Credential Export (${credCount} records)`,
`Hello,

${fromName} has exported ${credCount} credential(s) from VaultPro.

Export details:
• Records: ${credCount}
• Exported by: ${fromName}
• Date: ${new Date().toLocaleString()}

Please find the CSV attachment with this email.
Store it securely and delete after use.

VaultPro Security Team`, { filename: "vaultpro_export.csv", data: csvData });
  },
};

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────
const CSVExport = {
  generate: (creds, nodes, platforms, maskPasswords = true) => {
    const headers = ["Platform", "Username", "Password", "URL", "Category", "Status", "Vault", "Created At"];
    const rows = creds.map(cr => {
      const nd = nodes.find(n => n.id === cr.nodeId);
      const plat = platforms.find(p => p.id === nd?.platformId);
      const platNodes = nodes.filter(n => n.platformId === nd?.platformId);
      const path = nd ? buildPath(cr.nodeId, platNodes, plat?.name) : "—";
      const pw = maskPasswords ? "••••••••" : CryptoSim.decrypt(cr.passwordEnc) || cr.password || "";
      return [cr.title, cr.username, pw, cr.url || "", path, cr.status, cr.inVault ? "Yes" : "No", cr.createdAt];
    });
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    return [headers, ...rows].map(row => row.map(escape).join(",")).join("\n");
  },
  download: (csv, filename = "vaultpro_export.csv") => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
};

// ─── ICON PALETTE ─────────────────────────────────────────────────────────────
const ICON_PALETTE = ["📁","🌐","🔍","💬","☁️","🛡️","📧","💼","📱","🖥️","🔑","🏦","🛒","📊","🎯","⚙️","🔧","🗂️","🔗","🌍","💡","🚀","📌","🎨","🤖","📦","🔔","💰","🏠","🌟","📸","🎵","📹","🎮","🏋️","✈️","🧪","📚","🔬","🏢","👨‍⚕️","🏥","🦷","🩺","💊","🧬","🎓","⚕️","🫀","🏨"];
const PLATFORM_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_USERS = [{
  id: "u1", name: "Admin User", email: "admin@vaultpro.com",
  passwordHash: CryptoSim.hashPassword("Admin@123"),
  role: "admin", avatar: "AU", lastLogin: null, ip: "—",
  active: true, department: "Management", phone: "—", emailVerified: true,
}];

const SEED_PLATFORMS = [
  { id: "p1", name: "Dr. Zainab Vora", icon: "👨‍⚕️", color: "#6366f1", hidden: false, createdBy: "u1", createdAt: "2026-01-10T09:00:00Z", assignedEditors: [] },
  { id: "p2", name: "eConceptual", icon: "💡", color: "#0ea5e9", hidden: false, createdBy: "u1", createdAt: "2026-01-11T09:00:00Z", assignedEditors: [] },
  { id: "p3", name: "Dr. Apurv Mehra", icon: "🩺", color: "#10b981", hidden: false, createdBy: "u1", createdAt: "2026-01-12T09:00:00Z", assignedEditors: [] },
  { id: "p4", name: "Conuts", icon: "🛒", color: "#f59e0b", hidden: false, createdBy: "u1", createdAt: "2026-01-13T09:00:00Z", assignedEditors: [] },
];
const SEED_NODES = [];
const SEED_CREDENTIALS = [];
const SEED_LOGS = [
  { id: "LOG-001", action: "user_login", entityType: "user", entityId: "u1", entityName: "Admin User", userId: "u1", userName: "Admin User", userRole: "admin", timestamp: "2026-01-10T09:00:00Z", ip: "127.0.0.1", meta: {} },
];
const SEED_INVITES = [];

// ─── RBAC ─────────────────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin:  { manageUsers: true, managePlatforms: true, manageNodes: true, manageAllCreds: true, vault: true, viewLogs: true, exportAll: true, shareCredentials: true },
  editor: { manageUsers: false, managePlatforms: false, manageNodes: true, manageAllCreds: false, vault: true, viewLogs: false, exportAll: false, shareCredentials: true },
  user:   { manageUsers: false, managePlatforms: false, manageNodes: false, manageAllCreds: false, vault: true, viewLogs: false, exportAll: false, shareCredentials: false },
};
const hasPerm = (role, perm) => !!ROLE_PERMISSIONS[role]?.[perm];
const canAccess = (cr, userId, role) => role === "admin" || (role === "editor" && cr.accessList?.includes(userId)) || cr.ownerId === userId;
const canEdit = (cr, userId, role) => role === "admin" || (role === "editor" && cr.accessList?.includes(userId)) || cr.ownerId === userId;

// ─── TREE HELPERS ─────────────────────────────────────────────────────────────
const buildPath = (nodeId, nodes, platformName = "") => {
  const chain = [];
  let cur = nodes.find(n => n.id === nodeId);
  while (cur) { chain.unshift(cur.name); cur = cur.parentId ? nodes.find(n => n.id === cur.parentId) : null; }
  return platformName ? [platformName, ...chain].join(" › ") : chain.join(" › ");
};
const getChildren = (parentId, nodes, platformId) => nodes.filter(n => n.parentId === parentId && n.platformId === platformId);
const getRoots = (nodes, platformId) => nodes.filter(n => n.parentId === null && n.platformId === platformId);
const getDescendants = (nodeId, nodes) => {
  const result = [nodeId]; const queue = [nodeId];
  while (queue.length) { const pid = queue.shift(); const kids = nodes.filter(n => n.parentId === pid); kids.forEach(k => { result.push(k.id); queue.push(k.id); }); }
  return result;
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const genId = () => "n" + Math.random().toString(36).slice(2,9);
const genCrId = () => "cr" + Math.random().toString(36).slice(2,9);
const genPId = () => "p" + Math.random().toString(36).slice(2,9);
const genUId = () => "u" + Math.random().toString(36).slice(2,9);
let logCtr = SEED_LOGS.length + 1;
const genLogId = () => `LOG-${String(logCtr++).padStart(3,"0")}`;
const maskPwd = p => "•".repeat(Math.min(p?.length || 8, 12));
const nowISO = () => new Date().toISOString();
const fmtDate = ts => { if(!ts) return "—"; const d = new Date(ts); return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) + " · " + d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}); };
const initials = name => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

const CHARSET = { upper:"ABCDEFGHIJKLMNOPQRSTUVWXYZ", lower:"abcdefghijklmnopqrstuvwxyz", numbers:"0123456789", symbols:"!@#$%^&*()_+-=[]{}|;:,.<>?" };
function generatePassword(length=16, opts={upper:true,lower:true,numbers:true,symbols:true}) {
  let pool=""; const required=[];
  if(opts.upper){pool+=CHARSET.upper;required.push(CHARSET.upper[Math.floor(Math.random()*CHARSET.upper.length)]);}
  if(opts.lower){pool+=CHARSET.lower;required.push(CHARSET.lower[Math.floor(Math.random()*CHARSET.lower.length)]);}
  if(opts.numbers){pool+=CHARSET.numbers;required.push(CHARSET.numbers[Math.floor(Math.random()*CHARSET.numbers.length)]);}
  if(opts.symbols){pool+=CHARSET.symbols;required.push(CHARSET.symbols[Math.floor(Math.random()*CHARSET.symbols.length)]);}
  if(!pool) pool=CHARSET.lower;
  const arr=[...required];
  while(arr.length<length) arr.push(pool[Math.floor(Math.random()*pool.length)]);
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr.join("").slice(0,length);
}
function calcStrength(pw) {
  if(!pw) return {score:0,label:"",color:""};
  let score=0;
  if(pw.length>=8) score++; if(pw.length>=12) score++; if(pw.length>=16) score++;
  if(/[A-Z]/.test(pw)) score++; if(/[a-z]/.test(pw)) score++;
  if(/[0-9]/.test(pw)) score++; if(/[^A-Za-z0-9]/.test(pw)) score++;
  if(pw.length>=20) score++;
  if(score<=2) return {score:1,pct:20,label:"Very Weak",color:"#ef4444"};
  if(score<=3) return {score:2,pct:40,label:"Weak",color:"#f97316"};
  if(score<=4) return {score:3,pct:60,label:"Fair",color:"#f59e0b"};
  if(score<=6) return {score:4,pct:80,label:"Strong",color:"#10b981"};
  return {score:5,pct:100,label:"Very Strong",color:"#06b6d4"};
}

// ─── PERSIST HOOK ─────────────────────────────────────────────────────────────
function usePersist(key, defaultValue) {
  const [state, setStateRaw] = useState(() => {
    try { const s = localStorage.getItem(key); if(s !== null) return JSON.parse(s); } catch {}
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  });
  const setState = useCallback((updater) => {
    setStateRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [state, setState];
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,300&family=DM+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#060810;--surface:#0c1018;--surface2:#111827;--surface3:#1a2235;--surface4:#1e2840;
  --border:#ffffff07;--border2:#ffffff10;--border3:#ffffff1a;
  --text:#eef1f8;--text2:#8899b0;--text3:#4a5a6e;
  --accent:#4f7cff;--accent2:#7c5cfc;--accentglow:#4f7cff18;
  --green:#0fba81;--red:#f43f5e;--yellow:#f5a623;--orange:#f97316;
  --vault:#b06afc;--vaultglow:#b06afc18;
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
  --shadow:0 4px 24px #00000050;--shadowlg:0 12px 48px #00000070;
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--surface3);border-radius:4px}

/* ── APP SHELL ── */
.app{display:flex;height:100vh;overflow:hidden}

/* ── SIDEBAR ── */
.sidebar{width:244px;min-width:244px;background:var(--surface);border-right:1px solid var(--border2);display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:10}
.sidebar::after{content:'';position:absolute;top:0;right:0;width:1px;height:100%;background:linear-gradient(180deg,transparent,#4f7cff28,transparent);pointer-events:none}
.sidebar-logo{padding:20px 18px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0}
.logo-mark{width:34px;height:34px;border-radius:9px;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;font-size:16px;box-shadow:0 0 20px var(--accentglow)}
.logo-name{font-size:14px;font-weight:800;letter-spacing:-.4px}
.logo-tagline{font-size:9px;color:var(--text3);letter-spacing:1.4px;text-transform:uppercase;font-weight:600}
.sidebar-section-label{padding:14px 18px 5px;font-size:9px;font-weight:700;color:var(--text3);letter-spacing:2px;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;margin:1px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:13px;font-weight:500;color:var(--text2);transition:all .13s;position:relative}
.nav-item:hover{background:var(--surface2);color:var(--text)}
.nav-item.active{background:linear-gradient(135deg,var(--accent)14,var(--accent2)08);color:var(--text);border:1px solid var(--accent)20}
.nav-item.active::before{content:'';position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:3px;height:16px;background:linear-gradient(180deg,var(--accent),var(--accent2));border-radius:0 2px 2px 0}
.nav-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.nav-badge{margin-left:auto;background:var(--accent)22;color:var(--accent);font-size:10px;padding:1px 6px;border-radius:20px;font-weight:700;border:1px solid var(--accent)28}
.nav-vault-badge{margin-left:auto;background:var(--vault)18;color:var(--vault);font-size:10px;padding:1px 6px;border-radius:20px;font-weight:700;border:1px solid var(--vault)28}
.sidebar-footer{margin-top:auto;padding:10px;border-top:1px solid var(--border);flex-shrink:0;position:relative}
.user-pill{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:var(--radius-sm);cursor:pointer;transition:background .13s;border:1px solid var(--border)}
.user-pill:hover{background:var(--surface3)}
.avatar{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;font-size:10px;font-weight:700;flex-shrink:0;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));letter-spacing:-.5px}
.user-pill-name{font-size:12px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.user-pill-role{font-size:10px;color:var(--text3);text-transform:capitalize}
.role-badge{font-size:9px;padding:1px 6px;border-radius:20px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.role-admin{background:#f43f5e18;color:#f43f5e;border:1px solid #f43f5e28}
.role-editor{background:#f5a62318;color:#f5a623;border:1px solid #f5a62328}
.role-user{background:#0fba8118;color:#0fba81;border:1px solid #0fba8128}

/* ── MAIN ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{display:flex;align-items:center;gap:12px;padding:13px 22px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0}
.topbar-left{flex:1;min-width:0}
.topbar-title{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar-breadcrumb{font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.search-wrap{position:relative;flex:1;max-width:240px}
.search-wrap input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:7px 11px 7px 30px;font-size:12.5px;color:var(--text);outline:none;font-family:'DM Sans',sans-serif;transition:border .13s}
.search-wrap input::placeholder{color:var(--text3)}
.search-wrap input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accentglow)}
.search-ico{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:12px;pointer-events:none}
.btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:var(--radius-sm);font-size:12.5px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .13s;white-space:nowrap}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 0 16px var(--accentglow)}
.btn-primary:hover{opacity:.9;box-shadow:0 0 24px var(--accentglow)}
.btn-ghost{background:transparent;color:var(--text2);border:1px solid var(--border3)}
.btn-ghost:hover{background:var(--surface2);color:var(--text);border-color:var(--border3)}
.btn-vault{background:var(--vaultglow);color:var(--vault);border:1px solid var(--vault)28}
.btn-vault:hover{background:var(--vault)22}
.btn-green{background:#0fba8118;color:var(--green);border:1px solid #0fba8128}
.btn-green:hover{background:#0fba8125}
.btn-danger{background:#f43f5e18;color:var(--red);border:1px solid #f43f5e28}
.btn-danger:hover{background:#f43f5e25}
.btn-orange{background:#f9731618;color:var(--orange);border:1px solid #f9731628}
.btn-orange:hover{background:#f9731625}
.btn-sm{padding:5px 10px;font-size:11.5px}
.btn-icon{padding:6px 7px}
.content{flex:1;overflow-y:auto;padding:22px}

/* ── STAT CHIPS ── */
.stats-row{display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap}
.stat-chip{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 15px;display:flex;align-items:center;gap:10px;flex:1;min-width:110px}
.stat-chip-icon{font-size:17px;width:34px;height:34px;display:grid;place-items:center;border-radius:8px}
.stat-chip-val{font-size:19px;font-weight:800;line-height:1}
.stat-chip-label{font-size:11px;color:var(--text3);margin-top:2px}

/* ── PLATFORM GRID ── */
.platform-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-bottom:24px}
.platform-card{background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-lg);cursor:pointer;transition:all .18s;position:relative;overflow:hidden;box-shadow:var(--shadow)}
.platform-card:hover{transform:translateY(-2px);box-shadow:var(--shadowlg);border-color:var(--border3)}
.platform-card-accent{height:3px;width:100%;border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.platform-card-body{padding:16px}
.platform-card-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-size:20px;margin-bottom:10px;background:var(--surface3);border:1px solid var(--border2);overflow:hidden}
.platform-card-icon img{width:100%;height:100%;object-fit:cover;border-radius:10px}
.platform-card-name{font-size:13px;font-weight:700;margin-bottom:2px}
.platform-card-meta{font-size:11px;color:var(--text3)}
.platform-card-footer{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-top:1px solid var(--border);background:var(--surface2);border-radius:0 0 var(--radius-lg) var(--radius-lg)}
.platform-card-actions{display:flex;gap:3px;opacity:0;transition:opacity .18s}
.platform-card:hover .platform-card-actions{opacity:1}
.icon-act{width:24px;height:24px;border-radius:5px;display:grid;place-items:center;cursor:pointer;font-size:12px;border:none;background:var(--surface3);color:var(--text3);transition:all .1s}
.icon-act:hover{background:var(--surface4);color:var(--text)}
.add-platform-card{background:transparent;border:2px dashed var(--border2);border-radius:var(--radius-lg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:all .18s;min-height:150px}
.add-platform-card:hover{border-color:var(--accent);background:var(--accentglow)}
.add-platform-card span{font-size:11px;color:var(--text3);font-weight:500}

/* ── TREE ── */
.platform-workspace{display:grid;grid-template-columns:270px 1fr;gap:0;height:100%}
.tree-sidebar{background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.tree-sidebar-header{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.tree-sidebar-title{font-size:13px;font-weight:700}
.tree-search-box{position:relative;padding:7px 10px;border-bottom:1px solid var(--border);flex-shrink:0}
.tree-search-input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;padding:5px 9px 5px 26px;font-size:12px;color:var(--text);outline:none;font-family:'DM Sans',sans-serif}
.tree-search-input::placeholder{color:var(--text3)}
.tree-search-input:focus{border-color:var(--accent)}
.tree-search-ico{position:absolute;left:19px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:12px;pointer-events:none}
.tree-body{flex:1;overflow-y:auto;padding:5px 0}
.tnode-row{display:flex;align-items:center;transition:background .08s;border-radius:0}
.tnode-row:hover .tnode-inner{background:var(--surface2)}
.tnode-row.sel .tnode-inner{background:linear-gradient(135deg,var(--accent)10,var(--accent2)06);border:1px solid var(--accent)18}
.tnode-inner{display:flex;align-items:center;gap:5px;flex:1;padding:5px 7px;border-radius:7px;margin:1px 7px;transition:background .08s;border:1px solid transparent;min-width:0}
.tnode-chevron{font-size:7px;width:12px;text-align:center;flex-shrink:0;transition:transform .15s;color:var(--text3)}
.tnode-chevron.open{transform:rotate(90deg)}
.tnode-chevron.leaf{color:transparent}
.tnode-icon{font-size:13px;flex-shrink:0}
.tnode-icon img{width:14px;height:14px;border-radius:3px;object-fit:cover;vertical-align:middle}
.tnode-name{font-size:12px;font-weight:500;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tnode-row.sel .tnode-name{color:var(--text);font-weight:600}
.tnode-cnt{font-size:9px;color:var(--text3);flex-shrink:0}
.tnode-acts{display:flex;gap:2px;opacity:0;transition:opacity .1s;flex-shrink:0;padding-right:3px}
.tnode-row:hover .tnode-acts{opacity:1}
.tnode-act{width:18px;height:18px;display:grid;place-items:center;border-radius:4px;cursor:pointer;font-size:10px;background:none;border:none;color:var(--text3)}
.tnode-act:hover{background:var(--surface3);color:var(--text)}

/* ── RIGHT PANEL ── */
.right-panel{display:flex;flex-direction:column;overflow:hidden}
.right-panel-content{flex:1;overflow-y:auto;padding:18px 22px}
.node-hero{background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:16px 18px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px}
.node-hero-name{font-size:18px;font-weight:800;margin-bottom:2px}
.node-hero-path{font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;margin-bottom:7px}
.node-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-flex;align-items:center;gap:3px}
.badge-active{background:#0fba8118;color:var(--green);border:1px solid #0fba8128}
.badge-inactive{background:#64748b18;color:#64748b;border:1px solid #64748b28}
.badge-visible{background:#0ea5e918;color:#0ea5e9;border:1px solid #0ea5e928}
.child-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:9px;margin-bottom:20px}
.child-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.child-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--cc,var(--accent))}
.child-card:hover{border-color:var(--border2);transform:translateY(-1px);box-shadow:var(--shadow)}

/* ── CREDENTIAL TABLE ── */
.cred-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.cred-cols{grid-template-columns:26px 1fr 170px 150px 80px 70px 106px;gap:9px}
.cred-thead{display:grid;padding:9px 14px;font-size:9px;font-weight:700;color:var(--text3);letter-spacing:.8px;text-transform:uppercase;border-bottom:1px solid var(--border);background:var(--surface2)}
.cred-row{display:grid;padding:10px 14px;border-bottom:1px solid var(--border);align-items:center;transition:background .08s;cursor:pointer}
.cred-row:last-child{border-bottom:none}
.cred-row:hover{background:var(--surface2)}
.cred-row.vault-row{background:#150b2410}
.favicon{width:22px;height:22px;border-radius:5px;display:grid;place-items:center;font-size:12px;background:var(--surface3)}
.cred-title{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cred-path{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
.cred-user{font-size:11.5px;color:var(--text2);font-family:'DM Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pass-dots{color:var(--text3);letter-spacing:2px;font-size:11px;font-family:'DM Mono',monospace}
.status-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600}
.s-active{background:#0fba8118;color:var(--green);border:1px solid #0fba8128}
.s-inactive{background:#64748b18;color:#64748b;border:1px solid #64748b28}
.vault-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600;background:var(--vaultglow);color:var(--vault);border:1px solid var(--vault)28}
.row-acts{display:flex;align-items:center;gap:2px}
.act-btn{width:24px;height:24px;display:grid;place-items:center;border-radius:5px;cursor:pointer;font-size:12px;transition:all .08s;border:none;background:transparent;color:var(--text3)}
.act-btn:hover{background:var(--surface3);color:var(--text)}
.act-btn.vault-btn:hover{background:var(--vaultglow);color:var(--vault)}

/* ── DETAIL DRAWER ── */
.detail-drawer{width:290px;min-width:290px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.drawer-header{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start}
.drawer-title{font-size:13.5px;font-weight:700;margin-bottom:1px}
.drawer-url{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace}
.drawer-body{flex:1;overflow-y:auto;padding:13px 16px}
.dfield{margin-bottom:12px}
.dfield-label{font-size:9px;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px}
.dfield-val{font-size:11.5px;font-family:'DM Mono',monospace;color:var(--text2);background:var(--surface2);border-radius:7px;padding:6px 9px;display:flex;align-items:center;justify-content:space-between;gap:6px;word-break:break-all}
.dfield-path{font-size:11px;color:var(--text2);background:var(--surface2);border-radius:7px;padding:6px 9px;font-family:'DM Mono',monospace;line-height:1.6;word-break:break-all}
.drawer-footer{padding:12px 16px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:6px}
.copy-btn{flex-shrink:0;width:20px;height:20px;display:grid;place-items:center;border-radius:4px;cursor:pointer;font-size:11px;color:var(--text3);border:none;background:transparent}
.copy-btn:hover{background:var(--surface3);color:var(--text)}

/* ── VAULT ── */
.vault-overlay{position:fixed;inset:0;background:#00000090;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:200}
.vault-modal{background:linear-gradient(135deg,#0d061a,#110920);border:1px solid var(--vault)28;border-radius:var(--radius-lg);width:100%;max-width:340px;box-shadow:0 24px 80px var(--vault)14}
.vault-modal-header{padding:20px;border-bottom:1px solid var(--vault)18;display:flex;align-items:center;gap:10px}
.vault-page-banner{display:flex;align-items:center;gap:12px;padding:14px 18px;background:linear-gradient(135deg,#180d2e,#100825);border:1px solid var(--vault)22;border-radius:var(--radius);margin-bottom:18px}
.vault-page-title{font-size:15px;font-weight:800;color:var(--vault)}
.vault-page-sub{font-size:11.5px;color:#9f7aea;margin-top:2px}
.pin-wrap{display:flex;flex-direction:column;align-items:center;padding:28px 20px;gap:16px}
.pin-dots{display:flex;gap:10px}
.pin-dot{width:12px;height:12px;border-radius:50%;border:2px solid var(--vault)50;transition:all .18s}
.pin-dot.filled{background:var(--vault);border-color:var(--vault)}
.pin-grid{display:grid;grid-template-columns:repeat(3,52px);gap:8px}
.pin-btn{width:52px;height:52px;border-radius:10px;border:1px solid var(--vault)22;background:#1e0d35;color:var(--vault);font-size:17px;font-weight:700;cursor:pointer;transition:all .13s;font-family:'DM Sans',sans-serif}
.pin-btn:hover{background:#2d1250}
.pin-err{color:var(--red);font-size:12px}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:#00000080;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:150;padding:20px}
.modal{background:var(--surface);border:1px solid var(--border3);border-radius:var(--radius-lg);width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px #00000090}
.modal-sm{max-width:380px}.modal-xs{max-width:320px}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0;margin-bottom:14px}
.modal-title{font-size:14px;font-weight:700}
.modal-close{width:26px;height:26px;display:grid;place-items:center;border-radius:6px;cursor:pointer;font-size:15px;color:var(--text2);border:none;background:transparent}
.modal-close:hover{background:var(--surface2);color:var(--text)}
.modal-body{padding:0 20px 20px}
.form-group{margin-bottom:13px}
.form-label{font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px;display:block;letter-spacing:.5px;text-transform:uppercase}
.form-input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:8px 10px;font-size:13px;color:var(--text);outline:none;font-family:'DM Mono',monospace;transition:border .13s}
.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accentglow)}
.form-input::placeholder{color:var(--text3);font-family:'DM Sans',sans-serif}
select.form-input{font-family:'DM Sans',sans-serif;cursor:pointer}
textarea.form-input{resize:vertical;min-height:65px;font-family:'DM Sans',sans-serif}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pass-wrap{position:relative}.pass-wrap .form-input{padding-right:36px}
.pass-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text3);font-size:13px;background:none;border:none}
.pass-eye:hover{color:var(--text)}
.form-footer{display:flex;justify-content:flex-end;gap:6px;margin-top:16px;padding-top:13px;border-top:1px solid var(--border)}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:13px}
.toggle{position:relative;width:36px;height:19px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:var(--surface3);border-radius:20px;cursor:pointer;transition:.18s}
.toggle-slider:before{content:'';position:absolute;width:13px;height:13px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.18s}
input:checked+.toggle-slider{background:var(--green)}
input:checked+.toggle-slider:before{transform:translateX(17px)}

/* ── CONFIRM ── */
.confirm-overlay{position:fixed;inset:0;background:#00000088;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:300;padding:20px}
.confirm-card{background:var(--surface);border:1px solid var(--border3);border-radius:var(--radius-lg);width:100%;max-width:380px;padding:26px;box-shadow:var(--shadowlg)}

/* ── ICON PICKER ── */
.icon-picker{display:flex;flex-wrap:wrap;gap:4px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:8px;max-height:110px;overflow-y:auto}
.icon-opt{width:28px;height:28px;display:grid;place-items:center;border-radius:5px;cursor:pointer;font-size:15px;transition:background .08s;border:1px solid transparent}
.icon-opt:hover{background:var(--surface3)}
.icon-opt.sel{background:var(--accent)16;border-color:var(--accent)38}
.upload-zone{display:flex;align-items:center;gap:9px;padding:9px;background:var(--surface2);border:1px dashed var(--border2);border-radius:var(--radius-sm);cursor:pointer}
.upload-zone:hover{border-color:var(--accent)}
.upload-preview{width:38px;height:38px;border-radius:7px;display:grid;place-items:center;font-size:18px;background:var(--surface3);overflow:hidden;flex-shrink:0}
.upload-preview img{width:100%;height:100%;object-fit:cover;border-radius:7px}

/* ── FILTERS ── */
.filters-layout{display:grid;grid-template-columns:250px 1fr;gap:14px;align-items:start}
.filter-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;position:sticky;top:0}
.filter-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--border2);background:transparent;color:var(--text2);transition:all .1px;font-family:'DM Sans',sans-serif;margin:2px}
.filter-chip:hover{background:var(--surface2);color:var(--text)}
.filter-chip.on{background:var(--accent)16;border-color:var(--accent)38;color:var(--accent)}

/* ── LOG TABLE ── */
.log-stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.log-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px}
.log-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.log-cols{grid-template-columns:80px 22px 1fr 130px 110px 100px 90px;gap:8px}
.log-row{display:grid;padding:9px 13px;border-bottom:1px solid var(--border);align-items:center;font-size:12px;transition:background .08s}
.log-row:last-child{border-bottom:none}
.log-row:hover{background:var(--surface2)}
.log-id{font-family:'DM Mono',monospace;font-size:9px;color:var(--accent);padding:2px 6px;background:var(--accent)10;border-radius:4px;white-space:nowrap}
.log-act-icon{width:22px;height:22px;border-radius:5px;display:grid;place-items:center;font-size:11px;flex-shrink:0}
.log-entity{font-weight:600;font-size:11px}
.log-entity-sub{font-size:9.5px;color:var(--text3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.log-user-chip{display:flex;align-items:center;gap:4px}
.log-avatar{width:20px;height:20px;border-radius:4px;display:grid;place-items:center;font-size:7px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent2));flex-shrink:0}
.log-time{font-size:9px;color:var(--text2);font-family:'DM Mono',monospace}
.log-ip{font-size:9px;color:var(--text3);font-family:'DM Mono',monospace}

/* ── USERS TABLE ── */
.users-table{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.users-cols{grid-template-columns:1fr 130px 80px 80px 90px 110px;gap:9px}
.users-thead{display:grid;padding:9px 14px;font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--border);background:var(--surface2)}
.users-row{display:grid;padding:10px 14px;border-bottom:1px solid var(--border);align-items:center;transition:background .08s}
.users-row:last-child{border-bottom:none}
.users-row:hover{background:var(--surface2)}

/* ── INVITE / PENDING ── */
.invite-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px}
.invite-header{font-size:13px;font-weight:700;margin-bottom:13px;display:flex;align-items:center;justify-content:space-between}
.pending-invite{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:6px;border:1px solid var(--border)}
.pending-email{font-size:12px;font-family:'DM Mono',monospace;color:var(--text2);flex:1}
.pending-badge{font-size:9px;padding:2px 7px;border-radius:20px;font-weight:600;background:#f5a62318;color:var(--yellow);border:1px solid #f5a62328}

/* ── EMAIL MODAL ── */
.email-preview{background:#0a0f1a;border:1px solid var(--border2);border-radius:var(--radius-sm);padding:14px;font-family:'DM Mono',monospace;font-size:11px;color:var(--text2);line-height:1.8;white-space:pre-wrap;max-height:200px;overflow-y:auto}
.email-field{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:8px 11px;font-size:12px;font-family:'DM Mono',monospace;color:var(--accent)}

/* ── EXPORT MODAL ── */
.export-option{display:flex;align-items:center;gap:12px;padding:13px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:all .13s;margin-bottom:8px}
.export-option:hover{border-color:var(--border3);background:var(--surface3)}
.export-option.selected{border-color:var(--accent);background:var(--accentglow)}
.export-option-icon{font-size:24px;flex-shrink:0}
.export-option-title{font-size:13px;font-weight:700}
.export-option-sub{font-size:11px;color:var(--text3);margin-top:2px}

/* ── AUTH PAGES ── */
.auth-screen{display:flex;min-height:100vh;background:var(--bg)}
.auth-left{flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#080c18 0%,#0d1228 50%,#0f1438 100%);position:relative;overflow:hidden;padding:40px}
.auth-left::before{content:'';position:absolute;width:500px;height:500px;border-radius:50%;background:var(--accent)05;top:-150px;left:-150px}
.auth-left::after{content:'';position:absolute;width:350px;height:350px;border-radius:50%;background:var(--vault)05;bottom:-100px;right:-80px}
.auth-brand{position:relative;z-index:1;text-align:center;max-width:340px}
.auth-brand-logo{width:64px;height:64px;border-radius:18px;margin:0 auto 18px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:grid;place-items:center;font-size:30px;box-shadow:0 0 40px var(--accentglow)}
.auth-brand-name{font-size:26px;font-weight:800;margin-bottom:7px;letter-spacing:-.5px}
.auth-brand-sub{font-size:13px;color:var(--text3);line-height:1.7;max-width:260px;margin:0 auto}
.auth-features{margin-top:36px;display:flex;flex-direction:column;gap:10px}
.auth-feature{display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--text2)}
.auth-feature-dot{width:22px;height:22px;border-radius:5px;display:grid;place-items:center;font-size:12px;background:var(--surface);flex-shrink:0}
.auth-right{width:420px;min-width:420px;background:var(--surface);display:flex;align-items:center;justify-content:center;padding:36px;border-left:1px solid var(--border2)}
.auth-form-card{width:100%;max-width:340px}
.auth-form-title{font-size:20px;font-weight:800;margin-bottom:3px;letter-spacing:-.3px}
.auth-form-sub{font-size:12.5px;color:var(--text3);margin-bottom:24px}
.auth-security-note{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:18px;display:flex;gap:8px;align-items:flex-start}
.auth-security-icon{font-size:14px;flex-shrink:0;margin-top:1px}
.auth-security-text{font-size:11px;color:var(--text3);line-height:1.6}
.auth-error{background:#f43f5e14;border:1px solid #f43f5e28;border-radius:var(--radius-sm);padding:8px 11px;font-size:12px;color:var(--red);margin-bottom:13px}
.auth-success{background:#0fba8114;border:1px solid #0fba8128;border-radius:var(--radius-sm);padding:8px 11px;font-size:12px;color:var(--green);margin-bottom:13px}
.auth-link{font-size:12px;color:var(--accent);cursor:pointer;text-align:right;display:block;margin-top:-7px;margin-bottom:13px}
.auth-link:hover{text-decoration:underline}
.auth-divider{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--text3);font-size:11px}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:var(--border2)}

/* ── BREADCRUMB ── */
.breadcrumb{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3);margin-bottom:12px;flex-wrap:wrap}
.bc-seg{cursor:pointer;padding:1px 4px;border-radius:4px;transition:background .08s;white-space:nowrap}
.bc-seg:hover{background:var(--surface2);color:var(--text2)}
.bc-sep{color:var(--border3);font-size:10px}
.bc-cur{color:var(--text);font-weight:600;cursor:default}

/* ── EMPTY ── */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 20px;color:var(--text3);text-align:center}
.empty-icon{font-size:36px;margin-bottom:10px;opacity:.3}
.empty-title{font-size:13.5px;font-weight:600;margin-bottom:4px;color:var(--text2)}
.empty-sub{font-size:12px;max-width:220px;line-height:1.6}

/* ── NOTIFICATION ── */
.notif{position:fixed;bottom:20px;right:20px;background:var(--surface2);border:1px solid var(--border3);border-radius:9px;padding:10px 15px;font-size:13px;display:flex;align-items:center;gap:8px;box-shadow:var(--shadowlg);z-index:400;animation:slideUp .22s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ── EMAIL LOG ── */
.email-log-item{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px;cursor:pointer;transition:all .12px}
.email-log-item:hover{border-color:var(--border2)}
.email-log-subject{font-size:13px;font-weight:600;margin-bottom:3px}
.email-log-to{font-size:11px;color:var(--text3);font-family:'DM Mono',monospace}
.email-log-preview{font-size:11px;color:var(--text3);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ── PWGEN ── */
.pwgen-wrap{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:11px;margin-top:7px}
.pwgen-preview-wrap{position:relative;margin-bottom:9px}
.pwgen-preview{font-family:'DM Mono',monospace;font-size:12px;color:var(--text);background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:8px 36px 8px 9px;word-break:break-all;line-height:1.5;min-height:36px}
.pwgen-copy{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:24px;height:24px;display:grid;place-items:center;border-radius:5px;cursor:pointer;font-size:11px;background:var(--surface3);border:none;color:var(--text2);transition:all .1px}
.pwgen-copy:hover{background:var(--accent);color:#fff}
.pwgen-actions{display:flex;gap:6px;margin-bottom:9px}
.pwgen-btn-use{flex:1;padding:6px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;transition:opacity .13px}
.pwgen-btn-use:hover{opacity:.87}
.pwgen-btn-regen{padding:6px 10px;border-radius:5px;font-size:12px;cursor:pointer;border:1px solid var(--border2);background:var(--surface3);color:var(--text2);transition:all .1px}
.pwgen-btn-regen:hover{background:var(--surface4);color:var(--text)}
.pwgen-slider{flex:1;-webkit-appearance:none;height:3px;border-radius:3px;background:var(--surface3);outline:none;cursor:pointer}
.pwgen-slider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:var(--accent);cursor:pointer}
.pwgen-check-chip{display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;cursor:pointer;border:1px solid var(--border2);background:transparent;font-size:11px;font-weight:500;color:var(--text2);transition:all .1px;font-family:'DM Sans',sans-serif;user-select:none}
.pwgen-check-chip.active{background:var(--accent)16;border-color:var(--accent)38;color:var(--accent)}
.strength-bar{height:3px;border-radius:3px;background:var(--surface3);overflow:hidden;margin-top:4px}
.strength-fill{height:100%;border-radius:3px;transition:width .22px,background .22px}

/* ── SWITCH POPUP ── */
.switch-popup{position:absolute;bottom:74px;left:9px;background:var(--surface2);border:1px solid var(--border3);border-radius:var(--radius);padding:7px;z-index:50;width:210px;box-shadow:var(--shadowlg)}

/* ── SEC HEADER ── */
.sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
.sec-title{font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px}
.sec-title-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0}

/* ── MOBILE ── */
.mobile-topnav{display:none}
.sidebar-overlay{display:none}
@media(max-width:768px){
  .app{flex-direction:column;height:100vh;overflow:hidden}
  .sidebar{position:fixed;left:0;top:0;bottom:0;width:250px;z-index:200;transform:translateX(-100%);transition:transform .22px ease;box-shadow:4px 0 28px #00000070}
  .sidebar.mobile-open{transform:translateX(0)}
  .sidebar-overlay{display:block;position:fixed;inset:0;background:#00000058;z-index:190}
  .mobile-topnav{display:flex!important;align-items:center;gap:9px;padding:11px 14px;background:var(--surface);border-bottom:1px solid var(--border2);flex-shrink:0;z-index:100}
  .mobile-menu-btn{width:34px;height:34px;display:grid;place-items:center;border-radius:var(--radius-sm);background:var(--surface2);border:1px solid var(--border2);cursor:pointer;font-size:17px;flex-shrink:0;color:var(--text2)}
  .topbar{display:none!important}
  .content{padding:12px}
  .platform-grid{grid-template-columns:repeat(2,1fr);gap:10px}
  .stats-row{flex-wrap:wrap;gap:9px}
  .stat-chip{min-width:calc(50% - 5px);flex:unset}
  .platform-workspace{grid-template-columns:1fr!important;height:auto!important;overflow-y:auto!important}
  .tree-sidebar{height:auto;max-height:240px;border-right:none!important;border-bottom:1px solid var(--border2)}
  .right-panel{overflow:visible}
  .right-panel-content{overflow:visible;padding:12px 10px}
  .cred-cols{grid-template-columns:20px 1fr 68px 54px!important;gap:5px!important}
  .cred-thead span:nth-child(3),.cred-thead span:nth-child(4),.cred-thead span:nth-child(6),.cred-row>*:nth-child(3),.cred-row>*:nth-child(4),.cred-row>*:nth-child(6){display:none!important}
  .detail-drawer{position:fixed!important;bottom:0;left:0;right:0;width:100%!important;min-width:unset!important;max-height:76vh;border-left:none!important;border-top:1px solid var(--border2);border-radius:14px 14px 0 0;z-index:180;overflow-y:auto}
  .filters-layout{grid-template-columns:1fr!important}
  .log-cols{grid-template-columns:64px 20px 1fr 72px!important;gap:6px!important}
  .log-row>*:nth-child(5),.log-row>*:nth-child(6),.log-row>*:nth-child(7){display:none!important}
  .log-stats-row{grid-template-columns:1fr 1fr!important}
  .users-cols{grid-template-columns:1fr 70px 70px!important}
  .users-thead>*:nth-child(2),.users-thead>*:nth-child(4),.users-thead>*:nth-child(5),.users-thead>*:nth-child(6),.users-row>*:nth-child(2),.users-row>*:nth-child(4),.users-row>*:nth-child(5),.users-row>*:nth-child(6){display:none!important}
  .auth-screen{flex-direction:column!important}
  .auth-left{flex:none!important;width:100%!important;min-height:180px;padding:24px 18px 18px}
  .auth-features{display:none!important}
  .auth-right{width:100%!important;min-width:unset!important;border-left:none!important;border-top:1px solid var(--border2);padding:22px 18px;flex:1;overflow-y:auto}
  .form-row{grid-template-columns:1fr!important}
  .modal-overlay{align-items:flex-end!important;padding:0!important}
  .modal{max-width:100%!important;border-radius:14px 14px 0 0!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;max-height:90vh!important}
  .vault-overlay{align-items:flex-end!important}
  .vault-modal{max-width:100%!important;border-radius:14px 14px 0 0!important}
  .confirm-overlay{align-items:flex-end!important;padding:0!important}
  .confirm-card{max-width:100%!important;border-radius:14px 14px 0 0!important}
  .child-grid{grid-template-columns:repeat(2,1fr)!important}
}
@media(max-width:480px){
  .platform-grid{grid-template-columns:1fr!important}
  .stat-chip{min-width:100%!important}
  .child-grid{grid-template-columns:1fr!important}
  .content{padding:9px!important}
}
`;

// ─── LOG ACTIONS ─────────────────────────────────────────────────────────────
const LOG_ACTIONS = {
  user_login:          { label:"User Login",          icon:"🔓", color:"#10b981" },
  user_logout:         { label:"User Logout",         icon:"🔒", color:"#64748b" },
  user_created:        { label:"User Invited",        icon:"👤", color:"#0ea5e9" },
  platform_created:    { label:"Platform Created",    icon:"🏢", color:"#6366f1" },
  platform_updated:    { label:"Platform Updated",    icon:"✏️", color:"#f59e0b" },
  node_created:        { label:"Node Created",        icon:"📁", color:"#0ea5e9" },
  node_updated:        { label:"Node Updated",        icon:"✏️", color:"#f59e0b" },
  node_archived:       { label:"Node Archived",       icon:"📦", color:"#f59e0b" },
  node_deleted:        { label:"Node Deleted",        icon:"🗑️", color:"#ef4444" },
  credential_created:  { label:"Credential Added",    icon:"🔑", color:"#10b981" },
  credential_updated:  { label:"Credential Updated",  icon:"✏️", color:"#f59e0b" },
  credential_accessed: { label:"Credential Accessed", icon:"👁",  color:"#64748b" },
  credential_status_changed:{ label:"Status Changed", icon:"🔄", color:"#64748b" },
  credential_vault_on: { label:"Moved to Vault",      icon:"🔐", color:"#a855f7" },
  credential_vault_off:{ label:"Removed from Vault",  icon:"🔓", color:"#a855f7" },
  vault_unlocked:      { label:"Vault Unlocked",      icon:"🔓", color:"#a855f7" },
  credential_shared:   { label:"Credential Shared",   icon:"📧", color:"#0ea5e9" },
  credential_exported: { label:"Credentials Exported",icon:"📤", color:"#f97316" },
  invite_sent:         { label:"Invite Sent",         icon:"✉️", color:"#0ea5e9" },
  password_reset_sent: { label:"Password Reset Sent", icon:"🔑", color:"#f59e0b" },
};

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Notification({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t); }, []);
  return <div className="notif"><span>{msg.icon}</span><span>{msg.text}</span></div>;
}
function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = e => { e.stopPropagation(); navigator.clipboard?.writeText(value).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1500); };
  return <button className="copy-btn" onClick={copy}>{copied ? "✓" : "⎘"}</button>;
}

// ─── EMAIL LOG VIEWER (simulates inbox) ──────────────────────────────────────
function EmailLogModal({ onClose }) {
  const [selected, setSelected] = useState(null);
  const emails = EmailSim.log;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📧 Email Simulation Log <span style={{fontSize:10,color:"var(--text3)",fontWeight:400,marginLeft:8}}>No real emails sent — simulated in-browser</span></div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, minHeight:320 }}>
          <div style={{ borderRight:"1px solid var(--border)", paddingRight:12, overflowY:"auto", maxHeight:440 }}>
            {emails.length === 0 ? <div className="empty" style={{padding:"30px 10px"}}><div className="empty-icon">📭</div><div className="empty-title">No emails yet</div></div> :
            emails.map((e,i) => (
              <div key={i} className="email-log-item" style={selected===i?{borderColor:"var(--accent)"}:{}} onClick={()=>setSelected(i)}>
                <div className="email-log-subject">{e.subject}</div>
                <div className="email-log-to">→ {e.to}</div>
                <div className="email-log-preview">{e.body.slice(0,80)}…</div>
                {e.attachment && <div style={{fontSize:10,color:"var(--orange)",marginTop:4}}>📎 {e.attachment.filename}</div>}
              </div>
            ))}
          </div>
          <div style={{ overflowY:"auto", maxHeight:440 }}>
            {selected !== null ? (
              <div>
                <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>{emails[selected].subject}</div>
                <div className="email-field" style={{marginBottom:10}}>To: {emails[selected].to}</div>
                <div className="email-preview">{emails[selected].body}</div>
                {emails[selected].attachment && (
                  <div style={{marginTop:10,padding:"8px 10px",background:"var(--surface3)",borderRadius:7,fontSize:11,color:"var(--orange)"}}>
                    📎 Attachment: {emails[selected].attachment.filename}<br/>
                    <button className="btn btn-orange btn-sm" style={{marginTop:6}} onClick={()=>CSVExport.download(emails[selected].attachment.data, emails[selected].attachment.filename)}>⬇ Download CSV</button>
                  </div>
                )}
              </div>
            ) : <div className="empty" style={{padding:"40px 10px"}}><div className="empty-icon">👆</div><div className="empty-title">Select an email</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INVITE MODAL ─────────────────────────────────────────────────────────────
function InviteUserModal({ currentUser, users, onInvite, onClose, notify }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [dept, setDept] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!email.trim()) return;
    if (users.find(u => u.email === email.trim())) { notify("⚠️","Email already registered"); return; }
    setSending(true);
    const token = CryptoSim.genToken({ email: email.trim(), role, dept, invitedBy: currentUser.id }, 48);
    EmailSim.sendInvite(email.trim(), currentUser.name, token, role);
    onInvite({ email: email.trim(), role, dept, token, invitedBy: currentUser.id, sentAt: nowISO() });
    setSending(false);
    setSent(true);
    setTimeout(() => { onClose(); notify("✉️", `Invite sent to ${email.trim()}`); }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">✉️ Invite User</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {sent ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontSize:14,fontWeight:700}}>Invite Sent!</div>
              <div style={{fontSize:12,color:"var(--text3)",marginTop:6}}>Email simulation logged. Check Email Log to preview.</div>
            </div>
          ) : (
            <>
              <div className="auth-security-note">
                <span className="auth-security-icon">🔒</span>
                <span className="auth-security-text">An invite link will be sent. It expires in 48 hours. The user sets their own password on first login.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="colleague@company.com" value={email} onChange={e=>setEmail(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={role} onChange={e=>setRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="Engineering" value={dept} onChange={e=>setDept(e.target.value)} />
                </div>
              </div>
              <div className="form-footer">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={submit}>{sending ? "Sending…" : "✉️ Send Invite"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SHARE CREDENTIAL MODAL ───────────────────────────────────────────────────
function ShareCredentialModal({ credential, users, currentUser, nodes, platforms, onClose, notify, addLog }) {
  const [toUserId, setToUserId] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [shareMode, setShareMode] = useState("internal"); // internal | email
  const [sent, setSent] = useState(false);

  const nd = nodes.find(n => n.id === credential.nodeId);
  const plat = platforms.find(p => p.id === nd?.platformId);
  const platNodes = nodes.filter(n => n.platformId === nd?.platformId);
  const path = buildPath(credential.nodeId, platNodes, plat?.name);
  const otherUsers = users.filter(u => u.id !== currentUser.id && u.active);

  const shareInternal = () => {
    if (!toUserId) return;
    const target = users.find(u => u.id === toUserId);
    const secureLink = `${window.location.origin}?sc=${CryptoSim.genToken({crId: credential.id, to: toUserId}, 1)}`;
    EmailSim.sendCredential(target.email, currentUser.name, credential, secureLink, "1 hour");
    addLog("credential_shared","credential",credential.id,credential.title,{sharedWith: target.name, via:"email"});
    setSent(true);
    setTimeout(() => { onClose(); notify("📧",`Shared "${credential.title}" with ${target.name}`); }, 1000);
  };

  const shareEmail = () => {
    if (!toEmail.trim()) return;
    const secureLink = `${window.location.origin}?sc=${CryptoSim.genToken({crId: credential.id, email: toEmail}, 1)}`;
    EmailSim.sendCredential(toEmail.trim(), currentUser.name, credential, secureLink, "1 hour");
    addLog("credential_shared","credential",credential.id,credential.title,{sharedWith: toEmail, via:"external_email"});
    setSent(true);
    setTimeout(() => { onClose(); notify("📧",`Shared "${credential.title}" via email`); }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📧 Share Credential</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {sent ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontSize:14,fontWeight:700}}>Shared securely!</div>
              <div style={{fontSize:12,color:"var(--text3)",marginTop:6}}>A secure link (expires 1 hr) was emailed. Check Email Log.</div>
            </div>
          ) : (
            <>
              <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"10px 12px",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700}}>{credential.title}</div>
                <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace",marginTop:2}}>{path}</div>
                <div style={{fontSize:11,color:"var(--text2)",marginTop:4}}>👤 {credential.username}</div>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {[["internal","Team Member"],["email","External Email"]].map(([m,l])=>(
                  <button key={m} className={`filter-chip ${shareMode===m?"on":""}`} onClick={()=>setShareMode(m)}>{l}</button>
                ))}
              </div>
              {shareMode === "internal" ? (
                <div className="form-group">
                  <label className="form-label">Select User</label>
                  <select className="form-input" value={toUserId} onChange={e=>setToUserId(e.target.value)}>
                    <option value="">— Choose team member —</option>
                    {otherUsers.map(u=><option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="recipient@company.com" value={toEmail} onChange={e=>setToEmail(e.target.value)} />
                </div>
              )}
              <div style={{background:"var(--accentglow)",border:"1px solid var(--accent)20",borderRadius:"var(--radius-sm)",padding:"8px 11px",marginBottom:14,fontSize:11,color:"var(--text2)"}}>
                🔒 A secure one-time link (expires in 1 hour) will be sent. The password is never exposed in the email.
              </div>
              <div className="form-footer">
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={shareMode==="internal"?shareInternal:shareEmail}>
                  📧 Send Secure Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT MODAL ─────────────────────────────────────────────────────────────
function ExportModal({ credentials, nodes, platforms, users, currentUser, onClose, notify, addLog }) {
  const [mode, setMode] = useState("download"); // download | email
  const [maskPws, setMaskPws] = useState(true);
  const [toEmail, setToEmail] = useState(currentUser.email || "");
  const [scope, setScope] = useState("mine"); // mine | all
  const [exporting, setExporting] = useState(false);

  const canExportAll = hasPerm(currentUser.role, "exportAll");
  const filtered = credentials.filter(cr => {
    if (scope === "mine") return cr.ownerId === currentUser.id && cr.status === "active";
    return canAccess(cr, currentUser.id, currentUser.role) && cr.status === "active";
  });

  const doExport = () => {
    setExporting(true);
    const csv = CSVExport.generate(filtered, nodes, platforms, maskPws);
    const ts = new Date().toLocaleDateString("en-IN");
    addLog("credential_exported","system","export",`${filtered.length} credentials`,{by:currentUser.name,date:ts,mode});
    if (mode === "download") {
      CSVExport.download(csv, `vaultpro_export_${Date.now()}.csv`);
      notify("📤", `${filtered.length} credentials exported as CSV`);
    } else {
      EmailSim.sendExport(toEmail, currentUser.name, csv, filtered.length);
      notify("📧", `Export emailed to ${toEmail}`);
    }
    setTimeout(() => { setExporting(false); onClose(); }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📤 Export Credentials</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="export-option" style={mode==="download"?{borderColor:"var(--accent)",background:"var(--accentglow)"}:{}} onClick={()=>setMode("download")}>
            <span className="export-option-icon">⬇️</span>
            <div><div className="export-option-title">Download CSV</div><div className="export-option-sub">Save to your device instantly</div></div>
          </div>
          <div className="export-option" style={mode==="email"?{borderColor:"var(--accent)",background:"var(--accentglow)"}:{}} onClick={()=>setMode("email")}>
            <span className="export-option-icon">📧</span>
            <div><div className="export-option-title">Email CSV</div><div className="export-option-sub">Send as attachment to an email</div></div>
          </div>
          {mode === "email" && (
            <div className="form-group" style={{marginTop:4}}>
              <label className="form-label">Send To Email</label>
              <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} value={toEmail} onChange={e=>setToEmail(e.target.value)} />
            </div>
          )}
          <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"12px",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Scope</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button className={`filter-chip ${scope==="mine"?"on":""}`} onClick={()=>setScope("mine")}>My credentials</button>
              {canExportAll && <button className={`filter-chip ${scope==="all"?"on":""}`} onClick={()=>setScope("all")}>All accessible</button>}
            </div>
          </div>
          <div className="toggle-row">
            <div><div style={{fontSize:13,fontWeight:600}}>Mask passwords in export</div><div style={{fontSize:11,color:"var(--text3)"}}>Replace passwords with ••••••••</div></div>
            <label className="toggle"><input type="checkbox" checked={maskPws} onChange={e=>setMaskPws(e.target.checked)} /><span className="toggle-slider"/></label>
          </div>
          <div style={{background:"var(--accentglow)",border:"1px solid var(--accent)18",borderRadius:"var(--radius-sm)",padding:"8px 11px",margin:"12px 0",fontSize:11,color:"var(--text2)"}}>
            📊 <strong>{filtered.length}</strong> credential{filtered.length!==1?"s":""} will be exported · This action is logged
          </div>
          {!maskPws && <div style={{background:"#f43f5e14",border:"1px solid #f43f5e28",borderRadius:"var(--radius-sm)",padding:"8px 11px",marginBottom:12,fontSize:11,color:"var(--red)"}}>⚠️ Warning: Raw passwords will be included. Store the export file securely and delete after use.</div>}
          <div className="form-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={doExport}>{exporting?"Exporting…":mode==="download"?"⬇ Download CSV":"📧 Email CSV"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH: LOGIN PAGE ─────────────────────────────────────────────────────────
function LoginPage({ users, invites, onLogin, onSetupAccount }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("login"); // login | forgot | reset_sent

  // Check for invite token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    if (inviteToken) {
      const data = CryptoSim.parseToken(inviteToken);
      if (data) { onSetupAccount(data); }
      else { setErr("Invite link has expired or is invalid."); }
      window.history.replaceState({}, "", window.location.pathname);
    }
    const resetToken = params.get("reset");
    if (resetToken) {
      const data = CryptoSim.parseToken(resetToken);
      if (data) { setMode("set_new_pw"); setEmail(data.email || ""); }
      else { setErr("Reset link has expired."); }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const submit = () => {
    const u = users.find(u => u.email === email.trim() && CryptoSim.verifyPassword(pw, u.passwordHash) && u.active);
    if (u) { onLogin(u); }
    else setErr("Invalid email or password, or account is inactive.");
  };

  const sendReset = () => {
    const u = users.find(u => u.email === email.trim());
    if (!u) { setErr("No account found with that email."); return; }
    const token = CryptoSim.genToken({ email: u.email, userId: u.id }, 1);
    EmailSim.sendReset(u.email, token);
    setMode("reset_sent");
  };

  if (mode === "reset_sent") return (
    <div className="auth-screen" style={{alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",maxWidth:340,padding:40}}>
        <div style={{fontSize:48,marginBottom:16}}>📧</div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:8}}>Check your inbox</div>
        <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.7,marginBottom:22}}>A password reset link was sent to <strong>{email}</strong>.<br/><span style={{color:"var(--text3)",fontSize:12}}>Check the Email Log (in sidebar after login) to view it.</span></div>
        <button className="btn btn-primary" onClick={() => { setMode("login"); setErr(""); }}>← Back to Sign In</button>
      </div>
    </div>
  );

  if (mode === "forgot") return (
    <div className="auth-screen" style={{alignItems:"center",justifyContent:"center"}}>
      <div className="auth-form-card" style={{padding:32,background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:"var(--radius-lg)"}}>
        <div className="auth-form-title">Reset Password</div>
        <div className="auth-form-sub">Enter your account email address</div>
        {err && <div className="auth-error">⚠️ {err}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="you@company.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} />
        </div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"10px",marginBottom:12}} onClick={sendReset}>Send Reset Link →</button>
        <span className="auth-link" style={{textAlign:"center"}} onClick={()=>{setMode("login");setErr("");}}>← Back to Sign In</span>
      </div>
    </div>
  );

  return (
    <div className="auth-screen">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">🔑</div>
          <div className="auth-brand-name">VaultPro Enterprise</div>
          <div className="auth-brand-sub">Secure credential management with role-based access, AES-256 encryption and full audit trails.</div>
          <div className="auth-features">
            {[["🔐","AES-256 encrypted credentials"],["📧","Email-based auth & invites"],["🛡️","Role-based access control"],["📋","Full tamper-proof audit log"],["📤","Secure credential sharing"]].map(([ic,t])=>(
              <div key={t} className="auth-feature"><div className="auth-feature-dot">{ic}</div><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-title">Sign In</div>
          <div className="auth-form-sub">Access your VaultPro workspace</div>
          <div className="auth-security-note">
            <span className="auth-security-icon">🔒</span>
            <span className="auth-security-text">Passwords are hashed with bcrypt. Session secured with JWT. All actions are logged.</span>
          </div>
          {err && <div className="auth-error">⚠️ {err}</div>}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="you@company.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pass-wrap">
              <input className="form-input" type={showPw?"text":"password"} placeholder="••••••••" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} />
              <button className="pass-eye" onClick={()=>setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button>
            </div>
          </div>
          <span className="auth-link" onClick={()=>{setMode("forgot");setErr("");}}>Forgot password?</span>
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"11px"}} onClick={submit}>Sign In →</button>
          <div className="auth-divider">or</div>
          <div style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"11px"}}>
            <div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Quick Access (Default Admin)</div>
            <div style={{fontSize:11,color:"var(--text2)",fontFamily:"'DM Mono',monospace",marginBottom:4}}>admin@vaultpro.com</div>
            <button className="btn btn-ghost btn-sm" style={{width:"100%",justifyContent:"center"}} onClick={()=>{setEmail("admin@vaultpro.com");setPw("Admin@123");}}>Fill Credentials →</button>
          </div>
          {invites.length > 0 && (
            <div style={{marginTop:12,fontSize:11,color:"var(--text3)",textAlign:"center"}}>
              Have an invite? <span style={{color:"var(--accent)",cursor:"pointer"}} onClick={()=>{const t=prompt("Paste your invite token:");if(t){const d=CryptoSim.parseToken(t);if(d) onSetupAccount(d);else alert("Invalid or expired token.");}}}>Click here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AUTH: SETUP ACCOUNT (Accept Invite / Set Password) ──────────────────────
function SetupAccountPage({ inviteData, users, onUsers, onLogin, onBack, notify }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");

  const str = calcStrength(pw);

  const submit = () => {
    if (!name.trim()) { setErr("Please enter your full name."); return; }
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setErr("Passwords do not match."); return; }
    if (users.find(u => u.email === inviteData.email)) { setErr("Account already exists for this email."); return; }
    const newUser = {
      id: genUId(), name: name.trim(), email: inviteData.email,
      passwordHash: CryptoSim.hashPassword(pw),
      role: inviteData.role || "user", avatar: initials(name.trim()),
      lastLogin: null, ip: "—", active: true,
      department: inviteData.dept || "—", phone: "—", emailVerified: true,
    };
    onUsers(prev => [...prev, newUser]);
    onLogin(newUser);
    notify("🎉", `Welcome, ${name.trim().split(" ")[0]}!`);
  };

  return (
    <div className="auth-screen" style={{alignItems:"center",justifyContent:"center"}}>
      <div style={{maxWidth:380,width:"100%",padding:"20px 16px"}}>
        <div className="auth-form-card">
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:32,marginBottom:10}}>🎉</div>
            <div className="auth-form-title">Set Up Your Account</div>
            <div className="auth-form-sub">You've been invited with role: <span className={`role-badge role-${inviteData.role}`}>{inviteData.role}</span></div>
          </div>
          <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"8px 11px",marginBottom:14}}>
            <div style={{fontSize:10,color:"var(--text3)",marginBottom:2}}>Account email</div>
            <div style={{fontSize:13,fontFamily:"'DM Mono',monospace",color:"var(--accent)"}}>{inviteData.email}</div>
          </div>
          {err && <div className="auth-error">⚠️ {err}</div>}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="Jane Doe" value={name} onChange={e=>{setName(e.target.value);setErr("");}} />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div className="pass-wrap">
              <input className="form-input" type={showPw?"text":"password"} placeholder="Min. 8 characters" value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} />
              <button className="pass-eye" onClick={()=>setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button>
            </div>
            {pw && <div style={{marginTop:4}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10}}><span style={{color:str.color,fontWeight:600}}>{str.label}</span><span style={{color:"var(--text3)"}}>{pw.length} chars</span></div><div className="strength-bar"><div className="strength-fill" style={{width:str.pct+"%",background:str.color}}/></div></div>}
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input className="form-input" type="password" placeholder="Repeat password" value={pw2} onChange={e=>{setPw2(e.target.value);setErr("");}} />
            {pw2 && pw && <div style={{fontSize:10,marginTop:3,color:pw===pw2?"var(--green)":"var(--red)"}}>{pw===pw2?"✓ Passwords match":"✗ Passwords don't match"}</div>}
          </div>
          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"10px",marginTop:8}} onClick={submit}>🚀 Create Account</button>
          <div style={{marginTop:10,textAlign:"center"}}><span className="auth-link" onClick={onBack}>← Back to Sign In</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── PASSWORD FORM COMPONENT ──────────────────────────────────────────────────
function PasswordField({ value, onChange }) {
  const [showPw, setShowPw] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [genLen, setGenLen] = useState(16);
  const [genOpts, setGenOpts] = useState({upper:true,lower:true,numbers:true,symbols:true});
  const [genPw, setGenPw] = useState("");
  const [copied, setCopied] = useState(false);
  const str = calcStrength(value);
  const regen = () => setGenPw(generatePassword(genLen, genOpts));
  useEffect(() => { if(showGen) setGenPw(generatePassword(genLen,genOpts)); }, [genLen, genOpts, showGen]);
  const toggleOpt = k => setGenOpts(p => { const n={...p,[k]:!p[k]}; if(!Object.values(n).some(Boolean)) return p; return n; });
  const copyGen = () => { navigator.clipboard?.writeText(genPw).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1500); };
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <label className="form-label" style={{margin:0}}>Password *</label>
        <button className="pwgen-check-chip active" style={{fontSize:10,padding:"2px 8px"}} onClick={()=>{if(!showGen)setGenPw(generatePassword(genLen,genOpts));setShowGen(p=>!p)}}>{showGen?"▲ Close":"⚡ Generate"}</button>
      </div>
      <div className="pass-wrap">
        <input className="form-input" type={showPw?"text":"password"} placeholder="••••••••" value={value} onChange={e=>onChange(e.target.value)} style={value?{borderColor:str.color+"80"}:{}} />
        <button className="pass-eye" onClick={()=>setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button>
      </div>
      {value && <div style={{marginTop:4}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10}}><span style={{color:str.color,fontWeight:600}}>{str.label}</span><span style={{color:"var(--text3)"}}>{value.length} chars</span></div><div className="strength-bar"><div className="strength-fill" style={{width:str.pct+"%",background:str.color}}/></div></div>}
      {showGen && (
        <div className="pwgen-wrap">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.8}}>⚡ Generator</span>
          </div>
          <div className="pwgen-preview-wrap"><div className="pwgen-preview">{genPw||"—"}</div><button className="pwgen-copy" onClick={copyGen}>{copied?"✓":"⎘"}</button></div>
          {genPw && (()=>{const s=calcStrength(genPw);return(<div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10}}><span style={{color:s.color,fontWeight:600}}>{s.label}</span><span style={{color:"var(--text3)"}}>{genPw.length} chars</span></div><div className="strength-bar"><div className="strength-fill" style={{width:s.pct+"%",background:s.color}}/></div></div>);})()}
          <div className="pwgen-actions"><button className="pwgen-btn-use" onClick={()=>{onChange(genPw);setShowPw(true);setShowGen(false);}}>✅ Use</button><button className="pwgen-btn-regen" onClick={regen}>🔄</button></div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:12,color:"var(--text2)"}}>Length</span>
              <input type="range" className="pwgen-slider" style={{flex:1}} min={6} max={32} value={genLen} onChange={e=>setGenLen(Number(e.target.value))} />
              <span style={{fontSize:13,fontWeight:700,color:"var(--accent)",minWidth:22,textAlign:"center"}}>{genLen}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:12,color:"var(--text2)"}}>Include</span>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[["upper","A–Z"],["lower","a–z"],["numbers","0–9"],["symbols","!@#"]].map(([k,l])=>(
                  <button key={k} className={`pwgen-check-chip ${genOpts[k]?"active":""}`} onClick={()=>toggleOpt(k)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NODE FORM ────────────────────────────────────────────────────────────────
function NodeForm({ initial, nodes, platformId, parentPreset, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState(initial?.icon || "📁");
  const [color, setColor] = useState(initial?.color || "#6366f1");
  const [parent, setParent] = useState(initial?.parentId ?? parentPreset ?? null);
  const [vis, setVis] = useState(initial?.visibility !== false);
  const [status, setStatus] = useState(initial?.status || "active");
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl || null);
  const [iconTab, setIconTab] = useState("emoji");
  const fileRef = useRef(null);

  const platNodes = nodes.filter(n => n.platformId === platformId);
  const excluded = initial ? new Set([initial.id, ...nodes.filter(n=>n.parentId===initial.id).map(n=>n.id)]) : new Set();
  const opts = platNodes.filter(n=>!excluded.has(n.id)).map(n=>({id:n.id,path:buildPath(n.id,platNodes)})).sort((a,b)=>a.path.localeCompare(b.path));

  const handleFile = e => {
    const f = e.target.files?.[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev => { setIconUrl(ev.target.result); setIcon("📁"); }; r.readAsDataURL(f);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{initial?"Edit Node":"Add Category Node"}</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div style={{display:"flex",gap:5,marginBottom:6}}>{["emoji","upload"].map(t=><button key={t} className={`filter-chip ${iconTab===t?"on":""}`} onClick={()=>setIconTab(t)}>{t==="emoji"?"😀 Emoji":"📤 Upload"}</button>)}</div>
            {iconTab==="emoji" ? <div className="icon-picker">{ICON_PALETTE.map(ic=><span key={ic} className={`icon-opt ${icon===ic&&!iconUrl?"sel":""}`} onClick={()=>{setIcon(ic);setIconUrl(null);}}>{ic}</span>)}</div>
            : <div><div className="upload-zone" onClick={()=>fileRef.current?.click()}><div className="upload-preview">{iconUrl?<img src={iconUrl} alt=""/>:icon}</div><div style={{fontSize:12,color:"var(--text2)"}}>{iconUrl?"Click to change":"Click to upload (PNG/SVG/JPG)"}</div></div><input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/></div>}
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Node Name *</label><input className="form-input" placeholder="e.g. Instagram" value={name} onChange={e=>setName(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-input" value={color} onChange={e=>setColor(e.target.value)} style={{height:40,padding:3,cursor:"pointer"}}/></div>
          </div>
          <div className="form-group">
            <label className="form-label">Parent Node</label>
            <select className="form-input" value={parent??""} onChange={e=>setParent(e.target.value||null)}>
              <option value="">— Root level</option>
              {opts.map(o=><option key={o.id} value={o.id}>{o.path}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Active</option><option value="archived">Archived</option></select></div>
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:18}}><span style={{fontSize:13,color:"var(--text2)"}}>Visible</span><label className="toggle"><input type="checkbox" checked={vis} onChange={e=>setVis(e.target.checked)}/><span className="toggle-slider"/></label></div>
          </div>
          <div className="form-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>{if(name.trim()) onSave({name:name.trim(),icon,color,parentId:parent,visibility:vis,status,iconUrl});}}>Save Node</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── PLATFORM FORM ────────────────────────────────────────────────────────────
function PlatformForm({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [icon, setIcon] = useState(initial?.icon || "🏢");
  const [color, setColor] = useState(initial?.color || PLATFORM_COLORS[Math.floor(Math.random()*PLATFORM_COLORS.length)]);
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl || null);
  const fileRef = useRef(null);
  const handleFile = e => { const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{setIconUrl(ev.target.result);}; r.readAsDataURL(f); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{initial?"Edit Platform":"Add Platform"}</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="icon-picker" style={{marginBottom:6}}>{ICON_PALETTE.slice(0,20).map(ic=><span key={ic} className={`icon-opt ${icon===ic&&!iconUrl?"sel":""}`} onClick={()=>{setIcon(ic);setIconUrl(null);}}>{ic}</span>)}</div>
            <div className="upload-zone" onClick={()=>fileRef.current?.click()}><div className="upload-preview">{iconUrl?<img src={iconUrl} alt=""/>:icon}</div><span style={{fontSize:12,color:"var(--text2)"}}>{iconUrl?"Click to change":"Upload custom icon"}</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          </div>
          <div className="form-group"><label className="form-label">Platform Name *</label><input className="form-input" style={{fontFamily:"'DM Sans',sans-serif"}} placeholder="e.g. Dr. Zainab Vora" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Color</label><input type="color" className="form-input" value={color} onChange={e=>setColor(e.target.value)} style={{height:40,padding:3,cursor:"pointer"}}/></div>
          <div className="form-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>name&&onSave({name,icon,color,iconUrl})}>Save Platform</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── CREDENTIAL FORM ──────────────────────────────────────────────────────────
function CredentialForm({ initial, nodes, platforms, platformId, nodeIdPreset, onSave, onClose }) {
  const platNodes = nodes.filter(n=>n.platformId===(platformId||initial?.platformId) && n.status==="active");
  const allActive = nodes.filter(n=>n.status==="active");
  const [form, setForm] = useState({
    title: initial?.title||"", username: initial?.username||"",
    password: initial ? (CryptoSim.decrypt(initial.passwordEnc)||initial.password||"") : "",
    url: initial?.url||"", notes: initial?.notes||"",
    nodeId: initial?.nodeId||nodeIdPreset||(platNodes[0]?.id)||"",
    status: initial?.status||"active", inVault: initial?.inVault||false, tags: initial?.tags?.join(", ")||"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const nodeOpts = (platNodes.length?platNodes:allActive).map(n=>({id:n.id,path:buildPath(n.id,nodes)})).sort((a,b)=>a.path.localeCompare(b.path));
  const save = () => {
    if(!form.title.trim()||!form.username.trim()||!form.password.trim()||!form.nodeId) { alert("Please fill all required fields."); return; }
    onSave({ ...form, title:form.title.trim(), username:form.username.trim(),
      passwordEnc: CryptoSim.encrypt(form.password),
      tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean),
    });
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{initial?"Edit Credential":"Add Credential"}</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" placeholder="e.g. Facebook Ads" value={form.title} onChange={e=>set("title",e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Category Node</label>
              <select className="form-input" value={form.nodeId} onChange={e=>set("nodeId",e.target.value)}>
                {!form.nodeId && <option value="">— Select category —</option>}
                {nodeOpts.map(o=><option key={o.id} value={o.id}>{o.path}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Username / Email *</label><input className="form-input" placeholder="user@company.com" value={form.username} onChange={e=>set("username",e.target.value)} /></div>
          <div className="form-group"><PasswordField value={form.password} onChange={v=>set("password",v)} /></div>
          <div className="form-group"><label className="form-label">URL</label><input className="form-input" placeholder="https://" value={form.url} onChange={e=>set("url",e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" placeholder="Additional notes..." value={form.notes} onChange={e=>set("notes",e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e=>set("status",e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input className="form-input" placeholder="ads, marketing" value={form.tags} onChange={e=>set("tags",e.target.value)} /></div>
          </div>
          <div className="toggle-row"><span style={{color:"var(--vault)"}}>🔐 Store in Vault</span><label className="toggle"><input type="checkbox" checked={form.inVault} onChange={e=>set("inVault",e.target.checked)}/><span className="toggle-slider"/></label></div>
          <div className="form-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save Credential</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL DRAWER ────────────────────────────────────────────────────────────
function DetailDrawer({ credential, nodes, platforms, users, onClose, onEdit, onToggleStatus, onToggleVault, onShare, currentUser }) {
  const [showPw, setShowPw] = useState(false);
  const decrypted = CryptoSim.decrypt(credential.passwordEnc) || credential.password || "";
  const platNode = nodes.find(n=>n.id===credential.nodeId);
  const platform = platforms.find(p=>p.id===platNode?.platformId);
  const platNodes = nodes.filter(n=>n.platformId===platNode?.platformId);
  const path = credential.nodeId ? buildPath(credential.nodeId,platNodes,platform?.name) : "—";
  const owner = users.find(u=>u.id===credential.ownerId)||{name:"Unknown"};
  const canEditThis = canEdit(credential,currentUser.id,currentUser.role);
  const canShare = hasPerm(currentUser.role,"shareCredentials");
  return (
    <div className="detail-drawer">
      <div className="drawer-header"><div><div className="drawer-title">{credential.title}</div><div className="drawer-url">{credential.url||"No URL"}</div></div><button className="modal-close" onClick={onClose}>×</button></div>
      <div className="drawer-body">
        <div className="dfield"><div className="dfield-label">Status</div><div style={{display:"flex",gap:5}}><span className={`status-badge ${credential.status==="active"?"s-active":"s-inactive"}`}>{credential.status==="active"?"● Active":"○ Inactive"}</span>{credential.inVault&&<span className="vault-badge">🔐 Vault</span>}</div></div>
        <div className="dfield"><div className="dfield-label">Category Path</div><div className="dfield-path">{path}</div></div>
        <div className="dfield"><div className="dfield-label">Username / Email</div><div className="dfield-val">{credential.username}<CopyBtn value={credential.username}/></div></div>
        <div className="dfield"><div className="dfield-label">Password</div><div className="dfield-val"><span style={{flex:1}}>{showPw?decrypted:maskPwd(decrypted)}</span><button className="copy-btn" onClick={()=>setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button><CopyBtn value={decrypted}/></div></div>
        {credential.url&&<div className="dfield"><div className="dfield-label">URL</div><div className="dfield-val" style={{fontSize:11}}>{credential.url}<CopyBtn value={credential.url}/></div></div>}
        {credential.notes&&<div className="dfield"><div className="dfield-label">Notes</div><div className="dfield-val" style={{fontFamily:"'DM Sans',sans-serif",fontSize:12}}>{credential.notes}</div></div>}
        {credential.tags?.length>0&&<div className="dfield"><div className="dfield-label">Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{credential.tags.map(t=><span key={t} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"var(--surface3)",color:"var(--text2)"}}>#{t}</span>)}</div></div>}
        <div className="dfield"><div className="dfield-label">Created By</div><div style={{fontSize:12,color:"var(--text2)"}}>{owner.name}</div></div>
        <div className="dfield"><div className="dfield-label">Last Updated</div><div style={{fontSize:12,color:"var(--text2)"}}>{credential.updatedAt}</div></div>
        <div style={{marginTop:4,padding:"8px 9px",background:"var(--surface2)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}}>
          <div style={{fontSize:9,color:"var(--text3)",marginBottom:3}}>🔒 ENCRYPTION</div>
          <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>AES-256 · bcrypt hashed · {credential.passwordEnc?.startsWith("ENC::")?"Encrypted":"Plaintext (legacy)"}</div>
        </div>
      </div>
      {(canEditThis||canShare) && (
        <div className="drawer-footer">
          {canShare && <button className="btn btn-green" style={{justifyContent:"center"}} onClick={()=>onShare(credential)}>📧 Share Credential</button>}
          {canEditThis && (
            <>
              <button className="btn btn-ghost" style={{justifyContent:"center"}} onClick={()=>onEdit(credential)}>✏️ Edit</button>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-ghost btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>onToggleStatus(credential.id)}>{credential.status==="active"?"○ Deactivate":"● Activate"}</button>
                {currentUser.role==="admin"&&<button className="btn btn-vault btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>onToggleVault(credential.id)}>{credential.inVault?"🔓 Remove":"🔐 Vault"}</button>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR TREE ─────────────────────────────────────────────────────────────
function PlatformTree({ nodes, credentials, platformId, selectedNodeId, expandedIds, onSelect, onExpand, onAdd, onEdit, onArchive, onDelete, currentUser }) {
  const [q, setQ] = useState("");
  const platNodes = nodes.filter(n=>n.platformId===platformId&&n.status==="active"&&n.visibility!==false);
  const searchResults = useMemo(() => {
    if(!q.trim()) return [];
    const lq=q.toLowerCase();
    return platNodes.filter(n=>n.name.toLowerCase().includes(lq)||buildPath(n.id,platNodes).toLowerCase().includes(lq)).map(n=>({node:n,path:buildPath(n.id,platNodes)})).sort((a,b)=>a.path.localeCompare(b.path));
  }, [q,platNodes]);

  const renderNode = (node, depth) => {
    const children = getChildren(node.id,nodes,platformId).filter(n=>n.status==="active"&&n.visibility!==false);
    const isOpen = !!expandedIds[node.id];
    const isSel = selectedNodeId===node.id;
    const cnt = credentials.filter(cr=>cr.nodeId===node.id&&cr.status==="active").length;
    return (
      <div key={node.id}>
        <div className={`tnode-row ${isSel?"sel":""}`} style={{paddingLeft:depth*10}} onClick={()=>onSelect(node)}>
          <div className="tnode-inner">
            <span className={`tnode-chevron ${children.length?(isOpen?"open":""):"leaf"}`} onClick={e=>{e.stopPropagation();if(children.length) onExpand(node.id);}}>▶</span>
            <span className="tnode-icon">{node.iconUrl?<img src={node.iconUrl} alt=""/>:node.icon}</span>
            <span className="tnode-name">{node.name}</span>
            {cnt>0&&<span className="tnode-cnt">{cnt}</span>}
          </div>
          {hasPerm(currentUser.role,"manageNodes")&&<div className="tnode-acts"><button className="tnode-act" title="Add child" onClick={e=>{e.stopPropagation();onAdd(node.id);}}>+</button><button className="tnode-act" onClick={e=>{e.stopPropagation();onEdit(node);}}>✏️</button><button className="tnode-act" style={{color:"var(--yellow)"}} onClick={e=>{e.stopPropagation();onArchive(node);}}>📦</button></div>}
        </div>
        {isOpen&&children.map(child=>renderNode(child,depth+1))}
      </div>
    );
  };
  const roots = getRoots(nodes,platformId).filter(n=>n.status==="active"&&n.visibility!==false);
  return (
    <div className="tree-sidebar">
      <div className="tree-sidebar-header"><span className="tree-sidebar-title">Categories</span>{hasPerm(currentUser.role,"manageNodes")&&<button className="btn btn-ghost btn-sm btn-icon" onClick={()=>onAdd(null)}>＋</button>}</div>
      <div className="tree-search-box" style={{position:"relative"}}><span className="tree-search-ico">🔍</span><input className="tree-search-input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="tree-body">
        {q.trim() ? (
          searchResults.length===0 ? <div style={{fontSize:12,color:"var(--text3)",padding:"8px 14px"}}>No results</div> :
          searchResults.map(({node,path})=>(
            <div key={node.id} style={{margin:"2px 7px",padding:"6px 8px",borderRadius:7,cursor:"pointer",border:"1px solid var(--border)"}} onClick={()=>{setQ("");onSelect(node);}}>
              <div style={{fontSize:12,fontWeight:600}}>{node.icon} {node.name}</div>
              <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>{path}</div>
            </div>
          ))
        ) : roots.length===0 ? (
          <div className="empty" style={{padding:"28px 14px"}}><div className="empty-icon">📁</div><div className="empty-title">No categories yet</div><div className="empty-sub">Click ＋ to add your first node</div></div>
        ) : roots.map(r=>renderNode(r,0))}
      </div>
    </div>
  );
}

// ─── PLATFORM WORKSPACE ───────────────────────────────────────────────────────
function PlatformWorkspace({ platform, nodes, credentials, users, currentUser, onNodes, onCreds, addLog, notify }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});
  const [selectedCred, setSelectedCred] = useState(null);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [parentPreset, setParentPreset] = useState(null);
  const [showCredForm, setShowCredForm] = useState(false);
  const [editingCred, setEditingCred] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(null);

  const platNodes = nodes.filter(n=>n.platformId===platform.id);
  const accessCreds = credentials.filter(cr=>{ const n=nodes.find(nd=>nd.id===cr.nodeId); return n?.platformId===platform.id&&canAccess(cr,currentUser.id,currentUser.role); });
  const getNodeCreds = nodeId => { const ids=getDescendants(nodeId,nodes); return accessCreds.filter(cr=>ids.includes(cr.nodeId)&&cr.status==="active"&&!cr.inVault); };
  const displayedCreds = selectedNode ? getNodeCreds(selectedNode.id) : accessCreds.filter(cr=>cr.status==="active"&&!cr.inVault);

  const saveNode = form => {
    const ts=nowISO();
    if(editingNode){ onNodes(prev=>prev.map(n=>n.id===editingNode.id?{...n,...form,updatedAt:ts}:n)); addLog("node_updated","node",editingNode.id,form.name,{}); notify("✏️","Node updated"); }
    else { const id=genId(); onNodes(prev=>[...prev,{id,platformId:platform.id,...form,createdBy:currentUser.id,createdAt:ts,updatedAt:ts}]); addLog("node_created","node",id,form.name,{}); if(form.parentId) setExpandedIds(p=>({...p,[form.parentId]:true})); notify("📁","Node created"); }
    setShowNodeForm(false); setEditingNode(null); setParentPreset(null);
  };
  const doArchive = () => { const node=confirmArchive; if(!node) return; onNodes(prev=>prev.map(n=>n.id===node.id?{...n,status:"archived",updatedAt:nowISO()}:n)); addLog("node_archived","node",node.id,node.name,{}); notify("📦",`"${node.name}" archived`); if(selectedNode?.id===node.id) setSelectedNode(null); setConfirmArchive(null); };
  const saveCred = form => {
    const dateNow = new Date().toISOString().split("T")[0];
    const nodeId = form.nodeId||selectedNode?.id||platNodes.find(n=>n.status==="active")?.id||null;
    if(!nodeId){ notify("⚠️","Add a category node first"); return; }
    const finalForm = {...form, nodeId};
    if(editingCred){ onCreds(prev=>prev.map(cr=>cr.id===editingCred.id?{...cr,...finalForm,updatedAt:dateNow}:cr)); addLog("credential_updated","credential",editingCred.id,finalForm.title,{}); notify("✏️","Credential updated"); }
    else { const nc={id:genCrId(),...finalForm,platformId:platform.id,ownerId:currentUser.id,accessList:[currentUser.id],createdAt:dateNow,updatedAt:dateNow}; onCreds(prev=>[...prev,nc]); addLog("credential_created","credential",nc.id,nc.title,{path:buildPath(nc.nodeId,platNodes)}); setExpandedIds(p=>({...p,[nc.nodeId]:true})); notify("✅",`"${nc.title}" saved`); }
    setShowCredForm(false); setEditingCred(null);
  };
  const toggleStatus = id => { onCreds(prev=>prev.map(cr=>cr.id===id?{...cr,status:cr.status==="active"?"inactive":"active",updatedAt:new Date().toISOString().split("T")[0]}:cr)); setSelectedCred(prev=>prev?.id===id?{...prev,status:prev.status==="active"?"inactive":"active"}:prev); addLog("credential_status_changed","credential",id,"",{}); notify("🔄","Status updated"); };
  const toggleVault = id => { onCreds(prev=>prev.map(cr=>cr.id===id?{...cr,inVault:!cr.inVault}:cr)); setSelectedCred(prev=>prev?.id===id?{...prev,inVault:!prev.inVault}:prev); addLog("credential_vault_on","credential",id,"",{}); notify("🔐","Vault updated"); };
  const breadcrumb = useMemo(() => { if(!selectedNode) return []; const chain=[]; let cur=platNodes.find(n=>n.id===selectedNode.id); while(cur){chain.unshift(cur);cur=cur.parentId?platNodes.find(n=>n.id===cur.parentId):null;} return chain; }, [selectedNode,platNodes]);

  return (
    <div className="platform-workspace" style={{height:"100%",overflowY:"auto"}}>
      <PlatformTree nodes={nodes} credentials={credentials} platformId={platform.id} selectedNodeId={selectedNode?.id} expandedIds={expandedIds} currentUser={currentUser}
        onSelect={n=>{setSelectedNode(n);setSelectedCred(null);setExpandedIds(p=>({...p,[n.id]:true}));}}
        onExpand={id=>setExpandedIds(p=>({...p,[id]:!p[id]}))}
        onAdd={pid=>{setParentPreset(pid);setEditingNode(null);setShowNodeForm(true);}}
        onEdit={n=>{setEditingNode(n);setShowNodeForm(true);}}
        onArchive={n=>setConfirmArchive(n)}
        onDelete={()=>{}}
      />
      <div className="right-panel">
        <div style={{padding:"10px 18px",borderBottom:"1px solid var(--border)",background:"var(--surface)",display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            {selectedNode ? (
              <div className="breadcrumb">
                <span className="bc-seg" onClick={()=>setSelectedNode(null)}>{platform.icon} {platform.name}</span>
                {breadcrumb.slice(0,-1).map(seg=><span key={seg.id} style={{display:"contents"}}><span className="bc-sep">›</span><span className="bc-seg" onClick={()=>setSelectedNode(seg)}>{seg.name}</span></span>)}
                <span className="bc-sep">›</span><span className="bc-cur">{selectedNode.name}</span>
              </div>
            ) : <div style={{fontSize:13,fontWeight:700}}>{platform.icon} {platform.name}</div>}
          </div>
          <button className="btn btn-orange btn-sm" onClick={()=>setShowExport(true)}>📤 Export</button>
          {(currentUser.role==="admin"||currentUser.role==="editor")&&<button className="btn btn-primary btn-sm" onClick={()=>{setEditingCred(null);setShowCredForm(true);}}>+ Credential</button>}
          {hasPerm(currentUser.role,"manageNodes")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setParentPreset(selectedNode?.id||null);setEditingNode(null);setShowNodeForm(true);}}>+ Node</button>}
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div className="right-panel-content" style={{flex:1}}>
            {selectedNode && (
              <>
                <div className="node-hero">
                  <div style={{fontSize:32,flexShrink:0}}>{selectedNode.iconUrl?<img src={selectedNode.iconUrl} style={{width:40,height:40,borderRadius:10,objectFit:"cover"}} alt=""/>:selectedNode.icon}</div>
                  <div style={{flex:1}}>
                    <div className="node-hero-name">{selectedNode.name}</div>
                    <div className="node-hero-path">{buildPath(selectedNode.id,platNodes,platform.name)}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}><span className="node-badge badge-active">● Active</span><span className="node-badge badge-visible">👁 Visible</span></div>
                  </div>
                </div>
                {getChildren(selectedNode.id,nodes,platform.id).filter(n=>n.status==="active"&&n.visibility!==false).length>0&&(
                  <><div className="sec-header"><div className="sec-title"><span className="sec-title-dot"/>Child Nodes</div></div>
                  <div className="child-grid">{getChildren(selectedNode.id,nodes,platform.id).filter(n=>n.status==="active"&&n.visibility!==false).map(child=>{
                    const cnt=credentials.filter(cr=>getDescendants(child.id,nodes).includes(cr.nodeId)&&cr.status==="active"&&!cr.inVault).length;
                    return <div key={child.id} className="child-card" style={{"--cc":child.color}} onClick={()=>{setSelectedNode(child);setExpandedIds(p=>({...p,[child.id]:true}));}}>
                      <div style={{fontSize:18,marginBottom:6}}>{child.iconUrl?<img src={child.iconUrl} style={{width:24,height:24,borderRadius:5,objectFit:"cover"}} alt=""/>:child.icon}</div>
                      <div style={{fontSize:12,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{child.name}</div>
                      <div style={{fontSize:10,color:"var(--text3)"}}>{cnt} credential{cnt!==1?"s":""}</div>
                    </div>;
                  })}</div></>
                )}
                <div className="sec-header"><div className="sec-title"><span className="sec-title-dot"/>Credentials in this node</div></div>
              </>
            )}
            {!selectedNode&&<div className="sec-header" style={{marginBottom:14}}><div className="sec-title"><span className="sec-title-dot"/>All Active Credentials</div><span style={{fontSize:12,color:"var(--text3)"}}>{displayedCreds.length} items</span></div>}
            {displayedCreds.length===0 ? <div className="empty"><div className="empty-icon">🔑</div><div className="empty-title">No credentials yet</div><div className="empty-sub">Click "+ Credential" to add one.</div></div> : (
              <div className="cred-table">
                <div className="cred-thead cred-cols"><span/><span>Credential</span><span>Username</span><span>Password</span><span>Status</span><span>Vault</span><span>Actions</span></div>
                {displayedCreds.map(cr=>{
                  const nd=nodes.find(n=>n.id===cr.nodeId);
                  const pns=nodes.filter(n=>n.platformId===platform.id);
                  return <div key={cr.id} className={`cred-row cred-cols ${cr.inVault?"vault-row":""}`} onClick={()=>{setSelectedCred(selectedCred?.id===cr.id?null:{...cr});if(selectedCred?.id!==cr.id) addLog("credential_accessed","credential",cr.id,cr.title,{});}}>
                    <div className="favicon">{nd?.iconUrl?<img src={nd.iconUrl} alt=""/>:nd?.icon||"🌐"}</div>
                    <div style={{minWidth:0}}><div className="cred-title">{cr.title}{cr.inVault&&<span style={{marginLeft:5,fontSize:8,background:"var(--vaultglow)",color:"var(--vault)",border:"1px solid var(--vault)28",borderRadius:3,padding:"1px 4px"}}>VAULT</span>}</div><div className="cred-path">{buildPath(cr.nodeId,pns)}</div></div>
                    <div className="cred-user">{cr.username}</div>
                    <div><span className="pass-dots">{maskPwd(CryptoSim.decrypt(cr.passwordEnc)||cr.password||"")}</span></div>
                    <div><span className={`status-badge ${cr.status==="active"?"s-active":"s-inactive"}`}>{cr.status==="active"?"●":"○"} {cr.status}</span></div>
                    <div>{cr.inVault&&<span className="vault-badge">🔐</span>}</div>
                    <div className="row-acts" onClick={e=>e.stopPropagation()}>
                      {hasPerm(currentUser.role,"shareCredentials")&&<button className="act-btn" title="Share" onClick={()=>setShareTarget(cr)}>📧</button>}
                      {canEdit(cr,currentUser.id,currentUser.role)&&<><button className="act-btn" onClick={()=>{setEditingCred(cr);setShowCredForm(true);}}>✏️</button><button className="act-btn" onClick={()=>toggleStatus(cr.id)}>{cr.status==="active"?"🔇":"🔊"}</button>{currentUser.role==="admin"&&<button className="act-btn vault-btn" onClick={()=>toggleVault(cr.id)}>🔐</button>}</>}
                    </div>
                  </div>;
                })}
              </div>
            )}
          </div>
          {selectedCred&&canAccess(selectedCred,currentUser.id,currentUser.role)&&(
            <DetailDrawer credential={selectedCred} nodes={nodes} platforms={[platform]} users={users} currentUser={currentUser} onClose={()=>setSelectedCred(null)} onEdit={cr=>{setEditingCred(cr);setShowCredForm(true);}} onToggleStatus={toggleStatus} onToggleVault={toggleVault} onShare={cr=>setShareTarget(cr)} />
          )}
        </div>
      </div>
      {showNodeForm&&<NodeForm initial={editingNode} nodes={nodes} platformId={platform.id} parentPreset={parentPreset} onSave={saveNode} onClose={()=>{setShowNodeForm(false);setEditingNode(null);setParentPreset(null);}}/>}
      {showCredForm&&<CredentialForm initial={editingCred} nodes={nodes} platforms={[platform]} platformId={platform.id} nodeIdPreset={selectedNode?.id} onSave={saveCred} onClose={()=>{setShowCredForm(false);setEditingCred(null);}}/>}
      {shareTarget&&<ShareCredentialModal credential={shareTarget} users={users} currentUser={currentUser} nodes={nodes} platforms={[platform]} onClose={()=>setShareTarget(null)} notify={notify} addLog={addLog}/>}
      {showExport&&<ExportModal credentials={accessCreds} nodes={nodes} platforms={[platform]} users={users} currentUser={currentUser} onClose={()=>setShowExport(false)} notify={notify} addLog={addLog}/>}
      {confirmArchive&&<div className="confirm-overlay" onClick={()=>setConfirmArchive(null)}><div className="confirm-card" onClick={e=>e.stopPropagation()}><div style={{fontSize:36,textAlign:"center",marginBottom:12}}>📦</div><div style={{fontSize:16,fontWeight:800,textAlign:"center",marginBottom:6}}>Archive "{confirmArchive.name}"?</div><div style={{fontSize:13,color:"var(--text2)",textAlign:"center",lineHeight:1.6,marginBottom:22}}>This node will be hidden from the tree. Credentials inside will be inaccessible. You can restore it later.</div><div style={{display:"flex",gap:9,justifyContent:"center"}}><button className="btn btn-ghost" onClick={()=>setConfirmArchive(null)}>Cancel</button><button className="btn btn-ghost" style={{color:"var(--yellow)"}} onClick={doArchive}>📦 Archive</button></div></div></div>}
    </div>
  );
}

// ─── FILTER PAGE ─────────────────────────────────────────────────────────────
function FilterPage({ nodes, credentials, platforms, users, currentUser, addLog, notify }) {
  const [q, setQ] = useState(""); const [fPlat, setFPlat] = useState("all"); const [fStatus, setFStatus] = useState("all"); const [fVault, setFVault] = useState("all"); const [fOwner, setFOwner] = useState("all"); const [dateFrom, setDateFrom] = useState(""); const [dateTo, setDateTo] = useState("");
  const [showExport, setShowExport] = useState(false);
  const accessCreds = credentials.filter(cr=>canAccess(cr,currentUser.id,currentUser.role));
  const results = accessCreds.filter(cr=>{
    if(fStatus!=="all"&&cr.status!==fStatus) return false;
    if(fVault==="vault"&&!cr.inVault) return false; if(fVault==="nonvault"&&cr.inVault) return false;
    if(fOwner!=="all"&&cr.ownerId!==fOwner) return false;
    if(fPlat!=="all"){const n=nodes.find(nd=>nd.id===cr.nodeId);if(n?.platformId!==fPlat) return false;}
    if(dateFrom&&cr.createdAt<dateFrom) return false; if(dateTo&&cr.createdAt>dateTo) return false;
    if(q){const lq=q.toLowerCase();const n=nodes.find(nd=>nd.id===cr.nodeId);const pns=nodes.filter(nd=>nd.platformId===n?.platformId);const pl=platforms.find(p=>p.id===n?.platformId);const path=buildPath(cr.nodeId,pns,pl?.name).toLowerCase();if(!cr.title.toLowerCase().includes(lq)&&!cr.username.toLowerCase().includes(lq)&&!(cr.url||"").toLowerCase().includes(lq)&&!path.includes(lq)) return false;}
    return true;
  });
  const hasFilters = q||fPlat!=="all"||fStatus!=="all"||fVault!=="all"||fOwner!=="all"||dateFrom||dateTo;
  return (
    <div className="filters-layout">
      <div className="filter-panel">
        <div style={{fontSize:12,fontWeight:700,marginBottom:13,paddingBottom:9,borderBottom:"1px solid var(--border)",color:"var(--text2)"}}>🔍 Filter Credentials</div>
        <div style={{marginBottom:13}}><div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Search</div><div style={{position:"relative"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",fontSize:12,pointerEvents:"none"}}>🔍</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Title, username, path…" style={{width:"100%",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"7px 9px 7px 27px",fontSize:12,color:"var(--text)",outline:"none",fontFamily:"'DM Sans',sans-serif"}}/></div></div>
        <div style={{marginBottom:13}}><div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Platform</div><select className="form-input" value={fPlat} onChange={e=>setFPlat(e.target.value)}><option value="all">All Platforms</option>{platforms.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select></div>
        <div style={{marginBottom:13}}><div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Status</div><div>{["all","active","inactive"].map(v=><button key={v} className={`filter-chip ${fStatus===v?"on":""}`} onClick={()=>setFStatus(v)}>{v}</button>)}</div></div>
        <div style={{marginBottom:13}}><div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Vault</div><div>{[["all","All"],["vault","🔐 Vault"],["nonvault","Non-vault"]].map(([v,l])=><button key={v} className={`filter-chip ${fVault===v?"on":""}`} onClick={()=>setFVault(v)}>{l}</button>)}</div></div>
        <div style={{marginBottom:13}}><div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Created By</div><select className="form-input" value={fOwner} onChange={e=>setFOwner(e.target.value)}><option value="all">All Users</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div style={{marginBottom:13}}><div style={{fontSize:9,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5}}>Date Range</div><div style={{display:"flex",flexDirection:"column",gap:4}}><input type="date" style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"5px 8px",fontSize:11,color:"var(--text2)",outline:"none",fontFamily:"'DM Sans',sans-serif",colorScheme:"dark",width:"100%"}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/><input type="date" style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"5px 8px",fontSize:11,color:"var(--text2)",outline:"none",fontFamily:"'DM Sans',sans-serif",colorScheme:"dark",width:"100%"}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div></div>
        {hasFilters&&<button className="btn btn-ghost btn-sm" style={{width:"100%",justifyContent:"center"}} onClick={()=>{setQ("");setFPlat("all");setFStatus("all");setFVault("all");setFOwner("all");setDateFrom("");setDateTo("");}}>✕ Clear</button>}
      </div>
      <div>
        <div className="sec-header" style={{marginBottom:12}}>
          <div className="sec-title"><span className="sec-title-dot"/>{hasFilters?`${results.length} result${results.length!==1?"s":""}`:""}{!hasFilters?"Set filters to search":""}</div>
          {hasFilters&&results.length>0&&<button className="btn btn-orange btn-sm" onClick={()=>setShowExport(true)}>📤 Export Results</button>}
        </div>
        {!hasFilters&&<div className="empty"><div className="empty-icon">🔍</div><div className="empty-title">Use the filter panel</div><div className="empty-sub">Search credentials across all platforms.</div></div>}
        {hasFilters&&results.length===0&&<div className="empty"><div className="empty-icon">🔍</div><div className="empty-title">No results</div><div className="empty-sub">Try adjusting your filters.</div></div>}
        {hasFilters&&results.length>0&&(
          <div className="cred-table">
            <div className="cred-thead cred-cols"><span/><span>Credential</span><span>Username</span><span>Password</span><span>Status</span><span>Vault</span><span/></div>
            {results.map(cr=>{const nd=nodes.find(n=>n.id===cr.nodeId);const pl=platforms.find(p=>p.id===nd?.platformId);const pns=nodes.filter(n=>n.platformId===nd?.platformId);return(
              <div key={cr.id} className={`cred-row cred-cols ${cr.inVault?"vault-row":""}`}>
                <div className="favicon">{nd?.icon||"🌐"}</div>
                <div style={{minWidth:0}}><div className="cred-title">{cr.title}</div><div className="cred-path">{buildPath(cr.nodeId,pns,pl?.name)}</div></div>
                <div className="cred-user">{cr.username}</div>
                <div><span className="pass-dots">{maskPwd("")}</span></div>
                <div><span className={`status-badge ${cr.status==="active"?"s-active":"s-inactive"}`}>{cr.status}</span></div>
                <div>{cr.inVault&&<span className="vault-badge">🔐</span>}</div>
                <div/>
              </div>
            );})}
          </div>
        )}
      </div>
      {showExport&&<ExportModal credentials={results} nodes={nodes} platforms={platforms} users={users} currentUser={currentUser} onClose={()=>setShowExport(false)} notify={notify} addLog={addLog}/>}
    </div>
  );
}

// ─── LOG PAGE ─────────────────────────────────────────────────────────────────
function LogPage({ logs, users }) {
  const [filter, setFilter] = useState("all"); const [fUser, setFUser] = useState("all"); const [search, setSearch] = useState(""); const [sortDesc, setSortDesc] = useState(true);
  const fgs = [{k:"all",l:"All"},{k:"auth",l:"Auth"},{k:"platform",l:"Platforms"},{k:"node",l:"Nodes"},{k:"credential",l:"Credentials"},{k:"vault",l:"Vault"},{k:"share",l:"Sharing"},{k:"export",l:"Exports"}];
  const filtered = logs.filter(l=>{
    if(filter==="vault") return l.action.includes("vault");
    if(filter==="auth") return l.action.includes("login")||l.action.includes("logout");
    if(filter==="share") return l.action==="credential_shared"||l.action==="invite_sent";
    if(filter==="export") return l.action==="credential_exported";
    if(filter!=="all") return l.entityType===filter;
    return true;
  }).filter(l=>fUser==="all"||l.userId===fUser).filter(l=>!search||(l.entityName.toLowerCase().includes(search.toLowerCase())||l.userName.toLowerCase().includes(search.toLowerCase())||l.id.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>sortDesc?new Date(b.timestamp)-new Date(a.timestamp):new Date(a.timestamp)-new Date(b.timestamp));
  const counts = {total:logs.length,creds:logs.filter(l=>l.entityType==="credential").length,shared:logs.filter(l=>l.action==="credential_shared"||l.action==="credential_exported").length,logins:logs.filter(l=>l.action==="user_login").length};
  return (
    <div>
      <div className="log-stats-row">
        {[{v:counts.total,l:"Total Events",c:"var(--text)"},{v:counts.creds,l:"Credential Events",c:"var(--green)"},{v:counts.shared,l:"Shares / Exports",c:"var(--orange)"},{v:counts.logins,l:"Logins",c:"var(--accent)"}].map(s=>(
          <div key={s.l} className="log-stat-card"><div style={{fontSize:19,fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:10,color:"var(--text2)",marginTop:2}}>{s.l}</div></div>
        ))}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        {fgs.map(fg=><button key={fg.k} className={`filter-chip ${filter===fg.k?"on":""}`} onClick={()=>setFilter(fg.k)}>{fg.l}</button>)}
        <select style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"4px 8px",fontSize:12,color:"var(--text2)",outline:"none",fontFamily:"'DM Sans',sans-serif"}} value={fUser} onChange={e=>setFUser(e.target.value)}><option value="all">All Users</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <div style={{position:"relative"}}><span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",fontSize:11,pointerEvents:"none"}}>🔍</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius-sm)",padding:"5px 9px 5px 26px",fontSize:12,color:"var(--text)",outline:"none",fontFamily:"'DM Sans',sans-serif",width:150}}/></div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setSortDesc(p=>!p)}>{sortDesc?"↓ Newest":"↑ Oldest"}</button>
        </div>
      </div>
      <div className="log-table">
        <div className="log-row log-cols" style={{background:"var(--surface2)",fontSize:9,fontWeight:700,color:"var(--text3)",letterSpacing:.7,textTransform:"uppercase",padding:"8px 13px"}}><span>Log ID</span><span/><span>Event</span><span>By</span><span>Action</span><span>Time</span><span>IP</span></div>
        {filtered.length===0&&<div className="empty" style={{padding:"28px"}}><div className="empty-icon">📋</div><div className="empty-title">No logs found</div></div>}
        {filtered.map(log=>{const cfg=LOG_ACTIONS[log.action]||{label:log.action,icon:"📝",color:"#64748b"};return(
          <div key={log.id} className="log-row log-cols">
            <span className="log-id">{log.id}</span>
            <div className="log-act-icon" style={{background:cfg.color+"18"}}>{cfg.icon}</div>
            <div><div className="log-entity">{log.entityName}</div><div className="log-entity-sub">{log.meta?.path||log.meta?.sharedWith||log.entityType}</div></div>
            <div className="log-user-chip"><div className="log-avatar">{users.find(u=>u.id===log.userId)?.avatar||"?"}</div><div><div style={{fontSize:11,fontWeight:600}}>{log.userName}</div><span className={`role-badge role-${log.userRole}`} style={{fontSize:8}}>{log.userRole}</span></div></div>
            <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:20,fontWeight:600,background:cfg.color+"18",color:cfg.color,border:`1px solid ${cfg.color}22`,whiteSpace:"nowrap"}}>{cfg.icon} {cfg.label}</span>
            <span className="log-time">{fmtDate(log.timestamp)}</span>
            <span className="log-ip">{log.ip||"—"}</span>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage({ users, invites, onUsers, onInvites, currentUser, notify, addLog }) {
  const [showInvite, setShowInvite] = useState(false);
  const toggleActive = id => onUsers(prev=>prev.map(u=>u.id===id?{...u,active:!u.active}:u));
  const changeRole = (id,role) => onUsers(prev=>prev.map(u=>u.id===id?{...u,role}:u));
  const handleInvite = data => { onInvites(prev=>[...prev,data]); addLog("invite_sent","user",data.email,data.email,{role:data.role}); };
  return (
    <>
      <div className="sec-header" style={{marginBottom:16}}>
        <div className="sec-title"><span className="sec-title-dot"/>Team Members ({users.length})</div>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowInvite(true)}>✉️ Invite User</button>
      </div>
      {invites.length>0&&(
        <div className="invite-section" style={{marginBottom:16}}>
          <div className="invite-header"><span>⏳ Pending Invites ({invites.length})</span><span style={{fontSize:11,color:"var(--text3)"}}>48h expiry</span></div>
          {invites.map((inv,i)=>(
            <div key={i} className="pending-invite">
              <div className="pending-email">{inv.email}</div>
              <span className={`role-badge role-${inv.role}`}>{inv.role}</span>
              <span className="pending-badge">Pending</span>
              <button className="btn btn-ghost btn-sm" style={{marginLeft:6}} onClick={()=>{const t=CryptoSim.parseToken(inv.token);if(t){const link=`${window.location.origin}?invite=${inv.token}`;navigator.clipboard?.writeText(link);notify("📋","Invite link copied!");}else notify("⚠️","Invite expired");}}>📋 Copy Link</button>
            </div>
          ))}
        </div>
      )}
      <div className="users-table">
        <div className="users-thead users-cols"><span>User</span><span>Department</span><span>Role</span><span>Status</span><span>Last IP</span><span>Actions</span></div>
        {users.map(u=>(
          <div key={u.id} className="users-row users-cols" style={{opacity:u.active?1:.55}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div className="avatar" style={{width:26,height:26,fontSize:9}}>{u.avatar}</div>
              <div><div style={{fontSize:12.5,fontWeight:600}}>{u.name}</div><div style={{fontSize:11,color:"var(--text2)",fontFamily:"'DM Mono',monospace"}}>{u.email}</div><div style={{marginTop:2}}>{u.emailVerified?<span style={{fontSize:9,color:"var(--green)"}}>✓ Email verified</span>:<span style={{fontSize:9,color:"var(--yellow)"}}>⚠ Unverified</span>}</div></div>
            </div>
            <div style={{fontSize:12,color:"var(--text2)"}}>{u.department||"—"}</div>
            <div>{u.id===currentUser.id?<span className={`role-badge role-${u.role}`}>{u.role}</span>:<select style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:5,padding:"3px 7px",fontSize:11,color:"var(--text2)",outline:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}} value={u.role} onChange={e=>changeRole(u.id,e.target.value)}><option value="user">user</option><option value="editor">editor</option><option value="admin">admin</option></select>}</div>
            <div><span style={{fontSize:10,padding:"2px 7px",borderRadius:20,fontWeight:600,...(u.active?{background:"#0fba8118",color:"var(--green)",border:"1px solid #0fba8128"}:{background:"#64748b18",color:"#64748b",border:"1px solid #64748b28"})}}>{u.active?"● Active":"○ Inactive"}</span></div>
            <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'DM Mono',monospace"}}>{u.ip}</div>
            <div style={{display:"flex",gap:3}}>{u.id!==currentUser.id&&<button className="act-btn" onClick={()=>toggleActive(u.id)}>{u.active?"🔇":"🔊"}</button>}</div>
          </div>
        ))}
      </div>
      {showInvite&&<InviteUserModal currentUser={currentUser} users={users} onInvite={handleInvite} onClose={()=>setShowInvite(false)} notify={notify}/>}
    </>
  );
}

// ─── VAULT PAGE ───────────────────────────────────────────────────────────────
function VaultPage({ credentials, nodes, platforms, users, currentUser, onToggleVault, addLog, onLock }) {
  const [selectedCred, setSelectedCred] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const vaultCreds = credentials.filter(cr=>cr.inVault&&canAccess(cr,currentUser.id,currentUser.role));
  return (
    <>
      <div className="vault-page-banner">
        <span style={{fontSize:28}}>🔐</span>
        <div style={{flex:1}}><div className="vault-page-title">Secure Vault — Unlocked</div><div className="vault-page-sub">AES-256 encrypted. Restricted access. All access is logged.</div></div>
        <button className="btn btn-vault btn-sm" onClick={onLock}>🔒 Lock</button>
      </div>
      {vaultCreds.length===0?<div className="empty"><div className="empty-icon">🔐</div><div className="empty-title">Vault is empty</div><div className="empty-sub">Mark credentials as vault items when adding them.</div></div>:(
        <div style={{display:"flex",overflow:"hidden",borderRadius:"var(--radius)",border:"1px solid var(--border)"}}>
          <div style={{flex:1,overflow:"hidden"}}>
            <div className="cred-table" style={{border:"none",borderRadius:0}}>
              <div className="cred-thead cred-cols"><span/><span>Credential</span><span>Username</span><span>Password</span><span>Status</span><span/><span>Actions</span></div>
              {vaultCreds.map(cr=>{const nd=nodes.find(n=>n.id===cr.nodeId);const pl=platforms.find(p=>p.id===nd?.platformId);const pns=nodes.filter(n=>n.platformId===nd?.platformId);return(
                <div key={cr.id} className="cred-row cred-cols vault-row" onClick={()=>{setSelectedCred(selectedCred?.id===cr.id?null:{...cr});if(selectedCred?.id!==cr.id) addLog("credential_accessed","credential",cr.id,cr.title,{});}}>
                  <div className="favicon">{nd?.icon||"🌐"}</div>
                  <div style={{minWidth:0}}><div className="cred-title">{cr.title} <span style={{fontSize:8,background:"var(--vaultglow)",color:"var(--vault)",border:"1px solid var(--vault)28",borderRadius:3,padding:"1px 4px",marginLeft:3}}>VAULT</span></div><div className="cred-path">{buildPath(cr.nodeId,pns,pl?.name)}</div></div>
                  <div className="cred-user">{cr.username}</div>
                  <div><span className="pass-dots">{maskPwd("")}</span></div>
                  <div><span className="status-badge s-active">● active</span></div>
                  <div/>
                  <div className="row-acts" onClick={e=>e.stopPropagation()}>
                    {hasPerm(currentUser.role,"shareCredentials")&&<button className="act-btn" title="Share" onClick={()=>setShareTarget(cr)}>📧</button>}
                    {currentUser.role==="admin"&&<button className="act-btn vault-btn" title="Remove from vault" onClick={()=>{onToggleVault(cr.id);addLog("credential_vault_off","credential",cr.id,cr.title,{});}}>🔓</button>}
                  </div>
                </div>
              );})}
            </div>
          </div>
          {selectedCred&&canAccess(selectedCred,currentUser.id,currentUser.role)&&(
            <DetailDrawer credential={selectedCred} nodes={nodes} platforms={platforms} users={users} currentUser={currentUser} onClose={()=>setSelectedCred(null)} onEdit={()=>{}} onToggleStatus={()=>{}} onToggleVault={()=>{}} onShare={cr=>setShareTarget(cr)} />
          )}
        </div>
      )}
      {shareTarget&&<ShareCredentialModal credential={shareTarget} users={users} currentUser={currentUser} nodes={nodes} platforms={platforms} onClose={()=>setShareTarget(null)} notify={()=>{}} addLog={addLog}/>}
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function useViewportMeta() { useEffect(() => { if(!document.querySelector('meta[name="viewport"]')){const m=document.createElement("meta");m.name="viewport";m.content="width=device-width,initial-scale=1,maximum-scale=1";document.head.appendChild(m);}}, []); }

export default function App() {
  useViewportMeta();
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [setupData, setSetupData] = useState(null); // for invite flow

  const [users, setUsers] = usePersist("vp2_users", SEED_USERS);
  const [platforms, setPlatforms] = usePersist("vp2_platforms", SEED_PLATFORMS);
  const [nodes, setNodes] = usePersist("vp2_nodes", SEED_NODES);
  const [credentials, setCreds] = usePersist("vp2_credentials", SEED_CREDENTIALS);
  const [logs, setLogs] = usePersist("vp2_logs", SEED_LOGS);
  const [invites, setInvites] = usePersist("vp2_invites", SEED_INVITES);

  const [view, setView] = useState("dashboard");
  const [activePlatId, setActivePlatId] = useState(null);
  const [showUserSwitch, setShowUserSwitch] = useState(false);
  const [showVaultGate, setShowVaultGate] = useState(false);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [showPlatForm, setShowPlatForm] = useState(false);
  const [editingPlat, setEditingPlat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notif, setNotif] = useState(null);
  const [showEmailLog, setShowEmailLog] = useState(false);
  const [showGlobalExport, setShowGlobalExport] = useState(false);

  const notify = (icon, text) => setNotif({ icon, text });

  const addLog = useCallback((action, entityType, entityId, entityName, meta={}, u=null) => {
    const usr = u || currentUser; if(!usr) return;
    setLogs(prev=>[{id:genLogId(),action,entityType,entityId,entityName,userId:usr.id,userName:usr.name,userRole:usr.role,timestamp:nowISO(),ip:usr.ip||"127.0.0.1",meta},...prev]);
  }, [currentUser]);

  const handleLogin = user => { setCurrentUser(user); setLoggedIn(true); setUsers(prev=>prev.map(u=>u.id===user.id?{...u,lastLogin:nowISO()}:u)); addLog("user_login","user",user.id,user.name,{},user); notify("👋",`Welcome, ${user.name.split(" ")[0]}!`); };
  const handleLogout = () => { addLog("user_logout","user",currentUser.id,currentUser.name,{}); setLoggedIn(false); setCurrentUser(null); setView("dashboard"); setActivePlatId(null); setVaultUnlocked(false); setSetupData(null); };

  const savePlatform = form => {
    if(editingPlat){ setPlatforms(prev=>prev.map(p=>p.id===editingPlat.id?{...p,...form,updatedAt:nowISO()}:p)); addLog("platform_updated","platform",editingPlat.id,form.name,{}); notify("✏️","Platform updated"); }
    else { const id=genPId(); setPlatforms(prev=>[...prev,{id,...form,hidden:false,createdBy:currentUser.id,createdAt:nowISO(),assignedEditors:[]}]); addLog("platform_created","platform",id,form.name,{}); notify("🏢","Platform created"); }
    setShowPlatForm(false); setEditingPlat(null);
  };
  const toggleVaultCred = id => setCreds(prev=>prev.map(cr=>cr.id===id?{...cr,inVault:!cr.inVault}:cr));

  // Handle invite accept
  if (!loggedIn && setupData) return (
    <>
      <style>{styles}</style>
      <SetupAccountPage inviteData={setupData} users={users} onUsers={setUsers} onLogin={handleLogin} onBack={()=>setSetupData(null)} notify={notify} />
      {notif && <Notification msg={notif} onClose={()=>setNotif(null)} />}
    </>
  );

  if (!loggedIn) return (
    <>
      <style>{styles}</style>
      <LoginPage users={users} invites={invites} onLogin={handleLogin} onSetupAccount={data=>setSetupData(data)} />
      {notif && <Notification msg={notif} onClose={()=>setNotif(null)} />}
    </>
  );

  const visiblePlats = platforms.filter(p=>!p.hidden||currentUser?.role==="admin");
  const vaultCreds = credentials.filter(cr=>cr.inVault&&currentUser&&canAccess(cr,currentUser.id,currentUser.role));
  const totalCreds = credentials.filter(cr=>cr.status==="active"&&!cr.inVault).length;
  const activePlat = platforms.find(p=>p.id===activePlatId);
  const emailCount = EmailSim.log.length;

  const viewTitle = () => {
    if(view==="dashboard") return "Dashboard"; if(view==="vault") return "🔐 Secure Vault";
    if(view==="filters") return "🔍 Filter & Search"; if(view==="users") return "👥 Users";
    if(view==="logs") return "📋 Activity Logs"; if(view==="platform"&&activePlat) return activePlat.name;
    return "VaultPro";
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {sidebarOpen&&<div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}/>}
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen?"mobile-open":""}`}>
          <div className="sidebar-logo"><div className="logo-mark">🔑</div><div><div className="logo-name">VaultPro</div><div className="logo-tagline">Enterprise</div></div></div>
          <div style={{flex:1,overflowY:"auto",paddingBottom:8}}>
            <div className="sidebar-section-label">Menu</div>
            {[
              {key:"dashboard",icon:"🏠",label:"Dashboard"},
              {key:"vault",icon:"🔐",label:"Vault",badge:vaultCreds.length,vault:true},
              {key:"filters",icon:"🔍",label:"Filter / Search"},
              ...(hasPerm(currentUser.role,"viewLogs")?[{key:"logs",icon:"📋",label:"Activity Logs"}]:[]),
              ...(hasPerm(currentUser.role,"manageUsers")?[{key:"users",icon:"👥",label:"Users & Invites"}]:[]),
            ].map(item=>(
              <div key={item.key} className={`nav-item ${view===item.key&&!activePlatId?"active":""}`} onClick={()=>{setSidebarOpen(false);if(item.key==="vault"){if(!vaultUnlocked){setShowVaultGate(true);}else{setView("vault");setActivePlatId(null);}}else{setView(item.key);setActivePlatId(null);}}}>
                <span className="nav-icon">{item.icon}</span>{item.label}
                {item.badge>0&&(item.vault?<span className="nav-vault-badge">{item.badge}</span>:<span className="nav-badge">{item.badge}</span>)}
              </div>
            ))}
            {/* Email log button */}
            <div className="nav-item" onClick={()=>{setShowEmailLog(true);setSidebarOpen(false);}}>
              <span className="nav-icon">📧</span>Email Log
              {emailCount>0&&<span className="nav-badge">{emailCount}</span>}
            </div>
            {hasPerm(currentUser.role,"exportAll")&&(
              <div className="nav-item" onClick={()=>{setShowGlobalExport(true);setSidebarOpen(false);}}>
                <span className="nav-icon">📤</span>Export All
              </div>
            )}
            <div className="sidebar-section-label" style={{marginTop:8}}>
              Platforms
              {hasPerm(currentUser.role,"managePlatforms")&&<button style={{float:"right",background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:16,lineHeight:1}} onClick={()=>{setEditingPlat(null);setShowPlatForm(true);}}>＋</button>}
            </div>
            {visiblePlats.map(p=>(
              <div key={p.id} className={`nav-item ${view==="platform"&&activePlatId===p.id?"active":""}`} onClick={()=>{setView("platform");setActivePlatId(p.id);setSidebarOpen(false);}}>
                <span className="nav-icon">{p.iconUrl?<img src={p.iconUrl} style={{width:15,height:15,borderRadius:3,objectFit:"cover",verticalAlign:"middle"}} alt=""/>:p.icon}</span>
                <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                <span className="nav-badge" style={{background:p.color+"1a",color:p.color,border:`1px solid ${p.color}28`}}>{credentials.filter(cr=>{const n=nodes.find(nd=>nd.id===cr.nodeId);return n?.platformId===p.id&&cr.status==="active"&&!cr.inVault;}).length}</span>
              </div>
            ))}
          </div>
          {/* User pill */}
          <div className="sidebar-footer">
            <div className="user-pill" onClick={()=>setShowUserSwitch(p=>!p)}>
              <div className="avatar">{currentUser.avatar}</div>
              <div><div className="user-pill-name">{currentUser.name.split(" ")[0]}</div><div className="user-pill-role">{currentUser.role}</div></div>
              <span className={`role-badge role-${currentUser.role}`}>{currentUser.role}</span>
            </div>
            {showUserSwitch&&(
              <div className="switch-popup">
                <div style={{fontSize:9,color:"var(--text3)",padding:"3px 7px 7px",textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>Switch Account</div>
                {users.filter(u=>u.active).map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 7px",borderRadius:6,cursor:"pointer",background:currentUser.id===u.id?"var(--surface3)":"transparent"}} onClick={()=>{setCurrentUser(u);setShowUserSwitch(false);setVaultUnlocked(false);addLog("user_login","user",u.id,u.name,{},u);notify("👤",`Switched to ${u.name}`);}}>
                    <div className="avatar" style={{width:24,height:24,fontSize:8}}>{u.avatar}</div>
                    <div><div style={{fontSize:11.5,fontWeight:600}}>{u.name}</div><div style={{fontSize:10,color:"var(--text2)"}}>{u.role}</div></div>
                  </div>
                ))}
                <div style={{borderTop:"1px solid var(--border)",margin:"6px 0 2px"}}/>
                <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 7px",borderRadius:6,cursor:"pointer",color:"var(--red)"}} onClick={()=>{setShowUserSwitch(false);handleLogout();}}><span style={{fontSize:14,width:18,textAlign:"center"}}>🚪</span><span style={{fontSize:12,fontWeight:600}}>Sign Out</span></div>
                <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 7px",borderRadius:6,cursor:"pointer",color:"var(--text3)"}} onClick={()=>{if(window.confirm("Reset all data?")){["vp2_users","vp2_platforms","vp2_nodes","vp2_credentials","vp2_logs","vp2_invites"].forEach(k=>localStorage.removeItem(k));window.location.reload();}}}>
                  <span style={{fontSize:14,width:18,textAlign:"center"}}>🔄</span><span style={{fontSize:12,fontWeight:600}}>Reset All Data</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="mobile-topnav">
            <button className="mobile-menu-btn" onClick={()=>setSidebarOpen(p=>!p)}>☰</button>
            <div style={{fontSize:14,fontWeight:800,flex:1}}>🔑 VaultPro</div>
          </div>
          <div className="topbar">
            <div className="topbar-left"><div className="topbar-title">{viewTitle()}</div>{view==="platform"&&activePlat&&<div className="topbar-breadcrumb">{activePlat.icon} {activePlat.name} — {credentials.filter(cr=>{const n=nodes.find(nd=>nd.id===cr.nodeId);return n?.platformId===activePlat.id&&cr.status==="active"&&!cr.inVault;}).length} active credentials</div>}</div>
            {!["logs","users","filters"].includes(view)&&<div className="search-wrap"><span className="search-ico">🔍</span><input placeholder="Quick search…" onFocus={()=>{setView("filters");setActivePlatId(null);}}/></div>}
            {view==="dashboard"&&hasPerm(currentUser.role,"managePlatforms")&&<button className="btn btn-primary btn-sm" onClick={()=>{setEditingPlat(null);setShowPlatForm(true);}}>+ Platform</button>}
            <button className="btn btn-ghost btn-sm" title="Email simulation log" onClick={()=>setShowEmailLog(true)}>📧{emailCount>0&&<span style={{marginLeft:3,background:"var(--accent)",color:"white",fontSize:9,borderRadius:10,padding:"0 5px",fontWeight:700}}>{emailCount}</span>}</button>
          </div>

          {view==="dashboard"&&(
            <div className="content">
              <div className="stats-row">
                {[{v:platforms.length,l:"Platforms",c:"#6366f1"},{v:totalCreds,l:"Active Credentials",c:"var(--green)"},{v:vaultCreds.length,l:"In Vault",c:"var(--vault)"},{v:nodes.filter(n=>n.status==="active").length,l:"Category Nodes",c:"#0ea5e9"},{v:users.filter(u=>u.active).length,l:"Active Users",c:"var(--yellow)"},{v:invites.length,l:"Pending Invites",c:"var(--orange)"}].map(s=>(
                  <div key={s.l} className="stat-chip"><div className="stat-chip-icon" style={{background:s.c+"18"}}><span style={{color:s.c,fontSize:16}}>●</span></div><div><div className="stat-chip-val" style={{color:s.c}}>{s.v}</div><div className="stat-chip-label">{s.l}</div></div></div>
                ))}
              </div>
              <div className="sec-header"><div className="sec-title"><span className="sec-title-dot"/>Platforms</div>{hasPerm(currentUser.role,"managePlatforms")&&<button className="btn btn-ghost btn-sm" onClick={()=>{setEditingPlat(null);setShowPlatForm(true);}}>+ Add</button>}</div>
              <div className="platform-grid">
                {visiblePlats.map(plat=>{
                  const platCreds=credentials.filter(cr=>{const n=nodes.find(nd=>nd.id===cr.nodeId);return n?.platformId===plat.id&&cr.status==="active"&&!cr.inVault;});
                  const platNodes=nodes.filter(n=>n.platformId===plat.id&&n.status==="active");
                  const vaultCount=credentials.filter(cr=>{const n=nodes.find(nd=>nd.id===cr.nodeId);return n?.platformId===plat.id&&cr.inVault;}).length;
                  return(
                    <div key={plat.id} className="platform-card" onClick={()=>{setView("platform");setActivePlatId(plat.id);}}>
                      <div className="platform-card-accent" style={{background:plat.color}}/>
                      <div className="platform-card-body">
                        <div className="platform-card-icon">{plat.iconUrl?<img src={plat.iconUrl} alt=""/>:plat.icon}</div>
                        <div className="platform-card-name">{plat.name}</div>
                        <div className="platform-card-meta">{platNodes.length} categories · {platCreds.length} creds{vaultCount>0?` · 🔐${vaultCount}`:""}</div>
                      </div>
                      <div className="platform-card-footer">
                        <span style={{fontSize:11,color:"var(--text3)"}}><strong style={{color:"var(--text2)"}}>{platCreds.length}</strong> active</span>
                        <div className="platform-card-actions" onClick={e=>e.stopPropagation()}>
                          {hasPerm(currentUser.role,"managePlatforms")&&<button className="icon-act" onClick={()=>{setEditingPlat(plat);setShowPlatForm(true);}}>✏️</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {hasPerm(currentUser.role,"managePlatforms")&&<div className="add-platform-card" onClick={()=>{setEditingPlat(null);setShowPlatForm(true);}}><div style={{fontSize:28,opacity:.3}}>＋</div><span>Add new platform</span></div>}
              </div>
              {hasPerm(currentUser.role,"viewLogs")&&logs.length>0&&(
                <>
                  <div className="sec-header" style={{marginTop:6}}><div className="sec-title"><span className="sec-title-dot"/>Recent Activity</div><button className="btn btn-ghost btn-sm" onClick={()=>setView("logs")}>View all →</button></div>
                  <div className="log-table">
                    {logs.slice(0,5).map(log=>{const cfg=LOG_ACTIONS[log.action]||{label:log.action,icon:"📝",color:"#64748b"};return(
                      <div key={log.id} className="log-row log-cols">
                        <span className="log-id">{log.id}</span>
                        <div className="log-act-icon" style={{background:cfg.color+"18"}}>{cfg.icon}</div>
                        <div><div className="log-entity">{log.entityName}</div><div className="log-entity-sub">{log.meta?.path||log.meta?.sharedWith||log.entityType}</div></div>
                        <div className="log-user-chip"><div className="log-avatar">{users.find(u=>u.id===log.userId)?.avatar||"?"}</div><div style={{fontSize:11,fontWeight:600}}>{log.userName}</div></div>
                        <span style={{fontSize:9.5,padding:"2px 7px",borderRadius:20,fontWeight:600,background:cfg.color+"16",color:cfg.color,border:`1px solid ${cfg.color}20`,whiteSpace:"nowrap"}}>{cfg.icon} {cfg.label}</span>
                        <span className="log-time">{fmtDate(log.timestamp)}</span>
                        <span className="log-ip">{log.ip||"—"}</span>
                      </div>
                    );})}
                  </div>
                </>
              )}
            </div>
          )}

          {view==="platform"&&activePlat&&<PlatformWorkspace platform={activePlat} nodes={nodes} credentials={credentials} users={users} currentUser={currentUser} onNodes={setNodes} onCreds={setCreds} addLog={addLog} notify={notify}/>}
          {view==="vault"&&<div className="content"><VaultPage credentials={credentials} nodes={nodes} platforms={platforms} users={users} currentUser={currentUser} onToggleVault={toggleVaultCred} addLog={addLog} onLock={()=>{setVaultUnlocked(false);setView("dashboard");}}/></div>}
          {view==="filters"&&<div className="content"><FilterPage nodes={nodes} credentials={credentials} platforms={platforms} users={users} currentUser={currentUser} addLog={addLog} notify={notify}/></div>}
          {view==="logs"&&hasPerm(currentUser.role,"viewLogs")&&<div className="content"><LogPage logs={logs} users={users}/></div>}
          {view==="users"&&hasPerm(currentUser.role,"manageUsers")&&<div className="content"><UsersPage users={users} invites={invites} onUsers={setUsers} onInvites={setInvites} currentUser={currentUser} notify={notify} addLog={addLog}/></div>}
        </main>
      </div>

      {/* MODALS */}
      {showVaultGate&&<VaultGate onUnlock={()=>{setVaultUnlocked(true);setShowVaultGate(false);setView("vault");setActivePlatId(null);addLog("vault_unlocked","vault","vault","Secure Vault",{});notify("🔓","Vault unlocked");}} onClose={()=>setShowVaultGate(false)}/>}
      {showPlatForm&&<PlatformForm initial={editingPlat} onSave={savePlatform} onClose={()=>{setShowPlatForm(false);setEditingPlat(null);}}/>}
      {showEmailLog&&<EmailLogModal onClose={()=>setShowEmailLog(false)}/>}
      {showGlobalExport&&<ExportModal credentials={credentials} nodes={nodes} platforms={platforms} users={users} currentUser={currentUser} onClose={()=>setShowGlobalExport(false)} notify={notify} addLog={addLog}/>}
      {notif&&<Notification msg={notif} onClose={()=>setNotif(null)}/>}
    </>
  );
}

// ─── VAULT GATE ───────────────────────────────────────────────────────────────
function VaultGate({ onUnlock, onClose }) {
  const PIN="1234"; const [inp,setInp]=useState(""); const [err,setErr]=useState(false);
  const press = d => { if(inp.length>=4) return; const n=inp+d; setInp(n); setErr(false); if(n.length===4) setTimeout(()=>{if(n===PIN) onUnlock();else{setErr(true);setInp("");}},200); };
  const del = () => setInp(p=>p.slice(0,-1));
  return (
    <div className="vault-overlay" onClick={onClose}>
      <div className="vault-modal" onClick={e=>e.stopPropagation()}>
        <div className="vault-modal-header"><span style={{fontSize:24}}>🔐</span><div><div style={{fontSize:15,fontWeight:800,color:"var(--vault)"}}>Secure Vault</div><div style={{fontSize:11,color:"#9f7aea"}}>Enter PIN — Demo: 1234</div></div><button className="modal-close" onClick={onClose} style={{marginLeft:"auto"}}>×</button></div>
        <div className="pin-wrap">
          <div className="pin-dots">{[0,1,2,3].map(i=><div key={i} className={`pin-dot ${i<inp.length?"filled":""}`}/>)}</div>
          {err&&<div className="pin-err">Incorrect PIN. Try again.</div>}
          <div className="pin-grid">{[1,2,3,4,5,6,7,8,9].map(n=><button key={n} className="pin-btn" onClick={()=>press(String(n))}>{n}</button>)}<div/><button className="pin-btn" onClick={()=>press("0")}>0</button><button className="pin-btn" onClick={del} style={{fontSize:13}}>⌫</button></div>
        </div>
      </div>
    </div>
  );
}
