import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  Plus,
  Activity,
} from "lucide-react";
import { useAuth, allowed } from "../contexts/Auth";
import {
  Button,
  PageHead,
  State,
  Table,
  Badge,
  money,
  useData,
  today,
  dateTime,
} from "../components/ui";
import { PatientForm, AppointmentForm } from "../components/forms";
export function DateFilter({ from, to, setFrom, setTo }) {
  const { t } = useTranslation(),
    { clinic } = useAuth();
  const [preset, setPreset] = useState("Today");
  function choose(v) {
    setPreset(v);
    let a = new Date(`${today(clinic.timezone)}T12:00:00Z`),
      b = new Date(a);
    if (v === "Yesterday") {
      a.setUTCDate(a.getUTCDate() - 1);
      b = new Date(a);
    }
    if (v === "This week")
      a.setUTCDate(a.getUTCDate() - ((a.getUTCDay() + 6) % 7));
    if (v === "This month") a.setUTCDate(1);
    if (v === "Last month") {
      a.setUTCDate(1);
      a.setUTCMonth(a.getUTCMonth() - 1);
      b = new Date(a);
      b.setUTCMonth(b.getUTCMonth() + 1);
      b.setUTCDate(0);
    }
    if (v !== "Custom range") {
      setFrom(a.toISOString().slice(0, 10));
      setTo(b.toISOString().slice(0, 10));
    }
  }
  return (
    <div className="date-filter">
      <select
        aria-label="Date range"
        value={preset}
        onChange={(e) => choose(e.target.value)}
      >
        {[
          "Today",
          "Yesterday",
          "This week",
          "This month",
          "Last month",
          "Custom range",
        ].map((x) => (
          <option key={x} value={x}>
            {t(x)}
          </option>
        ))}
      </select>
      <input
        aria-label="From date"
        type="date"
        value={from}
        onChange={(e) => {
          setPreset("Custom range");
          setFrom(e.target.value);
        }}
      />
      <span>—</span>
      <input
        aria-label="To date"
        type="date"
        value={to}
        onChange={(e) => {
          setPreset("Custom range");
          setTo(e.target.value);
        }}
      />
    </div>
  );
}
export default function Dashboard() {
  const { t } = useTranslation(),
    { user, clinic } = useAuth(),
    navigate = useNavigate(),
    [from, setFrom] = useState(today(clinic.timezone)),
    [to, setTo] = useState(from),
    [form, setForm] = useState("");
  const query = useData(`/dashboard?from=${from}&to=${to}`);
  const data = query.data;
  const monetary = [
    "Revenue",
    "Received",
    "Pending",
    "Expenses",
    "NetOperatingResult",
  ];
  const icons = {
    Appointments: CalendarDays,
    RegisteredPatients: Users,
    NewPatients: Users,
    Waiting: Clock,
    Completed: CheckCircle2,
  };
  const labels = {
    Appointments: "AppointmentsMetric",
    Waiting: "WaitingMetric",
    Completed: "CompletedMetric",
    Expenses: "ExpensesMetric",
  };
  return (
    <>
      <PageHead
        eyebrow={t("Daily overview")}
        title={`${t("Welcome back")}, ${user.name.split(" ")[0]}.`}
        description={t("Your clinic, at a glance.")}
      >
        <DateFilter {...{ from, to, setFrom, setTo }} />
        {allowed(user, "patients") &&
          ["owner", "manager", "receptionist"].includes(user.role) && (
            <Button onClick={() => setForm("patient")}>
              <Plus size={17} />
              {t("Register patient")}
            </Button>
          )}
      </PageHead>
      <div className="welcome-banner">
        <div>
          <span>
            <Activity size={17} /> CLINIC WORKSPACE
          </span>
          <h2>Every visit starts with great care.</h2>
          <p>
            {clinic.name} ·{" "}
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "full",
              timeZone: clinic.timezone,
            }).format(new Date())}
          </p>
        </div>
        <div className="banner-symbol">
          <HeartGraphic />
        </div>
      </div>
      <State query={query}>
        <div className="stats-grid">
          {Object.entries(data?.metrics || {}).map(([k, v], i) => {
            const Icon = icons[k] || Wallet;
            return (
              <div
                className={`stat-card ${monetary.includes(k) ? "financial" : ""}`}
                key={k}
              >
                <div className="stat-top">
                  <span>{t(labels[k] || k)}</span>
                  <i>
                    <Icon size={18} />
                  </i>
                </div>
                <strong>{monetary.includes(k) ? money(v) : v}</strong>
                <small>
                  {k === "Pending"
                    ? "All current unpaid invoices"
                    : k === "RegisteredPatients"
                      ? "Registered patient records"
                      : `${from} · ${to}`}
                </small>
              </div>
            );
          })}
        </div>
        <div className="dashboard-grid">
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <h3>{t("Patient flow")}</h3>
                <p>{t("Appointments & visits")}</p>
              </div>
              <span className="legend">
                <i />
                Visits
              </span>
            </div>
            {data?.trend.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0792a0" stopOpacity={0.2} />
                      <stop
                        offset="100%"
                        stopColor="#0792a0"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#edf1f4"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(x) => x.slice(5)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#078b98"
                    fill="url(#area)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="chart-empty">No appointments in this period</p>
            )}
          </section>
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <h3>{t("Clinic activity")}</h3>
                <p>Appointments by doctor</p>
              </div>
              <span className="soft-icon">
                <StethoscopeGraphic />
              </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data?.doctorCounts}
                layout="vertical"
                margin={{ left: 10 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="visits"
                  fill="#55aaa7"
                  radius={[0, 5, 5, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
        {data?.revenueTrend?.length > 0 && (
          <section className="card chart-card">
            <div className="card-head">
              <div>
                <h3>{t("Monthly Revenue")}</h3>
                <p>Net posted revenue, excluding collected tax</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={data.revenueTrend}
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#edf1f4"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `Rs ${(v / 100).toLocaleString()}`}
                  tick={{ fontSize: 10 }}
                  width={80}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => money(v)} />
                <Bar
                  dataKey="revenue"
                  fill="#409e9f"
                  barSize={35}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}
        <section className="card">
          <div className="card-head">
            <div>
              <h3>{t("Your schedule")}</h3>
              <p>{data?.upcoming || 0} upcoming appointments</p>
            </div>
            {allowed(user, "appointments") && (
              <Button variant="ghost" onClick={() => navigate("/appointments")}>
                {t("View all")}
                <ArrowUpRight size={16} />
              </Button>
            )}
          </div>
          <Table
            rows={data?.appointments}
            columns={[
              {
                key: "patient",
                title: t("Patient"),
                render: (r) => (
                  <div className="person-cell">
                    <span>{r.patient?.name?.[0]}</span>
                    <div>
                      <strong>{r.patient?.name}</strong>
                      <small>{r.patient?.mrn}</small>
                    </div>
                  </div>
                ),
              },
              {
                key: "doctor",
                title: t("Doctor"),
                render: (r) => r.doctor?.name,
              },
              {
                key: "startAt",
                title: t("Date"),
                render: (r) => dateTime(r.startAt, clinic.timezone),
              },
              { key: "token", title: "Token", render: (r) => r.token || "—" },
              {
                key: "status",
                title: t("Status"),
                render: (r) => <Badge>{t(r.status)}</Badge>,
              },
            ]}
          />
        </section>
        <div className="quick-actions">
          {allowed(user, "appointments") && (
            <Button variant="secondary" onClick={() => setForm("appointment")}>
              <CalendarDays size={18} />
              {t("New appointment")}
            </Button>
          )}
          {allowed(user, "billing") && (
            <Button
              variant="secondary"
              onClick={() => navigate("/billing?new=1")}
            >
              <Wallet size={18} />
              {t("New invoice")}
            </Button>
          )}
          {allowed(user, "expenses") && (
            <Button
              variant="secondary"
              onClick={() => navigate("/expenses?new=1")}
            >
              <Plus size={18} />
              {t("Add expense")}
            </Button>
          )}
        </div>
      </State>
      {form === "patient" && <PatientForm onClose={() => setForm("")} />}
      {form === "appointment" && (
        <AppointmentForm onClose={() => setForm("")} />
      )}
    </>
  );
}
function HeartGraphic() {
  return (
    <svg width="150" height="120" viewBox="0 0 150 120" fill="none">
      <rect
        x="23"
        y="13"
        width="99"
        height="96"
        rx="24"
        fill="white"
        fillOpacity=".1"
        transform="rotate(-9 23 13)"
      />
      <path
        d="M29 68h23l9-24 14 47 12-31h32"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".8"
      />
      <circle cx="116" cy="26" r="14" fill="white" fillOpacity=".14" />
    </svg>
  );
}
function StethoscopeGraphic() {
  return <Activity size={21} />;
}
