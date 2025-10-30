import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ToastProvider } from "./components/ui/ToastProvider";
import {
  LayoutDashboard, // Replaced Home
  Package,
  Layers,
  Sparkles, // Added
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Archive, // Replaced Warehouse
  Truck,
  MessageSquare,
  Star,
  Users,
  Mail,
  Megaphone, // Kept for Campaigns
  Percent, // Kept for Discounts
  Tag,
  BarChart3,
  Settings,
  UserCog, // Added
  Receipt, // Added
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Bell, // Added
  Search, // Added
  User // Added
} from "lucide-react";

// NOTE: Data API is initialized once in App.jsx. Avoid initializing here to prevent duplicate clients.

const navigationGroups = [
  {
    title: "Merchandising",
    items: [
      { name: "Products", url: "Products", icon: Package },
      { name: "Bundles", url: "Bundles", icon: Layers },
      { name: "Specials", url: "Specials", icon: Tag },
      { name: "Price Updates", url: "PriceUpdates", icon: TrendingUp }
    ]
  },
  {
    title: "Sales & Inventory",
    items: [
      { name: "Orders", url: "Orders", icon: ShoppingCart },
      { name: "Payments", url: "Payments", icon: CreditCard },
      { name: "Stock", url: "Stock", icon: Archive } // Changed from Warehouse to Archive
    ]
  },
  {
    title: "Engage & Marketing",
    items: [
      { name: "Reviews", url: "Reviews", icon: Star },
      { name: "Messages", url: "Messages", icon: MessageSquare },
      { name: "Contacts", url: "Contacts", icon: Users },
      { name: "Campaigns", url: "Campaigns", icon: Megaphone },
      { name: "Discounts", url: "Discounts", icon: Percent }
    ]
  },
  {
    title: "Analytics",
    items: [
      { name: "Analytics", url: "Analytics", icon: BarChart3 }
    ]
  },
  {
    title: "Settings",
    items: [
      { name: "General", url: "GeneralSettings", icon: Settings },
      { name: "Users", url: "UserSettings", icon: Users },
      { name: "Shipping", url: "ShippingSettings", icon: Truck }
    ]
  }
];

function NavGroup({ group, currentPath, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasActive = group.items.some(item => currentPath.includes(item.url.toLowerCase()));

  return (
    <div className="nav-group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="nav-group-header"
      >
        {!isCollapsed && (
          <>
            <span>{group.title}</span>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </>
        )}
      </button>
      {isOpen && (
        <div className="nav-items">
          {group.items.map(item => (
            <Link
              key={item.url}
              to={createPageUrl(item.url)}
              className={`nav-item ${currentPath.includes(item.url.toLowerCase()) ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const buildId = (import.meta.env?.VITE_BUILD_ID || import.meta.env?.VITE_COMMIT || new Date().toISOString());

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log('[Layout] mounted with theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ToastProvider>
      <style>{`
        :root {
          --bg: #e0e0e0;
          --card: #e0e0e0;
          --text: #333333;
          --text-muted: #666666;
          --border: #d1d1d1;
          --accent: #6EC1FF;
          --accent-2: #FF77E9;
          --shadow-light: rgba(255, 255, 255, 0.7);
          --shadow-dark: rgba(0, 0, 0, 0.15);
        }

        [data-theme="dark"] {
          --bg: #2a2a2a;
          --card: #2a2a2a;
          --text: #e0e0e0;
          --text-muted: #999999;
          --border: #3a3a3a;
          --shadow-light: rgba(255, 255, 255, 0.05);
          --shadow-dark: rgba(0, 0, 0, 0.3);
        }

        * {
          transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }

        body {
          background: var(--bg);
          color: var(--text);
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
        }

        .sidebar {
          width: ${sidebarCollapsed ? '80px' : '240px'};
          background: var(--bg);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 100;
          transition: width 0.3s ease;
        }

        .sidebar-header {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 12px;
        }

        .nav-group {
          margin-bottom: 24px;
        }

        .nav-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: none;
          border: none;
          width: 100%;
          cursor: pointer;
          transition: color 0.2s;
        }

        .nav-group-header:hover {
          color: var(--text);
        }

        .nav-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: var(--text);
          text-decoration: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          background: var(--bg);
          box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light);
          transition: all 0.3s ease;
        }

        .nav-item:hover {
          box-shadow: inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light);
        }

        .nav-item.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          box-shadow: 3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: white;
          border-radius: 0 3px 3px 0;
        }

        .main-content {
          flex: 1;
          margin-left: ${sidebarCollapsed ? '80px' : '240px'};
          transition: margin-left 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          height: 72px;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          box-shadow: 3px 3px 8px var(--shadow-dark), -3px -3px 8px var(--shadow-light);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 9999px;
          background: #dc2626;
          color: #ffffff;
          font-weight: 800;
          letter-spacing: 0.06em;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.2);
          animation: pulse 1.6s infinite;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #ffffff;
        }

        @keyframes pulse {
          0% { transform: translateZ(0) scale(1); filter: brightness(1); }
          50% { transform: translateZ(0) scale(1.03); filter: brightness(1.2); }
          100% { transform: translateZ(0) scale(1); filter: brightness(1); }
        }

        .menu-button {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--bg);
          border: none;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .menu-button:active {
          box-shadow: inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light);
        }

        .breadcrumb {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .version-badge {
          font-size: 11px;
          color: var(--text-muted);
          border: 1px solid var(--border);
          padding: 4px 8px;
          border-radius: 8px;
        }

        .theme-toggle {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--bg);
          border: none;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .theme-toggle:active {
          box-shadow: inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light);
        }

        .content-area {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(${mobileOpen ? '0' : '-100%'});
            width: 240px;
          }
          
          .main-content {
            margin-left: 0;
          }

          .topbar {
            padding: 0 16px;
          }

          .content-area {
            padding: 16px;
          }
        }

        .mobile-overlay {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-overlay {
            display: ${mobileOpen ? 'block' : 'none'};
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 90;
          }
        }
      `}</style>

      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">
                <Package className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && <span>ShopAdmin</span>}
            </div>
          </div>
          
          <div className="sidebar-content">
            {navigationGroups.map(group => (
              <NavGroup
                key={group.title}
                group={group}
                currentPath={location.pathname}
                isCollapsed={sidebarCollapsed}
              />
            ))}
          </div>
        </aside>

        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />

        <div className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <button className="menu-button md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
                <Menu className="w-5 h-5" />
              </button>
              <button className="menu-button hidden md:flex" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
              <h1 className="breadcrumb">
                {currentPageName || (location.pathname === '/' ? 'Dashboard' : location.pathname.split('/').pop() || 'Dashboard')}
              </h1>
              <span className="live-badge" title="This is the LIVE build">
                <span className="live-dot" /> LIVE
              </span>
            </div>
            
            <div className="topbar-actions">
              <div className="version-badge">Build: {buildId}</div>
              <button className="theme-toggle" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>

          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
