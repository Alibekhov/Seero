import { getApiBaseUrl } from "../config/env";

type AuthState<TUser> = {
  user: TUser | null;
  access: string | null;
  refresh: string | null;
};

type ApiFetchOptions<TUser> = {
  init?: RequestInit;
  access: string | null;
  refresh: string | null;
  currentUser: TUser | null;
  onAuthUpdate: (next: AuthState<TUser>) => void;
};

async function refreshAccessToken(refresh: string) {
  const apiBaseUrl = getApiBaseUrl();
  const res = await fetch(`${apiBaseUrl}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error("refresh failed");
  return (await res.json()) as { access: string; refresh?: string };
}

export async function apiFetch<TUser>(
  input: RequestInfo | URL,
  options: ApiFetchOptions<TUser>,
): Promise<Response> {
  const { init, access, refresh, currentUser, onAuthUpdate } = options;

  const headers = new Headers(init?.headers || undefined);
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const first = await fetch(input, { ...init, headers });
  if (first.status !== 401 || !refresh) return first;

  try {
    const tokens = await refreshAccessToken(refresh);
    onAuthUpdate({ user: currentUser, access: tokens.access, refresh: tokens.refresh ?? refresh });

    const retryHeaders = new Headers(init?.headers || undefined);
    retryHeaders.set("Authorization", `Bearer ${tokens.access}`);
    return fetch(input, { ...init, headers: retryHeaders });
  } catch {
    onAuthUpdate({ user: null, access: null, refresh: null });
    return first;
  }
}
