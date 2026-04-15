const DEV_DEFAULT = "dashboard-local";

function expectedToken(): string {
  return process.env.DASHBOARD_LOCAL_TOKEN || DEV_DEFAULT;
}

/**
 * Guard for local-only script endpoints. Tailscale is the real auth boundary;
 * this is defense-in-depth against stray browser requests (CSRF-shaped risks
 * if the tailnet ever gets broader device access than expected).
 */
export function requireLocal(req: Request): Response | null {
  const header = req.headers.get("x-local");
  if (header !== expectedToken()) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
