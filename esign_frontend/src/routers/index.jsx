import Login from "../pages/Login/index";
import Home from "../pages/Home/index";
import Register from "../pages/Register/index";
import ForgotPassword from '../pages/ForgotPassword';
import Dashboard from "../pages/Dashboad";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import Signature from "../pages/Signature";
import Documents from "../pages/Documents";
import DocumentEditor from "../pages/DocumentEditor";
import OrganizationOverview from "../pages/Organization/OrganizationOverview";
import OrganizationSettings from "../pages/Organization/OrganizationSettings";

const publicRouter = [
    { path: '/login', component: Login },
    { path: '/', component: Home },
    { path: '/register', component: Register },
    { path: '/forgot-password', component: ForgotPassword },
    { path: '/document-editor', component: DocumentEditor },
    { path: '/document-editor/:id', component: DocumentEditor },
];

const privateRouter = [
    { path: '/dashboard', component: Dashboard },
    { path: '/profile', component: Profile },
    { path: '/signature', component: Signature },
    { path: '/documents', component: Documents },
    { path: '/settings', component: Settings },

];

const orgRouter = [
    { path: '/o/:orgUrl/work-space', component: Dashboard },
    { path: '/o/:orgUrl/dashboard', component: OrganizationOverview },
    { path: '/o/:orgUrl/settings', component: OrganizationSettings },
];

export { publicRouter, privateRouter, orgRouter };