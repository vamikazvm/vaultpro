import { useState } from "react";

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

import {
  MOCK_USERS,
  MOCK_CATEGORIES,
  MOCK_LOGS
} from "./data/mockData";

export default function App() {

  const [activePage, setActivePage] = useState("dashboard");

  const [activeCategory, setActiveCategory] = useState(null);

  const [showAddCred, setShowAddCred] = useState(false);

  const [showAddCat, setShowAddCat] = useState(false);

  const currentUser = MOCK_USERS[0];

 
   return (
  <>
    <h1 style={{ color: "white" }}>APP IS RUNNING</h1>

    {activePage === "dashboard" && <Dashboard />}
  </>
);
}