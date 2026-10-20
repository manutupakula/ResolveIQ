
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
  ClipboardList,
  X,
} from "lucide-react";
import { apiRequest } from "../api/client";

const STATUSES = [
  "All", "Open", "In Progress", "Blocked", "Resolved", "Closed",
];

const CATEGORIES = [
  "Billing", "Orders", "Data Import", "Approvals", "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "Billing",
  priority: "Medium",
  dueDate: "",
};

function StatusBadge({ status }) {
  const styles = {
    Open: "bg-blue-50 text-blue-700",
    "In Progress": "bg-amber-50 text-amber-700",
    Blocked: "bg-rose-50 text-rose-700",
    Resolved: "bg-emerald-50 text-emerald-700",
    Closed: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.Open}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    Low: "text-slate-500",
    Medium: "text-blue-600",
    High: "text-amber-600",
    Critical: "text-rose-600",
  };

  return (
    <span className={`text-sm font-semibold ${styles[priority] || ""}`}>
      {priority}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
}

export default function Exceptions({ onOpenException }) {
  const [exceptions, setExceptions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExceptions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/exceptions");
      setExceptions(data.exceptions || []);
    } catch (err) {
      setError(err.message || "Unable to load exceptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const filteredExceptions = exceptions.filter((item) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      item.exception_number?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.reporter_name?.toLowerCase().includes(query) ||
      item.assignee_name?.toLowerCase().includes(query);

    return (
      matchesSearch &&
      (statusFilter === "All" || item.status === statusFilter)
    );
  });

  async function handleCreateException(event) {
    event.preventDefault();
    setFormError("");

    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Title and description are required.");
      return;
    }

    setSaving(true);

    try {
      let dueDate = null;

      if (form.dueDate) {
        const parsed = new Date(form.dueDate);

        if (Number.isNaN(parsed.getTime())) {
          setFormError("Please enter a valid due date.");
          return;
        }

        dueDate = parsed.toISOString();
      }

      await apiRequest("/exceptions", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
          dueDate,
        }),
      });

      setShowCreateForm(false);
      setForm({ ...INITIAL_FORM });
      setSearch("");
      setStatusFilter("All");

      await loadExceptions();
    } catch (err) {
      setFormError(err.message || "Unable to create exception.");
    } finally {
      setSaving(false);
    }
  }

  function openForm() {
    setForm({ ...INITIAL_FORM });
    setFormError("");
    setShowCreateForm(true);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">OPERATIONS</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Exception Register
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review, prioritize, and track operational issues.
          </p>
        </div>

        <button
          onClick={openForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          New exception
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number, title, category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All statuses" : status}
              </option>
            ))}
          </select>

          <button
            onClick={loadExceptions}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
            <LoaderCircle className="animate-spin text-blue-600" size={22} />
            Loading exceptions...
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={30} className="text-rose-500" />
            <p className="mt-3 font-semibold text-slate-900">
              Unable to load exceptions
            </p>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <button
              onClick={loadExceptions}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"
            >
              Try again
            </button>
          </div>
        ) : filteredExceptions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <ClipboardList size={30} className="text-slate-400" />
            <p className="mt-3 font-semibold text-slate-900">
              No matching exceptions
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Try a different search or create a new exception.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Exception</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Assignee</th>
                  <th className="px-5 py-4">Due date</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredExceptions.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open exception ${item.exception_number}`}
                    onClick={() => onOpenException?.(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onOpenException?.(item.id);
                      }
                    }}
                    className="cursor-pointer transition hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <td className="px-5 py-4">
                      <p className="text-xs font-medium text-blue-600">
                        {item.exception_number}
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Reported by {item.reporter_name || "Unknown"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.category}
                    </td>
                    <td className="px-5 py-4">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.assignee_name || "Unassigned"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {formatDate(item.due_date)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Showing {filteredExceptions.length} of {exceptions.length} exceptions
          </div>
        )}
      </section>

      {showCreateForm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowCreateForm(false);
            }
          }}
        >
          <form
            onSubmit={handleCreateException}
            className="my-auto w-full max-w-xl space-y-5 rounded-2xl bg-white p-5 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Create exception
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Record a new operational issue.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Title *
              </label>
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="e.g. Invoice and order mismatch"
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Explain the issue and its impact..."
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Due date (optional)
              </label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
              />
            </div>

            {formError && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                {saving ? "Saving..." : "Create exception"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
