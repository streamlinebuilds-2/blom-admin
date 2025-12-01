
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ToastProvider } from "./components/ui/ToastProvider";
import {
  LayoutDashboard, // Replaced Home
  Package,
  Layers,
  Sparkles, // Added
  ShoppingCart,
  CreditCard,
  Archive, // Replaced Warehouse
  Truck,
  MessageSquare,
  Star,
  Users,
  DollarSign,
  Mail,
  Tag,
  BarChart3,
  Settings,
  UserCog, // Added
  Receipt, // Added
  ChevronDown,
  ChevronRight,
  X,
  Sun,
  Moon,
  Bell, // Added
  Search, // Added
  User, // Added
  Menu // Added for mobile hamburger menu
} from "lucide-react";



const navigationGroups = [
  {
    title: "Merchandising",
    items: [
      { name: "Products", url: "Products", icon: Package },
      { name: "Bundles", url: "Bundles", icon: Layers },
      { name: "Featured", url: "featured", icon: Sparkles },
      { name: "Specials", url: "Specials", icon: Tag }
    ]
  },
  {
    title: "Sales & Inventory",
    items: [
      { name: "Orders", url: "Orders", icon: ShoppingCart },
      { name: "Sales", url: "Payments", icon: CreditCard },
      { name: "Stock", url: "Stock", icon: Archive } // Changed from Warehouse to Archive
    ]
  },
  {
    title: "Engage & Marketing",
    items: [
      { name: "Reviews", url: "Reviews", icon: Star },
      { name: "Messages", url: "Messages", icon: MessageSquare },
      { name: "Contacts", url: "Contacts", icon: Users }
    ]
  },
  {
    title: "Analytics",
    items: [
      { name: "Analytics", url: "Analytics", icon: BarChart3 }
    ]
  }
];

function NavGroup({ group, currentPath, isCollapsed, onNavClick }) {
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
              to={item.url === "Orders" ? "/orders" : item.url === "featured" ? "/featured" : createPageUrl(item.url)}
              className={`nav-item ${currentPath.includes(item.url.toLowerCase()) ? 'active' : ''}`}
              onClick={onNavClick}
            >
              <item.icon className={isCollapsed ? "w-6 h-6" : "w-5 h-5"} />
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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
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
          transition: width 0.3s ease, transform 0.3s ease;
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
          justify-content: ${sidebarCollapsed ? 'center' : 'flex-start'};
          gap: 12px;
          padding: ${sidebarCollapsed ? '16px' : '12px 16px'};
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

        .menu-button {
          min-width: 44px;
          min-height: 44px;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: var(--bg);
          border: none;
          color: var(--text);
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          flex-shrink: 0;
        }

        .menu-button:active {
          box-shadow: inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light);
        }

        .menu-button.mobile-menu {
          display: none;
        }

        .menu-button.desktop-menu {
          display: flex;
        }

        @media (max-width: 768px) {
          .menu-button.mobile-menu {
            display: flex;
          }

          .menu-button.desktop-menu {
            display: none;
          }
        }

        .breadcrumb {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .theme-toggle {
          min-width: 44px;
          min-height: 44px;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: var(--bg);
          border: none;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          flex-shrink: 0;
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
            width: 280px;
            z-index: 150;
            box-shadow: ${mobileOpen ? '8px 0 24px rgba(0, 0, 0, 0.3)' : 'none'};
          }

          .main-content {
            margin-left: 0;
          }

          .topbar {
            padding: 0 12px;
            height: 64px;
          }

          .topbar-left {
            gap: 8px;
            flex: 1;
            min-width: 0;
          }

          .breadcrumb {
            font-size: 18px;
          }

          .content-area {
            padding: 16px;
          }

          .nav-item {
            min-height: 48px;
            padding: 12px 16px;
          }

          .nav-group-header {
            min-height: 44px;
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
            background: rgba(0, 0, 0, 0.6);
            z-index: 140;
            backdrop-filter: blur(2px);
            pointer-events: ${mobileOpen ? 'auto' : 'none'};
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
                onNavClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        </aside>

        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />

        <div className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              {/* Mobile menu button - VISIBLE on mobile, HIDDEN on desktop */}
              <button className="menu-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Desktop collapse button - HIDDEN on mobile, VISIBLE on desktop */}
              <button className="menu-button desktop-menu" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>

              <h1 className="breadcrumb">
                {currentPageName || (location.pathname === '/' ? 'Dashboard' : location.pathname.split('/').pop() || 'Dashboard')}
                {(currentPageName === 'Dashboard' || location.pathname === '/') && (
                  <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                    Test Push
                  </span>
                )}
              </h1>
            </div>

            <div className="topbar-actions">
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
