// listener.service.ts
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Listener, ListenerInput } from "./listener.types";
import { getApiBase } from "../../../core/backend-url.util";

@Injectable({ providedIn: "root" })
export class ListenerService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = getApiBase();

  /** All listeners incl. runtime status */
  getListeners(): Observable<Listener[]> {
    return this.http
      .get<{ listeners: Listener[] }>(`${this.apiBase}/configs/listeners`)
      .pipe(map((root) => root?.listeners ?? []));
  }

  getListener(id: string): Observable<Listener> {
    return this.http.get<Listener>(`${this.apiBase}/configs/listeners/${id}`);
  }

  /** 400 on rule violations (duplicate source, wildcard, loop, unknown config/section) */
  createListener(payload: ListenerInput): Observable<Listener> {
    return this.http.post<Listener>(`${this.apiBase}/configs/listeners`, payload);
  }

  updateListener(id: string, payload: ListenerInput): Observable<Listener> {
    return this.http.put<Listener>(`${this.apiBase}/configs/listeners/${id}`, payload);
  }

  deleteListener(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/configs/listeners/${id}`);
  }
}
