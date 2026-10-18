import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Upload, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/Auth";
import {
  Button,
  PageHead,
  Field,
  Select,
  Textarea,
  Table,
  State,
  Badge,
  Modal,
  Confirm,
  useData,
  useAction,
  money,
  minor,
  dateTime,
} from "../components/ui";
export default function Settings() {
  const { t } = useTranslation(),
    { clinic, user, updateClinic } = useAuth(),
    navigate = useNavigate(),
    action = useAction(),
    [tab, setTab] = useState("Clinic profile"),
    [d, set] = useState(null),
    [opening, setOpening] = useState(null),
    [grant, setGrant] = useState(false);
  const query = useData("/settings"),
    grants = useData("/support-grants"),
    admins = useData("/support-admins");
  useEffect(() => {
    if (query.data) {
      const c = query.data;
      set({
        name: c.name,
        ownerName: c.ownerName || "",
        address: c.address || "",
        city: c.city || "",
        phone: c.phone || "",
        whatsapp: c.whatsapp || "",
        email: c.email || "",
        registration: c.registration || "",
        timezone: c.timezone,
        language: c.language,
        settings: {
          tokenPrefix: c.settings.tokenPrefix,
          invoicePrefix: c.settings.invoicePrefix,
          allowOverbooking: c.settings.allowOverbooking,
          defaultFee: c.settings.defaultFee,
          taxBasisPoints: c.settings.taxBasisPoints,
          invoiceFooter: c.settings.invoiceFooter || "",
          prescriptionFooter: c.settings.prescriptionFooter || "",
          paperSize: c.settings.paperSize || "A4",
          retentionDays: c.settings.retentionDays || 3650,
          openingHours: c.settings.openingHours || "",
          closingHours: c.settings.closingHours || "",
        },
      });
    }
  }, [query.data]);
  const change = (k) => (e) => set((x) => ({ ...x, [k]: e.target.value }));
  const cs = (k) => (e) =>
    set((x) => ({
      ...x,
      settings: {
        ...x.settings,
        [k]:
          e.target.type === "checkbox"
            ? e.target.checked
            : ["defaultFee", "taxBasisPoints", "retentionDays"].includes(k)
              ? Number(e.target.value)
              : e.target.value,
      },
    }));
  async function save(e) {
    e.preventDefault();
    try {
      const c = await action.mutateAsync({
        url: "/settings",
        method: "PUT",
        body: d,
      });
      updateClinic(c);
    } catch {}
  }
  async function logo(file) {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const c = await action.mutateAsync({ url: "/settings/logo", body });
      updateClinic(c);
    } catch {}
  }
  return (
    <>
      <PageHead
        title={t("Settings")}
        eyebrow="CLINIC CONFIGURATION"
        description={t("Personalize your clinic")}
      >
        <Button variant="secondary" onClick={() => navigate("/password")}>
          {t("Change password")}
        </Button>
      </PageHead>
      <div className="tabs">
        {[
          "Clinic profile",
          "Appointment settings",
          "Billing settings",
          "Prescription settings",
          "Support access",
          "Subscription",
        ].map((x) => (
          <button
            className={tab === x ? "active" : ""}
            key={x}
            onClick={() => setTab(x)}
          >
            {t(x)}
          </button>
        ))}
      </div>
      <State query={query}>
        {d && (
          <form className="card settings-card" onSubmit={save}>
            {tab === "Clinic profile" && (
              <>
                <div className="logo-upload">
                  {clinic.logo ? (
                    <img src={clinic.logo} alt="Clinic logo" />
                  ) : (
                    <ShieldCheck size={36} />
                  )}
                  <label className="btn secondary">
                    <Upload size={16} />
                    Upload clinic logo
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) => logo(e.target.files[0])}
                    />
                  </label>
                </div>
                <div className="form-grid">
                  {[
                    ["name", "Clinic name"],
                    ["ownerName", "Owner name"],
                    ["address", "Address"],
                    ["city", "City"],
                    ["phone", "Phone"],
                    ["whatsapp", "WhatsApp"],
                    ["email", "Email"],
                    ["registration", "Clinic registration"],
                    ["timezone", "Timezone"],
                  ].map(([k, l]) => (
                    <Field
                      key={k}
                      label={t(l)}
                      value={d[k]}
                      required={k === "name"}
                      onChange={change(k)}
                    />
                  ))}
                  <Select
                    label="Default language"
                    value={d.language}
                    onChange={change("language")}
                  >
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                    <option value="roman">Roman Urdu</option>
                  </Select>
                  <Field
                    label="Retention period (days)"
                    type="number"
                    min="365"
                    value={d.settings.retentionDays}
                    onChange={cs("retentionDays")}
                  />
                </div>
              </>
            )}
            {tab === "Appointment settings" && (
              <div className="form-grid">
                <Field
                  label="Token prefix"
                  value={d.settings.tokenPrefix}
                  onChange={cs("tokenPrefix")}
                />
                <Field
                  label="Opening hours"
                  type="time"
                  value={d.settings.openingHours}
                  onChange={cs("openingHours")}
                />
                <Field
                  label="Closing hours"
                  type="time"
                  value={d.settings.closingHours}
                  onChange={cs("closingHours")}
                />
                <label className="check">
                  <input
                    type="checkbox"
                    checked={d.settings.allowOverbooking}
                    onChange={cs("allowOverbooking")}
                  />
                  Allow explicit overbooking
                </label>
                <div className="notice">
                  Tokens reset per doctor each clinic-local day. Appointment
                  durations, sessions, breaks and leave are managed on each
                  doctor's profile.
                </div>
              </div>
            )}
            {tab === "Billing settings" && (
              <>
                <div className="form-grid">
                  <Field
                    label="Invoice prefix"
                    value={d.settings.invoicePrefix}
                    onChange={cs("invoicePrefix")}
                  />
                  <Field
                    label="Default consultation fee (PKR)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={d.settings.defaultFee / 100}
                    onChange={(e) =>
                      set({
                        ...d,
                        settings: {
                          ...d.settings,
                          defaultFee: minor(e.target.value),
                        },
                      })
                    }
                  />
                  <Field
                    label="Tax (%)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={d.settings.taxBasisPoints / 100}
                    onChange={(e) =>
                      set({
                        ...d,
                        settings: {
                          ...d.settings,
                          taxBasisPoints: Math.round(
                            Number(e.target.value) * 100,
                          ),
                        },
                      })
                    }
                  />
                  <Textarea
                    label="Invoice footer"
                    value={d.settings.invoiceFooter}
                    onChange={cs("invoiceFooter")}
                  />
                </div>
                <div className="notice">
                  Supported methods: Cash, Bank Transfer, recorded Card payment
                  and Other. Cash and bank balances are derived from posted
                  journal movements.
                </div>
                <div className="row-actions">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setOpening("cash")}
                  >
                    Set cash opening balance
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setOpening("bank")}
                  >
                    Set bank opening balance
                  </Button>
                </div>
              </>
            )}
            {tab === "Prescription settings" && (
              <div className="form-grid">
                <Select
                  label="Default paper size"
                  value={d.settings.paperSize}
                  onChange={cs("paperSize")}
                >
                  <option>A4</option>
                  <option>A5</option>
                </Select>
                <Textarea
                  label="Prescription footer"
                  value={d.settings.prescriptionFooter}
                  onChange={cs("prescriptionFooter")}
                />
                <div className="notice">
                  Letterhead uses clinic information and the prescribing
                  doctor's qualification and registration. Approval is linked to
                  the doctor account, signed timestamp and preserved version
                  history.
                </div>
              </div>
            )}
            {tab === "Support access" && (
              <>
                <div className="notice">
                  Support grants expire after a maximum of two hours. They
                  expose clinic configuration and staff roles only. Patient
                  medical records remain inaccessible to Ahmed Solutions
                  administrators.
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setGrant(true)}
                >
                  Approve support access
                </Button>
                <Table
                  rows={grants.data}
                  columns={[
                    { key: "reason", title: "Reason" },
                    {
                      key: "expiresAt",
                      title: "Expires",
                      render: (r) => dateTime(r.expiresAt, clinic.timezone),
                    },
                    {
                      key: "status",
                      title: "Status",
                      render: (r) =>
                        r.revokedAt
                          ? "Revoked"
                          : new Date(r.expiresAt) < new Date()
                            ? "Expired"
                            : "Active",
                    },
                    {
                      key: "action",
                      title: "Action",
                      render: (r) =>
                        !r.revokedAt &&
                        new Date(r.expiresAt) > new Date() && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              action.mutate({
                                url: `/support-grants/${r._id}/revoke`,
                              })
                            }
                          >
                            Revoke
                          </Button>
                        ),
                    },
                  ]}
                />
              </>
            )}
            {tab === "Subscription" && (
              <div className="detail-grid">
                {[
                  ["Plan", clinic.plan],
                  ["Status", clinic.status],
                  ["Expiry", dateTime(clinic.expiresAt, clinic.timezone)],
                  ["Doctor limit", clinic.doctorLimit],
                  ["Staff user limit", clinic.userLimit],
                ].map(([k, v]) => (
                  <div key={k}>
                    <small>{k}</small>
                    <p>{v}</p>
                  </div>
                ))}
              </div>
            )}
            {!["Subscription", "Support access"].includes(tab) && (
              <div className="form-actions">
                <Button busy={action.isPending}>{t("Save")}</Button>
              </div>
            )}
          </form>
        )}
      </State>
      {opening && (
        <OpeningForm account={opening} onClose={() => setOpening(null)} />
      )}
      {grant && (
        <GrantForm admins={admins.data || []} onClose={() => setGrant(false)} />
      )}
    </>
  );
}
function OpeningForm({ account, onClose }) {
  const action = useAction(),
    [amount, setAmount] = useState(0),
    [reason, setReason] = useState("");
  return (
    <Modal title={`Opening ${account} balance`} onClose={onClose}>
      <Field
        label="Amount (PKR)"
        type="number"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Field
        label="Reason / as-of description"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="form-actions">
        <Button
          disabled={reason.length < 5}
          busy={action.isPending}
          onClick={async () => {
            try {
              await action.mutateAsync({
                url: "/accounts/opening",
                body: { account, amount: minor(amount), reason },
              });
              onClose();
            } catch {}
          }}
        >
          Record once
        </Button>
      </div>
    </Modal>
  );
}
function GrantForm({ admins, onClose }) {
  const action = useAction(),
    [adminId, setAdmin] = useState(""),
    [minutes, setMinutes] = useState(30),
    [reason, setReason] = useState("");
  return (
    <Modal title="Approve limited support access" onClose={onClose}>
      <Select
        label="Ahmed Solutions administrator"
        value={adminId}
        onChange={(e) => setAdmin(e.target.value)}
      >
        <option value="">Select administrator</option>
        {admins.map((a) => (
          <option key={a._id} value={a._id}>
            {a.name} · {a.email}
          </option>
        ))}
      </Select>
      <Field
        label="Duration (minutes)"
        type="number"
        min="5"
        max="120"
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
      />
      <Field
        label="Reason"
        minLength="5"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="form-actions">
        <Button
          disabled={!adminId || reason.length < 5}
          busy={action.isPending}
          onClick={async () => {
            try {
              await action.mutateAsync({
                url: "/support-grants",
                body: { adminId, minutes, reason },
              });
              onClose();
            } catch {}
          }}
        >
          Approve
        </Button>
      </div>
    </Modal>
  );
}
export function UserManagement() {
  const { t } = useTranslation(),
    { user } = useAuth(),
    action = useAction(),
    query = useData("/users"),
    docs = useData("/doctors?limit=100"),
    [form, setForm] = useState(false),
    [reset, setReset] = useState(null),
    [edit, setEdit] = useState(null);
  return (
    <>
      <PageHead
        title={t("Users")}
        eyebrow="ACCESS MANAGEMENT"
        description="Give each team member the access their work requires."
      >
        <Button onClick={() => setForm(true)}>
          <Plus size={17} />
          Add staff user
        </Button>
      </PageHead>
      <section className="card">
        <State query={query}>
          <Table
            rows={query.data}
            columns={[
              { key: "name", title: t("Name") },
              { key: "email", title: t("Email") },
              {
                key: "role",
                title: "Role",
                render: (r) => <Badge>{r.role}</Badge>,
              },
              {
                key: "clinicalAccess",
                title: "Clinical access",
                render: (r) =>
                  r.role === "doctor" || r.clinicalAccess
                    ? "Granted"
                    : "Restricted",
              },
              {
                key: "active",
                title: "Status",
                render: (r) => (r.active ? "Active" : "Disabled"),
              },
              {
                key: "actions",
                title: "Actions",
                render: (r) => (
                  <div className="row-actions">
                    <Button variant="ghost" onClick={() => setReset(r)}>
                      Reset password
                    </Button>
                    {user.role === "owner" && (
                      <Button variant="ghost" onClick={() => setEdit(r)}>
                        Permissions
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() =>
                        action.mutate({
                          url: `/users/${r._id}`,
                          method: "PATCH",
                          body: { active: !r.active },
                        })
                      }
                    >
                      {r.active ? "Disable" : "Activate"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </State>
      </section>
      {form && (
        <UserForm
          doctors={docs.data?.items || []}
          onClose={() => setForm(false)}
        />
      )}
      {reset && (
        <ResetForm
          record={reset}
          url={`/users/${reset._id}/reset`}
          onClose={() => setReset(null)}
        />
      )}
      {edit && <PermissionForm record={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function UserForm({ doctors, onClose }) {
  const { user } = useAuth(),
    action = useAction(),
    [d, set] = useState({
      name: "",
      email: "",
      password: "",
      role: "receptionist",
      doctorId: "",
      clinicalAccess: false,
    });
  const change = (k) => (e) => set({ ...d, [k]: e.target.value });
  return (
    <Modal title="Add staff user" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const data = { ...d };
            if (!data.doctorId) delete data.doctorId;
            await action.mutateAsync({ url: "/users", body: data });
            onClose();
          } catch {}
        }}
      >
        <Field label="Name" required value={d.name} onChange={change("name")} />
        <Field
          label="Email"
          type="email"
          required
          value={d.email}
          onChange={change("email")}
        />
        <Field
          label="Temporary password (12+ characters)"
          type="password"
          minLength="12"
          required
          value={d.password}
          onChange={change("password")}
        />
        <Select label="Role" value={d.role} onChange={change("role")}>
          {[
            "receptionist",
            "doctor",
            "accountant",
            "manager",
            ...(user.role === "owner" ? ["owner"] : []),
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        {d.role === "doctor" && (
          <Select
            label="Linked doctor"
            required
            value={d.doctorId}
            onChange={change("doctorId")}
          >
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
        {user.role === "owner" && (
          <label className="check">
            <input
              type="checkbox"
              checked={d.clinicalAccess}
              onChange={(e) => set({ ...d, clinicalAccess: e.target.checked })}
            />
            Explicit clinical record access
          </label>
        )}
        <div className="form-actions">
          <Button busy={action.isPending}>Create user</Button>
        </div>
      </form>
    </Modal>
  );
}
export function ResetForm({ record, url, onClose }) {
  const action = useAction(),
    [password, set] = useState("");
  return (
    <Modal title={`Reset access · ${record.name}`} onClose={onClose}>
      <Field
        label="Temporary password (12+ characters)"
        type="password"
        minLength="12"
        value={password}
        onChange={(e) => set(e.target.value)}
      />
      <p className="muted">
        Existing sessions are revoked. The user must change this password on
        next sign-in.
      </p>
      <div className="form-actions">
        <Button
          disabled={password.length < 12}
          busy={action.isPending}
          onClick={async () => {
            try {
              await action.mutateAsync({ url, body: { password } });
              onClose();
            } catch {}
          }}
        >
          Reset access
        </Button>
      </div>
    </Modal>
  );
}
function PermissionForm({ record, onClose }) {
  const action = useAction(),
    [clinicalAccess, setClinical] = useState(record.clinicalAccess),
    [permissions, setPermissions] = useState(record.permissions || []);
  const options = [
    "patients:read",
    "patients:write",
    "appointments:read",
    "appointments:write",
    "doctors:read",
    "doctors:write",
    "billing:read",
    "billing:write",
    "finance:read",
    "finance:write",
    "reports:read",
    "settings:write",
    "users:write",
    "audit:read",
  ];
  return (
    <Modal title={`Extra access · ${record.name}`} onClose={onClose}>
      <p className="muted">
        Role permissions remain. These are additional grants approved by the
        clinic owner.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={clinicalAccess}
          onChange={(e) => setClinical(e.target.checked)}
        />
        Clinical record access
      </label>
      <div className="permission-grid">
        {options.map((p) => (
          <label className="check" key={p}>
            <input
              type="checkbox"
              checked={permissions.includes(p)}
              onChange={(e) =>
                setPermissions((x) =>
                  e.target.checked ? [...x, p] : x.filter((v) => v !== p),
                )
              }
            />
            {p.replace(":", " · ")}
          </label>
        ))}
      </div>
      <div className="form-actions">
        <Button
          busy={action.isPending}
          onClick={async () => {
            try {
              await action.mutateAsync({
                url: `/users/${record._id}`,
                method: "PATCH",
                body: { active: record.active, clinicalAccess, permissions },
              });
              onClose();
            } catch {}
          }}
        >
          Save access
        </Button>
      </div>
    </Modal>
  );
}
export function AuditLog() {
  const { clinic } = useAuth(),
    [page, setPage] = useState(1),
    query = useData(`/audit?page=${page}`);
  return (
    <>
      <PageHead
        title="Audit log"
        eyebrow="ACCOUNTABILITY"
        description="Who changed what, and when."
      />
      <section className="card">
        <State query={query}>
          <Table
            rows={query.data?.items}
            columns={[
              {
                key: "createdAt",
                title: "Timestamp",
                render: (r) => dateTime(r.createdAt, clinic.timezone),
              },
              { key: "action", title: "Action" },
              { key: "entity", title: "Record type" },
              { key: "actorId", title: "Actor" },
              { key: "reason", title: "Reason" },
            ]}
          />
        </State>
      </section>
    </>
  );
}
