import { useState } from "react";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import Credentials from "./pages/Credentials";
import Vault from "./pages/Vault";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import Activity from "./pages/Activity";
import Architecture from "./pages/Architecture";

import CategoryTree from "./components/categories/CategoryTree";

import AddCredentialModal from "./components/modals/AddCredentialModal";
import AddCategoryModal from "./components/modals/AddCategoryModal";

import { MOCK_USERS, MOCK_CATEGORIES, MOCK_LOGS } from "./data/mockData";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [activeCategory, setActiveCategory] = useState(null);

  const [showAddCred, setShowAddCred] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);

  const currentUser = MOCK_USERS[0];

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "credentials":
        return (
          <Credentials
            activeCategory={activeCategory}
            categories={MOCK_CATEGORIES}
          />
        );

      case "vault":
        return <Vault />;

      case "users":
        return <Users users={MOCK_USERS} />;

      case "categories":
        return (
          <Categories
            categories={MOCK_CATEGORIES}
            onAddCategory={() => setShowAddCat(true)}
          />
        );

      case "activity":
        return <Activity logs={MOCK_LOGS} />;

      case "architecture":
        return <Architecture />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🔐</div>

          <div>
            <div className="logo-text">VaultPro</div>
            <div className="logo-sub">Enterprise Password Manager</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-label">Overview</div>

          <div
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </div>

          <div
            className={`nav-item ${
              activePage === "credentials" ? "active" : ""
            }`}
            onClick={() => setActivePage("credentials")}
          >
            <span className="nav-icon">🔑</span>
            Credentials
          </div>

          <div
            className={`nav-item ${activePage === "vault" ? "active" : ""}`}
            onClick={() => setActivePage("vault")}
          >
            <span className="nav-icon">🛡️</span>
            Vault
          </div>

          <div className="divider" />

          <div className="nav-section-label">Management</div>

          <div
            className={`nav-item ${activePage === "users" ? "active" : ""}`}
            onClick={() => setActivePage("users")}
          >
            <span className="nav-icon">👥</span>
            Users
          </div>

          <div
            className={`nav-item ${
              activePage === "categories" ? "active" : ""
            }`}
            onClick={() => setActivePage("categories")}
          >
            <span className="nav-icon">📁</span>
            Categories
          </div>

          <div
            className={`nav-item ${activePage === "activity" ? "active" : ""}`}
            onClick={() => setActivePage("activity")}
          >
            <span className="nav-icon">📜</span>
            Activity Logs
          </div>

          <div
            className={`nav-item ${
              activePage === "architecture" ? "active" : ""
            }`}
            onClick={() => setActivePage("architecture")}
          >
            <span className="nav-icon">🏗️</span>
            Architecture
          </div>

          <div className="divider" />

          <div className="nav-section-label">Categories</div>

          <CategoryTree
            categories={MOCK_CATEGORIES}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {currentUser.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)}
          </div>

          <div className="user-info">
            <div className="user-name">{currentUser.name}</div>
            <div className="user-role">{currentUser.role}</div>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="main">
        <div className="topbar">
          <div className="page-title">
            {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
          </div>

          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search credentials..." />
          </div>

          <button
            className="topbar-btn ghost"
            onClick={() => setShowAddCat(true)}
          >
            + Category
          </button>

          <button
            className="topbar-btn primary"
            onClick={() => setShowAddCred(true)}
          >
            + Credential
          </button>
        </div>

        <div className="content">{renderPage()}</div>
      </main>

      {/* MODALS */}
      {showAddCred && (
        <AddCredentialModal onClose={() => setShowAddCred(false)} />
      )}

      {showAddCat && <AddCategoryModal onClose={() => setShowAddCat(false)} />}
    </div>
  );
}
