import { useState, createContext, useContext, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "../services/api";
const Toast = createContext();
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  function notify(text, type = "success") {
    const id = crypto.randomUUID();
    setItems((x) => [...x, { id, text, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 5000);
  }
  return (
    <Toast.Provider value={notify}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((i) => (
          <div className={`toast ${i.type}`} key={i.id}>
            {i.type === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>{i.text}</span>
          </div>
        ))}
      </div>
    </Toast.Provider>
  );
}
export const useNotify = () => useContext(Toast);
export function useData(url, enabled = true) {
  return useQuery({
    queryKey: [url],
    queryFn: () => api(url),
    enabled,
    staleTime: 10000,
    retry: 1,
    refetchInterval: url.startsWith("/queue") ? 10000 : false,
  });
}
export function useAction() {
  const qc = useQueryClient(),
    notify = useNotify(),
    { t } = useTranslation();
  return useMutation({
    mutationFn: ({ url, method = "POST", body }) => api(url, { method, body }),
    onSuccess: () => {
      qc.invalidateQueries();
      notify(t("Saved successfully"));
    },
    onError: (e) => notify(e.message, "error"),
  });
}
export function Button({
  children,
  variant = "primary",
  busy = false,
  ...rest
}) {
  const { t } = useTranslation();
  return (
    <button
      className={`btn ${variant}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy && <Loader2 size={16} className="spin" />}
      {typeof children === "string" ? t(children) : children}
    </button>
  );
}
export function Badge({ children }) {
  const { t } = useTranslation();
  return (
    <span
      className={`badge ${String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {typeof children === "string" ? t(children) : children}
    </span>
  );
}
export function Field({ label, error, children, ...props }) {
  const { t } = useTranslation();
  return (
    <label className={`field ${props.className || ""}`}>
      <span>
        {t(label)}
        {props.required && " *"}
      </span>
      {children || <input {...props} className="input" />}
      {error && <small className="error">{error}</small>}
    </label>
  );
}
export function Select({ label, children, ...props }) {
  return (
    <Field label={label}>
      <select className="input" {...props}>
        {children}
      </select>
    </Field>
  );
}
export function Textarea({ label, ...props }) {
  return (
    <Field label={label}>
      <textarea className="input" rows="3" {...props} />
    </Field>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = ref.current.querySelectorAll(
          'button,input,select,textarea,a,[tabindex="0"]',
        );
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        tabIndex="-1"
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Empty({ title, description, action }) {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <span>
        <Inbox size={32} />
      </span>
      <h3>{title || t("No records yet")}</h3>
      <p>{description || t("Start by adding your first record.")}</p>
      {action}
    </div>
  );
}
export function State({ query, children }) {
  const { t } = useTranslation();
  if (query.isLoading)
    return (
      <div className="loading">
        <Loader2 className="spin" />
        {t("Loading…")}
      </div>
    );
  if (query.error)
    return (
      <div className="error-panel">
        <AlertCircle />
        <p>{query.error.message}</p>
        <Button onClick={() => query.refetch()}>Retry</Button>
      </div>
    );
  return children;
}
export function PageHead({ eyebrow, title, description, children }) {
  const { t } = useTranslation();
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{t(title || "")}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="head-actions">{children}</div>
    </div>
  );
}
export function Table({ columns, rows, onRow }) {
  const { t } = useTranslation();
  if (!rows?.length) return <Empty />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{t(c.title)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r._id || i}
              onClick={onRow ? () => onRow(r) : undefined}
              className={onRow ? "clickable" : ""}
            >
              {columns.map((c) => (
                <td key={c.key} data-label={t(c.title)}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pager({ data, page, setPage }) {
  const { t } = useTranslation();
  if (!data) return null;
  return (
    <div className="pager">
      <span>
        {data.total} records · {page} /{" "}
        {Math.max(1, Math.ceil(data.total / data.limit))}
      </span>
      <div>
        <Button
          variant="ghost"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
          {t("Previous")}
        </Button>
        <Button
          variant="ghost"
          disabled={page * data.limit >= data.total}
          onClick={() => setPage(page + 1)}
        >
          {t("Next")}
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function Confirm({
  title,
  onClose,
  onConfirm,
  reasonRequired = true,
  busy,
}) {
  const [reason, setReason] = useState("");
  const { t } = useTranslation();
  return (
    <Modal title={title || t("Confirm action")} onClose={onClose}>
      <p className="muted">
        This action will be recorded in the audit history.
      </p>
      {reasonRequired && (
        <Textarea
          label={t("Reason")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <div className="form-actions">
        <Button variant="ghost" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          busy={busy}
          disabled={reasonRequired && reason.trim().length < 5}
          onClick={() => onConfirm(reason)}
        >
          {t("Continue")}
        </Button>
      </div>
    </Modal>
  );
}
export const money = (n) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format((n || 0) / 100);
export const dateTime = (d, tz = "Asia/Karachi") =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(d))
    : "—";
export const today = (tz = "Asia/Karachi") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const minor = (s) => Math.round(Number(s || 0) * 100);
export function useDebounce(value, delay = 250) {
  const [v, set] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => set(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return v;
}
