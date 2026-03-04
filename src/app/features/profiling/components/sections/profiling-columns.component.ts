import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfilingResult, ColumnProfile, ProfileTopValue } from '../../services/profiling.types';


@Component({
  standalone: true,
  selector: 'ds2-profiling-columns',
  imports: [CommonModule],
  templateUrl: './profiling-columns.component.html',
})
export class ProfilingColumnsComponent {
  @Input({ required: true }) result!: ProfilingResult;
  readonly selectedCol = signal<string | null>(null);
  profile = (col: string): ColumnProfile | null => this.result.profiles?.[col] ?? null;
  readonly row_count = computed(() => this.result.row_count);

  readonly selectedProfile = computed(() => {
    const col = this.selectedCol();
    return col ? this.profile(col) : null;
  });

  select(col: string) {
    console.log('selecting column', col, this.profile(col));
    this.selectedCol.set(this.result.profiles?.[col] ? col : null);
  }

  typeSummary(p: ColumnProfile | null): string {
    const tf = p?.type_freq;
    if (!tf) return '—';
    const entries = Object.entries(tf).sort((a,b) => b[1] - a[1]);
    const top = entries[0];
    if (!top) return '—';
    const total = entries.reduce((s,[,v]) => s + v, 0) || 1;
    const pct = Math.round((top[1] / total) * 100);
    return `${top[0]} ${pct}%`;
    }

  hasNumericHints(p: ColumnProfile): boolean {
    return !!(p.suggested_quantile_range || p.suggested_irq_range || p.suggested_mad_range);
  }

  renderValue(v: any): string {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
  }
}
