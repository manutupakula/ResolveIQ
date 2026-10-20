
import { useEffect, useState } from "react";
import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  LogOut,
  LoaderCircle,
  ClipboardList,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Exceptions from "./pages/Exceptions";
import ExceptionDetail from "./pages/ExceptionDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserManagement from "./pages/UserManagement";
import { apiRequest } from "./api/client";

function getExceptionList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.exceptions)) return data.exceptions;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getAssigneeId(exception) {
  return (
    exception.assignee_id ??
    exception.assigneeId ??
    exception.assignee?.id ??
    exception.assigned_to ??
    null
  );
}

function formatDate(value) {
  if (!value) return "No due date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status) {
  const value = String(status || "Open").toLowerCase();

  if (value === "resolved" || value === "closed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (value === "blocked") {
    return "bg-red-50 text-red-700";
  }
  if (value === "in progress") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function priorityStyle(priority) {
  const value = String(priority || "Medium").toLowerCase();

  if (value === "high" || value === "critical") {
    return "bg-red-50 text-red-700";
  }
  if (value === "low") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-orange-50 text-orange-700";
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authPage, setAuthPage] = useState("login");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedExceptionId, setSelectedExceptionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [assignedExceptions, setAssignedExceptions] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");

  const role = String(user?.role || "reporter").toLowerCase();

  useEffect(() => {
    let cancelled = false;

    async function checkAuthentication() {
      const token = localStorage.getItem("resolveiq_token");

      if (!token) {
        if (!cancelled) setCheckingAuth(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me");
        const savedUser = localStorage.getItem("resolveiq_user");
        const parsedUser = savedUser ? JSON.parse(savedUser) : null;
        const authenticatedUser = data.user || parsedUser || null;

        if (!cancelled) {
          if (authenticatedUser) {
            setUser(authenticatedUser);
          } else {
            localStorage.removeItem("resolveiq_token");
            localStorage.removeItem("resolveiq_user");
            setUser(null);
          }
        }
      } catch {
        localStorage.removeItem("resolveiq_token");
        localStorage.removeItem("resolveiq_user");

        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the logged-in resolver's assignments.
  // The API already limits resolver results; we additionally filter
  // by assignee so reported-by tasks do not appear as assignments.
  useEffect(() => {
    if (!user || role !== "resolver") {
      setAssignedExceptions([]);
      setAssignmentsError("");
      setAssignmentsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAssignments() {
      setAssignmentsLoading(true);
      setAssignmentsError("");

      try {
        const data = await apiRequest("/exceptions");
        const allExceptions = getExceptionList(data);
        const currentUserId = String(user.id ?? user.userId ?? "");

        const mine = allExceptions.filter((exception) => {
          const assigneeId = getAssigneeId(exception);
          return (
            assigneeId !== null &&
            currentUserId !== "" &&
            String(assigneeId) === currentUserId
          );
        });

        if (!cancelled) {
          setAssignedExceptions(mine);
        }
      } catch (error) {
        if (!cancelled) {
          setAssignmentsError(
            error.message || "Could not load your assignments."
          );
        }
      } finally {
        if (!cancelled) setAssignmentsLoading(false);
      }
    }

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [user, role, activePage]);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setAuthPage("login");
    setSelectedExceptionId(null);
    setActivePage("dashboard");
  }

  function handleRegistered(email) {
    setRegisteredEmail(email);
    setAuthPage("login");
  }

  function handleLogout() {
    localStorage.removeItem("resolveiq_token");
    localStorage.removeItem("resolveiq_user");

    setUser(null);
    setAssignedExceptions([]);
    setSelectedExceptionId(null);
    setActivePage("dashboard");
    setAuthPage("login");
    setSidebarOpen(false);
  }

  function openException(id) {
    setSelectedExceptionId(id);
    setActivePage("exception-detail");
    setSidebarOpen(false);
  }

  function navigateTo(page) {
    const allowedPages = [
      "dashboard",
      "exceptions",
      "reports",
      "users",
      "assignments",
    ];

    if (!allowedPages.includes(page)) return;

    if (["reports", "users"].includes(page) && role !== "manager") {
      return;
    }

    if (page === "assignments" && role !== "resolver") {
      return;
    }

    setSelectedExceptionId(null);
    setActivePage(page);
    setSidebarOpen(false);
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <LoaderCircle
            size={22}
            className="animate-spin text-blue-600"
          />
          Checking your session...
        </div>
      </div>
    );
  }

  if (!user) {
    if (authPage === "register") {
      return (
        <Register
          onRegistered={handleRegistered}
          onBackToLogin={() => setAuthPage("login")}
        />
      );
    }

    return (
      <Login
        key={registeredEmail}
        onLogin={handleLogin}
        onGoToRegister={() => setAuthPage("register")}
        initialEmail={registeredEmail}
      />
    );
  }

  const pageTitles = {
    dashboard:
      role === "manager"
        ? "Manager Dashboard"
        : role === "resolver"
          ? "Assigned Work"
          : "My Dashboard",
    exceptions:
      role === "manager"
        ? "Manage Exceptions"
        : role === "resolver"
          ? "My Assigned Exceptions"
          : "My Exceptions",
    reports: "Reports",
    users: "User Management",
    assignments: "My Assignments",
    "exception-detail": "Exception Details",
  };

  const pageTitle = pageTitles[activePage] || "Workspace";
  const displayName =
    user.fullName ||
    user.full_name ||
    user.email ||
    "ResolveIQ User";
  const displayRole = role.replaceAll("_", " ");

  const activeAssignmentCount = assignedExceptions.filter((exception) => {
    const status = String(exception.status || "Open").toLowerCase();
    return status !== "resolved" && status !== "closed";
  }).length;

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <Sidebar
        activePage={activePage}
        onNavigate={navigateTo}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role={role}
        assignmentCount={activeAssignmentCount}
      />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
              <span>ResolveIQ</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">
                {pageTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <Search size={18} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                ResolveIQ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
            >
              <Bell size={19} />
            </button>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
                  {displayName}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {displayRole}
                </p>
              </div>

              <ChevronDown
                size={16}
                className="hidden text-slate-400 sm:block"
              />

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="ml-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-8">
          {activePage === "dashboard" && (
            <Dashboard onNavigate={navigateTo} role={role} />
          )}

          {activePage === "exceptions" && (
            <Exceptions onOpenException={openException} />
          )}

          {activePage === "exception-detail" && selectedExceptionId && (
            <ExceptionDetail
              key={selectedExceptionId}
              exceptionId={selectedExceptionId}
              onBack={() => navigateTo("exceptions")}
              role={role}
            />
          )}

          {activePage === "reports" && role === "manager" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
              <p className="mt-2 text-sm text-slate-500">
                Reporting and CSV export are planned for a later step.
              </p>
            </div>
          )}

          {activePage === "users" && role === "manager" && (
            <UserManagement />
          )}

          {activePage === "assignments" && role === "resolver" && (
            <section>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    My Assignments
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Exceptions assigned to you.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePage((page) => page)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              {assignmentsLoading && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  <LoaderCircle size={18} className="animate-spin" />
                  Loading your assignments...
                </div>
              )}

              {!assignmentsLoading && assignmentsError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  {assignmentsError}
                  <button
                    type="button"
                    onClick={() => setActivePage("dashboard")}
                    className="ml-2 font-semibold underline"
                  >
                    Return to dashboard
                  </button>
                </div>
              )}

              {!assignmentsLoading &&
                !assignmentsError &&
                assignedExceptions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <ClipboardList
                      size={36}
                      className="mx-auto text-slate-300"
                    />
                    <h2 className="mt-4 text-lg font-semibold text-slate-800">
                      No assignments yet
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Tasks assigned to you by a manager will appear here.
                    </p>
                  </div>
                )}

              {!assignmentsLoading &&
                !assignmentsError &&
                assignedExceptions.length > 0 && (
                  <div className="grid gap-4">
                    {assignedExceptions.map((exception) => (
                      <button
                        type="button"
                        key={exception.id}
                        onClick={() => openException(exception.id)}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-slate-900">
                              {exception.title || "Untitled exception"}
                            </h2>
                            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                              {exception.description ||
                                "No description provided."}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(exception.status)}`}
                          >
                            {exception.status || "Open"}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                          <span
                            className={`rounded-full px-3 py-1 font-semibold ${priorityStyle(exception.priority)}`}
                          >
                            {exception.priority || "Medium"} priority
                          </span>

                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <CalendarDays size={14} />
                            {formatDate(
                              exception.due_date ?? exception.dueDate
                            )}
                          </span>

                          <span className="ml-auto text-sm font-semibold text-blue-600">
                            View task →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
