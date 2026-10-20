
import {
  LayoutDashboard,
  ClipboardList,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  X,
  Users,
  UserCheck,
} from "lucide-react";

export default function Sidebar({
  activePage,
  onNavigate,
  open,
  onClose,
  role = "reporter",
  assignmentCount = 0,
}) {
  const userRole = String(role).toLowerCase();
  const count = Math.max(0, Number(assignmentCount) || 0);

  const navigation = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      page: "dashboard",
      roles: ["reporter", "resolver", "manager"],
    },
    {
      label: "Exceptions",
      icon: ClipboardList,
      page: "exceptions",
      roles: ["reporter", "resolver", "manager"],
    },
    {
      label: "Reports",
      icon: ChartNoAxesCombined,
      page: "reports",
      roles: ["manager"],
    },
    {
      label: "User Management",
      icon: Users,
      page: "users",
      roles: ["manager"],
    },
    {
      label: "My Assignments",
      icon: UserCheck,
      page: "assignments",
      roles: ["resolver"],
    },
  ];

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  const roleLabel = {
    reporter: "Reporter Workspace",
    resolver: "Resolver Workspace",
    manager: "Manager Console",
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          bg-[#111c34] text-slate-300 transition-transform
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
              <ShieldCheck size={23} />
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-white">
                ResolveIQ
              </p>
              <p className="text-xs text-slate-400">
                {roleLabel[userRole] || "Business Operations"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            {visibleNavigation.map(({ label, icon: Icon, page }) => (
              <button
                key={page}
                type="button"
                onClick={() => {
                  onNavigate(page);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                  activePage === page
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={19} />

                <span className="flex-1">{label}</span>

                {page === "assignments" && count > 0 && (
                  <span
                    aria-label={`${count} active assignments`}
                    className="inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold leading-none text-white shadow-sm"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/10 p-5">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">
              ResolveIQ Workspace
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {userRole === "manager"
                ? "Oversee exceptions, manage assignments, and monitor operations."
                : userRole === "resolver"
                  ? "Review assigned exceptions and record progress toward resolution."
                  : "Report exceptions and track their resolution status."}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 px-1 text-xs text-slate-500">
            <Settings size={14} />
            Operations console
          </div>
        </div>
      </aside>
    </>
  );
}
