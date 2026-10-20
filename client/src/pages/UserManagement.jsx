
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "../api/client";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/users");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function changeRole(userId, newRole) {
    setError("");
    setSuccess("");
    setUpdatingId(userId);

    try {
      const data = await apiRequest(`/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          String(user.id) === String(userId)
            ? { ...user, ...data.user }
            : user
        )
      );

      setSuccess(
        `${data.user.full_name || data.user.email} is now a ${newRole}.`
      );
    } catch (err) {
      setError(err.message || "Could not update the user's role.");
      await loadUsers();
    } finally {
      setUpdatingId(null);
    }
  }

  const activeUsers = users.filter((user) => user.is_active);
  const resolverCount = activeUsers.filter(
    (user) => user.role === "resolver"
  ).length;

  const managerCount = activeUsers.filter(
    (user) => user.role === "manager"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            User Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            View registered users and manage reporter and resolver access.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={Users}
          label="Total Users"
          value={users.length}
        />
        <SummaryCard
          icon={ShieldCheck}
          label="Managers"
          value={managerCount}
        />
        <SummaryCard
          icon={UserCheck}
          label="Resolvers"
          value={resolverCount}
        />
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Registered Accounts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Only active users can have their roles changed here.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">User</th>
                  <th className="px-5 py-4 font-semibold">Current Role</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Change Role</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {user.full_name || "Unnamed user"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
                        {user.role}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.role === "manager" ? (
                        <span className="text-xs text-slate-500">
                          Manager account
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={!user.is_active || updatingId === user.id}
                          onChange={(event) =>
                            changeRole(user.id, event.target.value)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                          aria-label={`Change role for ${user.email}`}
                        >
                          <option value="reporter">Reporter</option>
                          <option value="resolver">Resolver</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Manager accounts cannot be changed from this screen. Role changes
        are submitted to the backend, which checks manager authorization.
      </p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon size={21} className="text-blue-600" />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
