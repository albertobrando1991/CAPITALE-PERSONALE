import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken } from "./supabase";

// API base URL - use Railway backend in production, relative URLs in development
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Get full API URL - prepends base URL for production
 */
export function getApiUrl(path: string): string {
  if (API_BASE_URL && path.startsWith("/api")) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Get headers with Authorization if available
 */
async function getAuthHeaders(hasBody: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {};

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  // Add JWT token if available
  try {
    const token = await getAccessToken();
    if (token) {
      // console.log("[API] Attaching Bearer token");
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn("[API] No access token found (session might be missing or expired)");
    }
  } catch (err) {
    console.error("[API] Error retrieving access token:", err);
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = await getAuthHeaders(!!data);
  const fullUrl = getApiUrl(url);
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Keep for legacy session support
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const headers = await getAuthHeaders();
      const url = queryKey.join("/") as string;
      const fullUrl = getApiUrl(url);
      const res = await fetch(fullUrl, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
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
