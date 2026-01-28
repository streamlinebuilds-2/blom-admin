import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { setAPI } from '@/components/data/api'
import { createSupabaseAdapter } from '@/components/data/supabaseAdapter'
import { createMockAdapter } from '@/components/data/mockAdapter'
import React from 'react';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo || null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#f5f5f5', border: '1px solid #ccc', margin: '20px' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// All pages now from src/pages/ (consolidated from admin/pages)
import ProductsPage from '@/pages/Products'
import ProductEdit from '@/pages/ProductEdit'
import ProductNew from '@/pages/ProductNew'
import BundlesPage from '@/pages/Bundles'
import BundleEdit from '@/pages/BundleEdit'
import BundleNew from '@/pages/BundleNew'
import Reviews from '@/pages/Reviews'
import ContactsPage from '@/pages/Contacts'
import ContactDetail from '@/pages/ContactDetail'
import Messages from '@/pages/Messages'
import MessageDetail from '@/pages/MessageDetail'
import Stock from '@/pages/Stock'
import Finance from '@/pages/Finance'
import Orders from '@/pages/Orders'
import OrderDetail from '@/pages/OrderDetail'
import PriceUpdates from '@/pages/PriceUpdates'
import Specials from '@/pages/Specials'
import Featured from '@/pages/Featured'

// Initialize Supabase adapter for real database access, with fallback to mock
function initializeAdapter() {
  try {
    console.log('🔄 Attempting to initialize Supabase adapter...')
    console.log('📦 Calling createSupabaseAdapter()...')
    const supabaseAdapter = createSupabaseAdapter()
    console.log('📦 Supabase adapter object:', typeof supabaseAdapter, Object.keys(supabaseAdapter || {}))
    console.log('📦 Supabase adapter has listProducts:', typeof supabaseAdapter?.listProducts === 'function')
    if (supabaseAdapter?.listProducts) {
      console.log('📦 Testing supabaseAdapter.listProducts()...')
      supabaseAdapter.listProducts().catch(e => console.log('⚠️ Supabase listProducts failed:', e.message))
    }
    setAPI(supabaseAdapter)
    console.log('✅ Supabase adapter initialized successfully')
  } catch (error) {
    console.warn('⚠️ Supabase adapter failed, falling back to mock adapter:', error.message, error.stack)
    try {
      console.log('🔄 Initializing mock adapter as fallback...')
      const mockAdapter = createMockAdapter()
      console.log('🎭 Mock adapter created:', typeof mockAdapter, Object.keys(mockAdapter || {}))
      console.log('🎭 Mock adapter has listProducts:', typeof mockAdapter?.listProducts === 'function')
      if (mockAdapter?.listProducts) {
        console.log('🎭 Testing mockAdapter.listProducts()...')
        mockAdapter.listProducts().then(testProducts => {
          console.log('🎭 Mock products count:', testProducts?.length || 0)
        }).catch(e => console.log('⚠️ Mock listProducts failed:', e.message))
      }
      setAPI(mockAdapter)
      console.log('✅ Mock adapter initialized as fallback')
    } catch (mockError) {
      console.error('❌ Failed to initialize both Supabase and mock adapters:', mockError)
      // Keep previous API if both fail
    }
  }
}

// Initialize the adapter
initializeAdapter()

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  console.log('AuthenticatedApp: Rendering');
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  console.log('AuthenticatedApp: Auth state:', { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated });

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    console.log('AuthenticatedApp: Showing loading spinner');
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    console.log('AuthenticatedApp: Auth error:', authError);
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  console.log('AuthenticatedApp: Rendering main app');
  // Render the main app
  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<MainPage />} />
        <Route path="/dashboard" element={<MainPage />} />

        {/* Legacy redirects - MUST come before canonical routes */}
        <Route path="/productnew" element={<Navigate to="/products/new" replace />} />
        <Route path="/admin/productnew" element={<Navigate to="/products/new" replace />} />
        <Route path="/bundle-new" element={<Navigate to="/bundles/new" replace />} />
        <Route path="/special-new" element={<Navigate to="/specials/new" replace />} />
        <Route path="/orders-list" element={<Navigate to="/orders" replace />} />
        {/* Redirect legacy /admin/* routes individually */}

        {/* Products - Canonical Routes */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductNew />} />
        <Route path="/products/:id" element={<ProductEdit />} />

        {/* Bundles - Canonical Routes */}
        <Route path="/bundles" element={<BundlesPage />} />
        <Route path="/bundles/new" element={<BundleNew />} />
        <Route path="/bundles/:id" element={<BundleEdit />} />

        {/* Specials - Canonical Routes */}
        <Route path="/specials" element={<Specials />} />
        <Route path="/specials/new" element={<Specials />} />
        <Route path="/specials/:id" element={<Specials />} />

        {/* Featured - Canonical Routes */}
        <Route path="/featured" element={<Featured />} />

        {/* Orders - Canonical Routes */}
        <Route path="/orders" element={<Orders/>} />
        <Route path="/orders/:id" element={<OrderDetail/>} />
        <Route path="/course-bookings" element={<CourseBookings/>} />

        {/* Reviews - Canonical Routes */}
        <Route path="/reviews" element={<Reviews/>} />
        <Route path="/reviews/:id" element={<Reviews/>} />

        {/* Messages - Canonical Routes */}
        <Route path="/messages" element={<Messages/>} />
        <Route path="/messages/:id" element={<MessageDetail/>} />

        {/* Finance - Canonical Routes */}
        <Route path="/finance" element={<Finance/>} />
        <Route path="/finance/daily" element={<Finance/>} />

        {/* Settings - Canonical Routes (stub) */}
        <Route path="/settings" element={<div className="p-6"><h1>Settings</h1><p>Settings page coming soon</p></div>} />
        <Route path="/settings/users" element={<div className="p-6"><h1>Settings - Users</h1><p>User management coming soon</p></div>} />
        <Route path="/settings/shipping" element={<div className="p-6"><h1>Settings - Shipping</h1><p>Shipping settings coming soon</p></div>} />

        {/* Additional pages */}
        <Route path="/price-updates" element={<PriceUpdates/>} />

        {/* Dynamic pages from pagesConfig - AFTER explicit routes */}
        {Object.entries(Pages).map(([path, Page]) => {
          // Skip conflicts
          const skip = ['orders', 'products', 'bundles', 'specials', 'reviews', 'messages', 'finance', 'settings', 'dashboard', 'featured'];
          if (skip.includes(path.toLowerCase())) return null;
          return <Route key={path} path={`/${path}`} element={<Page />} />;
        })}

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {
  console.log('App: Rendering');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
