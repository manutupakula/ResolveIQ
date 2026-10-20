
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  UserRound,
  LoaderCircle,
} from "lucide-react";
import { apiRequest } from "../api/client";

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString();
}

function statusStyle(status) {
  return {
    Open: "bg-blue-50 text-blue-700",
    "In Progress": "bg-amber-50 text-amber-700",
    Blocked: "bg-rose-50 text-rose-700",
    Resolved: "bg-emerald-50 text-emerald-700",
    Closed: "bg-slate-100 text-slate-700",
  }[status] || "bg-slate-100 text-slate-700";
}

function priorityStyle(priority) {
  return {
    Low: "bg-slate-100 text-slate-600",
    Medium: "bg-blue-50 text-blue-700",
    High: "bg-amber-50 text-amber-700",
    Critical: "bg-rose-50 text-rose-700",
  }[priority] || "bg-slate-100 text-slate-600";
}

export default function Dashboard({ onNavigate, role = "reporter" }) {
  const [exceptions, setExceptions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userRole = String(role).toLowerCase();
  const isManager = userRole === "manager";
  const isResolver = userRole === "resolver";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/exceptions");
      const rows = data.exceptions || [];
      setExceptions(rows);

      // Load history for recent exceptions. One failed history request
      // should not prevent the exception list and statistics from loading.
      const historyResults = await Promise.allSettled(
        rows.slice(0, 8).map(async (item) => {
          const result = await apiRequest(
            `/exceptions/${item.id}/history`
          );

          return (result.history || []).map((event) => ({
            ...event,
            exception_id: item.id,
            exception_title: item.title,
            exception_number: item.exception_number,
          }));
        })
      );

      const recentActivities = historyResults
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .sort(
          (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
        .slice(0, 8);

      setActivities(recentActivities);
    } catch (err) {
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const total = exceptions.length;
  const open = exceptions.filter((item) => item.status === "Open").length;
  const inProgress = exceptions.filter(
    (item) => item.status === "In Progress"
  ).length;
  const resolved = exceptions.filter(
    (item) => ["Resolved", "Closed"].includes(item.status)
  ).length;
  const overdue = exceptions.filter((item) => {
    if (!item.due_date) return false;

    return (
      new Date(item.due_date) < new Date() &&
      !["Resolved", "Closed"].includes(item.status)
    );
  }).length;

  const metrics = isResolver
    ? [
        {
          label: "Assigned Exceptions",
          value: total,
          note: "Issues available to you",
          icon: Activity,
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Open Issues",
          value: open,
          note: "Awaiting action",
          icon: AlertCircle,
          color: "bg-amber-50 text-amber-600",
        },
        {
          label: "In Progress",
          value: inProgress,
          note: "Work underway",
          icon: Clock3,
          color: "bg-indigo-50 text-indigo-600",
        },
        {
          label: "Resolved",
          value: resolved,
          note: "Resolved or closed",
          icon: CheckCircle2,
          color: "bg-emerald-50 text-emerald-600",
        },
      ]
    : [
        {
          label: isManager ? "All Exceptions" : "My Exceptions",
          value: total,
          note: isManager
            ? "All recorded issues"
            : "Issues you reported",
          icon: Activity,
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Open Issues",
          value: open,
          note: "Awaiting action",
          icon: AlertCircle,
          color: "bg-amber-50 text-amber-600",
        },
        {
          label: "Overdue",
          value: overdue,
          note: "Past their due date",
          icon: Clock3,
          color: "bg-rose-50 text-rose-600",
        },
        {
          label: "Resolved",
          value: resolved,
          note: "Resolved or closed",
          icon: CheckCircle2,
          color: "bg-emerald-50 text-emerald-600",
        },
      ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">
            {isManager
              ? "MANAGER WORKSPACE"
              : isResolver
                ? "RESOLVER WORKSPACE"
                : "REPORTER WORKSPACE"}
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isManager
              ? "Monitor exceptions, assignments, and resolution progress."
              : isResolver
                ? "Track your assigned work and resolution progress."
                : "Track the issues you reported and see who is resolving them."}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() => onNavigate("exceptions")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            View exceptions
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <p className="mt-1 text-xs">
            Check that the backend is running and your session is valid.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  {loading ? "—" : value}
                </p>
              </div>

              <div className={`rounded-xl p-3 ${color}`}>
                <Icon size={21} />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Recent exceptions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Status, priority, and assigned resolver
              </p>
            </div>
            <ClipboardIcon />
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle size={19} className="animate-spin" />
              Loading exceptions...
            </div>
          ) : exceptions.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Activity className="mx-auto text-slate-400" size={28} />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No exceptions yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Exceptions you can access will appear here after they are created.
              </p>
              <button
                onClick={() => onNavigate("exceptions")}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open exceptions
              </button>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-3 pr-3 font-medium">Exception</th>
                    <th className="py-3 pr-3 font-medium">Status</th>
                    <th className="py-3 pr-3 font-medium">Priority</th>
                    <th className="py-3 pr-3 font-medium">Assigned resolver</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.slice(0, 6).map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-4 pr-3">
                        <p className="text-xs font-medium text-blue-600">
                          {item.exception_number || `EXC-${item.id}`}
                        </p>
                        <p className="mt-1 max-w-56 truncate text-sm font-semibold text-slate-800">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Due: {formatDate(item.due_date)}
                        </p>
                      </td>
                      <td className="py-4 pr-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 pr-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-4 pr-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <UserRound size={16} className="shrink-0 text-slate-400" />
                          <span>
                            {item.assignee_name || "Not assigned yet"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {exceptions.length > 6 && (
                <button
                  onClick={() => onNavigate("exceptions")}
                  className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all {exceptions.length} exceptions →
                </button>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Exception activity</h2>
              <p className="mt-1 text-sm text-slate-500">
                Recent recorded changes
              </p>
            </div>
            <Activity size={20} className="text-slate-400" />
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
              Loading activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-700">
                No activity to show yet
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Updates to your exceptions will appear here when history events are recorded.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {activities.map((event, index) => (
                <div
                  key={`${event.exception_id}-${event.id || index}`}
                  className="flex gap-3"
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Activity size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {(event.actor_name || "A team member") + " "}
                      <span className="font-normal text-slate-600">
                        {(event.action || "updated").replaceAll("_", " ")}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {event.exception_title}
                    </p>
                    {event.field_name && (
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {event.field_name.replaceAll("_", " ")}:{" "}
                        {event.old_value ?? "—"} → {event.new_value ?? "—"}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Workflow</h2>
        <p className="mt-1 text-sm text-slate-500">
          How exceptions move through ResolveIQ
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["01", "Open", "Issue reported"],
            ["02", "In Progress", "Work is underway"],
            ["03", "Blocked", "Requires attention"],
            ["04", "Resolved", "Resolution recorded"],
            ["05", "Closed", "Work completed"],
          ].map(([number, title, description]) => (
            <div key={number} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                {number}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ClipboardIcon() {
  return <ArrowUpRight size={20} className="text-slate-400" />;
}
