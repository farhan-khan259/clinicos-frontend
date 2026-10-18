let token = "",
  refreshing;
export const setToken = (v) => {
  token = v;
};
const base = import.meta.env.VITE_API_URL || "/api";
async function raw(url, options = {}) {
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  return fetch(base + url, { credentials: "include", ...options, headers });
}
export function refreshSession() {
  if (!refreshing)
    refreshing = raw("/auth/refresh", { method: "POST" })
      .then(async (r) => {
        if (!r.ok) {
          window.dispatchEvent(new Event("clinic:sessionExpired"));
          throw Error("Session expired. Sign in again.");
        }
        const d = await r.json();
        setToken(d.accessToken);
        return d;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}
export async function api(url, options = {}) {
  const opts = { ...options };
  if (opts.body && !(opts.body instanceof FormData))
    opts.body = JSON.stringify(opts.body);
  let res = await raw(url, opts);
  if (res.status === 401 && !url.startsWith("/auth/")) {
    await refreshSession();
    res = await raw(url, opts);
  }
  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {}
    throw Error(data?.message || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}
export async function download(url, name) {
  let r = await raw(url);
  if (r.status === 401) {
    await refreshSession();
    r = await raw(url);
  }
  if (!r.ok) {
    const e = await r.json();
    throw Error(e.message);
  }
  const href = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
