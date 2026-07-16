import { useCallback, useEffect, useState } from "react";
import { approveAuthUser, listAuthUsers, rejectAuthUser } from "../api/authApi";
import type { AuthUser } from "../types/auth";
import LoadingSpinner from "./LoadingSpinner";
import SectionPanel from "./SectionPanel";

type UserAccessPanelProps = {
  currentUser: AuthUser;
};

export default function UserAccessPanel({ currentUser }: UserAccessPanelProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!currentUser.canApproveUsers) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listAuthUsers();
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [currentUser.canApproveUsers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const actOnUser = async (
    email: string,
    action: "approve-admin" | "approve-technical" | "reject",
  ) => {
    setPendingEmail(email);
    setError(null);
    setSuccess(null);
    try {
      if (action === "reject") {
        await rejectAuthUser(email);
        setSuccess(`${email} rejected.`);
      } else {
        await approveAuthUser(email, { technicalMode: action === "approve-technical" });
        setSuccess(`${email} approved.`);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "User action failed");
    } finally {
      setPendingEmail(null);
    }
  };

  if (!currentUser.canApproveUsers) {
    return (
      <SectionPanel title="Access control" description="Only Silverio can approve console access.">
        <p className="text-sm text-gray-500">
          You can use the console, but user authorization is restricted to the technical owner.
        </p>
      </SectionPanel>
    );
  }

  const pendingUsers = users.filter((user) => user.status === "pending");
  const approvedUsers = users.filter((user) => user.status === "approved");

  return (
    <SectionPanel
      title="Access control"
      description="Approve Google accounts before they can access the console."
      actions={
        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading || Boolean(pendingEmail)}
          className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 hover:border-gray-500 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh users"}
        </button>
      }
    >
      {error && (
        <p className="mb-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-3 text-sm text-emerald-300" role="status">
          {success}
        </p>
      )}

      {loading && users.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <LoadingSpinner className="size-4" label="Loading users…" />
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-200">
            Pending requests ({pendingUsers.length})
          </h3>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No pending access requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div
                  key={user.email}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-200">{user.name}</p>
                    <p className="font-mono text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(pendingEmail)}
                      onClick={() => void actOnUser(user.email, "approve-admin")}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Approve admin
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(pendingEmail)}
                      onClick={() => void actOnUser(user.email, "approve-technical")}
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Approve technical
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(pendingEmail)}
                      onClick={() => void actOnUser(user.email, "reject")}
                      className="rounded-md border border-red-900/70 px-3 py-1.5 text-xs font-medium text-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-200">
            Approved users ({approvedUsers.length})
          </h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Technical
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted bg-surface-raised">
                {approvedUsers.map((user) => (
                  <tr key={user.email}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.role}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {user.technicalMode ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}
