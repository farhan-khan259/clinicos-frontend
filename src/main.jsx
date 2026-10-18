import React, { Component, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/600.css";
import "./locales";
import "./styles/app.css";
import { AuthProvider, useAuth, allowed } from "./contexts/Auth";
import { ToastProvider, Button } from "./components/ui";
import Layout from "./layouts/Layout";
import { Login, PasswordPage } from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients, { PatientProfile } from "./pages/Patients";
import Appointments, { Queue, Doctors } from "./pages/Appointments";
import ClinicalList, { Encounter } from "./pages/Clinical";
import Billing, { InvoiceDetail } from "./pages/Billing";
import Expenses from "./pages/Expenses";
import Reports, { ReportDetail } from "./pages/Reports";
import Settings, { UserManagement, AuditLog } from "./pages/Settings";
import Admin from "./pages/Admin";
import PrintPage from "./pages/Print";
const qc = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, retry: 1 } },
});
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <div className="error-panel">
          <h2>The screen could not be loaded.</h2>
          <p>Refresh the page to continue.</p>
          <button className="btn primary" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    return this.props.children;
  }
}
function Guard({ page, children }) {
  const { user } = useAuth();
  return allowed(user, page) ? (
    children
  ) : (
    <div className="error-panel">
      <h2>Access restricted</h2>
      <p>Your role does not have permission for this module.</p>
    </div>
  );
}
function App() {
  const { user, loading } = useAuth(),
    { i18n } = useTranslation(),
    location = useLocation();
  useEffect(() => {
    document.documentElement.lang = i18n.language === "ur" ? "ur" : "en";
    document.documentElement.dir = i18n.language === "ur" ? "rtl" : "ltr";
  }, [i18n.language]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  if (loading) return <div className="boot">Loading Clinic OS…</div>;
  if (!user) return <Login />;
  if (user.mustChangePassword) return <PasswordPage />;
  if (user.role === "superadmin")
    return location.pathname === "/password" ? <PasswordPage /> : <Admin />;
  return (
    <Routes>
      <Route path="/print/:type/:id" element={<PrintPage />} />
      <Route path="/password" element={<PasswordPage />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="patients"
          element={
            <Guard page="patients">
              <Patients />
            </Guard>
          }
        />
        <Route
          path="patients/:id"
          element={
            <Guard page="patients">
              <PatientProfile />
            </Guard>
          }
        />
        <Route
          path="appointments"
          element={
            <Guard page="appointments">
              <Appointments />
            </Guard>
          }
        />
        <Route
          path="queue"
          element={
            <Guard page="queue">
              <Queue />
            </Guard>
          }
        />
        <Route
          path="doctors"
          element={
            <Guard page="doctors">
              <Doctors />
            </Guard>
          }
        />
        <Route
          path="consultations"
          element={
            <Guard page="consultations">
              <ClinicalList />
            </Guard>
          }
        />
        <Route
          path="consultations/:id"
          element={
            <Guard page="consultations">
              <Encounter />
            </Guard>
          }
        />
        <Route
          path="prescriptions"
          element={
            <Guard page="prescriptions">
              <ClinicalList prescriptions />
            </Guard>
          }
        />
        <Route
          path="billing"
          element={
            <Guard page="billing">
              <Billing />
            </Guard>
          }
        />
        <Route
          path="billing/:id"
          element={
            <Guard page="billing">
              <InvoiceDetail />
            </Guard>
          }
        />
        <Route
          path="expenses"
          element={
            <Guard page="expenses">
              <Expenses />
            </Guard>
          }
        />
        <Route
          path="reports"
          element={
            <Guard page="reports">
              <Reports />
            </Guard>
          }
        />
        <Route
          path="reports/:slug"
          element={
            <Guard page="reports">
              <ReportDetail />
            </Guard>
          }
        />
        <Route
          path="settings"
          element={
            <Guard page="settings">
              <Settings />
            </Guard>
          }
        />
        <Route
          path="users"
          element={
            <Guard page="users">
              <UserManagement />
            </Guard>
          }
        />
        <Route
          path="audit"
          element={
            <Guard page="audit">
              <AuditLog />
            </Guard>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
