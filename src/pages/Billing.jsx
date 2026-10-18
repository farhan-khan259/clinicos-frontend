import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Printer, Trash2, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/Auth";
import {
  Button,
  PageHead,
  State,
  Table,
  Pager,
  Badge,
  Modal,
  Field,
  Select,
  Confirm,
  money,
  minor,
  dateTime,
  useData,
  useAction,
} from "../components/ui";
import { PatientPicker } from "../components/forms";
export default function Billing() {
  const { t } = useTranslation(),
    navigate = useNavigate(),
    [search] = useSearchParams(),
    [page, setPage] = useState(1),
    [form, setForm] = useState(search.get("new") === "1");
  const query = useData(`/invoices?page=${page}`);
  return (
    <>
      <PageHead
        title={t("Billing")}
        eyebrow="INVOICES & PAYMENTS"
        description="Clear invoices, traceable payments and accurate balances."
      >
        <Button onClick={() => setForm(true)}>
          <Plus size={17} />
          {t("New invoice")}
        </Button>
      </PageHead>
      <section className="card">
        <State query={query}>
          <Table
            rows={query.data?.items}
            columns={[
              {
                key: "number",
                title: "Invoice",
                render: (r) => (
                  <strong className="link-color">{r.number}</strong>
                ),
              },
              {
                key: "patient",
                title: t("Patient"),
                render: (r) => r.patient?.name,
              },
              {
                key: "netTotal",
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
                render: (r) => <strong>{money(r.balance)}</strong>,
              },
              {
                key: "paymentStatus",
                title: t("Status"),
                render: (r) => <Badge>{r.paymentStatus}</Badge>,
              },
              {
                key: "action",
                title: t("Actions"),
                render: (r) => (
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/billing/${r._id}`)}
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
        <InvoiceForm
          onClose={() => setForm(false)}
          onSaved={(i) => navigate(`/billing/${i._id}`)}
          defaultPatient={search.get("patient") || ""}
          appointmentId={search.get("appointment") || undefined}
          consultationId={search.get("consultation") || undefined}
        />
      )}
    </>
  );
}
export function InvoiceForm({
  onClose,
  onSaved,
  defaultPatient = "",
  appointmentId,
  consultationId,
}) {
  const { clinic } = useAuth(),
    { t } = useTranslation(),
    action = useAction(),
    docs = useData("/doctors?limit=100");
  const [patientId, setPatient] = useState(defaultPatient),
    [doctorId, setDoctor] = useState(""),
    [lines, setLines] = useState([
      {
        name: "Consultation fee",
        quantity: 1,
        unitPrice: clinic.settings.defaultFee / 100,
      },
    ]),
    [discount, setDiscount] = useState(0),
    [tax, setTax] = useState(clinic.settings.taxBasisPoints / 100);
  const subtotal = lines.reduce(
      (s, l) => s + minor(l.unitPrice) * l.quantity,
      0,
    ),
    total =
      subtotal -
      minor(discount) +
      Math.round(((subtotal - minor(discount)) * tax) / 100);
  async function submit(e) {
    e.preventDefault();
    try {
      const inv = await action.mutateAsync({
        url: "/invoices",
        body: {
          patientId,
          ...(doctorId ? { doctorId } : {}),
          ...(appointmentId ? { appointmentId } : {}),
          ...(consultationId ? { consultationId } : {}),
          services: lines.map((l) => ({ ...l, unitPrice: minor(l.unitPrice) })),
          discount: minor(discount),
          taxBasisPoints: Math.round(tax * 100),
        },
      });
      onSaved?.(inv);
      onClose();
    } catch {}
  }
  return (
    <Modal wide title={t("New invoice")} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <PatientPicker value={patientId} onChange={setPatient} />
          <Select
            label={t("Doctor")}
            value={doctorId}
            onChange={(e) => {
              setDoctor(e.target.value);
              const d = docs.data?.items.find((d) => d._id === e.target.value);
              if (d)
                setLines((l) =>
                  l.map((x, i) =>
                    i === 0 ? { ...x, unitPrice: d.fee / 100 } : x,
                  ),
                );
            }}
          >
            <option value="">Unassigned</option>
            {docs.data?.items.map((d) => (
              <option value={d._id} key={d._id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <h3>Services</h3>
        {lines.map((l, i) => (
          <div className="invoice-line" key={i}>
            <Field
              label="Service"
              value={l.name}
              required
              onChange={(e) =>
                setLines((x) =>
                  x.map((a, j) =>
                    j === i ? { ...a, name: e.target.value } : a,
                  ),
                )
              }
            />
            <Field
              label="Quantity"
              type="number"
              min="1"
              step="1"
              value={l.quantity}
              required
              onChange={(e) =>
                setLines((x) =>
                  x.map((a, j) =>
                    j === i ? { ...a, quantity: Number(e.target.value) } : a,
                  ),
                )
              }
            />
            <Field
              label="Unit price (PKR)"
              type="number"
              min="0"
              step="0.01"
              value={l.unitPrice}
              required
              onChange={(e) =>
                setLines((x) =>
                  x.map((a, j) =>
                    j === i ? { ...a, unitPrice: Number(e.target.value) } : a,
                  ),
                )
              }
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove service"
              disabled={lines.length === 1}
              onClick={() => setLines((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setLines((x) => [...x, { name: "", quantity: 1, unitPrice: 0 }])
          }
        >
          <Plus size={16} />
          {t("Add service")}
        </Button>
        <div className="form-grid">
          <Field
            label="Discount (PKR)"
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
          <Field
            label="Applicable tax (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={tax}
            onChange={(e) => setTax(Number(e.target.value))}
          />
        </div>
        <div className="invoice-total">
          <span>Estimated total</span>
          <strong>{money(total)}</strong>
          <small>
            Final totals are calculated and validated on the server.
          </small>
        </div>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button disabled={!patientId} busy={action.isPending}>
            Post invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function InvoiceDetail() {
  const { id } = useParams(),
    { t } = useTranslation(),
    { user, clinic } = useAuth(),
    navigate = useNavigate(),
    action = useAction();
  const query = useData(`/invoices/${id}`),
    inv = query.data,
    pquery = useData(`/patients/${inv?.patientId}`, !!inv);
  const [payment, setPayment] = useState(""),
    [voiding, setVoid] = useState(false),
    financial = ["owner", "accountant"].includes(user.role);
  return (
    <>
      <Button variant="ghost" onClick={() => navigate("/billing")}>
        <ArrowLeft size={17} />
        Invoices
      </Button>
      <State query={query}>
        <PageHead
          title={inv?.number}
          eyebrow="INVOICE DETAILS"
          description={`${pquery.data?.name || ""} · ${dateTime(inv?.createdAt, clinic.timezone)}`}
        >
          <Badge>{inv?.paymentStatus}</Badge>
          <Button
            variant="secondary"
            onClick={() => navigate(`/print/invoice/${id}`)}
          >
            <Printer size={17} />
            {t("Print")}
          </Button>
          {inv?.status === "posted" && inv?.balance > 0 && (
            <Button onClick={() => setPayment("receipt")}>
              {t("Record payment")}
            </Button>
          )}
        </PageHead>
        <div className="billing-summary">
          <div className="card">
            <small>Net invoice total</small>
            <strong>{money(inv?.netTotal)}</strong>
          </div>
          <div className="card">
            <small>Net collected</small>
            <strong>{money(inv?.collected)}</strong>
          </div>
          <div className="card">
            <small>Outstanding</small>
            <strong>{money(inv?.balance)}</strong>
          </div>
        </div>
        <section className="card">
          <div className="card-head">
            <h3>Billable services</h3>
            <small>{pquery.data?.mrn}</small>
          </div>
          <Table
            rows={inv?.services}
            columns={[
              { key: "name", title: "Service" },
              { key: "quantity", title: "Qty" },
              {
                key: "unitPrice",
                title: "Unit price",
                render: (r) => money(r.unitPrice),
              },
              { key: "total", title: "Amount", render: (r) => money(r.total) },
            ]}
          />
          <div className="invoice-breakdown">
            <p>
              Subtotal <strong>{money(inv?.subtotal)}</strong>
            </p>
            <p>
              Discount <strong>{money(inv?.discount)}</strong>
            </p>
            <p>
              Applicable tax <strong>{money(inv?.tax)}</strong>
            </p>
            <p>
              Original total <strong>{money(inv?.total)}</strong>
            </p>
            <p>
              Refunded <strong>{money(inv?.refunded)}</strong>
            </p>
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <h3>Payment transaction history</h3>
            <span className="muted">
              Card entries record payments made outside this system.
            </span>
          </div>
          <Table
            rows={inv?.payments}
            columns={[
              {
                key: "createdAt",
                title: t("Date"),
                render: (r) => dateTime(r.createdAt, clinic.timezone),
              },
              {
                key: "kind",
                title: "Type",
                render: (r) => <Badge>{r.kind}</Badge>,
              },
              { key: "method", title: "Method" },
              {
                key: "amount",
                title: "Amount",
                render: (r) => money(r.amount),
              },
              {
                key: "reason",
                title: "Reference / reason",
                render: (r) => r.reason || r.reference || "—",
              },
              {
                key: "action",
                title: t("Actions"),
                render: (r) => (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      navigate(`/print/receipt/${id}?payment=${r._id}`)
                    }
                  >
                    <Printer size={16} />
                    Receipt
                  </Button>
                ),
              },
            ]}
          />
        </section>
        {financial && inv?.status === "posted" && (
          <div className="row-actions">
            <Button
              variant="secondary"
              disabled={inv.collected <= 0}
              onClick={() => setPayment("refund")}
            >
              {t("Refund")}
            </Button>
            <Button variant="ghost" onClick={() => setVoid(true)}>
              Void invoice
            </Button>
          </div>
        )}
      </State>
      {payment && (
        <PaymentForm
          kind={payment}
          invoice={inv}
          onClose={() => setPayment("")}
        />
      )}
      {voiding && (
        <Confirm
          title="Void invoice"
          busy={action.isPending}
          onClose={() => setVoid(false)}
          onConfirm={async (reason) => {
            try {
              await action.mutateAsync({
                url: `/invoices/${id}/void`,
                body: { reason },
              });
              setVoid(false);
            } catch {}
          }}
        />
      )}
    </>
  );
}
function PaymentForm({ kind, invoice, onClose }) {
  const { t } = useTranslation(),
    action = useAction(),
    [amount, setAmount] = useState(
      (kind === "receipt" ? invoice.balance : invoice.collected) / 100,
    ),
    [method, setMethod] = useState("Cash"),
    [account, setAccount] = useState("cash"),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [key] = useState(crypto.randomUUID());
  async function submit(e) {
    e.preventDefault();
    try {
      await action.mutateAsync({
        url: `/invoices/${invoice._id}/${kind === "receipt" ? "payments" : "refunds"}`,
        body: {
          amount: minor(amount),
          method,
          account,
          key,
          reason,
          reference,
        },
      });
      onClose();
    } catch {}
  }
  return (
    <Modal
      title={t(kind === "receipt" ? "Record payment" : "Refund")}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <Field
          required
          label="Amount (PKR)"
          type="number"
          min="0.01"
          step="0.01"
          max={(kind === "receipt" ? invoice.balance : invoice.collected) / 100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Select
          label="Payment method"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setAccount(e.target.value === "Cash" ? "cash" : "bank");
          }}
        >
          {["Cash", "Bank Transfer", "Card", "Other"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Select
          label="Account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </Select>
        <Field
          label="Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        {kind === "refund" && (
          <Field
            label="Refund reason"
            required
            minLength="5"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button busy={action.isPending}>{t("Save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
