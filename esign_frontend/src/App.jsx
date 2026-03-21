import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { publicRouter, privateRouter, orgRouter } from './routers'
import ProtectedRoute from './routers/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './components/Layout/MainLayout';
import OrgMainLayout from './components/Organization/OrgMainLayout';

function App() {
  const mainRoutes = privateRouter.filter(r => !r.path.includes('document-editor'));
  const editorRoutes = privateRouter.filter(r => r.path.includes('document-editor'));

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          {publicRouter.map((route, index) => {
            const Page = route.component;
            return <Route key={index} path={route.path} element={<Page />} />;
          })}

          <Route element={<ProtectedRoute />}>
            {/* Personal workspace — MainLayout (sidebar + header hiện tại) */}
            <Route element={<MainLayout><Outlet /></MainLayout>}>
              {mainRoutes.map((route, index) => {
                const Page = route.component;
                return <Route key={index} path={route.path} element={<Page />} />;
              })}
            </Route>

            {/* Document Editor — full page, không layout */}
            {editorRoutes.map((route, index) => {
              const Page = route.component;
              return <Route key={`editor-${index}`} path={route.path} element={<Page />} />;
            })}

            {/* Organization — OrgMainLayout */}
            <Route element={<OrgMainLayout />}>
              {orgRouter.map((route, index) => {
                const Page = route.component;
                return <Route key={`org-${index}`} path={route.path} element={<Page />} />;
              })}
            </Route>
          </Route>
        </Routes>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
