import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  UserRound,
  MessageSquare,
  History,
  Send,
  RefreshCw,
  AlertCircle,
  LoaderCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../api/client";

const STATUSES = ["Open", "In Progress", "Blocked", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleString();
}

function Badge({ children, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        colors[color] || colors.slate
      }`}
    >
      {children}
    </span>
  );
}

function statusColor(status) {
  return {
    Open: "blue",
    "In Progress": "amber",
    Blocked: "rose",
    Resolved: "green",
    Closed: "slate",
  }[status] || "slate";
}

function priorityColor(priority) {
  return {
    Low: "slate",
    Medium: "blue",
    High: "amber",
    Critical: "rose",
  }[priority] || "slate";
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function getHistoryMessage(event) {
  const field = event.field_name;
  const newValue = event.new_value;

  if (field === "assignee_id") {
    return newValue
      ? "updated the assigned resolver"
      : "removed the resolver assignment";
  }

  if (field === "status") {
    return `changed the status to ${newValue || "unknown"}`;
  }

  if (field === "priority") {
    return `changed the priority to ${newValue || "unknown"}`;
  }

  if (field === "due_date") {
    return "updated the due date";
  }

  if (field === "resolution_notes") {
    return "updated the resolution notes";
  }

  if (field) {
    return `updated ${field.replaceAll("_", " ")}`;
  }

  return String(event.action || "updated this exception").replaceAll(
    "_",
    " "
  );
}

export default function ExceptionDetail({
  exceptionId,
  onBack,
  role = "reporter",
}) {
  const userRole = String(role).toLowerCase();
  const isManager = userRole === "manager";
  const isResolver = userRole === "resolver";

  const [exception, setException] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [resolvers, setResolvers] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [detailData, commentData, historyData] = await Promise.all([
        apiRequest(`/exceptions/${exceptionId}`),
        apiRequest(`/exceptions/${exceptionId}/comments`),
        apiRequest(`/exceptions/${exceptionId}/history`),
      ]);

      const current = detailData.exception;

      setException(current);
      setComments(commentData.comments || []);
      setHistory(historyData.history || []);
      setNextStatus(current.status);
      setResolutionNotes(current.resolution_notes || "");

      setSelectedAssignee(
        current.assignee_id == null
          ? ""
          : String(current.assignee_id)
      );

      setPriority(current.priority || "Medium");
      setDueDate(toDateInput(current.due_date));
    } catch (err) {
      setError(err.message || "Unable to load exception details.");
    } finally {
      setLoading(false);
    }
  }, [exceptionId]);

  const loadResolvers = useCallback(async () => {
    if (!isManager) return;

    try {
      const data = await apiRequest("/users");

      setResolvers(
        (data.users || []).filter(
          (user) =>
            user.is_active &&
            user.role === "resolver"
        )
      );
    } catch (err) {
      setActionError(
        err.message || "Unable to load available resolvers."
      );
    }
  }, [isManager]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    loadResolvers();
  }, [loadResolvers]);

  async function handleAddComment(event) {
    event.preventDefault();
    setActionError("");
    setSuccess("");

    if (!commentText.trim()) {
      setActionError("Please enter a comment.");
      return;
    }

    setSavingComment(true);

    try {
      await apiRequest(`/exceptions/${exceptionId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          body: commentText.trim(),
        }),
      });

      setCommentText("");
      setSuccess("Comment added successfully.");

      await loadDetails();
    } catch (err) {
      setActionError(err.message || "Unable to add comment.");
    } finally {
      setSavingComment(false);
    }
  }

  async function handleSaveAssignment(event) {
    event.preventDefault();
    setActionError("");
    setSuccess("");

    if (!isManager) {
      setActionError("Only managers can assign exceptions.");
      return;
    }

    if (!PRIORITIES.includes(priority)) {
      setActionError("Select a valid priority.");
      return;
    }

    setSavingAssignment(true);

    try {
      const body = {
        assigneeId: selectedAssignee || null,
        priority,
        dueDate: dueDate
          ? new Date(dueDate).toISOString()
          : null,
      };

      await apiRequest(`/exceptions/${exceptionId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setSuccess("Assignment and exception settings saved.");

      await loadDetails();
    } catch (err) {
      setActionError(
        err.message || "Unable to save assignment settings."
      );
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleUpdateStatus(event) {
    event.preventDefault();
    setActionError("");
    setSuccess("");

    if (!exception || nextStatus === exception.status) {
      setActionError("Choose a different status.");
      return;
    }

    if (
      nextStatus === "Resolved" &&
      !resolutionNotes.trim() &&
      !exception.resolution_notes
    ) {
      setActionError("Resolution notes are required.");
      return;
    }

    setSavingStatus(true);

    try {
      const body = {
        status: nextStatus,
      };

      if (nextStatus === "Resolved") {
        body.resolutionNotes = resolutionNotes.trim();
      }

      await apiRequest(`/exceptions/${exceptionId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      setSuccess("Exception status updated.");

      await loadDetails();
    } catch (err) {
      setActionError(err.message || "Unable to update status.");
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
        <LoaderCircle
          className="animate-spin text-blue-600"
          size={22}
        />
        Loading exception details...
      </div>
    );
  }

  if (error || !exception) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <AlertCircle
          className="mx-auto text-rose-500"
          size={30}
        />

        <p className="mt-4 font-semibold text-slate-900">
          Unable to open exception
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {error || "Exception not found."}
        </p>

        <button
          onClick={onBack}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to exceptions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={17} />
        Back to exceptions
      </button>

      {/* Exception heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-blue-600">
            {exception.exception_number}
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {exception.title}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Created {formatDate(exception.created_at)}
          </p>
        </div>

        <button
          onClick={loadDetails}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Success and error messages */}
      {actionError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {actionError}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* Description */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap gap-2">
              <Badge color={statusColor(exception.status)}>
                {exception.status}
              </Badge>

              <Badge color={priorityColor(exception.priority)}>
                {exception.priority} priority
              </Badge>

              <Badge>{exception.category}</Badge>
            </div>

            <h2 className="mt-6 text-lg font-semibold text-slate-900">
              Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {exception.description}
            </p>

            {exception.resolution_notes && (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4">
                <h3 className="text-sm font-semibold text-emerald-900">
                  Resolution notes
                </h3>

                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-800">
                  {exception.resolution_notes}
                </p>
              </div>
            )}
          </section>

          {/* Comments */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <MessageSquare
                className="text-blue-600"
                size={21}
              />

              <h2 className="font-semibold text-slate-900">
                Comments
              </h2>
            </div>

            <form onSubmit={handleAddComment} className="mt-5">
              <textarea
                rows={3}
                maxLength={5000}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share an update..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingComment || !commentText.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingComment ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={16} />
                  )}

                  Add comment
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No comments yet.
                </p>
              ) : (
                comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {comment.author_name ||
                          `User ${comment.author_id}`}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {comment.body}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* Updated activity history */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <History
                className="text-violet-600"
                size={21}
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Activity history
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  See who changed this exception and what changed.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {history.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  No activity recorded yet. New assignments and updates
                  will appear here.
                </p>
              ) : (
                history.map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-3"
                  >
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <History size={15} />
                    </div>

                    <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">
                          {event.actor_name || "Team member"}
                        </span>{" "}

                        <span className="text-slate-600">
                          {getHistoryMessage(event)}
                        </span>
                      </p>

                      {event.field_name && (
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {event.field_name.replaceAll("_", " ")}:{" "}
                          {event.old_value ?? "—"} →{" "}
                          {event.new_value ?? "—"}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Issue information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Issue information
            </h2>

            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <UserRound
                  size={18}
                  className="mt-0.5 text-slate-400"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Reported by
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {exception.reporter_name || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <UserRound
                  size={18}
                  className="mt-0.5 text-slate-400"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Assigned to
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {exception.assignee_name || "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CalendarDays
                  size={18}
                  className="mt-0.5 text-slate-400"
                />

                <div>
                  <p className="text-xs text-slate-500">
                    Due date
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(exception.due_date)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Manager assignment controls */}
          {isManager && (
            <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={20}
                  className="text-blue-600"
                />

                <h2 className="font-semibold text-slate-900">
                  Manage exception
                </h2>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Assign a resolver, set priority, and choose a deadline.
              </p>

              <form
                onSubmit={handleSaveAssignment}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="resolver"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Assign resolver
                  </label>

                  <select
                    id="resolver"
                    value={selectedAssignee}
                    onChange={(e) =>
                      setSelectedAssignee(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  >
                    <option value="">Unassigned</option>

                    {resolvers.map((resolver) => (
                      <option
                        key={resolver.id}
                        value={String(resolver.id)}
                      >
                        {resolver.full_name || resolver.email} (
                        {resolver.email})
                      </option>
                    ))}
                  </select>

                  {resolvers.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No active resolvers found. Promote an active user
                      to Resolver in User Management first.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Priority
                  </label>

                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="due-date"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Due date and time
                  </label>

                  <input
                    id="due-date"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAssignment}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingAssignment && (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {savingAssignment
                    ? "Saving..."
                    : "Save assignment"}
                </button>
              </form>
            </section>
          )}

          {/* Manager and resolver status controls */}
          {(isManager || isResolver) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Update status
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                The backend validates permissions and workflow transitions.
              </p>

              <form
                onSubmit={handleUpdateStatus}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="next-status"
                    className="mb-2 block text-sm font-medium"
                  >
                    New status
                  </label>

                  <select
                    id="next-status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {nextStatus === "Resolved" && (
                  <div>
                    <label
                      htmlFor="resolution-notes"
                      className="mb-2 block text-sm font-medium"
                    >
                      Resolution notes *
                    </label>

                    <textarea
                      id="resolution-notes"
                      rows={3}
                      maxLength={5000}
                      value={resolutionNotes}
                      onChange={(e) =>
                        setResolutionNotes(e.target.value)
                      }
                      placeholder="Describe how the issue was resolved..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    savingStatus ||
                    nextStatus === exception.status
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingStatus && (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {savingStatus ? "Updating..." : "Update status"}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}