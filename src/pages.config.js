import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductCreate from './pages/ProductCreate';
import ProductEdit from './pages/ProductEdit';
import ProductNew from './pages/ProductNew';
import Bundles from './pages/Bundles';
import BundleNew from './pages/BundleNew';
import BundleEdit from './pages/BundleEdit';
import PriceUpdates from './pages/PriceUpdates';
import Stock from './pages/Stock';
import Orders from './pages/Orders';
import Specials from './pages/Specials';
import OrderDetail from './pages/OrderDetail';
import Payments from './pages/Payments';
import Shipping from './pages/Shipping';
import Reviews from './pages/Reviews';
import Messages from './pages/Messages';
import Contacts from './pages/Contacts';
import Analytics from './pages/Analytics';
import SupabaseDebug from './pages/SupabaseDebug';
import MessageDetail from './pages/MessageDetail';
import MessageIntake from './pages/MessageIntake';
import ReviewDetail from './pages/ReviewDetail';
import ReviewIntake from './pages/ReviewIntake';
import DebugData from './pages/DebugData';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Products": Products,
    "ProductCreate": ProductCreate,
    "ProductEdit": ProductEdit,
    "ProductNew": ProductNew,
    "Bundles": Bundles,
    "BundleNew": BundleNew,
    "BundleEdit": BundleEdit,
    "PriceUpdates": PriceUpdates,
    "Stock": Stock,
    "Orders": Orders,
    "Specials": Specials,
    "OrderDetail": OrderDetail,
    "Payments": Payments,
    "Shipping": Shipping,
    "Reviews": Reviews,
    "Messages": Messages,
    "Contacts": Contacts,
    "Analytics": Analytics,
    "SupabaseDebug": SupabaseDebug,
    "MessageDetail": MessageDetail,
    "MessageIntake": MessageIntake,
    "ReviewDetail": ReviewDetail,
    "ReviewIntake": ReviewIntake,
    "DebugData": DebugData,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};
