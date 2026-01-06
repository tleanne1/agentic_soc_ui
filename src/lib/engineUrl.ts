export const ENGINE_URL = (() => {
    const raw = process.env.NEXT_PUBLIC_ENGINE_URL || "http://127.0.0.1:8787";
    return raw.trim().replace(/\/+$/, ""); // trims + removes trailing slash(es)
  })();
  
  export function engineEndpoint(path: string) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${ENGINE_URL}${p}`;
  }
  