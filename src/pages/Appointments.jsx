import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, CalendarDays, Printer, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/Auth";
import {
  Button,
  PageHead,
  State,
  Table,
  Pager,
  Badge,
  useData,
  today,
  dateTime,
  money,
  useAction,
  Confirm,
  Empty,
} from "../components/ui";
import { AppointmentForm, DoctorForm } from "../components/forms";
export default function Appointments() {
  const { t } = useTranslation(),
    { clinic, user } = useAuth(),
    navigate = useNavigate(),
    action = useAction();
  const [date, setDate] = useState(today(clinic.timezone)),
    [doctor, setDoctor] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [form, setForm] = useState(
      new URLSearchParams(location.search).get("patient") ? {} : null,
    ),
    [change, setChange] = useState(null),
    [mode, setMode] = useState("list");
  const docs = useData("/doctors?limit=100"),
    query = useData(
      `/appointments?date=${date}&doctorId=${doctor}&status=${status}&page=${page}&limit=${mode === "calendar" ? 100 : 25}`,
    );
  async function check(a) {
    try {
      await action.mutateAsync({ url: `/appointments/${a._id}/check-in` });
    } catch {}
  }
  async function start(a) {
    try {
      const c = await action.mutateAsync({
        url: "/consultations/start",
        body: { appointmentId: a._id },
      });
      navigate(`/consultations/${c._id}`);
    } catch {}
  }
  const columns = [
    {
      key: "patient",
      title: t("Patient"),
      render: (r) => (
        <div className="person-cell">
          <span>{r.patient?.name?.[0]}</span>
          <div>
            <strong>{r.patient?.name}</strong>
            <small>
              {r.patient?.mrn} · {r.type}
            </small>
          </div>
        </div>
      ),
    },
    {
      key: "startAt",
      title: "Time",
      render: (r) =>
        new Intl.DateTimeFormat("en-GB", {
          timeZone: clinic.timezone,
          timeStyle: "short",
        }).format(new Date(r.startAt)),
    },
    { key: "doctor", title: t("Doctor"), render: (r) => r.doctor?.name },
    {
      key: "status",
      title: t("Status"),
      render: (r) => <Badge>{r.status}</Badge>,
    },
    { key: "token", title: "Token" },
    {
      key: "actions",
      title: t("Actions"),
      render: (r) => (
        <div className="row-actions">
          {r.status === "Scheduled" && (
            <>
              <Button
                variant="secondary"
                onClick={() => check(r)}
                busy={action.isPending}
              >
                {t("Check in")}
              </Button>
              <Button variant="ghost" onClick={() => setForm(r)}>
                {t("Edit")}
              </Button>
            </>
          )}
          {r.token && (
            <button
              className="icon-btn"
              aria-label="Print token"
              onClick={() => navigate(`/print/token/${r._id}`)}
            >
              <Printer size={17} />
            </button>
          )}
          {user.role === "doctor" &&
            ["Waiting", "In Consultation"].includes(r.status) && (
              <Button onClick={() => start(r)}>
                {t("Start consultation")}
              </Button>
            )}
          {["Scheduled", "Waiting"].includes(r.status) && (
            <select
              aria-label="Change appointment status"
              value=""
              onChange={(e) => {
                if (e.target.value) setChange({ a: r, status: e.target.value });
              }}
            >
              <option value="">More</option>
              <option>Cancelled</option>
              <option>No Show</option>
            </select>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="APPOINTMENT PLANNER"
        title={t("Appointments")}
        description="Keep your schedule clear and your patient flow smooth."
      >
        <Button onClick={() => setForm({})}>
          <Plus size={17} />
          {t("New appointment")}
        </Button>
      </PageHead>
      <section className="card">
        <div className="list-toolbar">
          <div className="filters">
            <input
              aria-label="Appointment date"
              className="input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="input"
              aria-label="Doctor filter"
              value={doctor}
              onChange={(e) => {
                setDoctor(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All doctors</option>
              {docs.data?.items.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              aria-label="Status filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {[
                "Scheduled",
                "Waiting",
                "In Consultation",
                "Completed",
                "Cancelled",
                "No Show",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="segmented">
            <button
              className={mode === "list" ? "active" : ""}
              onClick={() => setMode("list")}
            >
              List
            </button>
            <button
              className={mode === "calendar" ? "active" : ""}
              onClick={() => setMode("calendar")}
            >
              Calendar
            </button>
          </div>
        </div>
        <State query={query}>
          {mode === "list" ? (
            <Table rows={query.data?.items} columns={columns} />
          ) : (
            <div className="calendar-grid">
              {(doctor
                ? docs.data?.items.filter((d) => d._id === doctor)
                : docs.data?.items
              )?.map((d) => (
                <div className="calendar-column" key={d._id}>
                  <h3>{d.name}</h3>
                  <small>{d.specialization}</small>
                  {query.data?.items
                    .filter((a) => a.doctorId === d._id)
                    .map((a) => (
                      <article key={a._id}>
                        <strong>
                          {new Intl.DateTimeFormat("en-GB", {
                            timeZone: clinic.timezone,
                            timeStyle: "short",
                          }).format(new Date(a.startAt))}
                        </strong>
                        <p>{a.patient?.name}</p>
                        <Badge>{a.status}</Badge>
                        <div className="row-actions">
                          {a.status === "Scheduled" && (
                            <Button
                              variant="secondary"
                              onClick={() => check(a)}
                            >
                              {t("Check in")}
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              ))}
            </div>
          )}
          <Pager data={query.data} {...{ page, setPage }} />
        </State>
      </section>
      {form && (
        <AppointmentForm
          appointment={form._id ? form : null}
          patientId={
            new URLSearchParams(location.search).get("patient") || undefined
          }
          onClose={() => setForm(null)}
        />
      )}
      {change && (
        <Confirm
          title={`Mark ${change.status}`}
          busy={action.isPending}
          onClose={() => setChange(null)}
          onConfirm={async (reason) => {
            try {
              await action.mutateAsync({
                url: `/appointments/${change.a._id}/status`,
                body: { status: change.status, reason },
              });
              setChange(null);
            } catch {}
          }}
        />
      )}
    </>
  );
}
export function Queue() {
  const { t } = useTranslation(),
    { user } = useAuth(),
    navigate = useNavigate(),
    action = useAction();
  const [doctor, setDoctor] = useState(
      user.role === "doctor" ? user.doctorId : "",
    ),
    [skip, setSkip] = useState(null),
    [form, setForm] = useState(false);
  const docs = useData("/doctors?limit=100"),
    query = useData(`/queue?doctorId=${doctor}`);
  query.refetchInterval = 10000;
  async function call() {
    try {
      await action.mutateAsync({ url: `/queue/${doctor}/next` });
    } catch {}
  }
  async function start(a) {
    try {
      const c = await action.mutateAsync({
        url: "/consultations/start",
        body: { appointmentId: a._id },
      });
      navigate(`/consultations/${c._id}`);
    } catch {}
  }
  return (
    <>
      <PageHead
        title={t("Live queue")}
        eyebrow="PATIENT FLOW"
        description="Call, consult and keep the day moving."
      >
        <Button variant="secondary" onClick={() => query.refetch()}>
          Refresh
        </Button>
        <Button onClick={() => setForm(true)}>
          <Plus size={16} />
          Walk-in appointment
        </Button>
      </PageHead>
      <div className="queue-toolbar">
        <select
          className="input"
          value={doctor}
          aria-label="Doctor queue"
          onChange={(e) => setDoctor(e.target.value)}
        >
          <option value="">All doctors</option>
          {docs.data?.items
            .filter((d) => user.role !== "doctor" || d._id === user.doctorId)
            .map((d) => (
              <option value={d._id} key={d._id}>
                {d.name}
              </option>
            ))}
        </select>
        <Button disabled={!doctor} onClick={call} busy={action.isPending}>
          {t("Call next")}
          <ArrowRight size={17} />
        </Button>
        <small>{query.data?.length || 0} active patients</small>
      </div>
      <State query={query}>
        {query.data?.length ? (
          <div className="queue-cards">
            {query.data?.map((a) => (
              <article
                className={`queue-card ${a.status === "In Consultation" ? "called" : ""}`}
                key={a._id}
              >
                <div className="token-number">
                  {a.token}
                  <small>Position {a.position}</small>
                </div>
                <div>
                  <h3>{a.patient?.name}</h3>
                  <p>
                    {a.patient?.mrn} ·{" "}
                    {docs.data?.items.find((d) => d._id === a.doctorId)?.name}
                  </p>
                  <span>
                    <Clock size={14} />
                    {Math.max(
                      0,
                      Math.floor(
                        (Date.now() - new Date(a.checkedInAt)) / 60000,
                      ),
                    )}{" "}
                    min since check-in
                  </span>
                </div>
                <Badge>{a.status}</Badge>
                <div className="row-actions">
                  {user.role === "doctor" && (
                    <Button onClick={() => start(a)}>
                      {t("Start consultation")}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/print/token/${a._id}`)}
                  >
                    <Printer size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setSkip({
                        a,
                        status:
                          a.status === "In Consultation"
                            ? "Waiting"
                            : "No Show",
                      })
                    }
                  >
                    Skip / requeue
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="The queue is clear"
            description="Checked-in patients will appear here."
          />
        )}
      </State>
      {skip && (
        <Confirm
          title="Queue action"
          onClose={() => setSkip(null)}
          busy={action.isPending}
          onConfirm={async (reason) => {
            try {
              await action.mutateAsync({
                url: `/appointments/${skip.a._id}/status`,
                body: { status: skip.status, reason },
              });
              setSkip(null);
            } catch {}
          }}
        />
      )}
      {form && <AppointmentForm onClose={() => setForm(false)} />}
    </>
  );
}
export function Doctors() {
  const { t } = useTranslation(),
    { user } = useAuth(),
    query = useData("/doctors?limit=100"),
    [form, setForm] = useState(null),
    canWrite = ["owner", "manager"].includes(user.role);
  return (
    <>
      <PageHead
        title={t("Doctors")}
        eyebrow="CARE TEAM"
        description="Manage availability, fees and clinic schedules."
      >
        {canWrite && (
          <Button onClick={() => setForm({})}>
            <Plus size={17} />
            {t("Add doctor")}
          </Button>
        )}
      </PageHead>
      <State query={query}>
        <div className="doctor-grid">
          {query.data?.items.map((d) => (
            <section className="card doctor-card" key={d._id}>
              <div className="doctor-avatar">
                {d.photo ? (
                  <img src={d.photo} alt={d.name} />
                ) : (
                  d.name.replace("Dr. ", "").slice(0, 1)
                )}
              </div>
              <Badge>{d.active ? "Active" : "Inactive"}</Badge>
              <h3>{d.name}</h3>
              <p>{d.specialization}</p>
              <small>
                {d.qualification} · {d.registration}
              </small>
              <div className="doctor-details">
                <div>
                  <span>Consultation</span>
                  <strong>{money(d.fee)}</strong>
                </div>
                <div>
                  <span>Follow-up</span>
                  <strong>{money(d.followupFee)}</strong>
                </div>
              </div>
              <p className="doctor-schedule">
                {d.duration}-minute slots ·{" "}
                {d.sessions.map((s) => `${s.start}–${s.end}`).join(" / ")}
              </p>
              {canWrite && (
                <Button variant="secondary" onClick={() => setForm(d)}>
                  {t("Edit")} schedule & details
                </Button>
              )}
            </section>
          ))}
        </div>
        {!query.data?.items.length && <Empty />}
      </State>
      {form && (
        <DoctorForm
          doctor={form._id ? form : null}
          onClose={() => setForm(null)}
        />
      )}
    </>
  );
}
