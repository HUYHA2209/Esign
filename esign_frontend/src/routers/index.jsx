import Login from "../pages/Login/index";
import Home from "../pages/Home/index";
import Register from "../pages/Register/index";
import ForgotPassword from '../pages/ForgotPassword';
import InvitationLink from "../pages/InvitationLink/index";
import Dashboard from "../pages/Dashboad";
import Settings from "../pages/Settings";
import Profile from "../pages/Profile";
import Signature from "../pages/Signature";
import Documents from "../pages/Documents";
import DocumentEditor from "../pages/DocumentEditor";
import OrgDocumentEditor from "../pages/Organization/OrgDocumentEditor";
import OrganizationOverview from "../pages/Organization/OrganizationOverview";
import OrganizationSettings from "../pages/Organization/OrganizationSettings";
import OrganizationMembers from "../pages/Organization/OrganizationMembers";
import OrganizationSignature from "../pages/Organization/OrganizationSignature";
import ReceivedDocuments from "../pages/ReceivedDocuments";
import SigningSuccess from "../pages/SigningSuccess";
import AuditTrailPage from "../pages/AuditTrail";

const publicRouter = [
    { path: '/login', component: Login },
    { path: '/', component: Home },
    { path: '/register', component: Register },
    { path: '/forgot-password', component: ForgotPassword },
];

const privateRouter = [
    { path: '/dashboard', component: Dashboard },
    { path: '/profile', component: Profile },
    { path: '/signature', component: Signature },
    { path: '/documents', component: Documents },
    { path: '/settings', component: Settings },
    { path: '/documents/document-editor/:id', component: DocumentEditor },
    { path: '/documents/document-editor', component: DocumentEditor },
    { path: '/documents/document-sign/:id', component: ReceivedDocuments },
    { path: '/documents/document-sign-success/:id', component: SigningSuccess },
    { path: '/documents/:documentId/audit-trail', component: AuditTrailPage },
    { path: '/invitations', component: InvitationLink },
];

const orgRouter = [
    { path: '/o/:orgUrl/work-space', component: Dashboard },
    { path: '/o/:orgUrl/dashboard', component: OrganizationOverview },
    { path: '/o/:orgUrl/documents', component: Documents },
    { path: '/o/:orgUrl/documents/document-editor/:id', component: OrgDocumentEditor },
    { path: '/o/:orgUrl/documents/document-editor', component: OrgDocumentEditor },
    { path: '/o/:orgUrl/documents/document-sign/:id', component: ReceivedDocuments },
    { path: '/o/:orgUrl/documents/document-sign-success/:id', component: SigningSuccess },
    { path: '/o/:orgUrl/documents/:documentId/audit-trail', component: AuditTrailPage },
    { path: '/o/:orgUrl/profile', component: Profile },
    { path: '/o/:orgUrl/settings', component: OrganizationSettings },
    { path: '/o/:orgUrl/members', component: OrganizationMembers },
    { path: '/o/:orgUrl/signature', component: OrganizationSignature },
];

export { publicRouter, privateRouter, orgRouter };