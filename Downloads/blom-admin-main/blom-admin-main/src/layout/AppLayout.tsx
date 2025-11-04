import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';

/**
 * Theme Guard - Sets dark theme by default
 */
export function ThemeGuard() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.getAttribute('data-theme')) {
      html.setAttribute('data-theme', 'dark');
    }
  }, []);
  return null;
}

/**
 * App Layout - Fixed sidebar, topbar, content area
 * Provides consistent structure for all admin pages
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <ThemeGuard />
      
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        backgroundColor: 'var(--card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
            BLOM Admin
          </h2>
        </div>
        <nav style={{ padding: '1rem', flex: 1 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
              Products
            </div>
            <Link
              to="/products"
              style={{
                display: 'block',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                color: location.pathname === '/products' ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                backgroundColor: location.pathname === '/products' ? 'var(--hover-bg)' : 'transparent',
              }}
            >
              Products
            </Link>
            <Link
              to="/products/new"
              style={{
                display: 'block',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                color: location.pathname === '/products/new' ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                backgroundColor: location.pathname === '/products/new' ? 'var(--hover-bg)' : 'transparent',
              }}
            >
              New Product
            </Link>
            <Link
              to="/bulk-price-updates"
              style={{
                display: 'block',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                color: location.pathname === '/bulk-price-updates' ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                backgroundColor: location.pathname === '/bulk-price-updates' ? 'var(--hover-bg)' : 'transparent',
              }}
            >
              Bulk Price Updates
            </Link>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
              Orders
            </div>
            <Link
              to="/orders"
              style={{
                display: 'block',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                color: location.pathname.startsWith('/orders') ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                backgroundColor: location.pathname.startsWith('/orders') ? 'var(--hover-bg)' : 'transparent',
              }}
            >
              Orders
            </Link>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
              Marketing
            </div>
            <Link
              to="/coupons"
              style={{
                display: 'block',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                color: location.pathname === '/coupons' ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                backgroundColor: location.pathname === '/coupons' ? 'var(--hover-bg)' : 'transparent',
              }}
            >
              Coupons
            </Link>
            <Link
              to="/discounts"
              style={{
                display: 'block',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                color: location.pathname === '/discounts' ? 'var(--accent)' : 'var(--text)',
                textDecoration: 'none',
                backgroundColor: location.pathname === '/discounts' ? 'var(--hover-bg)' : 'transparent',
              }}
            >
              Discounts
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: '64px',
          backgroundColor: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
        }}>
          <div style={{ flex: 1 }}>
            {/* Breadcrumb or page title can go here */}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

