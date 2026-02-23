// Base API client for Vasudha
// Uses fetch API — no external dependencies needed

const BASE_URL = import.meta.env.VITE_API_URL;

interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Attach auth token if available
  const token = localStorage.getItem("vasudha_token");
  if (token) {
    (defaultHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }

    return { data, success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Network error";
    console.error(`[API] ${options.method || "GET"} ${endpoint} failed:`, message);
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

export default apiClient;
