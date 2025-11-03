// configuration.service.ts
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, map, shareReplay } from "rxjs/operators";
import {
  ValidationRoot,
  ValidationState,
  TopicsMap,
} from "./configuration.types";

@Injectable({ providedIn: "root" })
export class ConfigurationService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch and normalize all validation states into an array:
   * [{ id, topics }, ...]
   */
  getAllConfigurationStates(): Observable<ValidationState[]> {
    return this.http.get<any>("/configs/validation").pipe(
      map((root) => {
        // Case 1: { validation: { [id]: topics } }
        if (
          root &&
          typeof root === "object" &&
          !Array.isArray(root) &&
          root.validation &&
          typeof root.validation === "object"
        ) {
          return Object.entries(root.validation).map(([id, topics]) => ({
            id,
            topics: topics as TopicsMap,
          }));
        }

        // Case 2: [{ id, topics }, ...]
        if (Array.isArray(root)) {
          return root.map((x: any) => ({
            id: String(x.id),
            topics: x.topics as TopicsMap,
          }));
        }

        // Case 3: { items: [{ id, topics }, ...] }
        if (root?.items && Array.isArray(root.items)) {
          return root.items.map((x: any) => ({
            id: String(x.id),
            topics: x.topics as TopicsMap,
          }));
        }

        console.warn("Unexpected validation payload shape:", root);
        return [];
      }),
      shareReplay(1)
    );
  }

  /**
   * Convenience: get a single state by id (from the normalized array).
   * If you expect heavy usage, consider a map cache keyed by id.
   */
  getConfigurationState(id: string): Observable<ValidationState | undefined> {
    return this.getAllConfigurationStates().pipe(
      map((arr) => arr.find((s) => s.id === id))
    );
  }

  /**
   * Optional: Force a refresh (e.g., after saving), if your backend supports it.
   * Consumers can re-subscribe to getAllConfigurationStates() afterward.
   */
  refreshAllConfigurationStates(): Observable<ValidationState[]> {
    return this.http.get<ValidationRoot>("/configs/validation").pipe(
      map((root) => {
        const record = root?.validation ?? {};
        return Object.entries(record).map<ValidationState>(([id, topics]) => ({
          id,
          topics: topics as TopicsMap,
        }));
      }),
      catchError((err) => {
        console.error("Failed to refresh validation configs:", err);
        return throwError(() => err);
      })
    );
  }
}
