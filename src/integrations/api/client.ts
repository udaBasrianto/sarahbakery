const IS_DEV = import.meta.env.DEV;
const explicitUrl = import.meta.env.VITE_API_URL;
const API_URL = (IS_DEV ? "/api" : (explicitUrl || window.location.origin)).replace(/\/+$/, "");
const AUTH_STORAGE_KEY = "sarah-auth-session";

export type User = {
  id: string;
  email?: string;
  phone?: string | null;
  [key: string]: any;
};

export type Session = {
  user: User;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | null;
  [key: string]: any;
};

export type ApiClientResponse<T = any> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};

type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: User;
};

type QueryFilter = {
  field: string;
  operator: string;
  value: any;
};

type QueryOrder = {
  column: string;
  ascending: boolean;
};

function getStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function setStoredSession(session: Session | null) {
  if (session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

const authSubscribers = new Map<number, (event: string, session: Session | null) => void>();
let nextSubscriberId = 1;

function notifyAuthStateChange(event: string, session: Session | null) {
  authSubscribers.forEach((callback) => callback(event, session));
}

async function fetchApi(path: string, init: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const session = getStoredSession();
  const headers: Record<string, string> = {};

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const resp = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers || {}),
      },
    });

    const text = await resp.text();
    try {
      const parsed = JSON.parse(text);
      if (!resp.ok && parsed && !parsed.error) {
        return { data: null, error: { message: parsed?.detail?.message || (typeof parsed?.detail === "string" ? parsed.detail : null) || text || `Request failed: ${resp.status}` } };
      }
      return parsed;
    } catch {
      return { error: { message: text || `Request failed: ${resp.status}` } };
    }
  } catch (e: any) {
    if (e?.name === "AbortError" || (e?.message && String(e.message).toLowerCase().includes("abort"))) {
      return { data: null, error: null, __aborted: true };
    }
    return { error: { message: e?.message || "Network error" } };
  }
}

async function apiRequest(path: string, method: string, body?: any) {
  const init: RequestInit = {
    method,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
    }
  }

  const result = await fetchApi(path, init);
  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
  } as ApiClientResponse<any>;
}

function createQueryBuilder(table: string) {
  const state = {
    table,
    select: "*",
    filters: [] as QueryFilter[],
    order: null as QueryOrder | null,
    limit: null as number | null,
    single: false,
    maybeSingle: false,
    operation: "GET",
    body: undefined as any,
  };

  const execute = async () => {
    const response = await apiRequest("/query", "POST", {
      table: state.table,
      select: state.select,
      filters: state.filters,
      order: state.order,
      limit: state.limit,
      single: state.single,
      maybeSingle: state.maybeSingle,
      operation: state.operation,
      data: state.body,
    });

    return { data: response.data, error: response.error };
  };

  return {
    select(selectClause: string) {
      state.select = selectClause;
      return this;
    },
    eq(field: string, value: any) {
      state.filters.push({ field, operator: "eq", value });
      return this;
    },
    ilike(field: string, value: string) {
      state.filters.push({ field, operator: "ilike", value });
      return this;
    },
    in(field: string, values: any[]) {
      state.filters.push({ field, operator: "in", value: values });
      return this;
    },
    order(column: string, options: { ascending?: boolean } = {}) {
      state.order = { column, ascending: options.ascending ?? true };
      return this;
    },
    limit(count: number) {
      state.limit = count;
      return this;
    },
    single() {
      state.single = true;
      return this;
    },
    maybeSingle() {
      state.maybeSingle = true;
      return this;
    },
    insert(data: any) {
      state.operation = "POST";
      state.body = data;
      return this;
    },
    update(data: any) {
      state.operation = "PATCH";
      state.body = data;
      return this;
    },
    delete() {
      state.operation = "DELETE";
      return this;
    },
    then(onfulfilled: (value: ApiClientResponse<any>) => any, onrejected?: (reason: any) => any) {
      return execute().then(onfulfilled, onrejected);
    },
  };
}

function createStorageBucket(bucket: string) {
  return {
    upload: async (path: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", path);
      const result = await fetchApi(`/storage/${bucket}/upload`, {
        method: "POST",
        body: formData,
      });
      return {
        error: result?.error ?? null,
      };
    },
    getPublicUrl: (path: string) => {
      return {
        data: {
          publicUrl: `${API_URL}/storage/${bucket}/public/${encodeURIComponent(path)}`,
        },
      };
    },
  };
}

const auth = {
  getSession: async () => {
    const session = getStoredSession();
    return { data: { session }, error: null };
  },
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    const id = nextSubscriberId++;
    authSubscribers.set(id, callback);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("type") === "recovery" || urlParams.get("type") === "password_recovery") {
      callback("PASSWORD_RECOVERY", null);
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => authSubscribers.delete(id),
        },
      },
    };
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const result = await apiRequest("/auth/signin", "POST", { email, password });
    if (result.data?.session) {
      setStoredSession(result.data.session);
      notifyAuthStateChange("SIGNED_IN", result.data.session);
    }
    return { data: { session: result.data?.session ?? null }, error: result.error };
  },
  signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
    const result = await apiRequest("/auth/signup", "POST", { email, password, options });
    if (result.data?.session) {
      setStoredSession(result.data.session);
      notifyAuthStateChange("SIGNED_IN", result.data.session);
    }
    return { data: { session: result.data?.session ?? null }, error: result.error };
  },
  resetPasswordForEmail: async ({ email, options }: { email: string; options?: any }) => {
    return apiRequest("/auth/reset-password", "POST", { email, options });
  },
  updateUser: async (updates: any) => {
    return apiRequest("/auth/user", "PUT", updates);
  },
  getUser: async () => {
    const result = await apiRequest("/auth/user", "GET");
    return { data: result.data, error: result.error };
  },
  signOut: async () => {
    setStoredSession(null);
    notifyAuthStateChange("SIGNED_OUT", null);
    return { error: null };
  },
  setSession: async (tokens: AuthTokens) => {
    const session: Session = {
      user: tokens.user ?? { id: "" },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at ?? null,
    };
    setStoredSession(session);
    notifyAuthStateChange("SIGNED_IN", session);
    return { data: { session }, error: null };
  },
};

export const apiClient = {
  auth,
  from: (table: string) => createQueryBuilder(table),
  rpc: async (name: string, params?: any) => {
    const result = await apiRequest(`/rpc/${encodeURIComponent(name)}`, "POST", params ?? {});
    return { data: result.data, error: result.error };
  },
  storage: {
    from: createStorageBucket,
  },
};


