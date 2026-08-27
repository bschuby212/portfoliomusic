const DEFAULT_ALLOWED = [
  "https://blakeschubert.com",
  "https://www.blakeschubert.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const fromEnv = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowlist = [...DEFAULT_ALLOWED, ...fromEnv];
  if (allowlist.includes(origin)) return true;

  try {
    const host = new URL(origin).hostname;
    return (
      host === "framer.com" ||
      host.endsWith(".framer.com") ||
      host.endsWith(".framer.app") ||
      host.endsWith(".framer.website") ||
      host.endsWith(".framercanvas.com") ||
      host.endsWith(".framerusercontent.com")
    );
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function jsonWithCors(request: Request, body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders(request),
      ...(init?.headers ?? {}),
    },
  });
}

export function optionsWithCors(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
