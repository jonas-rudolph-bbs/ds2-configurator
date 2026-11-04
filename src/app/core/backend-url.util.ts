/**
 * Base URL for backend API calls: always the frontend's own origin.
 *
 * A proxy in front of the app routes the API paths (/configs/...,
 * /profiling/profile/...) to the backend: nginx.conf on IDT, nginx.local.conf
 * in Docker Compose, proxy.conf.json with ng serve.
 *
 * Calling the backend's own IDT subdomain ("ds2ddtbackend.<domain>") instead
 * made browsers block the requests (a second self-signed certificate,
 * Firefox's local network access protection).
 */
export function getApiBase(): string {
  return '';
}
