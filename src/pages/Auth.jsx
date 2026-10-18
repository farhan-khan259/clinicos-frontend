import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HeartPulse,
  ShieldCheck,
  CalendarCheck,
  ClipboardPlus,
} from "lucide-react";
import { Logo } from "../layouts/Layout";
import { useAuth } from "../contexts/Auth";
import { Button, Field, useNotify } from "../components/ui";
export function Login() {
  const { login } = useAuth(),
    { t, i18n } = useTranslation(),
    notify = useNotify();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <div className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">BUILT AROUND BETTER CARE</span>
          <h1>
            Less admin.
            <br />
            More time for
            <br />
            <em>your patients.</em>
          </h1>
          <p>
            One thoughtful workspace for appointments, patient records and
            everyday clinic operations.
          </p>
          <div className="auth-feature">
            <CalendarCheck />
            <span>From the first appointment to the next follow-up.</span>
          </div>
          <div className="auth-feature">
            <ShieldCheck />
            <span>
              Secure access, organized records, clear responsibilities.
            </span>
          </div>
        </div>
        <small>AHMED SOLUTIONS · CLINIC MANAGEMENT</small>
      </div>
      <div className="auth-form">
        <select
          className="language"
          value={i18n.language}
          onChange={(e) => {
            i18n.changeLanguage(e.target.value);
            localStorage.setItem("clinicLanguage", e.target.value);
          }}
        >
          <option value="en">English</option>
          <option value="ur">اردو</option>
          <option value="roman">Roman Urdu</option>
        </select>
        <form onSubmit={submit} dir={i18n.language === "ur" ? "rtl" : "ltr"}>
          <div className="auth-mark">
            <HeartPulse size={32} />
          </div>
          <h2>{t("Welcome back")}</h2>
          <p>
            Sign in with the account issued by your clinic or Ahmed Solutions.
          </p>
          <Field
            required
            label={t("Email")}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            required
            label={t("Password")}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button busy={busy}>{t("Sign in")} →</Button>
          <small className="muted">
            Need access? Contact your clinic administrator.
          </small>
        </form>
        <small className="auth-copyright">Clinic OS by Ahmed Solutions</small>
      </div>
    </div>
  );
}
export function PasswordPage() {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth(),
    { t } = useTranslation(),
    notify = useNotify();
  const [current, setCurrent] = useState(""),
    [pass, setPass] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await changePassword(current, pass);
      notify("Password changed");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="password-screen">
      <form className="card" onSubmit={submit}>
        <Logo />
        <h2>{t("Change password")}</h2>
        <p>
          {user.mustChangePassword
            ? "Set a personal password before using the clinic workspace."
            : "Update your account password."}
        </p>
        <Field
          label={t("Current password")}
          required
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Field
          label={t("New password")}
          required
          minLength="12"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <small>Use at least 12 characters.</small>
        {!user.mustChangePassword && (
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Back to workspace
          </Button>
        )}
        <Button busy={busy}>{t("Save")}</Button>
      </form>
    </div>
  );
}
