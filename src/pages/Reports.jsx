import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileBarChart,
  ChevronRight,
  Download,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../contexts/Auth";
import {
  Button,
  PageHead,
  State,
  Table,
  Pager,
  useData,
  useNotify,
  money,
  today,
} from "../components/ui";
import { DateFilter } from "./Dashboard";
import { download } from "../services/api";
export default function Reports() {
  const { t } = useTranslation(),
    query = useData("/reports");
  return (
    <>
      <PageHead
        title={t("Reports")}
        eyebrow="REPORTS CENTER"
        description="One purpose per report. Clear numbers, professional exports."
      />
      <State query={query}>
        {["patients", "appointments", "finance"].map((group) => {
          const items = query.data?.filter((r) => r.group === group) || [];
          if (!items.length) return null;
          return (
            <section className="report-section" key={group}>
              <h2>
                {group === "patients"
                  ? t("Patient reports")
                  : group === "appointments"
                    ? t("Appointments & operations")
                    : t("Financial reports")}
              </h2>
              <div className="report-grid">
                {items.map((r) => (
                  <Link
                    to={`/reports/${r.slug}`}
                    className="report-card"
                    key={r.slug}
                  >
                    <span>
                      <FileBarChart size={22} />
                    </span>
                    <div>
                      <strong>{t(r.name)}</strong>
                      <small>{t("View, print and export")}</small>
                    </div>
                    <ChevronRight size={17} />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </State>
    </>
  );
}
export function ReportDetail() {
  const { slug } = useParams(),
    { clinic } = useAuth(),
    { t } = useTranslation(),
    notify = useNotify(),
    navigate = useNavigate();
  const [from, setFrom] = useState(today(clinic.timezone)),
    [to, setTo] = useState(from),
    [page, setPage] = useState(1),
    [doctor, setDoctor] = useState("");
  const suffix = `from=${from}&to=${to}&doctorId=${doctor}`,
    query = useData(`/reports/${slug}?${suffix}&page=${page}&limit=25`),
    docs = useData("/doctors?limit=100");
  const d = query.data;
  async function save(format) {
    try {
      await download(
        `/reports/${slug}/export?${suffix}&format=${format}`,
        `${slug}.${format}`,
      );
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <>
      <Button variant="ghost" onClick={() => navigate("/reports")}>
        <ArrowLeft size={17} />
        Reports center
      </Button>
      <PageHead
        title={d?.name || "Report"}
        eyebrow="CLINIC REPORT"
        description={`${clinic.name} · ${from} to ${to}`}
      >
        <Button variant="secondary" onClick={() => save("csv")}>
          {t("Export CSV")}
        </Button>
        <Button variant="secondary" onClick={() => save("xlsx")}>
          <Download size={16} />
          {t("Export Excel")}
        </Button>
        <Button onClick={() => navigate(`/print/report/${slug}?${suffix}`)}>
          <Printer size={16} />
          {t("Print")} / PDF
        </Button>
      </PageHead>
      <div className="report-filters">
        <DateFilter
          {...{
            from,
            to,
            setFrom: (v) => {
              setFrom(v);
              setPage(1);
            },
            setTo: (v) => {
              setTo(v);
              setPage(1);
            },
          }}
        />
        <select
          className="input"
          aria-label="Doctor report filter"
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
      </div>
      <State query={query}>
        {d?.notice && <div className="notice">{d.notice}</div>}
        <div className="report-metrics">
          {Object.entries(d?.metrics || {}).map(([k, v]) => (
            <div className="card" key={k}>
              <small>{k.replace(/([a-z])([A-Z])/g, "$1 $2")}</small>
              <strong>{d.financial ? money(v) : v}</strong>
            </div>
          ))}
        </div>
        <section className="card">
          <Table
            rows={d?.rows}
            columns={Object.keys(d?.rows[0] || {}).map((k) => ({
              key: k,
              title: k,
              render: (r) =>
                d.moneyColumns.includes(k) ? money(r[k]) : String(r[k] ?? "—"),
            }))}
          />
          <Pager data={d} {...{ page, setPage }} />
        </section>
        <small className="muted">
          Generated{" "}
          {d?.generatedAt ? new Date(d.generatedAt).toLocaleString() : ""} ·{" "}
          {clinic.timezone}
        </small>
      </State>
    </>
  );
}
