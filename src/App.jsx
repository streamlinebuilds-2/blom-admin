import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}

        {/* Admin Routes */}
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/products/new" element={<ProductEdit />} />
        <Route path="/admin/products/:id" element={<ProductEdit />} />

        <Route path="/admin/bundles" element={<BundlesPage />} />
        <Route path="/admin/bundles/new" element={<BundleEdit />} />
        <Route path="/admin/bundles/:id" element={<BundleEdit />} />

        <Route path="/admin/reviews" element={<Reviews/>} />

        <Route path="/admin/contacts" element={<ContactsPage/>} />
        <Route path="/admin/contacts/:id" element={<ContactDetail/>} />

        <Route path="/admin/stock" element={<Stock/>} />
        <Route path="/admin/finance" element={<Finance/>} />
        <Route path="/finance" element={<Finance/>} />

        {/* Orders routes - moved from /admin/orders to /orders */}
        <Route path="/orders" element={<Orders/>} />
        <Route path="/orders/:id" element={<OrderDetail/>} />
        
        {/* Keep /admin/orders for backwards compatibility */}
        <Route path="/admin/orders" element={<Orders/>} />
        <Route path="/admin/orders/:id" element={<OrderDetail/>} />

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
