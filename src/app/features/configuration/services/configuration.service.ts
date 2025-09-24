// configuration.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ValidationRoot, ValidationState, TopicsMap } from './configuration.types';

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch and normalize all validation states into an array:
   * [{ id, topics }, ...]
   */
  getAllConfigurationStates(): Observable<ValidationState[]> {
    return this.http.get<ValidationRoot>('/configs/validation').pipe(
      map((root) => {
        const record = root?.validation ?? {};
        return Object.entries(record).map<ValidationState>(([id, topics]) => ({
          id,
          topics: topics as TopicsMap,
        }));
      }),
      // Cache the latest value for subscribers
      shareReplay(1),
      catchError((err) => {
        console.error('Failed to load validation configs:', err);
        return throwError(() => err);
      })
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
    return this.http.get<ValidationRoot>('/configs/validation').pipe(
      map((root) => {
        const record = root?.validation ?? {};
        return Object.entries(record).map<ValidationState>(([id, topics]) => ({
          id,
          topics: topics as TopicsMap,
        }));
      }),
      catchError((err) => {
        console.error('Failed to refresh validation configs:', err);
        return throwError(() => err);
      })
    );
  }
}
