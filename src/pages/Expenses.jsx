import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Upload } from "lucide-react";
import { useAuth } from "../contexts/Auth";
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
  today,
  useNotify,
} from "../components/ui";
import { download } from "../services/api";
const categories = [
  "Clinic Rent",
  "Electricity",
  "Internet",
  "Staff Salaries",
  "Cleaning",
  "Equipment Maintenance",
  "Medical Supplies",
  "Utilities",
  "General Expenses",
];
export default function Expenses() {
  const { t } = useTranslation(),
    { clinic } = useAuth(),
    action = useAction(),
    notify = useNotify(),
    [search] = useSearchParams(),
    [page, setPage] = useState(1),
    [form, setForm] = useState(search.get("new") ? {} : null),
    [confirm, setConfirm] = useState(null);
  const query = useData(`/expenses?page=${page}`);
  async function upload(expense, file) {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      await action.mutateAsync({
        url: `/expenses/${expense._id}/receipt`,
        body,
      });
    } catch {}
  }
  return (
    <>
      <PageHead
        title={t("Expenses")}
        eyebrow="CLINIC ACCOUNTS"
        description="Post expenses with a permanent, reconcilable history."
      >
        <Button onClick={() => setForm({})}>
          <Plus size={17} />
          {t("Add expense")}
        </Button>
      </PageHead>
      <div className="notice">
        Drafts do not affect your accounts. Posting recognizes the expense and
        records the cash or bank payment on the posting date.
      </div>
      <section className="card">
        <State query={query}>
          <Table
            rows={query.data?.items}
            columns={[
              { key: "date", title: t("Date") },
              { key: "description", title: "Description" },
              { key: "category", title: "Category" },
              {
                key: "amount",
                title: "Amount",
                render: (r) => money(r.amount),
              },
              { key: "account", title: "Account" },
              {
                key: "status",
                title: t("Status"),
                render: (r) => <Badge>{r.status}</Badge>,
              },
              {
                key: "actions",
                title: t("Actions"),
                render: (r) => (
                  <div className="row-actions">
                    {r.status === "draft" && (
                      <>
                        <Button variant="secondary" onClick={() => setForm(r)}>
                          {t("Edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setConfirm({ r, kind: "post" })}
                        >
                          {t("Post expense")}
                        </Button>
                      </>
                    )}
                    {r.status === "posted" && (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirm({ r, kind: "reverse" })}
                      >
                        {t("Reverse")}
                      </Button>
                    )}
                    <label className="icon-btn" title="Attach receipt">
                      <Upload size={16} />
                      <input
                        hidden
                        type="file"
                        accept="image/png,image/jpeg,application/pdf"
                        onChange={(e) => upload(r, e.target.files[0])}
                      />
                    </label>
                    {r.receipt && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          download(
                            `/expenses/${r._id}/receipt`,
                            r.receipt.originalName,
                          ).catch((e) => notify(e.message, "error"))
                        }
                      >
                        Receipt
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          <Pager data={query.data} {...{ page, setPage }} />
        </State>
      </section>
      {form && (
        <ExpenseForm
          expense={form._id ? form : null}
          onClose={() => setForm(null)}
        />
      )}
      {confirm && (
        <Confirm
          title={
            confirm.kind === "post"
              ? "Post and pay expense"
              : "Reverse posted expense"
          }
          reasonRequired={confirm.kind === "reverse"}
          busy={action.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={async (reason) => {
            try {
              await action.mutateAsync({
                url: `/expenses/${confirm.r._id}/${confirm.kind}`,
                body: { reason },
              });
              setConfirm(null);
            } catch {}
          }}
        />
      )}
    </>
  );
}
function ExpenseForm({ expense, onClose }) {
  const { clinic } = useAuth(),
    { t } = useTranslation(),
    action = useAction(),
    [d, set] = useState({
      description: expense?.description || "",
      category: expense?.category || categories[0],
      amount: (expense?.amount || 0) / 100,
      method: expense?.method || "Cash",
      account: expense?.account || "cash",
      date: expense?.date || today(clinic.timezone),
    });
  const change = (k) => (e) => set({ ...d, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    try {
      await action.mutateAsync({
        url: expense ? `/expenses/${expense._id}` : "/expenses",
        method: expense ? "PATCH" : "POST",
        body: { ...d, amount: minor(d.amount) },
      });
      onClose();
    } catch {}
  }
  return (
    <Modal title={t("Add expense")} onClose={onClose}>
      <form onSubmit={submit}>
        <Field
          label="Description"
          required
          value={d.description}
          onChange={change("description")}
        />
        <Select
          label="Category"
          value={d.category}
          onChange={change("category")}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Field
          label="Amount (PKR)"
          required
          type="number"
          min="0.01"
          step="0.01"
          value={d.amount}
          onChange={change("amount")}
        />
        <Field
          label={t("Date")}
          required
          type="date"
          value={d.date}
          onChange={change("date")}
        />
        <Select
          label="Payment method"
          value={d.method}
          onChange={(e) =>
            set({
              ...d,
              method: e.target.value,
              account: e.target.value === "Cash" ? "cash" : "bank",
            })
          }
        >
          {["Cash", "Bank Transfer", "Card", "Other"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        <Select label="Account" value={d.account} onChange={change("account")}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
        </Select>
        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button busy={action.isPending}>{t("Save draft")}</Button>
        </div>
      </form>
    </Modal>
  );
}
