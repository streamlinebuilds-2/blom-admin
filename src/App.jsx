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

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

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
        <Route path="/" element={<MainPage />} />
        
        {/* Root routes for key pages */}
        <Route path="/orders" element={<Orders/>} />
        <Route path="/orders/:id" element={<OrderDetail/>} />
        <Route path="/finance" element={<Finance/>} />
        <Route path="/price-updates" element={<PriceUpdates/>} />
        <Route path="/discounts" element={<Discounts/>} />
        <Route path="/coupons" element={<CouponsPage/>} />

        {/* Redirect legacy /productnew to new editor - MUST come before /products routes */}
        <Route path="/productnew" element={<Navigate to="/products/new" replace />} />
        <Route path="/admin/productnew" element={<Navigate to="/products/new" replace />} />

        {/* Root routes for Products/Bundles editors */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductEdit />} />
        <Route path="/products/:id" element={<ProductEdit />} />
        <Route path="/bundles" element={<BundlesPage />} />
        <Route path="/bundles/new" element={<BundleEdit />} />
        <Route path="/bundles/:id" element={<BundleEdit />} />
        
        {/* Redirect legacy /admin/* routes to root equivalents */}
        <Route path="/admin/orders" element={<Navigate to="/orders" replace />} />
        <Route path="/admin/orders/:id" element={<Navigate to="/orders/:id" replace />} />
        <Route path="/admin/finance" element={<Navigate to="/finance" replace />} />
        <Route path="/admin/products" element={<Navigate to="/products" replace />} />
        <Route path="/admin/products/:id" element={<Navigate to="/products" replace />} />
        <Route path="/admin/bundles" element={<Navigate to="/bundles" replace />} />
        <Route path="/admin/bundles/:id" element={<Navigate to="/bundles" replace />} />
        <Route path="/admin/reviews" element={<Navigate to="/reviews" replace />} />
        <Route path="/admin/contacts" element={<Navigate to="/contacts" replace />} />
        <Route path="/admin/contacts/:id" element={<Navigate to="/contacts" replace />} />
        <Route path="/admin/stock" element={<Navigate to="/stock" replace />} />
        <Route path="/admin/price-updates" element={<Navigate to="/price-updates" replace />} />
        <Route path="/admin/discounts" element={<Navigate to="/discounts" replace />} />
        <Route path="/admin/coupons" element={<Navigate to="/coupons" replace />} />

        {/* Dynamic pages from pagesConfig - AFTER explicit routes */}
        {Object.entries(Pages).map(([path, Page]) => {
          // Skip "Orders" if it exists in pagesConfig to avoid conflict
          if (path.toLowerCase() === 'orders') return null;
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
