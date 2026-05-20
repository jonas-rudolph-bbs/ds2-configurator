// configuration.service.ts
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, map, shareReplay } from "rxjs/operators";
import {
  ValidationRoot,
  ValidationState,
  ValidationConfig,
  TopicsMap,
} from "./configuration.types";

@Injectable({ providedIn: "root" })
export class ConfigurationService {
  private readonly http = inject(HttpClient);

  private normalizeValidationState(id: string, rawConfig: any): ValidationState {
    const config = rawConfig as Partial<ValidationConfig>;

    return {
      id,
      metadata: config.metadata ?? {},
      topics: config.topics ?? {},
    };
  }

  /**
   * Fetch and normalize all validation states into an array:
   * [{ id, topics }, ...]
   */
  getAllConfigurationStates(): Observable<ValidationState[]> {
    return this.http.get<any>("/configs/validation").pipe(
      map((root) => {
        // Case 1: { validation: { [id]: { metadata, topics } } }
        if (
          root &&
          typeof root === "object" &&
          !Array.isArray(root) &&
          root.validation &&
          typeof root.validation === "object"
        ) {
          return Object.entries(root.validation).map(([id, config]) =>
            this.normalizeValidationState(id, config)
          );
        }

        // Case 2: [{ id, metadata, topics }, ...]
        if (Array.isArray(root)) {
          return root.map((x: any) =>
            this.normalizeValidationState(String(x.id), x)
          );
        }

        // Case 3: { items: [{ id, metadata, topics }, ...] }
        if (root?.items && Array.isArray(root.items)) {
          return root.items.map((x: any) =>
            this.normalizeValidationState(String(x.id), x)
          );
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
        return Object.entries(record).map<ValidationState>(([id, config]) =>
          this.normalizeValidationState(id, config)
        );
      }),
      catchError((err) => {
        console.error("Failed to refresh validation configs:", err);
        return throwError(() => err);
      })
    );
  }

  saveConfigurationState(id: string, payload: any): Observable<any> {
    return this.http.post(`/configs/validation/${id}`, payload).pipe(
      catchError((err) => {
        console.error("Failed to save validation config:", err);
        return throwError(() => err);
      })
    );
  }

  deleteConfiguration(id: string): Observable<void> {
    return this.http.delete<void>(`/configs/validation/${id}`);
  }
}
