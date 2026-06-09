import { Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { publicRouter, privateRouter, orgRouter } from './routers'
import ProtectedRoute from './routers/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './components/Layout/MainLayout';
import OrgMainLayout from './components/Organization/OrgMainLayout';
import { AnimatePresence } from 'framer-motion';

function App() {
  const location = useLocation();
  const mainRoutes = privateRouter.filter(r => !r.path.includes('documents/document-editor') && !r.path.includes('documents/document-sign') && !r.path.includes('invitations') && !r.path.includes('audit-trail'));
  const editorRoutes = privateRouter.filter(r => r.path.includes('documents/document-editor'));
  const signRoutes = privateRouter.filter(r => r.path.includes('documents/document-sign'));
  const invitationRoutes = privateRouter.filter(r => r.path.includes('invitations'));
  const auditTrailRoutes = privateRouter.filter(r => r.path.includes('audit-trail'));

  const orgMainRoutes = orgRouter.filter(r => !r.path.includes('documents/document-editor') && !r.path.includes('documents/document-sign') && !r.path.includes('audit-trail'));
  const orgEditorRoutes = orgRouter.filter(r => r.path.includes('documents/document-editor'));
  const orgSignRoutes = orgRouter.filter(r => r.path.includes('documents/document-sign'));
  const orgAuditTrailRoutes = orgRouter.filter(r => r.path.includes('audit-trail'));

  return (
    <div className="App">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          {publicRouter.map((route, index) => {
            const Page = route.component;
            return <Route key={index} path={route.path} element={<Page />} />;
          })}

          <Route element={<ProtectedRoute />}>
            {/* Personal workspace — MainLayout */}
            <Route element={<MainLayout><Outlet /></MainLayout>}>
              {mainRoutes.map((route, index) => {
                const Page = route.component;
                return <Route key={index} path={route.path} element={<Page />} />;
              })}
            </Route>

            {/* Document Editor */}
            {editorRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`editor-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Document Sign */}
            {signRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`sign-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Invitations */}
            {invitationRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`invite-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Audit Trail (Standalone) */}
            {auditTrailRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`audit-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Organization — OrgMainLayout */}
            <Route element={<OrgMainLayout />}>
              {orgMainRoutes.map((route, index) => {
                const Page = route.component;
                return <Route key={`org-${index}`} path={route.path} element={<Page />} />;
              })}
            </Route>

            {/* Org Document Editor */}
            {orgEditorRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`org-editor-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Org Document Sign & Success */}
            {orgSignRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`org-sign-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Org Audit Trail (Standalone) */}
            {orgAuditTrailRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`org-audit-${index}`} path={route.path} element={<Page />} />;
            })}
          </Route>
        </Routes>
      </AnimatePresence>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
