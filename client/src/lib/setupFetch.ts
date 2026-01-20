/**
 * Global fetch interceptor for API calls
 *
 * This intercepts all fetch calls to /api/* and:
 * 1. Redirects them to the Railway backend (VITE_API_URL)
 * 2. Adds Authorization header with Supabase JWT token
 */

import { getAccessToken } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Store the original fetch
const originalFetch = window.fetch.bind(window);

// Override global fetch
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  // Check if this is an API call that needs to be redirected
  const isApiCall = url.startsWith("/api") || url.startsWith("api/");

  if (isApiCall && API_BASE_URL) {
    // Normalize and prepend base URL
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;
    url = `${API_BASE_URL}${normalizedPath}`;

    // Get auth token and add to headers
    const token = await getAccessToken();
    const headers = new Headers(init?.headers);

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Create new init with updated headers
    const newInit: RequestInit = {
      ...init,
      headers,
      credentials: init?.credentials ?? "include",
    };

    return originalFetch(url, newInit);
  }

  // For non-API calls, use original fetch
  return originalFetch(input, init);
};

// Log configuration on load
if (API_BASE_URL) {
  console.log(`[API] Configured to use backend at: ${API_BASE_URL}`);
} else {
  console.log("[API] Using relative URLs (same origin)");
}

export {};
