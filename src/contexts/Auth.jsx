import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, refreshSession } from "../services/api";
import { useQueryClient } from "@tanstack/react-query";
const C = createContext();
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  useEffect(() => {
    refreshSession()
      .then((d) => {
        setToken(d.accessToken);
        setSession(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const expired = () => {
      setToken("");
      qc.clear();
      setSession(null);
    };
    window.addEventListener("clinic:sessionExpired", expired);
    return () => window.removeEventListener("clinic:sessionExpired", expired);
  }, [qc]);
  async function login(email, password) {
    const d = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(d.accessToken);
    qc.clear();
    setSession(d);
    return d;
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setToken("");
      qc.clear();
      setSession(null);
    }
  }
  async function changePassword(currentPassword, password) {
    const d = await api("/auth/password", {
      method: "POST",
      body: { currentPassword, password },
    });
    setToken(d.accessToken);
    setSession(d);
  }
  function updateClinic(clinic) {
    setSession((s) => ({ ...s, clinic }));
  }
  return (
    <C.Provider
      value={{
        ...session,
        loading,
        login,
        logout,
        changePassword,
        updateClinic,
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useAuth = () => useContext(C);
const access = {
  owner: [
    "patients",
    "appointments",
    "queue",
    "doctors",
    "billing",
    "expenses",
    "reports",
    "settings",
    "users",
    "audit",
  ],
  manager: ["patients", "appointments", "queue", "doctors", "reports", "users"],
  doctor: [
    "patients",
    "appointments",
    "queue",
    "doctors",
    "consultations",
    "prescriptions",
    "reports",
  ],
  receptionist: ["patients", "appointments", "queue", "doctors", "billing"],
  accountant: ["patients", "doctors", "billing", "expenses", "reports"],
};
export function allowed(user, page) {
  if (page === "dashboard") return true;
  if (["consultations", "prescriptions"].includes(page) && user?.clinicalAccess)
    return true;
  const featurePermission = {
    patients: "patients:read",
    appointments: "appointments:read",
    queue: "appointments:read",
    doctors: "doctors:read",
    billing: "billing:read",
    expenses: "finance:read",
    reports: "reports:read",
    settings: "settings:write",
    users: "users:write",
    audit: "audit:read",
  };
  return (
    access[user?.role]?.includes(page) ||
    (user?.permissions || []).includes(featurePermission[page]) ||
    false
  );
}
export function isClinical(user) {
  return user?.role === "doctor" || user?.clinicalAccess;
}
