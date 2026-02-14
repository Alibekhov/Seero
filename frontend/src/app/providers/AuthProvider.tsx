import type { ReactNode } from "react";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../shared/api/apiFetch";
import { getApiBaseUrl } from "../../shared/config/env";

export type User = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
};

type AuthState = {
  user: User | null;
  access: string | null;
  refresh: string | null;
};

type AuthContextValue = {
  isReady: boolean;
  user: User | null;
  access: string | null;
  refresh: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    first_name: string;
    last_name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: typeof fetch;
};

const AUTH_STORAGE_KEY = "usolve.auth";

const AuthContext = createContext<AuthContextValue | null>(null);

async function getErrorMessage(res: Response) {
  try {
    const data: unknown = await res.json();
    if (typeof data === "string" && data.trim()) return data;

    if (data && typeof data === "object") {
      const anyData = data as Record<string, unknown>;
      if (typeof anyData.detail === "string" && anyData.detail.trim()) return anyData.detail;

      const nonField = anyData.non_field_errors;
      if (Array.isArray(nonField) && typeof nonField[0] === "string") return nonField[0];

      for (const [key, value] of Object.entries(anyData)) {
        if (Array.isArray(value) && typeof value[0] === "string") return `${key}: ${value[0]}`;
      }
    }
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

function loadAuthState(): AuthState {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { user: null, access: null, refresh: null };
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, access: null, refresh: null };
  }
}

function saveAuthState(state: AuthState) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<AuthState>(() => loadAuthState());

  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!state.access) {
        setIsReady(true);
        return;
      }
      try {
        const res = await apiFetch(`${apiBaseUrl}/auth/me/`, {
          access: state.access,
          refresh: state.refresh,
          currentUser: state.user,
          onAuthUpdate: (next) => {
            if (cancelled) return;
            setState(next);
            saveAuthState(next);
          },
        });
        if (!res.ok) throw new Error("me failed");
        const user = (await res.json()) as User;
        const next = { ...state, user };
        if (!cancelled) {
          setState(next);
          saveAuthState(next);
        }
      } catch {
        if (!cancelled) {
          const next = { user: null, access: null, refresh: null };
          setState(next);
          saveAuthState(next);
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authFetch: typeof fetch = useMemo(() => {
    return (input: RequestInfo | URL, init?: RequestInit) =>
      apiFetch(input, {
        init,
        access: state.access,
        refresh: state.refresh,
        currentUser: state.user,
        onAuthUpdate: (next) => {
          setState(next);
          saveAuthState(next);
        },
      });
  }, [state.access, state.refresh, state.user]);

  async function login(email: string, password: string) {
    const res = await fetch(`${apiBaseUrl}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = (await res.json()) as { user: User; access: string; refresh: string };
    const next = { user: data.user, access: data.access, refresh: data.refresh };
    setState(next);
    saveAuthState(next);
  }

  async function register(payload: {
    first_name: string;
    last_name?: string;
    email: string;
    password: string;
  }) {
    const res = await fetch(`${apiBaseUrl}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    const data = (await res.json()) as { user: User; access: string; refresh: string };
    const next = { user: data.user, access: data.access, refresh: data.refresh };
    setState(next);
    saveAuthState(next);
  }

  async function logout() {
    const refresh = state.refresh;
    const next = { user: null, access: null, refresh: null };
    setState(next);
    saveAuthState(next);

    if (!refresh) return;
    await fetch(`${apiBaseUrl}/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(state.access ? { Authorization: `Bearer ${state.access}` } : {}),
      },
      body: JSON.stringify({ refresh }),
    }).catch(() => undefined);
  }

  const value: AuthContextValue = {
    isReady,
    user: state.user,
    access: state.access,
    refresh: state.refresh,
    login,
    register,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
