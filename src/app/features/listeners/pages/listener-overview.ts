import { Component, inject } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { AsyncPipe } from "@angular/common";
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, timer } from "rxjs";
import { Modal } from "bootstrap";
import { ListenerService } from "../services/listener.service";
import { ConfigurationService } from "../../configuration/services/configuration.service";
import { ValidationState } from "../../configuration/services/configuration.types";
import {
  Listener,
  ListenerState,
  apiErrorMessage,
  effectivePublishTopics,
  listenerState,
  toListenerInput,
} from "../services/listener.types";

/** Status counts (messages, last message) change all the time, so the list refreshes itself. */
const STATUS_REFRESH_MS = 5000;

interface ConfigGroup {
  id: string;
  name: string;
  topics: string[];
  listeners: Listener[];
}

@Component({
  standalone: true,
  selector: "app-listener-overview",
  imports: [RouterModule, AsyncPipe],
  templateUrl: "./listener-overview.html",
  styleUrls: ["./listener-overview.css"],
})
export class ListenerOverview {
  private readonly router = inject(Router);
  private readonly listenerService = inject(ListenerService);
  private readonly configService = inject(ConfigurationService);

  readonly effectivePublishTopics = effectivePublishTopics;
  readonly listenerState = listenerState;

  errorMessage: string | null = null;
  pendingDelete: Listener | null = null;
  togglingId: string | null = null;
  loadFailed = false;

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly configs$ = this.refresh$.pipe(
    switchMap(() =>
      this.configService.getAllConfigurationStates().pipe(catchError(() => of([] as ValidationState[])))
    )
  );

  private readonly listeners$ = this.refresh$.pipe(
    switchMap(() => timer(0, STATUS_REFRESH_MS)),
    switchMap(() =>
      this.listenerService.getListeners().pipe(
        map((listeners) => {
          this.loadFailed = false;
          return listeners;
        }),
        catchError(() => {
          this.loadFailed = true;
          return of([] as Listener[]);
        })
      )
    )
  );

  /** One block per validation configuration, listeners attached to it */
  readonly groups$ = combineLatest([this.configs$, this.listeners$]).pipe(
    map(([configs, listeners]) => this.groupByConfig(configs, listeners))
  );

  stateLabel(state: ListenerState): string {
    return { subscribed: "Subscribed", "not-connected": "Not connected", disabled: "Disabled" }[state];
  }

  timeAgo(value: string | null | undefined): string {
    if (!value) return "no messages yet";
    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return `last message ${seconds}s ago`;
    if (seconds < 3600) return `last message ${Math.round(seconds / 60)} min ago`;
    return `last message ${new Date(value).toLocaleString("de-DE")}`;
  }

  onAddListenerClick(configId?: string): void {
    this.router.navigate(["/listeners/new"], configId ? { queryParams: { config: configId } } : {});
  }

  onEditClick(listener: Listener): void {
    this.router.navigate(["/listeners", listener.id]);
  }

  onToggleEnabled(listener: Listener): void {
    this.togglingId = listener.id;
    const payload = { ...toListenerInput(listener), enabled: !listener.enabled };
    this.listenerService.updateListener(listener.id, payload).subscribe({
      next: () => {
        this.togglingId = null;
        this.refresh$.next();
      },
      error: (err) => {
        this.togglingId = null;
        this.showError(apiErrorMessage(err, "Unexpected error occurred while updating the listener."));
        this.refresh$.next();
      },
    });
  }

  onDeleteClick(listener: Listener): void {
    this.pendingDelete = listener;
    const element = document.getElementById("deleteListenerModal");
    if (element) Modal.getOrCreateInstance(element).show();
  }

  onDeleteConfirmed(): void {
    const listener = this.pendingDelete;
    if (!listener) return;
    this.listenerService.deleteListener(listener.id).subscribe({
      next: () => {
        this.pendingDelete = null;
        this.refresh$.next();
      },
      error: (err) => {
        this.pendingDelete = null;
        this.showError(apiErrorMessage(err, "Unexpected error occurred while deleting the listener."));
      },
    });
  }

  private showError(message: string): void {
    this.errorMessage = message;
    const element = document.getElementById("listenerErrorModal");
    if (element) Modal.getOrCreateInstance(element).show();
  }

  private groupByConfig(configs: ValidationState[], listeners: Listener[]): ConfigGroup[] {
    const groups: ConfigGroup[] = configs
      .map((c) => ({
        id: c.id,
        name: c.metadata.name || c.id,
        topics: Object.keys(c.topics ?? {}),
        listeners: listeners.filter((l) => l.validation_config_id === c.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de-DE", { sensitivity: "base" }));

    // The backend prevents this (409), but don't hide a listener whose config can't be loaded
    const known = new Set(configs.map((c) => c.id));
    const orphans = listeners.filter((l) => !known.has(l.validation_config_id));
    if (orphans.length) {
      groups.push({ id: "", name: "Unknown configuration", topics: [], listeners: orphans });
    }
    return groups;
  }
}
