import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  ShieldCheck,
  LogOut,
  Users,
  Clock,
  Wallet,
  Settings,
  Activity,
  Search,
} from "lucide-react";
import { useAuth } from "../contexts/Auth";
import { Logo } from "../layouts/Layout";
import {
  Button,
  PageHead,
  Table,
  State,
  Pager,
  Badge,
  Modal,
  Field,
  Select,
  Confirm,
  useData,
  useAction,
  money,
  minor,
  dateTime,
  useNotify,
} from "../components/ui";
import { ResetForm } from "./Settings";
import { api } from "../services/api";
export default function Admin() {
  const navigate = useNavigate();
  const { user, logout } = useAuth(),
    action = useAction(),
    notify = useNotify(),
    [tab, setTab] = useState("Clinics"),
    [page, setPage] = useState(1),
    [form, setForm] = useState(null),
    [renew, setRenew] = useState(null),
    [reset, setReset] = useState(null),
    [planForm, setPlanForm] = useState(null),
    [details, setDetails] = useState(null);
  const dashboard = useData("/admin/dashboard"),
    clinics = useData(`/admin/clinics?page=${page}`),
    plans = useData("/admin/plans"),
    activity = useData("/admin/activity");
  async function usage(c) {
    try {
      const data = await api(`/admin/clinics/${c._id}/usage`);
      setDetails({ ...c, usage: data });
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <div className="admin-shell">
      <header>
        <Logo />
        <div>
          <span className="admin-label">
            <ShieldCheck size={16} />
            AHMED SOLUTIONS ADMIN
          </span>
          <span>{user.name}</span>
          <Button variant="ghost" onClick={() => navigate("/password")}>
            Change password
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut size={17} />
            Sign out
          </Button>
        </div>
      </header>
      <main>
        <PageHead
          eyebrow="SAAS CONTROL CENTER"
          title="Clinics, connected."
          description="Manage licensing, clinic access and subscriptions."
        >
          <Button onClick={() => setForm({})}>
            <Plus size={17} />
            Create clinic
          </Button>
        </PageHead>
        <State query={dashboard}>
          <div className="admin-stats">
            {[
              ["clinics", "Registered clinics", Building2],
              ["active", "Active clinics", ShieldCheck],
              ["suspended", "Suspended", Clock],
              ["expired", "Expired subscriptions", Clock],
              ["renewals", "Renewals in 30 days", Clock],
              ["licensedUsers", "Licensed users", Users],
              ["subscriptionRevenue", "Recorded subscription revenue", Wallet],
            ].map(([k, label, Icon]) => (
              <div className="card" key={k}>
                <Icon size={20} />
                <small>{label}</small>
                <strong>
                  {k === "subscriptionRevenue"
                    ? money(dashboard.data?.[k])
                    : dashboard.data?.[k] || 0}
                </strong>
              </div>
            ))}
          </div>
        </State>
        <div className="tabs">
          {["Clinics", "Plans", "Administrative activity"].map((x) => (
            <button
              className={tab === x ? "active" : ""}
              key={x}
              onClick={() => setTab(x)}
            >
              {x}
            </button>
          ))}
        </div>
        {tab === "Clinics" && (
          <section className="card">
            <State query={clinics}>
              <Table
                rows={clinics.data?.items}
                columns={[
                  {
                    key: "name",
                    title: "Clinic",
                    render: (r) => (
                      <div>
                        <strong>{r.name}</strong>
                        <small className="block">{r.email}</small>
                      </div>
                    ),
                  },
                  { key: "plan", title: "Plan" },
                  {
                    key: "expiresAt",
                    title: "Expires",
                    render: (r) => dateTime(r.expiresAt),
                  },
                  {
                    key: "status",
                    title: "Status",
                    render: (r) => (
                      <Badge>
                        {new Date(r.expiresAt) < new Date()
                          ? "Expired"
                          : r.status}
                      </Badge>
                    ),
                  },
                  {
                    key: "limits",
                    title: "License limits",
                    render: (r) =>
                      `${r.doctorLimit} doctors · ${r.userLimit} users`,
                  },
                  {
                    key: "actions",
                    title: "Actions",
                    render: (r) => (
                      <div className="row-actions">
                        <Button variant="ghost" onClick={() => setForm(r)}>
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => setRenew(r)}>
                          Renew
                        </Button>
                        <Button variant="ghost" onClick={() => usage(r)}>
                          Usage
                        </Button>
                        <Button variant="ghost" onClick={() => setReset(r)}>
                          Reset owner
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
              <Pager data={clinics.data} {...{ page, setPage }} />
            </State>
          </section>
        )}
        {tab === "Plans" && (
          <>
            <div className="row-actions">
              <Button onClick={() => setPlanForm({})}>
                <Plus size={17} />
                New plan
              </Button>
            </div>
            <section className="card">
              <State query={plans}>
                <Table
                  rows={plans.data}
                  columns={[
                    { key: "name", title: "Plan" },
                    { key: "months", title: "Months" },
                    {
                      key: "price",
                      title: "Price",
                      render: (r) => money(r.price),
                    },
                    { key: "doctorLimit", title: "Doctor limit" },
                    { key: "userLimit", title: "Staff limit" },
                    {
                      key: "active",
                      title: "Active",
                      render: (r) => (r.active ? "Yes" : "No"),
                    },
                    {
                      key: "action",
                      title: "Action",
                      render: (r) => (
                        <Button variant="ghost" onClick={() => setPlanForm(r)}>
                          Edit
                        </Button>
                      ),
                    },
                  ]}
                />
              </State>
            </section>
          </>
        )}
        {tab === "Administrative activity" && (
          <section className="card">
            <State query={activity}>
              <Table
                rows={activity.data}
                columns={[
                  {
                    key: "createdAt",
                    title: "Time",
                    render: (r) => dateTime(r.createdAt),
                  },
                  { key: "action", title: "Action" },
                  { key: "entityId", title: "Reference" },
                  { key: "reason", title: "Reason" },
                ]}
              />
            </State>
          </section>
        )}
        <p className="admin-privacy">
          <ShieldCheck size={15} /> Clinic licensing is separate from patient
          medical records.
        </p>
      </main>
      {form && (
        <ClinicForm
          clinic={form._id ? form : null}
          plans={plans.data || []}
          onClose={() => setForm(null)}
        />
      )}
      {renew && (
        <RenewForm
          clinic={renew}
          plans={plans.data || []}
          onClose={() => setRenew(null)}
        />
      )}
      {reset && (
        <ResetForm
          record={reset}
          url={`/admin/clinics/${reset._id}/reset-owner`}
          onClose={() => setReset(null)}
        />
      )}
      {planForm && (
        <PlanForm
          plan={planForm._id ? planForm : null}
          onClose={() => setPlanForm(null)}
        />
      )}
      {details && (
        <Modal wide title={details.name} onClose={() => setDetails(null)}>
          <div className="detail-grid">
            <div>
              <small>Doctors</small>
              <p>
                {details.usage.doctors} / {details.doctorLimit}
              </p>
            </div>
            <div>
              <small>Staff users</small>
              <p>
                {details.usage.users} / {details.userLimit}
              </p>
            </div>
          </div>
          <h3>Subscription history</h3>
          <Table
            rows={details.subscriptionHistory}
            columns={[
              { key: "plan", title: "Plan" },
              {
                key: "start",
                title: "Start",
                render: (r) => dateTime(r.start),
              },
              {
                key: "expiry",
                title: "Expiry",
                render: (r) => dateTime(r.expiry),
              },
              {
                key: "amount",
                title: "Recorded payment",
                render: (r) => money(r.amount),
              },
            ]}
          />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const s = await api(`/admin/support/${details._id}`);
                setDetails((d) => ({ ...d, support: s }));
              } catch (e) {
                notify(e.message, "error");
              }
            }}
          >
            Open clinic-approved support
          </Button>
          {details.support && (
            <div className="notice">
              <strong>
                Support until {dateTime(details.support.grant.expiresAt)}
              </strong>
              <p>
                Timezone: {details.support.clinic.timezone} · Language:{" "}
                {details.support.clinic.language}
              </p>
              <p>
                {details.support.users
                  .map((u) => `${u.name}: ${u.role}`)
                  .join(", ")}
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function ClinicForm({ clinic, plans, onClose }) {
  const action = useAction(),
    [d, set] = useState({
      name: clinic?.name || "",
      ownerName: clinic?.ownerName || "",
      email: clinic?.email || "",
      password: "",
      phone: clinic?.phone || "",
      address: clinic?.address || "",
      city: clinic?.city || "",
      expiresAt: (clinic
        ? new Date(clinic.expiresAt)
        : new Date(Date.now() + 30 * 86400000)
      )
        .toISOString()
        .slice(0, 10),
      plan: clinic?.plan || "Monthly",
      doctorLimit: clinic?.doctorLimit || 3,
      userLimit: clinic?.userLimit || 10,
      status: clinic?.status || "active",
    });
  const change = (k) => (e) =>
    set({
      ...d,
      [k]: ["doctorLimit", "userLimit"].includes(k)
        ? Number(e.target.value)
        : e.target.value,
    });
  return (
    <Modal
      wide
      title={clinic ? "Edit clinic license" : "Create clinic account"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const data = clinic
              ? {
                  name: d.name,
                  phone: d.phone,
                  address: d.address,
                  status: d.status,
                  plan: d.plan,
                  doctorLimit: d.doctorLimit,
                  userLimit: d.userLimit,
                  expiresAt: new Date(
                    `${d.expiresAt}T23:59:59+05:00`,
                  ).toISOString(),
                }
              : {
                  ...d,
                  expiresAt: new Date(
                    `${d.expiresAt}T23:59:59+05:00`,
                  ).toISOString(),
                };
            if (!clinic) delete data.status;
            await action.mutateAsync({
              url: clinic ? `/admin/clinics/${clinic._id}` : "/admin/clinics",
              method: clinic ? "PATCH" : "POST",
              body: data,
            });
            onClose();
          } catch {}
        }}
      >
        <div className="form-grid">
          <Field
            label="Clinic name"
            required
            value={d.name}
            onChange={change("name")}
          />
          {!clinic && (
            <>
              <Field
                label="Owner name"
                required
                value={d.ownerName}
                onChange={change("ownerName")}
              />
              <Field
                label="Owner email"
                type="email"
                required
                value={d.email}
                onChange={change("email")}
              />
              <Field
                label="Temporary password"
                type="password"
                required
                minLength="12"
                value={d.password}
                onChange={change("password")}
              />
            </>
          )}
          <Field label="Phone" value={d.phone} onChange={change("phone")} />
          <Field
            label="Address"
            value={d.address}
            onChange={change("address")}
          />
          {!clinic && (
            <Field label="City" value={d.city} onChange={change("city")} />
          )}
          <Select
            label="Plan"
            value={d.plan}
            onChange={(e) => {
              const p = plans.find((p) => p.name === e.target.value);
              set({
                ...d,
                plan: e.target.value,
                ...(p
                  ? { doctorLimit: p.doctorLimit, userLimit: p.userLimit }
                  : {}),
              });
            }}
          >
            {plans.map((p) => (
              <option key={p._id}>{p.name}</option>
            ))}
          </Select>
          <Field
            label="Expiry date"
            required
            type="date"
            value={d.expiresAt}
            onChange={change("expiresAt")}
          />
          <Field
            label="Doctor limit"
            required
            type="number"
            min="1"
            value={d.doctorLimit}
            onChange={change("doctorLimit")}
          />
          <Field
            label="User limit"
            required
            type="number"
            min="1"
            value={d.userLimit}
            onChange={change("userLimit")}
          />
          {clinic && (
            <Select
              label="Clinic status"
              value={d.status}
              onChange={change("status")}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          )}
        </div>
        <div className="form-actions">
          <Button busy={action.isPending}>Save clinic</Button>
        </div>
      </form>
    </Modal>
  );
}
function RenewForm({ clinic, plans, onClose }) {
  const action = useAction(),
    [expiry, setExpiry] = useState(
      new Date(new Date(clinic.expiresAt).getTime() + 30 * 86400000)
        .toISOString()
        .slice(0, 10),
    ),
    [plan, setPlan] = useState(clinic.plan),
    [amount, setAmount] = useState(0);
  return (
    <Modal title={`Renew · ${clinic.name}`} onClose={onClose}>
      <Select
        label="Plan"
        value={plan}
        onChange={(e) => {
          setPlan(e.target.value);
          setAmount(
            (plans.find((p) => p.name === e.target.value)?.price || 0) / 100,
          );
        }}
      >
        {plans.map((p) => (
          <option key={p._id}>{p.name}</option>
        ))}
      </Select>
      <Field
        label="New expiry date"
        type="date"
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
      />
      <Field
        label="Subscription payment recorded (PKR)"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="form-actions">
        <Button
          busy={action.isPending}
          onClick={async () => {
            try {
              await action.mutateAsync({
                url: `/admin/clinics/${clinic._id}/renew`,
                body: {
                  expiresAt: new Date(`${expiry}T23:59:59+05:00`).toISOString(),
                  plan,
                  amount: minor(amount),
                },
              });
              onClose();
            } catch {}
          }}
        >
          Renew & activate
        </Button>
      </div>
    </Modal>
  );
}
function PlanForm({ plan, onClose }) {
  const action = useAction(),
    [d, set] = useState({
      name: plan?.name || "",
      months: plan?.months || 1,
      doctorLimit: plan?.doctorLimit || 3,
      userLimit: plan?.userLimit || 10,
      price: (plan?.price || 0) / 100,
      active: plan?.active ?? true,
    });
  return (
    <Modal title="Subscription plan" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await action.mutateAsync({
              url: plan ? `/admin/plans/${plan._id}` : "/admin/plans",
              method: plan ? "PUT" : "POST",
              body: { ...d, price: minor(d.price) },
            });
            onClose();
          } catch {}
        }}
      >
        {[
          ["name", "Plan name"],
          ["months", "Months"],
          ["doctorLimit", "Doctor limit"],
          ["userLimit", "Staff limit"],
          ["price", "Price (PKR)"],
        ].map(([k, l]) => (
          <Field
            key={k}
            label={l}
            required
            type={k === "name" ? "text" : "number"}
            min={k === "price" ? 0 : 1}
            step={k === "price" ? "0.01" : "1"}
            value={d[k]}
            onChange={(e) =>
              set({
                ...d,
                [k]: k === "name" ? e.target.value : Number(e.target.value),
              })
            }
          />
        ))}
        <label className="check">
          <input
            type="checkbox"
            checked={d.active}
            onChange={(e) => set({ ...d, active: e.target.checked })}
          />
          Active plan
        </label>
        <div className="form-actions">
          <Button busy={action.isPending}>Save plan</Button>
        </div>
      </form>
    </Modal>
  );
}
