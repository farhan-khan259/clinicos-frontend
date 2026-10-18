import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Printer,
  Plus,
  Save,
  CheckCircle2,
  History,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../contexts/Auth";
import {
  Button,
  PageHead,
  Table,
  State,
  Pager,
  Badge,
  Field,
  Textarea,
  Modal,
  Confirm,
  useData,
  useAction,
  dateTime,
  Empty,
} from "../components/ui";
const fields = [
  ["complaint", "Chief complaint"],
  ["symptoms", "Presenting symptoms"],
  ["hpi", "History of present illness"],
  ["pastHistory", "Relevant past history"],
  ["allergies", "Allergies"],
  ["currentMedications", "Current medications"],
  ["examination", "Physical examination"],
  ["workingDiagnosis", "Working diagnosis"],
  ["diagnosis", "Final diagnosis"],
  ["treatmentPlan", "Treatment plan"],
  ["advice", "Clinical advice"],
  ["followupInstructions", "Follow-up instructions"],
];
const numericVitals = [
  ["heartRate", "Heart rate (bpm)"],
  ["temperature", "Temperature (°C)"],
  ["weight", "Weight (kg)"],
  ["height", "Height (cm)"],
  ["spo2", "Oxygen saturation (%)"],
  ["respiratoryRate", "Respiratory rate"],
  ["glucose", "Blood glucose (mg/dL)"],
];
const blankMedicine = {
  name: "",
  strength: "",
  formulation: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  instructions: "",
};
export default function ClinicalList({ prescriptions = false }) {
  const { t } = useTranslation(),
    { clinic } = useAuth(),
    navigate = useNavigate(),
    [page, setPage] = useState(1);
  const query = useData(
    `/${prescriptions ? "prescriptions" : "consultations"}?page=${page}`,
  );
  return (
    <>
      <PageHead
        title={t(prescriptions ? "Prescriptions" : "Consultations")}
        eyebrow="CLINICAL WORKSPACE"
        description={
          prescriptions
            ? "Doctor-approved prescriptions, linked to the encounter."
            : "Drafts, signed encounters and a traceable patient history."
        }
      />
      <section className="card">
        <State query={query}>
          <Table
            rows={query.data?.items}
            columns={[
              {
                key: "createdAt",
                title: t("Date"),
                render: (r) => dateTime(r.createdAt, clinic.timezone),
              },
              {
                key: prescriptions ? "medicines" : "complaint",
                title: prescriptions ? "Medicines" : "Chief complaint",
                render: (r) =>
                  prescriptions
                    ? r.medicines.map((m) => m.name).join(", ")
                    : r.complaint || "Draft consultation",
              },
              {
                key: "diagnosis",
                title: prescriptions ? "Indication" : "Diagnosis",
                render: (r) => (prescriptions ? r.indication : r.diagnosis),
              },
              {
                key: "status",
                title: t("Status"),
                render: (r) => <Badge>{r.status}</Badge>,
              },
              {
                key: "action",
                title: t("Actions"),
                render: (r) => (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      navigate(
                        prescriptions
                          ? `/print/prescription/${r._id}`
                          : `/consultations/${r._id}`,
                      )
                    }
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
    </>
  );
}
export function Encounter() {
  const { id } = useParams(),
    { t } = useTranslation(),
    { user, clinic } = useAuth(),
    navigate = useNavigate(),
    action = useAction(),
    query = useData(`/consultations/${id}`);
  const c = query.data,
    pquery = useData(`/patients/${c?.patientId}`, !!c),
    history = useData(`/patients/${c?.patientId}/history`, !!c),
    dquery = useData(`/doctors/${c?.doctorId}`, !!c && user.role === "doctor");
  const [data, setData] = useState({}),
    [meds, setMeds] = useState([{ ...blankMedicine }]),
    [rxInfo, setRxInfo] = useState({
      indication: "",
      advice: "",
      followupDate: "",
    }),
    [tab, setTab] = useState("Notes"),
    [confirm, setConfirm] = useState(""),
    [versions, setVersions] = useState(false),
    [rx, setRx] = useState(null),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (c) {
      setData(
        Object.fromEntries([
          ...fields.map(([k]) => [k, c[k] || ""]),
          ["followupDate", c.followupDate || ""],
          ["diagnosisCode", c.diagnosisCode || ""],
          ["terminologyVersion", c.terminologyVersion || ""],
          [
            "vitals",
            c.vitals
              ? Object.fromEntries(
                  Object.entries(c.vitals).filter(([k]) => k !== "_id"),
                )
              : {},
          ],
        ]),
      );
      setDirty(false);
    }
  }, [c?._id, c?.updatedAt]);
  useEffect(() => {
    const p = history.data?.prescriptions.find((p) => p.consultationId === id);
    if (p) {
      setRx(p);
      setMeds(
        p.medicines.map((m) =>
          Object.fromEntries(Object.entries(m).filter(([k]) => k !== "_id")),
        ),
      );
      setRxInfo({
        indication: p.indication || "",
        advice: p.advice || "",
        followupDate: p.followupDate || "",
      });
    }
  }, [history.data, id]);
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const canEdit = user.role === "doctor",
    readOnly = !canEdit || (c?.status === "signed" && confirm !== "amend-edit");
  const set = (k) => (e) => {
    setDirty(true);
    setData((x) => ({ ...x, [k]: e.target.value }));
  };
  async function save() {
    try {
      await action.mutateAsync({
        url: `/consultations/${id}`,
        method: "PATCH",
        body: data,
      });
      setDirty(false);
    } catch {}
  }
  async function saveRx() {
    try {
      const p = await action.mutateAsync({
        url: `/consultations/${id}/prescription`,
        method: "PUT",
        body: { medicines: meds, ...rxInfo },
      });
      setRx(p);
    } catch {}
  }
  async function approval(reason) {
    try {
      if (confirm === "sign") {
        await action.mutateAsync({
          url: `/consultations/${id}`,
          method: "PATCH",
          body: data,
        });
        await action.mutateAsync({ url: `/consultations/${id}/sign` });
      }
      if (confirm === "amend")
        await action.mutateAsync({
          url: `/consultations/${id}/amend`,
          body: { data, reason },
        });
      if (confirm === "sign-rx") {
        const p = await action.mutateAsync({
          url: `/consultations/${id}/prescription`,
          method: "PUT",
          body: { medicines: meds, ...rxInfo },
        });
        await action.mutateAsync({ url: `/prescriptions/${p._id}/sign` });
      }
      if (confirm === "amend-rx")
        await action.mutateAsync({
          url: `/prescriptions/${rx._id}/amend`,
          body: { data: { medicines: meds, ...rxInfo }, reason },
        });
      if (confirm === "cancel-rx")
        await action.mutateAsync({
          url: `/prescriptions/${rx._id}/cancel`,
          body: { reason },
        });
      setConfirm("");
      setDirty(false);
    } catch {}
  }
  return (
    <>
      <Button variant="ghost" onClick={() => navigate("/consultations")}>
        <ArrowLeft size={17} />
        Consultations
      </Button>
      <State query={query}>
        <PageHead
          eyebrow="PATIENT ENCOUNTER"
          title={pquery.data?.name || "Consultation"}
          description={`${pquery.data?.mrn || ""} · ${dateTime(c?.createdAt, clinic.timezone)}`}
        >
          <Badge>{c?.status}</Badge>
          <Button
            variant="secondary"
            onClick={() => navigate(`/print/consultation/${id}`)}
          >
            <Printer size={16} />
            {t("Print")}
          </Button>
          {canEdit && c?.status === "draft" && (
            <>
              <Button
                variant="secondary"
                onClick={save}
                busy={action.isPending}
              >
                <Save size={16} />
                {t("Save draft")}
              </Button>
              <Button onClick={() => setConfirm("sign")}>
                <CheckCircle2 size={16} />
                {t("Sign consultation")}
              </Button>
            </>
          )}
          {canEdit && c?.status === "signed" && (
            <Button
              variant="secondary"
              onClick={() => {
                setConfirm("amend-edit");
                setTab("Notes");
              }}
            >
              Amend record
            </Button>
          )}
        </PageHead>
        {pquery.data?.allergies && (
          <div className="notice warning">
            <strong>Recorded allergies: </strong>
            {pquery.data.allergies}
          </div>
        )}
        <div className="encounter-layout">
          <aside className="card patient-timeline">
            <div className="card-head">
              <h3>{t("Visit history")}</h3>
              <History size={18} />
            </div>
            {history.data?.consultations
              .filter((x) => x._id !== id)
              .map((h) => (
                <button
                  className="timeline-entry"
                  key={h._id}
                  onClick={() => navigate(`/consultations/${h._id}`)}
                >
                  <small>{dateTime(h.createdAt, clinic.timezone)}</small>
                  <strong>{h.complaint || "Draft encounter"}</strong>
                  <p>{h.diagnosis || "—"}</p>
                  <Badge>{h.status}</Badge>
                </button>
              ))}
            {!history.data?.consultations.filter((x) => x._id !== id)
              .length && <p className="muted">No previous consultations.</p>}
            <Button
              variant="ghost"
              onClick={() => navigate(`/patients/${c?.patientId}`)}
            >
              Open patient profile →
            </Button>
            <Button variant="ghost" onClick={() => setVersions(true)}>
              Signed version history ({c?.versions?.length || 0})
            </Button>
          </aside>
          <section className="card encounter-editor">
            <div className="tabs">
              {["Notes", "Vitals", "Prescription", "Follow-up"].map((x) => (
                <button
                  className={tab === x ? "active" : ""}
                  onClick={() => setTab(x)}
                  key={x}
                >
                  {t(x)}
                </button>
              ))}
            </div>
            {tab === "Notes" && (
              <div className="form-grid">
                {fields.map(([k, l]) => (
                  <Textarea
                    key={k}
                    label={t(l)}
                    value={data[k] || ""}
                    onChange={set(k)}
                    disabled={readOnly}
                  />
                ))}
                <Field
                  label="Diagnosis code (optional)"
                  value={data.diagnosisCode || ""}
                  disabled={readOnly}
                  onChange={set("diagnosisCode")}
                />
                <Field
                  label="Terminology / version (optional)"
                  value={data.terminologyVersion || ""}
                  disabled={readOnly}
                  onChange={set("terminologyVersion")}
                />
              </div>
            )}
            {tab === "Vitals" && (
              <>
                <p className="muted">
                  Record only the vitals relevant to this consultation.
                </p>
                <div className="form-grid">
                  <Field
                    label="Blood pressure (mmHg)"
                    value={data.vitals?.bp || ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        vitals: { ...d.vitals, bp: e.target.value },
                      }))
                    }
                  />
                  {numericVitals.map(([k, l]) => (
                    <Field
                      key={k}
                      label={l}
                      type="number"
                      step="0.1"
                      value={data.vitals?.[k] ?? ""}
                      disabled={readOnly}
                      onChange={(e) => {
                        const v = { ...data.vitals };
                        if (e.target.value === "") delete v[k];
                        else v[k] = Number(e.target.value);
                        setData((d) => ({ ...d, vitals: v }));
                        setDirty(true);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            {tab === "Follow-up" && (
              <>
                <Field
                  label="Follow-up date"
                  type="date"
                  value={data.followupDate || ""}
                  disabled={readOnly}
                  onChange={set("followupDate")}
                />
                <Textarea
                  label="Follow-up instructions"
                  value={data.followupInstructions || ""}
                  disabled={readOnly}
                  onChange={set("followupInstructions")}
                />
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(`/appointments?patient=${c?.patientId}`)
                  }
                >
                  Schedule follow-up appointment
                </Button>
              </>
            )}
            {tab === "Prescription" && (
              <>
                <div className="notice">
                  Medicine, dose, frequency and duration are entered and
                  approved by the prescribing doctor.
                </div>
                {rx && <Badge>{rx.status}</Badge>}
                <div className="rx-favorites">
                  {canEdit && (
                    <select
                      className="input"
                      aria-label="Favorite medicine"
                      value=""
                      onChange={(e) => {
                        const m = dquery.data?.favorites.find(
                          (m) => m._id === e.target.value,
                        );
                        if (m)
                          setMeds((x) => [
                            ...x,
                            {
                              ...blankMedicine,
                              ...Object.fromEntries(
                                Object.entries(m).filter(([k]) => k !== "_id"),
                              ),
                            },
                          ]);
                      }}
                    >
                      <option value="">Add from doctor favorites</option>
                      {dquery.data?.favorites.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} {m.strength}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {meds.map((m, i) => (
                  <div className="medicine-row" key={i}>
                    <div className="medicine-heading">
                      <strong>Medicine {i + 1}</strong>
                      {canEdit &&
                        (!rx ||
                          rx.status === "draft" ||
                          confirm === "rx-edit") && (
                          <button
                            className="icon-btn"
                            aria-label="Remove medicine"
                            onClick={() =>
                              setMeds(meds.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                    </div>
                    <div className="form-grid three">
                      {Object.entries(blankMedicine).map(([k]) => (
                        <Field
                          key={k}
                          label={
                            k === "name"
                              ? "Medicine name"
                              : k[0].toUpperCase() + k.slice(1)
                          }
                          value={m[k] || ""}
                          disabled={
                            !canEdit ||
                            (rx &&
                              rx.status !== "draft" &&
                              confirm !== "rx-edit")
                          }
                          onChange={(e) =>
                            setMeds((x) =>
                              x.map((a, j) =>
                                j === i ? { ...a, [k]: e.target.value } : a,
                              ),
                            )
                          }
                        />
                      ))}
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          try {
                            const current = dquery.data?.favorites || [];
                            await action.mutateAsync({
                              url: `/doctors/${c.doctorId}/favorites`,
                              method: "PUT",
                              body: [
                                ...current.map((m) =>
                                  Object.fromEntries(
                                    Object.entries(m).filter(
                                      ([k]) => k !== "_id",
                                    ),
                                  ),
                                ),
                                {
                                  name: m.name,
                                  strength: m.strength,
                                  formulation: m.formulation,
                                  route: m.route,
                                  instructions: m.instructions,
                                },
                              ],
                            });
                          } catch {}
                        }}
                      >
                        Save as favorite
                      </Button>
                    )}
                  </div>
                ))}
                {canEdit &&
                  (!rx || rx.status === "draft" || confirm === "rx-edit") && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setMeds((x) => [...x, { ...blankMedicine }])
                      }
                    >
                      <Plus size={16} />
                      {t("Add medicine")}
                    </Button>
                  )}
                <div className="form-grid">
                  <Textarea
                    label="General advice"
                    value={rxInfo.advice}
                    disabled={
                      !canEdit ||
                      (rx && rx.status !== "draft" && confirm !== "rx-edit")
                    }
                    onChange={(e) =>
                      setRxInfo({ ...rxInfo, advice: e.target.value })
                    }
                  />
                  <Field
                    label="Follow-up date"
                    type="date"
                    value={rxInfo.followupDate}
                    disabled={
                      !canEdit ||
                      (rx && rx.status !== "draft" && confirm !== "rx-edit")
                    }
                    onChange={(e) =>
                      setRxInfo({ ...rxInfo, followupDate: e.target.value })
                    }
                  />
                </div>
                <div className="form-actions">
                  {rx && (
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/print/prescription/${rx._id}`)}
                    >
                      <Printer size={16} />
                      {t("Print")}
                    </Button>
                  )}
                  {canEdit && (!rx || rx.status === "draft") && (
                    <>
                      <Button
                        variant="secondary"
                        busy={action.isPending}
                        onClick={saveRx}
                      >
                        {t("Save draft")}
                      </Button>
                      <Button
                        disabled={c.status !== "signed"}
                        onClick={() => setConfirm("sign-rx")}
                      >
                        {t("Sign prescription")}
                      </Button>
                    </>
                  )}
                  {canEdit && rx?.status === "signed" && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setConfirm("rx-edit")}
                      >
                        Amend prescription
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirm("cancel-rx")}
                      >
                        Cancel prescription
                      </Button>
                    </>
                  )}
                  {confirm === "rx-edit" && (
                    <Button onClick={() => setConfirm("amend-rx")}>
                      Approve amendment
                    </Button>
                  )}
                </div>
              </>
            )}
            {confirm === "amend-edit" && (
              <div className="form-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setConfirm("");
                    query.refetch();
                  }}
                >
                  Discard edits
                </Button>
                <Button onClick={() => setConfirm("amend")}>
                  Save justified amendment
                </Button>
              </div>
            )}
          </section>
        </div>
      </State>
      {["sign", "amend", "sign-rx", "amend-rx", "cancel-rx"].includes(
        confirm,
      ) && (
        <Confirm
          title={
            confirm.includes("rx")
              ? "Approve prescription action"
              : "Approve consultation action"
          }
          reasonRequired={!["sign", "sign-rx"].includes(confirm)}
          onClose={() => setConfirm("")}
          busy={action.isPending}
          onConfirm={approval}
        />
      )}
      {versions && (
        <Modal
          wide
          title="Signed record versions"
          onClose={() => setVersions(false)}
        >
          {c?.versions.map((v, i) => (
            <div className="version" key={i}>
              <strong>
                Version {i + 1} · {v.reason}
              </strong>
              <p>
                {dateTime(v.at, clinic.timezone)} · Author {v.authorId}
              </p>
              <pre>{JSON.stringify(v.snapshot, null, 2)}</pre>
              <small>SHA-256: {v.hash}</small>
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}
