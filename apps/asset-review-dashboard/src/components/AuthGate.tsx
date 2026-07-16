import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getAuthMe, logout } from "../api/authApi";
import type { AuthUser } from "../types/auth";
import LoadingSpinner from "./LoadingSpinner";

type AuthGateProps = {
  children: (user: AuthUser) => ReactNode;
};

function LoginShell({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-6 text-center shadow-xl">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm text-gray-400">{message}</p>
        {action && <div className="mt-6">{action}</div>}
      </section>
    </main>
  );
}

export default function AuthGate({ children }: AuthGateProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const result = await getAuthMe();
        setAuthenticated(result.authenticated);
        setUser(result.authenticated ? result.user : null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <LoginShell
        title="Avatares AI Console"
        message="Checking your session."
        action={<LoadingSpinner className="mx-auto size-5" label="Loading session…" />}
      />
    );
  }

  if (!authenticated || !user) {
    return (
      <LoginShell
        title="Avatares AI Console"
        message="Sign in with Google to request access."
        action={
          <a
            href="/auth/login"
            className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign in with Google
          </a>
        }
      />
    );
  }

  if (user.status === "pending") {
    return (
      <LoginShell
        title="Access pending"
        message="Your Google account was registered. Silverio must approve access before you can use the console."
        action={
          <button
            type="button"
            onClick={() => void logout().then(() => window.location.assign("/"))}
            className="rounded-md border border-border px-4 py-2 text-sm text-gray-200 hover:border-gray-500"
          >
            Sign out
          </button>
        }
      />
    );
  }

  if (user.status === "rejected") {
    return (
      <LoginShell
        title="Access not approved"
        message="This Google account is not authorized to use the console."
        action={
          <button
            type="button"
            onClick={() => void logout().then(() => window.location.assign("/"))}
            className="rounded-md border border-border px-4 py-2 text-sm text-gray-200 hover:border-gray-500"
          >
            Sign out
          </button>
        }
      />
    );
  }

  return <>{children(user)}</>;
}
