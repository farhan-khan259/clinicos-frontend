import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/Auth";
import { Button, State, useData, money, dateTime } from "../components/ui";
function PrintTable({ rows, columns }) {
  const { t } = useTranslation();
  return (
    <table className="print-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{t(c.title)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows?.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function reportPages(rows, paper) {
  const first = paper === "A5" ? 3 : 7,
    later = paper === "A5" ? 6 : 11;
  const pages = [rows.slice(0, first)];
  for (let i = first; i < rows.length; i += later)
    pages.push(rows.slice(i, i + later));
  return pages;
}
export default function PrintPage() {
  const { type, id } = useParams(),
    [search] = useSearchParams(),
    navigate = useNavigate(),
    { clinic, user } = useAuth(),
    { t, i18n } = useTranslation();
  const endpoint =
    type === "report"
      ? `/reports/${id}/print?${search.toString()}`
      : type === "patient"
        ? `/patients/${id}`
        : type === "token"
          ? `/appointments/${id}`
          : type === "prescription"
            ? `/prescriptions/${id}`
            : type === "consultation"
              ? `/consultations/${id}`
              : `/invoices/${id}`;
  const query = useData(endpoint),
    d = query.data,
    pquery = useData(`/patients/${d?.patientId}`, !!d?.patientId),
    doc = useData(
      `/doctors/${d?.doctorId}`,
      !!d?.doctorId && ["prescription", "consultation"].includes(type),
    );
  const [paper, setPaper] = useState(clinic?.settings.paperSize || "A4"),
    p = type === "patient" ? d : pquery.data,
    doctor = doc.data;
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@page { size: ${type === "token" ? "A5" : paper}; margin: 14mm 13mm; }`;
    document.head.append(style);
    return () => style.remove();
  }, [paper, type]);
  if (!d)
    return (
      <div className="print-screen">
        <State query={query} />
      </div>
    );
  const name = {
    report: d?.name,
    patient: "Patient Summary",
    token: "Patient Token",
    prescription: "Prescription",
    consultation: "Consultation Summary",
    invoice: "Invoice",
    receipt: "Payment Receipt",
  }[type];
  const pay = d?.payments?.find((p) => p._id === search.get("payment"));
  const prescription = type === "prescription";
  return (
    <div className="print-screen" dir={i18n.language === "ur" ? "rtl" : "ltr"}>
      <div className="print-toolbar">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <span>
          Print preview · Choose “Save as PDF” in the print dialog to download.
        </span>
        <select
          value={paper}
          aria-label="Paper size"
          onChange={(e) => setPaper(e.target.value)}
        >
          <option>A4</option>
          <option>A5</option>
        </select>
        <Button variant="secondary" onClick={() => window.print()}>
          <Download size={16} />
          {t("Save PDF")}
        </Button>
        <Button onClick={() => window.print()}>
          <Printer size={16} />
          {t("Print")}
        </Button>
      </div>
      <State query={query}>
        <article
          className={`print-sheet ${paper.toLowerCase()} ${prescription ? "prescription" : ""}`}
        >
          <header className="letterhead">
            {clinic?.logo && <img src={clinic.logo} alt="Clinic logo" />}
            <div>
              <h1>{clinic?.name}</h1>
              <p>
                {clinic?.address} {clinic?.city}
              </p>
              <p>
                {clinic?.phone}
                {clinic?.email && ` · ${clinic.email}`}
              </p>
              {prescription && (
                <>
                  <h2>{doctor?.name}</h2>
                  <p>
                    {doctor?.qualification} · {doctor?.specialization}
                  </p>
                  <p>
                    Professional registration: {doctor?.registration || "—"}
                  </p>
                </>
              )}
            </div>
          </header>
          <div className="print-title">
            <h2>{t(name)}</h2>
            <span>{d?.number || d?.token || d?.mrn}</span>
          </div>
          {p && (
            <div className="print-patient">
              <div>
                <small>{t("Patient")}</small>
                <strong>{p.name}</strong>
              </div>
              <div>
                <small>MRN</small>
                <strong>{p.mrn}</strong>
              </div>
              <div>
                <small>
                  {t("Age")} / {t("Gender")}
                </small>
                <strong>
                  {p.age ??
                    (p.dob
                      ? Math.floor((Date.now() - new Date(p.dob)) / 31557600000)
                      : "—")}{" "}
                  / {p.gender}
                </strong>
              </div>
              <div>
                <small>{t("Date")}</small>
                <strong>
                  {dateTime(d?.signedAt || d?.createdAt, clinic.timezone)}
                </strong>
              </div>
            </div>
          )}
          {type === "prescription" && (
            <>
              {d.status !== "signed" && (
                <div className="print-warning">
                  {d.status.toUpperCase()} · NOT AN APPROVED PRESCRIPTION
                </div>
              )}
              {d.indication && (
                <p>
                  <strong>Indication: </strong>
                  {d.indication}
                </p>
              )}
              <div className="rx-mark">℞</div>
              <PrintTable
                rows={d.medicines}
                columns={[
                  {
                    key: "name",
                    title: t("Medicine"),
                    render: (r) => (
                      <>
                        <strong>
                          {r.name} {r.strength}
                        </strong>
                        <small className="block">
                          {r.formulation} · {r.route}
                        </small>
                      </>
                    ),
                  },
                  { key: "dose", title: t("Dose") },
                  { key: "frequency", title: t("Frequency") },
                  { key: "duration", title: t("Duration") },
                  { key: "instructions", title: t("Instructions") },
                ]}
              />
              {d.advice && (
                <div className="print-advice">
                  <h3>{t("Advice")}</h3>
                  <p>{d.advice}</p>
                </div>
              )}
              {d.followupDate && (
                <p>
                  <strong>Follow-up: </strong>
                  {d.followupDate}
                </p>
              )}
              <div className="signature">
                <strong>{doctor?.name}</strong>
                <p>
                  {d.status === "signed"
                    ? `Electronically approved · ${dateTime(d.signedAt, clinic.timezone)}`
                    : "Doctor approval pending"}
                </p>
                <small>Encounter: {d.consultationId}</small>
                <small>
                  Signed by: {d.signedBy || "—"} · Version{" "}
                  {d.versions?.length || 0}
                </small>
              </div>
              <p className="prescription-footer">
                {clinic.settings.prescriptionFooter}
              </p>
            </>
          )}
          {type === "consultation" && (
            <>
              {d.status !== "signed" && (
                <div className="print-warning">DRAFT RECORD</div>
              )}
              <p>
                <strong>Doctor: </strong>
                {doctor?.name}
              </p>
              {Object.entries(d.vitals || {}).filter(([k]) => k !== "_id")
                .length > 0 && (
                <div className="print-vitals">
                  {Object.entries(d.vitals || {})
                    .filter(([k, v]) => k !== "_id" && v !== "")
                    .map(([k, v]) => (
                      <span key={k}>
                        {k}: <strong>{v}</strong>
                      </span>
                    ))}
                </div>
              )}
              {[
                ["complaint", "Chief complaint"],
                ["symptoms", "Presenting symptoms"],
                ["hpi", "History"],
                ["pastHistory", "Past history"],
                ["allergies", "Allergies"],
                ["examination", "Examination"],
                ["diagnosis", "Diagnosis"],
                ["treatmentPlan", "Treatment plan"],
                ["advice", "Advice"],
                ["followupInstructions", "Follow-up instructions"],
                ["followupDate", "Follow-up date"],
              ]
                .filter(([k]) => d[k])
                .map(([k, l]) => (
                  <section className="print-note" key={k}>
                    <h3>{t(l)}</h3>
                    <p>{d[k]}</p>
                  </section>
                ))}
              <div className="signature">
                {d.status === "signed"
                  ? `Approved by ${doctor?.name} · ${dateTime(d.signedAt, clinic.timezone)} · Version ${d.versions.length}`
                  : "Draft — doctor approval pending"}
              </div>
            </>
          )}
          {type === "invoice" && (
            <>
              <PrintTable
                rows={d.services}
                columns={[
                  { key: "name", title: "Service" },
                  { key: "quantity", title: "Quantity" },
                  {
                    key: "unitPrice",
                    title: "Unit price",
                    render: (r) => money(r.unitPrice),
                  },
                  {
                    key: "total",
                    title: "Amount",
                    render: (r) => money(r.total),
                  },
                ]}
              />
              <div className="print-totals">
                {[
                  ["Subtotal", d.subtotal],
                  ["Discount", d.discount],
                  ["Tax", d.tax],
                  ["Original total", d.total],
                  ["Refunded", d.refunded],
                  ["Net total", d.netTotal],
                  ["Net received", d.collected],
                  ["Outstanding balance", d.balance],
                ].map(([k, v]) => (
                  <p key={k}>
                    <span>{k}</span>
                    <strong>{money(v)}</strong>
                  </p>
                ))}
              </div>
              <p>
                Status: <strong>{d.paymentStatus}</strong>
              </p>
              {d.status === "void" && (
                <div className="print-warning">VOID · {d.voidReason}</div>
              )}
              <p>{clinic.settings.invoiceFooter}</p>
            </>
          )}
          {type === "receipt" && (
            <>
              {pay ? (
                <div className="receipt-details">
                  <h3>
                    {pay.kind === "refund"
                      ? "Refund receipt"
                      : "Payment received"}
                  </h3>
                  <strong className="receipt-amount">
                    {money(pay.amount)}
                  </strong>
                  <p>
                    Method: {pay.method} · Account: {pay.account}
                  </p>
                  <p>Recorded: {dateTime(pay.createdAt, clinic.timezone)}</p>
                  <p>Transaction reference: {pay._id}</p>
                  <p>{pay.reason || pay.reference}</p>
                </div>
              ) : (
                <div className="print-warning">
                  Select a payment transaction from the invoice payment history.
                </div>
              )}
            </>
          )}
          {type === "token" && (
            <div className="printed-token">
              <strong>{d.token || "Not checked in"}</strong>
              <h2>{p?.name}</h2>
              <p>Doctor: {d.doctorName}</p>
              <p>{dateTime(d.checkedInAt || d.startAt, clinic.timezone)}</p>
              <p>Please wait for your token to be called.</p>
            </div>
          )}
          {type === "patient" && (
            <div className="print-detail-grid">
              {[
                ["Mobile", d.mobile],
                ["Address", d.address],
                ["City", d.city],
                ["Emergency contact", d.emergencyContact],
                ["Blood group", d.bloodGroup],
                ["Allergies", d.allergies],
                ["Medical history", d.medicalHistory],
                ["Existing conditions", d.conditions],
                ["Current medications", d.medications],
              ]
                .filter(([k, v]) => v)
                .map(([k, v]) => (
                  <section key={k}>
                    <h3>{t(k)}</h3>
                    <p>{v}</p>
                  </section>
                ))}
            </div>
          )}
          {type === "report" && (
            <>
              {reportPages(d.rows, paper).map((pageRows, index) => {
                const pages = reportPages(d.rows, paper).length;
                return (
                  <section className="report-print-page" key={index}>
                    {index > 0 && (
                      <div className="report-page-heading">
                        <strong>{clinic.name}</strong>
                        <span>{d.name}</span>
                      </div>
                    )}
                    <div className="report-print-range">
                      {d.from} to {d.to} · {clinic.timezone}
                    </div>
                    {index === 0 && (
                      <>
                        {d.notice && <p className="print-notice">{d.notice}</p>}
                        <div className="print-report-metrics">
                          {Object.entries(d.metrics).map(([k, v]) => (
                            <div key={k}>
                              <small>
                                {k.replace(/([a-z])([A-Z])/g, "$1 $2")}
                              </small>
                              <strong>{d.financial ? money(v) : v}</strong>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <PrintTable
                      rows={pageRows}
                      columns={Object.keys(d.rows[0] || {}).map((k) => ({
                        key: k,
                        title: k,
                        render: (r) =>
                          d.moneyColumns.includes(k)
                            ? money(r[k])
                            : String(r[k] ?? "—"),
                      }))}
                    />
                    {!d.rows.length && (
                      <p>No records in the selected period.</p>
                    )}
                    <footer className="print-footer">
                      <span>
                        Generated {dateTime(d.generatedAt, clinic.timezone)} ·
                        Ahmed Solutions
                      </span>
                      <span>
                        Page {index + 1} of {pages}
                      </span>
                    </footer>
                  </section>
                );
              })}
            </>
          )}

          {type !== "report" && (
            <footer className="print-footer">
              <span>
                Generated{" "}
                {dateTime(
                  d?.generatedAt || new Date().toISOString(),
                  clinic.timezone,
                )}{" "}
                · {user.name}
              </span>
              <span>Ahmed Solutions · Clinic OS</span>
            </footer>
          )}
        </article>
      </State>
    </div>
  );
}
