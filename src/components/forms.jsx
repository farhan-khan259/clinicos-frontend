import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth, isClinical } from "../contexts/Auth";
import {
  Button,
  Field,
  Modal,
  Select,
  Textarea,
  useAction,
  useData,
  useDebounce,
  minor,
  money,
  useNotify,
} from "./ui";
import { api } from "../services/api";
export function PatientPicker({ value, onChange, label = "Patient" }) {
  const [q, setQ] = useState(""),
    dq = useDebounce(q),
    { t } = useTranslation();
  const query = useData(`/patients?q=${encodeURIComponent(dq)}&limit=15`);
  const chosen = useData(`/patients/${value}`, !!value);
  return (
    <Field label={t(label)}>
      <div className="picker">
        <input
          className="input"
          placeholder={
            chosen.data
              ? `${chosen.data.name} · ${chosen.data.mrn}`
              : t("Search patients")
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {(!value || q) && (
          <div className="picker-results">
            {query.data?.items.map((p) => (
              <button
                type="button"
                key={p._id}
                onClick={() => {
                  onChange(p._id);
                  setQ("");
                }}
              >
                <strong>{p.name}</strong>
                <small>
                  {p.mrn} · {p.mobile}
                </small>
              </button>
            ))}
            {!query.data?.items.length && <small>No matching patients</small>}
          </div>
        )}
      </div>
    </Field>
  );
}
export function PatientForm({ patient, onClose, onSaved }) {
  const { t } = useTranslation(),
    { user } = useAuth(),
    action = useAction(),
    notify = useNotify(),
    [matches, setMatches] = useState([]),
    [confirmed, setConfirmed] = useState(false);
  const schema = z.object({
    name: z.string().trim().min(2, "Enter full name"),
    gender: z.string().min(1),
    mobile: z.string(),
    age: z.coerce.number().min(0).max(125).optional(),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: patient?.name || "",
      gender: patient?.gender || "Unspecified",
      mobile: patient?.mobile || "",
      age: patient?.age,
    },
  });
  const [extra, setExtra] = useState(
    Object.fromEntries(
      [
        "dob",
        "alternateContact",
        "address",
        "city",
        "emergencyContact",
        "bloodGroup",
        "cnic",
        "allergies",
        "medicalHistory",
        "conditions",
        "surgeries",
        "medications",
        "notes",
      ].map((k) => [k, patient?.[k] || ""]),
    ),
  );
  const change = (k) => (e) => setExtra((x) => ({ ...x, [k]: e.target.value }));
  async function submit(data) {
    try {
      if (!patient && !confirmed) {
        const m = await api(
          `/patients/matches?name=${encodeURIComponent(data.name)}&mobile=${encodeURIComponent(data.mobile)}`,
        );
        if (m.length) {
          setMatches(m);
          setConfirmed(true);
          return;
        }
      }
      const payload = { ...data, ...extra };
      if (data.age === undefined || Number.isNaN(data.age)) delete payload.age;
      const p = await action.mutateAsync({
        url: patient ? `/patients/${patient._id}` : "/patients",
        method: patient ? "PATCH" : "POST",
        body: payload,
      });
      onSaved?.(p);
      onClose();
    } catch (e) {
      if (!action.error) notify(e.message, "error");
    }
  }
  return (
    <Modal
      wide
      title={t(patient ? "Edit" : "Register patient")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)}>
        {matches.length > 0 && (
          <div className="notice warning">
            <strong>Possible existing patient</strong>
            <p>{matches.map((p) => `${p.name} (${p.mrn})`).join(", ")}</p>
            <p>
              Review these matches. Saving again creates a separate patient;
              records are never merged automatically.
            </p>
          </div>
        )}
        <div className="form-grid">
          <Field label={t("Name")} error={errors.name?.message} required>
            <input className="input" autoFocus {...register("name")} />
          </Field>
          <Field label={t("Mobile")} error={errors.mobile?.message}>
            <input className="input" {...register("mobile")} />
          </Field>
          <Field label={t("Age")} error={errors.age?.message}>
            <input
              className="input"
              type="number"
              min="0"
              max="125"
              {...register("age", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          </Field>
          <Select label={t("Gender")} {...register("gender")}>
            {["Unspecified", "Male", "Female", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Field
            label={t("Date of birth")}
            type="date"
            value={extra.dob}
            onChange={change("dob")}
          />
          {[
            ["alternateContact", "Alternate contact"],
            ["city", "City"],
            ["address", "Address"],
            ["emergencyContact", "Emergency contact"],
            ["bloodGroup", "Blood group"],
            ["cnic", "CNIC (optional)"],
          ].map(([k, l]) => (
            <Field key={k} label={t(l)} value={extra[k]} onChange={change(k)} />
          ))}
        </div>
        {isClinical(user) && (
          <>
            <h3>{t("Medical information")}</h3>
            <div className="form-grid">
              {[
                ["allergies", "Allergies"],
                ["medicalHistory", "Medical history"],
                ["conditions", "Existing conditions"],
                ["surgeries", "Previous surgeries"],
                ["medications", "Current medications"],
                ["notes", "Patient notes"],
              ].map(([k, l]) => (
                <Textarea
                  key={k}
                  label={t(l)}
                  value={extra[k]}
                  onChange={change(k)}
                />
              ))}
            </div>
          </>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button busy={action.isPending}>{t("Save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
export function localISO(value, tz) {
  const base = new Date(`${value}:00Z`);
  const p = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "longOffset",
  })
    .formatToParts(base)
    .find((p) => p.type === "timeZoneName").value;
  const m = p.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset = m ? (m[1] === "+" ? 1 : -1) * (+m[2] * 60 + +m[3]) : 0;
  return new Date(base.getTime() - offset * 60000).toISOString();
}
export function AppointmentForm({ appointment, patientId, onClose, onSaved }) {
  const { t } = useTranslation(),
    { clinic, user } = useAuth(),
    action = useAction(),
    docs = useData("/doctors?limit=100");
  const [data, setData] = useState({
    patientId: appointment?.patientId || patientId || "",
    doctorId:
      appointment?.doctorId || (user.role === "doctor" ? user.doctorId : ""),
    type: appointment?.type || "Consultation",
    reason: appointment?.reason || "",
    notes: appointment?.notes || "",
  });
  const [time, setTime] = useState(
    appointment
      ? new Intl.DateTimeFormat("sv-SE", {
          timeZone: clinic.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
          .format(new Date(appointment.startAt))
          .replace(" ", "T")
      : "",
  );
  const notify = useNotify();
  const [registering, setRegistering] = useState(false);
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));
  const doctor = docs.data?.items.find((d) => d._id === data.doctorId);
  async function submit(e) {
    e.preventDefault();
    try {
      const a = await action.mutateAsync({
        url: appointment ? `/appointments/${appointment._id}` : "/appointments",
        method: appointment ? "PATCH" : "POST",
        body: { ...data, startAt: localISO(time, clinic.timezone) },
      });
      onSaved?.(a);
      onClose();
    } catch (err) {
      if (!action.error) notify(err.message, "error");
    }
  }
  return (
    <>
      <Modal
        title={t(appointment ? "Edit" : "New appointment")}
        onClose={onClose}
      >
        <form onSubmit={submit}>
          <PatientPicker
            value={data.patientId}
            onChange={(v) => setData((d) => ({ ...d, patientId: v }))}
          />
          <button
            type="button"
            className="text-link"
            onClick={() => setRegistering(true)}
          >
            + {t("Register patient")}
          </button>
          <Select
            required
            label={t("Doctor")}
            value={data.doctorId}
            onChange={set("doctorId")}
          >
            <option value="">Select doctor</option>
            {docs.data?.items
              .filter(
                (d) =>
                  d.active &&
                  (user.role !== "doctor" || d._id === user.doctorId),
              )
              .map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
          </Select>
          {doctor && (
            <div className="notice">
              {doctor.sessions.map((s, i) => (
                <small key={i}>
                  {s.days
                    .map(
                      (d) =>
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d],
                    )
                    .join(", ")}{" "}
                  · {s.start}–{s.end}
                  <br />
                </small>
              ))}
            </div>
          )}
          <Field
            label={`${t("Date")} & time (${clinic.timezone})`}
            required
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <Select label="Visit type" value={data.type} onChange={set("type")}>
            {["Consultation", "Follow-up", "Walk-in"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Select>
          <Field
            label="Visit reason"
            value={data.reason}
            onChange={set("reason")}
          />
          <Textarea
            label="Appointment notes"
            value={data.notes}
            onChange={set("notes")}
          />
          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button
              disabled={!data.patientId || !data.doctorId || !time}
              busy={action.isPending}
            >
              {t("Save")}
            </Button>
          </div>
        </form>
      </Modal>
      {registering && (
        <PatientForm
          onClose={() => setRegistering(false)}
          onSaved={(p) => setData((d) => ({ ...d, patientId: p._id }))}
        />
      )}
    </>
  );
}
export function DoctorForm({ doctor, onClose }) {
  const { t } = useTranslation(),
    action = useAction();
  const [photo, setPhoto] = useState(null);
  const [d, set] = useState({
    name: doctor?.name || "",
    specialization: doctor?.specialization || "",
    qualification: doctor?.qualification || "",
    registration: doctor?.registration || "",
    phone: doctor?.phone || "",
    email: doctor?.email || "",
    fee: (doctor?.fee ?? 150000) / 100,
    followupFee: (doctor?.followupFee ?? 100000) / 100,
    duration: doctor?.duration || 15,
    active: doctor?.active ?? true,
    sessions: doctor?.sessions?.map(({ days, start, end }) => ({
      days,
      start,
      end,
    })) || [
      { days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "13:00" },
      { days: [1, 2, 3, 4, 5, 6], start: "15:00", end: "21:00" },
    ],
    leaves: doctor?.leaves?.map(({ date, reason }) => ({ date, reason })) || [],
  });
  const change = (k) => (e) =>
    set({
      ...d,
      [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value,
    });
  async function submit(e) {
    e.preventDefault();
    try {
      const saved = await action.mutateAsync({
        url: doctor ? `/doctors/${doctor._id}` : "/doctors",
        method: doctor ? "PATCH" : "POST",
        body: { ...d, fee: minor(d.fee), followupFee: minor(d.followupFee) },
      });
      if (photo) {
        const body = new FormData();
        body.append("file", photo);
        await action.mutateAsync({ url: `/doctors/${saved._id}/photo`, body });
      }
      onClose();
    } catch {}
  }
  return (
    <Modal title={t(doctor ? "Edit" : "Add doctor")} wide onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          {[
            ["name", "Name"],
            ["specialization", "Specialization"],
            ["qualification", "Qualification"],
            ["registration", "Professional registration"],
            ["phone", "Mobile"],
            ["email", "Email"],
            ["fee", "Consultation fee (PKR)"],
            ["followupFee", "Follow-up fee (PKR)"],
            ["duration", "Appointment duration (minutes)"],
          ].map(([k, l]) => (
            <Field
              key={k}
              required={k === "name"}
              label={t(l)}
              type={
                ["fee", "followupFee", "duration"].includes(k)
                  ? "number"
                  : k === "email"
                    ? "email"
                    : "text"
              }
              min="0"
              step={k === "duration" ? "1" : "0.01"}
              value={d[k]}
              onChange={change(k)}
            />
          ))}
        </div>
        <Field
          label="Profile photo (PNG / JPEG)"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setPhoto(e.target.files[0])}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={d.active}
            onChange={(e) => set({ ...d, active: e.target.checked })}
          />
          Active doctor
        </label>
        <h3>Availability & breaks</h3>
        {d.sessions.map((s, i) => (
          <div className="session-row" key={i}>
            <div className="days">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, n) => (
                <button
                  type="button"
                  key={n}
                  className={s.days.includes(n) ? "selected" : ""}
                  aria-label={
                    [
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ][n]
                  }
                  onClick={() =>
                    set({
                      ...d,
                      sessions: d.sessions.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              days: x.days.includes(n)
                                ? x.days.filter((v) => v !== n)
                                : [...x.days, n],
                            }
                          : x,
                      ),
                    })
                  }
                >
                  {day}
                </button>
              ))}
            </div>
            <input
              className="input"
              type="time"
              value={s.start}
              required
              onChange={(e) =>
                set({
                  ...d,
                  sessions: d.sessions.map((x, j) =>
                    j === i ? { ...x, start: e.target.value } : x,
                  ),
                })
              }
            />
            <input
              className="input"
              type="time"
              value={s.end}
              required
              onChange={(e) =>
                set({
                  ...d,
                  sessions: d.sessions.map((x, j) =>
                    j === i ? { ...x, end: e.target.value } : x,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                set({ ...d, sessions: d.sessions.filter((_, j) => i !== j) })
              }
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            set({
              ...d,
              sessions: [
                ...d.sessions,
                { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
              ],
            })
          }
        >
          Add session
        </Button>
        <h3>Days off / leave</h3>
        {d.leaves.map((l, i) => (
          <div className="session-row" key={i}>
            <input
              type="date"
              required
              className="input"
              value={l.date}
              onChange={(e) =>
                set({
                  ...d,
                  leaves: d.leaves.map((x, j) =>
                    i === j ? { ...x, date: e.target.value } : x,
                  ),
                })
              }
            />
            <input
              className="input"
              placeholder="Reason"
              value={l.reason}
              onChange={(e) =>
                set({
                  ...d,
                  leaves: d.leaves.map((x, j) =>
                    i === j ? { ...x, reason: e.target.value } : x,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                set({ ...d, leaves: d.leaves.filter((_, j) => j !== i) })
              }
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            set({ ...d, leaves: [...d.leaves, { date: "", reason: "" }] })
          }
        >
          Add day off
        </Button>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button busy={action.isPending}>{t("Save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
