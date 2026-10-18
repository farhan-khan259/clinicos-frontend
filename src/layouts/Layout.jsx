import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ListOrdered,
  Stethoscope,
  ClipboardList,
  Pill,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  LogOut,
  Menu,
  Search,
  Bell,
  PanelLeftClose,
  ChevronDown,
  HeartPulse,
  Plus,
  X,
} from "lucide-react";
import { useAuth, allowed } from "../contexts/Auth";
import { useData, useDebounce, Button } from "../components/ui";
export const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["patients", "Patients", Users],
  ["appointments", "Appointments", CalendarDays],
  ["queue", "Live queue", ListOrdered],
  ["doctors", "Doctors", Stethoscope],
  ["consultations", "Consultations", ClipboardList],
  ["prescriptions", "Prescriptions", Pill],
  ["billing", "Billing", Receipt],
  ["expenses", "Expenses", Wallet],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
  ["users", "Users", ShieldCheck],
  ["audit", "Audit log", History],
];
export function Logo({ small = false }) {
  return (
    <div className="brand">
      <span className="brand-icon">
        <HeartPulse size={26} />
      </span>
      {!small && (
        <div>
          <strong>
            Clinic<span>OS</span>
          </strong>
          <small>AHMED SOLUTIONS</small>
        </div>
      )}
    </div>
  );
}
export default function Layout() {
  const { t, i18n } = useTranslation(),
    { user, clinic, logout } = useAuth(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [search, setSearch] = useState(""),
    [notifications, setNotifications] = useState(false),
    dq = useDebounce(search);
  const results = useData(
    `/patients?q=${encodeURIComponent(dq)}&limit=6`,
    dq.length >= 2 && allowed(user, "patients"),
  );
  const waiting = useData("/queue", allowed(user, "queue"));
  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("clinicLanguage", lang);
  };
  return (
    <div
      className={`app ${collapsed ? "collapsed" : ""}`}
      dir={i18n.language === "ur" ? "rtl" : "ltr"}
    >
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo small={collapsed} />
          <button
            className="icon-btn mobile-only"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        {!collapsed && (
          <div className="workspace">
            <span>{clinic?.name?.slice(0, 1)}</span>
            <div>
              <strong>{clinic?.name}</strong>
              <small>{t("Clinic workspace")}</small>
            </div>
          </div>
        )}
        <div className="nav-label">{!collapsed && t("Operations")}</div>
        <nav>
          {nav
            .filter((n) => allowed(user, n[0]))
            .map(([path, label, Icon]) => (
              <NavLink
                to={`/${path}`}
                key={path}
                title={t(label)}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {!collapsed && <span>{t(label)}</span>}
                {path === "queue" && !collapsed && waiting.data?.length > 0 && (
                  <b>{waiting.data.length}</b>
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="help-card">
              <ShieldCheck size={22} />
              <strong>Secure clinic workspace</strong>
              <small>
                {user.role === "doctor"
                  ? "Your patients. Your workflow."
                  : "Manage everyday care with clarity."}
              </small>
            </div>
          )}
          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={19} />
            {!collapsed && t("Sign out")}
          </button>
          <button
            className="collapse-btn"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={17} />
            {!collapsed && "Collapse menu"}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-btn mobile-only"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="global-search">
            <Search size={18} />
            <input
              aria-label={t("Search patients")}
              placeholder={`${t("Search patients")}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>MRN</kbd>
            {dq.length >= 2 && (
              <div className="global-results">
                {results.data?.items.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => {
                      navigate(`/patients/${p._id}`);
                      setSearch("");
                    }}
                  >
                    <strong>{p.name}</strong>
                    <small>
                      {p.mrn} · {p.mobile}
                    </small>
                  </button>
                ))}
                {!results.data?.items?.length && <p>No matching patients</p>}
              </div>
            )}
          </div>
          <div className="top-actions">
            <select
              aria-label="Language"
              className="language"
              value={i18n.language}
              onChange={(e) => changeLang(e.target.value)}
            >
              <option value="en">EN · English</option>
              <option value="ur">اردو</option>
              <option value="roman">Roman Urdu</option>
            </select>
            {allowed(user, "queue") && (
              <div className="notification">
                <button
                  className="icon-btn"
                  aria-label="Notifications"
                  onClick={() => setNotifications(!notifications)}
                >
                  <Bell size={20} />
                  {waiting.data?.length > 0 && <i />}
                </button>
                {notifications && (
                  <div className="notification-panel">
                    <h3>Clinic activity</h3>
                    <p>
                      {waiting.data?.length || 0} patients in the active queue.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigate("/queue");
                        setNotifications(false);
                      }}
                    >
                      Open waiting queue
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="user-chip">
              <span>{user.name[0]}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </div>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
        <footer className="app-footer">
          © {new Date().getFullYear()} Ahmed Solutions{" "}
          <span>Clinic OS · Care, organized.</span>
        </footer>
      </div>
    </div>
  );
}
