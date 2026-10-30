// listener.types.ts
// MQTT listener as returned by the backend (GET /configs/listeners).
// A listener subscribes to one MQTT topic (`source`) and validates its messages
// with one topic section (`validation_topic`) of a validation configuration.

export interface ListenerStatus {
  /** Broker connected AND the listener's pipeline is running */
  subscribed: boolean;
  last_message_at: string | null;
  message_count: number;
  /** Messages that weren't valid JSON */
  error_count: number;
}

export interface Listener {
  id: string;
  name: string;
  source: string;
  enabled: boolean;
  validation_config_id: string;
  validation_topic: string;
  /** null = default ddt/<source>/validated */
  publish_validated: string | null;
  /** null = default ddt/<source>/alarm */
  publish_alarm: string | null;
  batch_size: number;
  variables: string[];
  timestamp_attribute: string | null;
  /** Only on GET responses */
  status?: ListenerStatus;
}

/** Body for POST / PUT (id and status are set by the server) */
export type ListenerInput = Omit<Listener, "id" | "status">;

export type ListenerState = "subscribed" | "not-connected" | "disabled";

export function listenerState(l: Listener): ListenerState {
  if (!l.enabled) return "disabled";
  return l.status?.subscribed ? "subscribed" : "not-connected";
}

/** Publish topics the backend actually uses (defaults when empty) */
export function effectivePublishTopics(
  l: Pick<Listener, "source" | "publish_validated" | "publish_alarm">
): { validated: string; alarm: string } {
  const source = l.source || "<source>";
  return {
    validated: l.publish_validated || `ddt/${source}/validated`,
    alarm: l.publish_alarm || `ddt/${source}/alarm`,
  };
}

export function toListenerInput(l: Listener): ListenerInput {
  const { id, status, ...input } = l;
  return input;
}

/** Readable message from a backend error (400/404/409 detail string, 422 detail list) */
export function apiErrorMessage(err: any, fallback: string): string {
  const detail = err?.error?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join("; ");
  return fallback;
}
