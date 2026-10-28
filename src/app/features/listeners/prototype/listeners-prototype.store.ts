// PROTOTYPE — throwaway, lives on branch prototype/listener-page only.
// Question: "What should the MQTT listener page look like?"
// Reads listeners + validation configs live from the backend (GET only).
// Save / delete / enable only change an in-memory copy; "Reload" resets it.
import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { forkJoin } from "rxjs";
import { getApiBase } from "../../../core/backend-url.util";

export interface ListenerStatus {
  subscribed: boolean;
  last_message_at: string | null;
  message_count: number;
  error_count: number;
}

export interface Listener {
  id: string;
  name: string;
  source: string;
  enabled: boolean;
  validation_config_id: string;
  validation_topic: string;
  publish_validated: string | null;
  publish_alarm: string | null;
  batch_size: number;
  variables: string[];
  timestamp_attribute: string | null;
  status?: ListenerStatus;
}

export interface ConfigSummary {
  id: string;
  name: string;
  topics: string[];
}

@Injectable()
export class ListenerProtoStore {
  private readonly http = inject(HttpClient);
  private readonly api = getApiBase();

  readonly listeners = signal<Listener[]>([]);
  readonly configs = signal<ConfigSummary[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly log = signal<string[]>([]);

  readonly configById = computed(() => new Map(this.configs().map((c) => [c.id, c])));

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loaded.set(false);
    forkJoin({
      l: this.http.get<any>(`${this.api}/configs/listeners`),
      v: this.http.get<any>(`${this.api}/configs/validation`),
    }).subscribe({
      next: ({ l, v }) => {
        this.listeners.set(l.listeners ?? []);
        this.configs.set(
          Object.entries(v.validation ?? {}).map(([id, cfg]: [string, any]) => ({
            id,
            name: cfg?.metadata?.name || id,
            topics: Object.keys(cfg?.topics ?? {}),
          }))
        );
        this.loadError.set(null);
        this.loaded.set(true);
        this.note("loaded from backend");
      },
      error: (e) => {
        this.loadError.set(`Backend not reachable (${e.status}). Is it running on :8000 with the proxy?`);
        this.loaded.set(true);
      },
    });
  }

  configName(id: string): string {
    return this.configById().get(id)?.name ?? `unknown config ${id.slice(0, 8)}…`;
  }

  topicsOf(id: string): string[] {
    return this.configById().get(id)?.topics ?? [];
  }

  effectivePublish(l: Pick<Listener, "source" | "publish_validated" | "publish_alarm">): [string, string] {
    const s = l.source || "<source>";
    return [l.publish_validated || `ddt/${s}/validated`, l.publish_alarm || `ddt/${s}/alarm`];
  }

  statusOf(l: Listener): "subscribed" | "disabled" | "waiting" {
    if (!l.enabled) return "disabled";
    return l.status?.subscribed ? "subscribed" : "waiting";
  }

  blank(): Listener {
    return {
      id: "",
      name: "",
      source: "",
      enabled: true,
      validation_config_id: "",
      validation_topic: "",
      publish_validated: null,
      publish_alarm: null,
      batch_size: 5,
      variables: [],
      timestamp_attribute: null,
    };
  }

  /** Same rules as the backend (400). Returns the error message or null. */
  validate(d: Listener): string | null {
    for (const f of ["name", "source", "validation_config_id", "validation_topic"] as const) {
      if (!String(d[f] ?? "").trim()) return `'${f}' is required`;
    }
    if (/[+#]/.test(d.source)) return `MQTT wildcards ('+', '#') are not allowed in source '${d.source}'`;
    if (!Number.isInteger(d.batch_size) || d.batch_size < 1) return "'batch_size' must be an integer >= 1";
    const others = this.listeners().filter((l) => l.id !== d.id);
    const dup = others.find((l) => l.source === d.source);
    if (dup) return `Listener '${dup.name}' already subscribes to '${d.source}'`;
    if (this.effectivePublish(d).includes(d.source)) return `Source '${d.source}' equals the listener's own publish topic`;
    for (const o of others) {
      if (this.effectivePublish(o).includes(d.source)) return `Source '${d.source}' equals a publish topic of listener '${o.name}'`;
      if (this.effectivePublish(d).includes(o.source)) return `A publish topic equals the source of listener '${o.name}'`;
    }
    if (!this.topicsOf(d.validation_config_id).includes(d.validation_topic))
      return `Unknown validation topic '${d.validation_topic}'`;
    return null;
  }

  save(d: Listener): string | null {
    const err = this.validate(d);
    if (err) {
      this.note(`400: ${err}`);
      return err;
    }
    if (d.id) {
      this.listeners.update((ls) => ls.map((l) => (l.id === d.id ? { ...d } : l)));
      this.note(`updated '${d.name}' (in memory)`);
    } else {
      const created = { ...d, id: crypto.randomUUID(), status: { subscribed: true, last_message_at: null, message_count: 0, error_count: 0 } };
      this.listeners.update((ls) => [...ls, created]);
      this.note(`created '${d.name}' (in memory)`);
    }
    return null;
  }

  remove(id: string): void {
    const l = this.listeners().find((x) => x.id === id);
    this.listeners.update((ls) => ls.filter((x) => x.id !== id));
    this.note(`deleted '${l?.name}' (in memory)`);
  }

  toggle(id: string): void {
    this.listeners.update((ls) => ls.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
    const l = this.listeners().find((x) => x.id === id);
    this.note(`${l?.enabled ? "enabled" : "disabled"} '${l?.name}' (in memory)`);
  }

  ago(iso: string | null | undefined): string {
    if (!iso) return "never";
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(iso).toLocaleString("de-DE");
  }

  private note(msg: string): void {
    this.log.update((l) => [`${new Date().toLocaleTimeString("de-DE")}  ${msg}`, ...l].slice(0, 8));
  }
}
