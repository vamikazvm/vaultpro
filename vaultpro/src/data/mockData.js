export const MOCK_USERS = [
  { id: 1, name: "Alexandra Chen", email: "alex@corp.com", role: "Admin", avatar: "AC", status: "active", lastLogin: "2026-03-20 09:12" },
  { id: 2, name: "Marcus Webb", email: "marcus@corp.com", role: "Editor", avatar: "MW", status: "active", lastLogin: "2026-03-20 08:45" },
  { id: 3, name: "Priya Sharma", email: "priya@corp.com", role: "User", avatar: "PS", status: "active", lastLogin: "2026-03-19 17:30" },
  { id: 4, name: "Daniel Torres", email: "daniel@corp.com", role: "Editor", avatar: "DT", status: "inactive", lastLogin: "2026-03-15 11:00" },
];

export const MOCK_CATEGORIES = [
  { id: 1, name: "Websites", parent: null, icon: "🌐", createdBy: "Alexandra Chen", status: "active", children: [
    { id: 3, name: "Conceptual Orthopedics", parent: 1, icon: "🏥", createdBy: "Alexandra Chen", status: "active", children: [] },
    { id: 4, name: "E-Commerce", parent: 1, icon: "🛒", createdBy: "Marcus Webb", status: "active", children: [] },
  ]},
  { id: 2, name: "Social Media", parent: null, icon: "📱", createdBy: "Alexandra Chen", status: "active", children: [
    { id: 5, name: "Instagram", parent: 2, icon: "📸", createdBy: "Alexandra Chen", status: "active", children: [] },
    { id: 6, name: "LinkedIn", parent: 2, icon: "💼", createdBy: "Priya Sharma", status: "active", children: [] },
    { id: 7, name: "Twitter/X", parent: 2, icon: "🐦", createdBy: "Marcus Webb", status: "active", children: [] },
  ]},
  { id: 8, name: "Cloud Services", parent: null, icon: "☁️", createdBy: "Alexandra Chen", status: "active", children: [
    { id: 9, name: "AWS", parent: 8, icon: "🔶", createdBy: "Alexandra Chen", status: "active", children: [
      { id: 11, name: "Production", parent: 9, icon: "⚡", createdBy: "Alexandra Chen", status: "active", children: [] },
      { id: 12, name: "Staging", parent: 9, icon: "🧪", createdBy: "Marcus Webb", status: "active", children: [] },
    ]},
    { id: 10, name: "Azure", parent: 8, icon: "🔷", createdBy: "Marcus Webb", status: "active", children: [] },
  ]},
  { id: 13, name: "Internal Tools", parent: null, icon: "🔧", createdBy: "Alexandra Chen", status: "active", children: [] },
];

export const MOCK_CREDENTIALS = [
  { id: 1, platform: "Instagram Business", username: "corp_official", password: "••••••••••••", url: "https://instagram.com", category: "Social Media → Instagram", categoryId: 5, notes: "Main corporate account", createdBy: "Alexandra Chen", createdAt: "2026-01-15", updatedAt: "2026-03-10", isVault: false, status: "active" },
  { id: 2, platform: "AWS Console", username: "admin@corp.com", password: "••••••••••••", url: "https://console.aws.amazon.com", category: "Cloud → AWS → Production", categoryId: 11, notes: "Production environment admin", createdBy: "Alexandra Chen", createdAt: "2026-01-20", updatedAt: "2026-03-18", isVault: true, status: "active" },
  { id: 3, platform: "LinkedIn Company", username: "hr@corp.com", password: "••••••••••••", url: "https://linkedin.com", category: "Social Media → LinkedIn", categoryId: 6, notes: "", createdBy: "Priya Sharma", createdAt: "2026-02-01", updatedAt: "2026-02-28", isVault: false, status: "active" },
  { id: 4, platform: "Conceptual Orthopedics CMS", username: "webmaster@corp.com", password: "••••••••••••", url: "https://cms.conortho.com", category: "Websites → Conceptual Orthopedics", categoryId: 3, notes: "WordPress admin", createdBy: "Marcus Webb", createdAt: "2026-02-10", updatedAt: "2026-03-15", isVault: false, status: "active" },
  { id: 5, platform: "Azure DevOps", username: "devops@corp.com", password: "••••••••••••", url: "https://dev.azure.com", category: "Cloud → Azure", categoryId: 10, notes: "CI/CD pipeline access", createdBy: "Alexandra Chen", createdAt: "2026-03-01", updatedAt: "2026-03-19", isVault: true, status: "active" },
  { id: 6, platform: "Twitter/X Business", username: "@CorpOfficial", password: "••••••••••••", url: "https://twitter.com", category: "Social Media → Twitter/X", categoryId: 7, notes: "Scheduled post account", createdBy: "Marcus Webb", createdAt: "2026-03-05", updatedAt: "2026-03-17", isVault: false, status: "active" },
];

export const MOCK_LOGS = [
  { id: 1, user: "Alexandra Chen", action: "accessed", target: "AWS Console credential", type: "credential_access", timestamp: "2026-03-20 10:45 AM", ip: "192.168.1.42" },
  { id: 2, user: "Marcus Webb", action: "updated", target: "Instagram Business credential", type: "credential_update", timestamp: "2026-03-20 09:30 AM", ip: "192.168.1.55" },
  { id: 3, user: "Priya Sharma", action: "logged in", target: "System", type: "login", timestamp: "2026-03-19 05:30 PM", ip: "10.0.0.15" },
  { id: 4, user: "Alexandra Chen", action: "created category", target: "Staging (AWS)", type: "category_create", timestamp: "2026-03-19 03:15 PM", ip: "192.168.1.42" },
  { id: 5, user: "Marcus Webb", action: "accessed vault", target: "Azure DevOps credential", type: "vault_access", timestamp: "2026-03-19 02:00 PM", ip: "192.168.1.55" },
  { id: 6, user: "Daniel Torres", action: "created credential", target: "Twitter/X Business", type: "credential_create", timestamp: "2026-03-18 11:20 AM", ip: "10.0.0.22" },
  { id: 7, user: "Alexandra Chen", action: "logged in", target: "System", type: "login", timestamp: "2026-03-18 09:05 AM", ip: "192.168.1.42" },
  { id: 8, user: "Priya Sharma", action: "created credential", target: "LinkedIn Company", type: "credential_create", timestamp: "2026-03-17 04:40 PM", ip: "10.0.0.15" },
];

export const SECURITY_ALERTS = [
  { id: 1, severity: "high", message: "2 vault credentials accessed outside business hours", time: "3 hours ago" },
  { id: 2, severity: "medium", message: "Daniel Torres account inactive for 5 days", time: "1 day ago" },
  { id: 3, severity: "low", message: "AWS Production password not rotated in 60+ days", time: "2 days ago" },
];