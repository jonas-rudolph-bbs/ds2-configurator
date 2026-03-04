import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { ProfilingResult } from './profiling.types';

@Injectable({ providedIn: 'root' })
export class ProfilingService {
  private readonly http = inject(HttpClient);

  /**
   * Upload a JSON file to be profiled.
   *
   * Backend expectation (suggested):
   *  - POST /api/profiling/profile
   *  - multipart/form-data with field name "file"
   */
  profileJsonFile(file: File): Observable<ProfilingResult> {
    const topic = 'profile-file';

    return from(file.text()).pipe(
      switchMap((text) => {
        const parsed = JSON.parse(text);

        const payloads = Array.isArray(parsed) ? parsed : [parsed];

        return this.http.post<ProfilingResult>(
          `/profiling/profile/${topic}`,
          payloads,
          {
            headers: { 'Content-Type': 'application/json' },
            params: { ts_col: 'dateCaptured' }
          }
        );
      })
    );
  }

  /**
   * Profile a pasted JSON payload.
   *
   * Backend expectation (suggested):
   *  - POST /api/profiling/profile-json
   *  - JSON body: { payload: any }
   */
  profileJsonPayload(payload: any): Observable<ProfilingResult> {
    let topic = 'profile-json';
    return this.http.post<ProfilingResult>(`/profiling/profile/${topic}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      params: {'ts_col': 'dateCaptured'}
    });
  }
}
