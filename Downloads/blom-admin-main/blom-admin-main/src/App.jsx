import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useSearchParams } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { setAPI } from '@/components/data/api'
import { createSupabaseAdapter } from '@/components/data/supabaseAdapter'
import AppLayout from '@/layout/AppLayout'

// Admin pages
import ProductsPage from '@/admin/pages/Products'
import ProductEdit from '@/admin/pages/ProductEdit'
import BundlesPage from '@/admin/pages/Bundles'
import BundleEdit from '@/admin/pages/BundleEdit'
import Reviews from '@/admin/pages/Reviews'
import ContactsPage from '@/admin/pages/Contacts'
import ContactDetail from '@/admin/pages/ContactDetail'
import Stock from '@/admin/pages/Stock'
import Finance from '@/admin/pages/Finance'
import Orders from '@/admin/pages/Orders'
import OrderDetail from '@/admin/pages/OrderDetail'
import CouponsPage from '@/admin/pages/Coupons'

// Fallback to existing pages for price updates and discounts
import PriceUpdates from '@/pages/PriceUpdates'
import Discounts from '@/pages/Discounts'

// Initialize Supabase adapter for real database access
try {
  setAPI(createSupabaseAdapter())
} catch (error) {
  console.error('Failed to initialize Supabase adapter:', error)
  // Keep previous API if initialization fails
}

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => {
  // Use AppLayout for admin routes, fallback to pagesConfig Layout for others
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/products') ||
    window.location.pathname.startsWith('/bundles') ||
    window.location.pathname.startsWith('/orders') ||
    window.location.pathname.startsWith('/bulk-price-updates');
  
  if (isAdminRoute) {
    return <AppLayout>{children}</AppLayout>;
  }
  
  return Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;
};

// Wrapper for ProductEdit to handle ?id= query param
function ProductEditWithQuery() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  return <ProductEdit key={id} />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<MainPage />} />
        <Route path="/dashboard" element={<MainPage />} />

        {/* Legacy redirects - MUST come before canonical routes */}
        <Route path="/productnew" element={<Navigate to="/products/new" replace />} />
        <Route path="/productsnew" element={<Navigate to="/products/new" replace />} />
        <Route path="/admin/productnew" element={<Navigate to="/products/new" replace />} />
        <Route path="/bundle-new" element={<Navigate to="/bundles/new" replace />} />
        <Route path="/special-new" element={<Navigate to="/specials/new" replace />} />
        <Route path="/orders-list" element={<Navigate to="/orders" replace />} />
        {/* Redirect legacy /admin/* routes individually */}
        <Route path="/admin/products" element={<Navigate to="/products" replace />} />
        <Route path="/admin/products/*" element={<Navigate to="/products/:splat" replace />} />

        {/* Products - Canonical Routes */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductEdit />} />
        <Route path="/products/edit" element={<ProductEditWithQuery />} />
        <Route path="/products/:id" element={<ProductEdit />} />
        <Route path="/bulk-price-updates" element={<PriceUpdates />} />

        {/* Bundles - Canonical Routes */}
        <Route path="/bundles" element={<BundlesPage />} />
        <Route path="/bundles/new" element={<BundleEdit />} />
        <Route path="/bundles/:id" element={<BundleEdit />} />

        {/* Specials - Canonical Routes (using Discounts for now) */}
        <Route path="/specials" element={<Discounts />} />
        <Route path="/specials/new" element={<Discounts />} />
        <Route path="/specials/:id" element={<Discounts />} />

        {/* Orders - Canonical Routes */}
        <Route path="/orders" element={<Orders/>} />
        <Route path="/orders/:id" element={<OrderDetail/>} />

        {/* Reviews - Canonical Routes */}
        <Route path="/reviews" element={<Reviews/>} />
        <Route path="/reviews/:id" element={<Reviews/>} />

        {/* Messages - Canonical Routes */}
        <Route path="/messages" element={<ContactsPage/>} />
        <Route path="/messages/:id" element={<ContactDetail/>} />

        {/* Finance - Canonical Routes */}
        <Route path="/finance" element={<Finance/>} />
        <Route path="/finance/daily" element={<Finance/>} />

        {/* Settings - Canonical Routes (stub) */}
        <Route path="/settings" element={<div className="p-6"><h1>Settings</h1><p>Settings page coming soon</p></div>} />
        <Route path="/settings/users" element={<div className="p-6"><h1>Settings - Users</h1><p>User management coming soon</p></div>} />
        <Route path="/settings/shipping" element={<div className="p-6"><h1>Settings - Shipping</h1><p>Shipping settings coming soon</p></div>} />

        {/* Additional pages */}
        <Route path="/price-updates" element={<PriceUpdates/>} />
        <Route path="/discounts" element={<Discounts/>} />
        <Route path="/coupons" element={<CouponsPage/>} />

        {/* Dynamic pages from pagesConfig - AFTER explicit routes */}
        {Object.entries(Pages).map(([path, Page]) => {
          // Skip conflicts
          const skip = ['orders', 'products', 'bundles', 'specials', 'reviews', 'messages', 'finance', 'settings', 'dashboard'];
          if (skip.includes(path.toLowerCase())) return null;
          return <Route key={path} path={`/${path}`} element={<Page />} />;
        })}

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {

  return (
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
  )
}

export default App
