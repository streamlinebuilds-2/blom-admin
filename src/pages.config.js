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
import Campaigns from './pages/Campaigns';
import Discounts from './pages/Discounts';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import SupabaseDebug from './pages/SupabaseDebug';
import GeneralSettings from './pages/GeneralSettings';
import BrandingSettings from './pages/BrandingSettings';
import UserSettings from './pages/UserSettings';
import IntegrationsSettings from './pages/IntegrationsSettings';
import NotificationsSettings from './pages/NotificationsSettings';
import MessageDetail from './pages/MessageDetail';
import MessageIntake from './pages/MessageIntake';
import ReviewDetail from './pages/ReviewDetail';
import ReviewIntake from './pages/ReviewIntake';
import ShippingSettings from './pages/ShippingSettings';
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
    "Campaigns": Campaigns,
    "Discounts": Discounts,
    "Analytics": Analytics,
    "Settings": Settings,
    "SupabaseDebug": SupabaseDebug,
    "GeneralSettings": GeneralSettings,
    "BrandingSettings": BrandingSettings,
    "UserSettings": UserSettings,
    "IntegrationsSettings": IntegrationsSettings,
    "NotificationsSettings": NotificationsSettings,
    "MessageDetail": MessageDetail,
    "MessageIntake": MessageIntake,
    "ReviewDetail": ReviewDetail,
    "ReviewIntake": ReviewIntake,
    "ShippingSettings": ShippingSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};