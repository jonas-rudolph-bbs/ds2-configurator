import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfilingResult, RuleCandidate } from '../../services/profiling.types';

interface RuleGroup {
  anomaly_class: string;
  rules: RuleCandidate[];
}

@Component({
  standalone: true,
  selector: 'ds2-profiling-rules',
  imports: [CommonModule],
  templateUrl: './profiling-rules.component.html',
})
export class ProfilingRulesComponent {
  @Input({ required: true }) result!: ProfilingResult;

  readonly groups = computed<RuleGroup[]>(() => {
    const list = this.result.rule_candidates ?? [];
    const map = new Map<string, RuleCandidate[]>();
    for (const r of list) {
      const key = r.anomaly_class || 'unknown';
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()]
      .map(([anomaly_class, rules]) => ({ anomaly_class, rules }))
      .sort((a,b) => a.anomaly_class.localeCompare(b.anomaly_class));
  });

  evidencePreview(evidence: Record<string, any>): Array<{key: string; value: string}> {
    const entries = Object.entries(evidence ?? {});
    // Drop huge arrays (like regex_examples) from inline rendering, but keep a count.
    const normalized = entries.map(([k, v]) => {
      if (Array.isArray(v)) {
        return [k, `Array(${v.length})`] as const;
      }
      if (typeof v === 'object' && v !== null) {
        return [k, JSON.stringify(v)] as const;
      }
      return [k, String(v)] as const;
    });

    return normalized.slice(0, 6).map(([key, value]) => ({ key, value }));
  }

  hasMoreEvidence(evidence: Record<string, any>): boolean {
    return Object.keys(evidence ?? {}).length > 6;
  }
}
