import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Phone,
  MapPin,
  CalendarDays,
  FileText,
  Upload,
  ArrowLeft,
  Printer,
} from "lucide-react";
import { useAuth, isClinical, allowed } from "../contexts/Auth";
import {
  PageHead,
  Button,
  State,
  Table,
  Pager,
  Badge,
  Empty,
  useData,
  useDebounce,
  money,
  dateTime,
  useAction,
  useNotify,
  Confirm,
} from "../components/ui";
import { PatientForm, AppointmentForm } from "../components/forms";
import { api, download } from "../services/api";
export default function Patients() {
  const { t } = useTranslation(),
    { user } = useAuth(),
    navigate = useNavigate();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [form, setForm] = useState(null),
    dq = useDebounce(search);
  const query = useData(`/patients?q=${encodeURIComponent(dq)}&page=${page}`),
    canWrite = ["owner", "manager", "receptionist"].includes(user.role);
  return (
    <>
      <PageHead
        eyebrow="PATIENT DIRECTORY"
        title={t("Patients")}
        description="A clear, organized record for every patient."
      >
        {canWrite && (
          <Button onClick={() => setForm({})}>
            <Plus size={17} />
            {t("Register patient")}
          </Button>
        )}
      </PageHead>
      <section className="card">
        <div className="list-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder={t("Search patients")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <small>{query.data?.total || 0} patients</small>
        </div>
        <State query={query}>
          <Table
            rows={query.data?.items}
            columns={[
              {
                key: "name",
                title: t("Patient"),
                render: (r) => (
                  <div className="person-cell">
                    <span>{r.name[0]}</span>
                    <div>
                      <strong>{r.name}</strong>
                      <small>{r.mrn}</small>
                    </div>
                  </div>
                ),
              },
              { key: "mobile", title: t("Mobile") },
              { key: "gender", title: t("Gender") },
              {
                key: "age",
                title: t("Age"),
                render: (r) =>
                  r.age ??
                  (r.dob
                    ? Math.floor((Date.now() - new Date(r.dob)) / 31557600000)
                    : "—"),
              },
              { key: "city", title: t("City") },
              {
                key: "actions",
                title: t("Actions"),
                render: (r) => (
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/patients/${r._id}`)}
                  >
                    {t("View")} →
                  </Button>
                ),
              },
            ]}
          />
          <Pager data={query.data} {...{ page, setPage }} />
        </State>
      </section>
      {form && (
        <PatientForm
          patient={form._id ? form : null}
          onClose={() => setForm(null)}
        />
      )}
    </>
  );
}
export function PatientProfile() {
  const { id } = useParams(),
    { t } = useTranslation(),
    { user, clinic } = useAuth(),
    notify = useNotify(),
    action = useAction(),
    navigate = useNavigate();
  const [historyPage, setHistoryPage] = useState(1);
  const query = useData(`/patients/${id}`),
    history = useData(`/patients/${id}/history?page=${historyPage}`),
    bills = useData(`/patients/${id}/statement`, allowed(user, "billing"));
  const [tab, setTab] = useState("Overview"),
    [edit, setEdit] = useState(false),
    [appointment, setAppointment] = useState(false),
    [archive, setArchive] = useState(false),
    [uploading, setUploading] = useState(false);
  const p = query.data;
  const tabs = [
    "Overview",
    "Appointments",
    ...(isClinical(user)
      ? ["Consultations", "Prescriptions", "Medical documents"]
      : []),
    ...(allowed(user, "billing") ? ["Billing history"] : []),
  ];
  async function upload(file) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      await action.mutateAsync({ url: `/patients/${id}/documents`, body });
    } catch {
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <Button variant="ghost" onClick={() => navigate("/patients")}>
        <ArrowLeft size={16} />
        Back to patients
      </Button>
      <State query={query}>
        <PageHead
          title={p?.name}
          eyebrow={p?.mrn}
          description={`${p?.gender || ""} · ${p?.age ?? "—"} years · Registered ${dateTime(p?.createdAt, clinic.timezone)}`}
        >
          <Button
            variant="secondary"
            onClick={() => navigate(`/print/patient/${id}`)}
          >
            <Printer size={17} />
            {t("Print")}
          </Button>
          {["owner", "manager", "receptionist"].includes(user.role) && (
            <Button variant="secondary" onClick={() => setEdit(true)}>
              {t("Edit")}
            </Button>
          )}
          {allowed(user, "appointments") && (
            <Button onClick={() => setAppointment(true)}>
              <CalendarDays size={17} />
              {t("New appointment")}
            </Button>
          )}
        </PageHead>
        <div className="profile-strip">
          <span>
            <Phone size={16} />
            {p?.mobile || "No mobile number"}
          </span>
          <span>
            <MapPin size={16} />
            {p?.address || p?.city || "No address"}
          </span>
          {allowed(user, "billing") && (
            <span className="balance">
              {t("Outstanding balance")}:{" "}
              <strong>{money(bills.data?.balance)}</strong>
            </span>
          )}
        </div>
        <div className="tabs">
          {tabs.map((x) => (
            <button
              className={tab === x ? "active" : ""}
              key={x}
              onClick={() => {
                setTab(x);
                setHistoryPage(1);
              }}
            >
              {t(x)}
            </button>
          ))}
        </div>
        <section className="card">
          {tab === "Overview" && (
            <div className="detail-grid">
              {[
                ["Full name", p?.name],
                ["Patient ID", p?.mrn],
                ["Date of birth", p?.dob],
                ["Mobile", p?.mobile],
                ["Alternate contact", p?.alternateContact],
                ["Emergency contact", p?.emergencyContact],
                ["City", p?.city],
                ["Blood group", p?.bloodGroup],
                ...(isClinical(user)
                  ? [
                      ["Allergies", p?.allergies],
                      ["Medical history", p?.medicalHistory],
                      ["Existing conditions", p?.conditions],
                      ["Previous surgeries", p?.surgeries],
                      ["Current medications", p?.medications],
                      ["Patient notes", p?.notes],
                    ]
                  : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <small>{t(k)}</small>
                  <p>{v || "—"}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "Appointments" && (
            <State query={history}>
              <Table
                rows={history.data?.appointments}
                columns={[
                  {
                    key: "startAt",
                    title: t("Date"),
                    render: (r) => dateTime(r.startAt, clinic.timezone),
                  },
                  { key: "type", title: "Type" },
                  { key: "token", title: "Token" },
                  {
                    key: "status",
                    title: t("Status"),
                    render: (r) => <Badge>{r.status}</Badge>,
                  },
                ]}
              />
            </State>
          )}
          {tab === "Consultations" && (
            <Table
              rows={history.data?.consultations}
              columns={[
                {
                  key: "createdAt",
                  title: t("Date"),
                  render: (r) => dateTime(r.createdAt, clinic.timezone),
                },
                { key: "complaint", title: "Chief complaint" },
                { key: "diagnosis", title: "Diagnosis" },
                {
                  key: "status",
                  title: t("Status"),
                  render: (r) => <Badge>{r.status}</Badge>,
                },
                {
                  key: "actions",
                  title: t("Actions"),
                  render: (r) => (
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/consultations/${r._id}`)}
                    >
                      {t("View")}
                    </Button>
                  ),
                },
              ]}
            />
          )}
          {tab === "Prescriptions" && (
            <Table
              rows={history.data?.prescriptions}
              columns={[
                {
                  key: "createdAt",
                  title: t("Date"),
                  render: (r) => dateTime(r.createdAt, clinic.timezone),
                },
                {
                  key: "medicines",
                  title: "Medicines",
                  render: (r) => r.medicines.map((m) => m.name).join(", "),
                },
                {
                  key: "status",
                  title: t("Status"),
                  render: (r) => <Badge>{r.status}</Badge>,
                },
                {
                  key: "actions",
                  title: t("Actions"),
                  render: (r) => (
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/print/prescription/${r._id}`)}
                    >
                      {t("View")}
                    </Button>
                  ),
                },
              ]}
            />
          )}
          {tab === "Medical documents" && (
            <>
              <div className="card-head">
                <h3>{t("Medical documents")}</h3>
                <label className="btn secondary">
                  <Upload size={17} />
                  {uploading ? "Uploading…" : "Upload PDF / image"}
                  <input
                    hidden
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    disabled={uploading}
                    onChange={(e) => upload(e.target.files[0])}
                  />
                </label>
              </div>
              <Table
                rows={history.data?.documents}
                columns={[
                  { key: "title", title: "Document" },
                  {
                    key: "createdAt",
                    title: "Uploaded",
                    render: (r) => dateTime(r.createdAt, clinic.timezone),
                  },
                  {
                    key: "size",
                    title: "Size",
                    render: (r) => `${Math.round(r.size / 1024)} KB`,
                  },
                  {
                    key: "action",
                    title: t("Actions"),
                    render: (r) => (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          download(
                            `/documents/${r._id}/download`,
                            r.originalName,
                          ).catch((e) => notify(e.message, "error"))
                        }
                      >
                        Download
                      </Button>
                    ),
                  },
                ]}
              />
            </>
          )}
          {tab === "Billing history" && (
            <Table
              rows={bills.data?.items}
              columns={[
                { key: "number", title: "Invoice" },
                {
                  key: "total",
                  title: "Total",
                  render: (r) => money(r.netTotal),
                },
                {
                  key: "collected",
                  title: "Received",
                  render: (r) => money(r.collected),
                },
                {
                  key: "balance",
                  title: "Balance",
                  render: (r) => money(r.balance),
                },
                {
                  key: "action",
                  title: t("Actions"),
                  render: (r) => (
                    <Button
                      variant="ghost"
                      onClick={() => navigate(`/billing/${r._id}`)}
                    >
                      {t("View")}
                    </Button>
                  ),
                },
              ]}
            />
          )}
          {[
            "Appointments",
            "Consultations",
            "Prescriptions",
            "Medical documents",
          ].includes(tab) && (
            <Pager
              data={{
                total:
                  history.data?.totals?.[
                    {
                      Appointments: "appointments",
                      Consultations: "consultations",
                      Prescriptions: "prescriptions",
                      "Medical documents": "documents",
                    }[tab]
                  ] || 0,
                limit: history.data?.limit || 25,
              }}
              page={historyPage}
              setPage={setHistoryPage}
            />
          )}
        </section>
        {user.role === "owner" && (
          <div className="retention-action">
            <p>
              Records are archived only after the configured retention period.
            </p>
            <Button variant="ghost" onClick={() => setArchive(true)}>
              Archive patient
            </Button>
          </div>
        )}
      </State>
      {edit && <PatientForm patient={p} onClose={() => setEdit(false)} />}
      {appointment && (
        <AppointmentForm patientId={id} onClose={() => setAppointment(false)} />
      )}
      {archive && (
        <Confirm
          title="Archive patient record"
          onClose={() => setArchive(false)}
          busy={action.isPending}
          onConfirm={async (reason) => {
            try {
              await action.mutateAsync({
                url: `/patients/${id}/archive`,
                body: { reason },
              });
              setArchive(false);
              navigate("/patients");
            } catch {}
          }}
        />
      )}
    </>
  );
}
