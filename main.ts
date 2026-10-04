/* Deno Deploy: сервер для раздачи статики ежедневника */

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  ico2: "image/x-icon",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  let path = url.pathname;
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
