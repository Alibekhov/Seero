import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isReady, access } = useAuth();

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!access) return <Navigate to="/" replace />;

  return children;
}
