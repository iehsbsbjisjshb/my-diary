/* Cloudflare Pages Function: /api/*
   Проверяет Basic Auth, проксирует к Worker с X-Secret. */

function corsHeaders(req) {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function unauthorized(req) {
  return new Response("Требуется авторизация", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Diary", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders(req),
    },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  /* CORS preflight */
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  /* Basic Auth */
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Basic ")) return unauthorized(request);

  try {
    const decoded = atob(authHeader.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return unauthorized(request);
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);

    if (user !== env.AUTH_USER || pass !== env.AUTH_PASS) {
      return unauthorized(request);
    }
  } catch {
    return unauthorized(request);
  }

  /* Проксируем к Worker */
  const pathParts = params.path || [];
  const path = Array.isArray(pathParts) ? pathParts.join("/") : pathParts;
  const target = `https://diary-sync.iehsbsbjisjshbb.workers.dev/api/${path}${url.search}`;

  const headers = new Headers();
  headers.set("X-Secret", env.SYNC_SECRET);
  headers.set(
    "Content-Type",
    request.headers.get("Content-Type") || "application/json",
  );

  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const res = await fetch(target, init);
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
      ...corsHeaders(request),
    },
  });
}
