/* Deno Deploy: сервер ежедневника.
   Статика — открыта (для PWA).
   API — только с логином/паролем. */

const AUTH_USER = Deno.env.get("AUTH_USER") || "";
const AUTH_PASS = Deno.env.get("AUTH_PASS") || "";
const SYNC_URL =
  Deno.env.get("SYNC_URL") || "https://diary-sync.iehsbsbjisjshbb.workers.dev";
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") || "";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  webmanifest: "application/manifest+json",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  txt: "text/plain; charset=utf-8",
};

/* ---------- Проверка авторизации ---------- */
function checkAuth(req: Request): boolean {
  if (!AUTH_USER || !AUTH_PASS) return true;

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return false;
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    return user === AUTH_USER && pass === AUTH_PASS;
  } catch {
    return false;
  }
}

function unauthorized(): Response {
  return new Response("Требуется авторизация", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Diary", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

/* ---------- Прокси к Cloudflare Worker (добавляет секрет) ---------- */
async function proxyApi(req: Request, url: URL): Promise<Response> {
  const target = SYNC_URL + url.pathname + url.search;

  const headers = new Headers();
  headers.set(
    "Content-Type",
    req.headers.get("Content-Type") || "application/json",
  );
  headers.set("X-Secret", SYNC_SECRET);

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(target, init);
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}

/* ---------- Сервер ---------- */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;

  /* ============ API — ЗАЩИЩЕНО ============ */
  if (path.startsWith("/api/")) {
    if (!checkAuth(req)) return unauthorized();

    try {
      return await proxyApi(req, url);
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /* ============ СТАТИКА — ОТКРЫТА ============ */
  if (path === "/" || path === "") path = "/index.html";

  try {
    const file = await Deno.readFile(`./${path.slice(1)}`);
    const ext = (path.split(".").pop() || "").toLowerCase();
    return new Response(file, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Not found: " + path, { status: 404 });
  }
});

console.log("Diary server ready");
