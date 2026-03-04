import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfilingResult, AnomalyPreviewRow } from '../../services/profiling.types';

@Component({
  standalone: true,
  selector: 'ds2-profiling-anomalies',
  imports: [CommonModule],
  templateUrl: './profiling-anomalies.component.html',
})
export class ProfilingAnomaliesComponent {
  @Input({ required: true }) result!: ProfilingResult;

  readonly selectedIndex = signal<number | null>(null);

  readonly selectedRow = computed(() => {
    const i = this.selectedIndex();
    return i === null ? null : (this.result.anomalies_preview?.[i] ?? null);
  });

  select(i: number) {
    this.selectedIndex.set(i);
  }

  keys(obj: Record<string, any>): string[] {
    return Object.keys(obj ?? {}).sort();
  }

  isMissing(v: any): boolean {
    return v === null || v === undefined || v === '';
  }

  renderValue(v: any): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
  }

  previewText(row: Record<string, any>): string {
    if (!row) return '';
    // show the first few keys/value pairs
    const ks = Object.keys(row).slice(0, 4);
    return ks.map(k => `${k}: ${this.renderValue(row[k])}`).join(' · ');
  }
}
