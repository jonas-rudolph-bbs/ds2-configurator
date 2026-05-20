import { Component, inject } from "@angular/core";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
} from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { Router, RouterModule } from "@angular/router";
import { AsyncPipe } from "@angular/common";
import { ValidationState } from "../services/configuration.types";
import { take } from "rxjs/operators";
import { Modal } from "bootstrap";

type SortColumn = "name" | "id" | "created_at" | "updated_at";
type SortDirection = "asc" | "desc";

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

@Component({
  standalone: true,
  selector: "app-configuration-overview",
  imports: [RouterModule, AsyncPipe],
  templateUrl: "./configuration-overview.html",
  styleUrls: ["./configuration-overview.css"],
})
export class ConfigurationOverview {
  constructor(private router: Router) { }

  private readonly configService: ConfigurationService =
    inject(ConfigurationService);

  errorMessage: string | null = null;

  sortColumn: SortColumn = "name";
  sortDirection: SortDirection = "asc";

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly sortState$ = new BehaviorSubject<SortState>({
    column: this.sortColumn,
    direction: this.sortDirection,
  });

  states$ = this.refresh$.pipe(
    switchMap(() =>
      this.configService.getAllConfigurationStates().pipe(
        startWith([] as ValidationState[]),
        catchError(() => of([] as ValidationState[]))
      )
    )
  );

  sortedStates$ = combineLatest([this.states$, this.sortState$]).pipe(
    map(([states, sortState]) => this.sortStates(states, sortState))
  );

  ids$ = this.states$.pipe(map((states) => states.map((s) => s.id)));

  onSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    this.sortState$.next({
      column: this.sortColumn,
      direction: this.sortDirection,
    });
  }

  getSortIndicator(column: SortColumn): string {
    if (this.sortColumn !== column) {
      return "";
    }

    return this.sortDirection === "asc" ? "▲" : "▼";
  }

  formatDate(value: unknown): string {
    if (!value || typeof value !== "string") {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onAddConfigurationClick(): void {
    this.ids$.pipe(take(1)).subscribe((ids) => {
      let newId: string;

      do {
        newId = crypto.randomUUID();
      } while (ids.includes(newId));

      this.router.navigate(["/details", newId]);
    });
  }

  onDeleteClick(id: string): void {
    this.configService.deleteConfiguration(id).subscribe({
      next: () => {
        this.refresh$.next();
      },
      error: (err) => {
        console.error("Error deleting configuration:", err);
        this.errorMessage =
          err?.error?.detail ??
          "Unexpected error occurred while deleting the configuration.";

        const element = document.getElementById("errorModal");
        if (element) {
          const modal = Modal.getOrCreateInstance(element);
          modal.show();
        }
      },
    });
  }

  private sortStates(
    states: ValidationState[],
    sortState: SortState
  ): ValidationState[] {
    return [...states].sort((a, b) => {
      const aValue = this.getSortValue(a, sortState.column);
      const bValue = this.getSortValue(b, sortState.column);

      if (aValue === null && bValue === null) {
        return 0;
      }

      if (aValue === null) {
        return 1;
      }

      if (bValue === null) {
        return -1;
      }

      let result = 0;

      if (typeof aValue === "number" && typeof bValue === "number") {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), "de-DE", {
          sensitivity: "base",
        });
      }

      return sortState.direction === "asc" ? result : -result;
    });
  }

  private getSortValue(
    state: ValidationState,
    column: SortColumn
  ): string | number | null {
    switch (column) {
      case "name":
        return (state.metadata.name || state.id).toLowerCase();

      case "id":
        return state.id.toLowerCase();

      case "created_at":
        return this.getTimestamp(state.metadata.created_at);

      case "updated_at":
        return this.getTimestamp(state.metadata.updated_at);
    }
  }

  private getTimestamp(value: unknown): number | null {
    if (!value || typeof value !== "string") {
      return null;
    }

    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp) ? null : timestamp;
  }
}