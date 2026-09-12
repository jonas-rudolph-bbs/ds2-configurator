/**
 * Computes the backend API base URL from the frontend's own hostname.
 *
 * On IDT, each module component gets its own subdomain under the
 * organisation's configured domain (e.g. "ds2ddtconfigurator.dtt.ds2.local"
 * for the frontend, "ds2ddtbackend.dtt.ds2.local" for the backend) — see
 * DS2's "Backend URL" guidance for module Helm charts.
 *
 * Locally (ng serve with proxy.conf.json, or Docker Compose with
 * nginx.local.conf) there's no such subdomain split — a proxy in front
 * already routes relative API calls to the backend on the same origin.
 * In that case this returns "" so existing relative-URL calls
 * (e.g. http.get('/configs/...')) keep working unchanged.
 */
export function getApiBase(): string {
  const hostname = window.location.hostname;
  const frontendPrefix = 'ds2ddtconfigurator.';

  if (!hostname.startsWith(frontendPrefix)) {
    // Local dev / Docker Compose — rely on the existing proxy, no prefix needed.
    return '';
  }

  const domain = hostname.replace(new RegExp(`^${frontendPrefix}`), '');
  const protocol = window.location.protocol; // "https:" or "http:"
  // Real IDT Ingress never has an explicit port (standard 80/443), but
  // local testing setups might use a non-standard port — include it
  // when present so this also works for those.
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${protocol}//ds2ddtbackend.${domain}${port}`;
}
