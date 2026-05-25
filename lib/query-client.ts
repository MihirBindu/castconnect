import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
const REQUEST_TIMEOUT_MS = 10_000;

/** Returns the Express API base URL, or null when EXPO_PUBLIC_DOMAIN is unset. */
export function getApiUrl(): string | null {
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) return null;
  try {
    return new URL(`https://${host}`).href;
  } catch {
    return null;
  }
}

function withTimeout(callerSignal?: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  callerSignal?.addEventListener('abort', () => ctrl.abort());
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown,
): Promise<Response> {
  const baseUrl = getApiUrl();
  if (!baseUrl) throw new Error('Express API not configured — set EXPO_PUBLIC_DOMAIN in your .env file.');

  const url = new URL(route, baseUrl);
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(url.toString(), {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal,
    });
    await throwIfResNotOk(res);
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Request timed out.');
    throw err;
  } finally {
    clear();
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal: callerSignal }) => {
    const baseUrl = getApiUrl();
    if (!baseUrl) throw new Error('Express API not configured — set EXPO_PUBLIC_DOMAIN in your .env file.');

    const url = new URL(queryKey.join("/") as string, baseUrl);
    const { signal, clear } = withTimeout(callerSignal);
    try {
      const res = await fetch(url.toString(), { credentials: "include", signal });
      if (unauthorizedBehavior === "returnNull" && res.status === 401) return null;
      await throwIfResNotOk(res);
      return await res.json();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw new Error('Request timed out.');
      throw err;
    } finally {
      clear();
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
