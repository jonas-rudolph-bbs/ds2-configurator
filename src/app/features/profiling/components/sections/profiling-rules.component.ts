import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfilingResult, RuleCandidate } from '../../services/profiling.types';
import { ProfilingAdoptionService } from '../../services/profiling-adoption.service';

interface RuleGroup {
  anomaly_class: string;
  rules: RuleCandidate[];
}

@Component({
  standalone: true,
  selector: 'ds2-profiling-rules',
  imports: [CommonModule],
  templateUrl: './profiling-rules.component.html',
  styleUrl: './profiling-rules.component.scss'
})
export class ProfilingRulesComponent {

  constructor(
    private adoptionService: ProfilingAdoptionService
  ) { }




  @Input({ required: true }) result!: ProfilingResult;

  openIndex = -1;



  readonly groups = computed<RuleGroup[]>(() => {
    const list = this.result.rule_candidates ?? [];
    const map = new Map<string, RuleCandidate[]>();
    for (const r of list) {
      const key = r.anomaly_class || 'unknown';
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()]
      .map(([anomaly_class, rules]) => ({ anomaly_class, rules }))
      .sort((a, b) => a.anomaly_class.localeCompare(b.anomaly_class));
  });

  private mapSuggestion(candidate: any) {
    switch (candidate?.anomaly_class) {
      case 'regex_constraints':
        return this.mapRegexConstraint(candidate);

      case 'constraint_violation/range':
        return this.mapRangeConstraint(candidate);

      case 'missingness':
        return this.mapMissingness(candidate);

      case 'schema_refinement/timestamp':
      case 'precision/scale_drift':
      default:
        return {
          supported: false,
          label: 'unsupported',
          preview: 'No direct expectation mapping available.',
          expectation: undefined
        };
    }
  }

  private mapRegexConstraint(candidate: any) {
    const column = candidate?.attribute;
    const pattern = candidate?.evidence?.pattern;

    if (!column || !pattern) {
      return {
        supported: false,
        label: 'unsupported',
        preview: 'No direct expectation mapping available.',
        expectation: undefined
      };
    }

    return {
      supported: true,
      label: 'regex',
      preview:
        `expect_column_values_to_match_regex(` +
        `column="${column}", regex="${pattern}")`,
      expectation: {
        expectation_type: 'expect_column_values_to_match_regex',
        kwargs: {
          column,
          regex: pattern
        }
      }
    };
  }

  private mapRangeConstraint(candidate: any) {
    const column = candidate?.attribute;

    const range =
      candidate?.evidence?.suggested_quantile_range ??
      candidate?.evidence?.suggested_irq_range ??
      candidate?.evidence?.suggested_mad_range;

    if (!column || !Array.isArray(range) || range.length !== 2) {
      return {
        supported: false,
        label: 'unsupported',
        preview: 'No direct expectation mapping available.',
        expectation: undefined
      };
    }

    const [minValue, maxValue] = range;

    if (minValue === null || minValue === undefined || maxValue === null || maxValue === undefined) {
      return {
        supported: false,
        label: 'unsupported',
        preview: 'No direct expectation mapping available.',
        expectation: undefined
      };
    }

    return {
      supported: true,
      label: 'between',
      preview:
        `expect_column_values_to_be_between(` +
        `column="${column}", min_value=${minValue}, max_value=${maxValue}, ` +
        `strict_min=false, strict_max=false)`,
      expectation: {
        expectation_type: 'expect_column_values_to_be_between',
        kwargs: {
          column,
          min_value: minValue,
          max_value: maxValue,
          strict_min: false,
          strict_max: false
        }
      }
    };
  }

  private mapMissingness(candidate: any) {
    const column = candidate?.attribute;

    if (!column) {
      return {
        supported: false,
        label: 'unsupported',
        preview: 'No direct expectation mapping available.',
        expectation: undefined
      };
    }

    return {
      supported: true,
      label: 'not null',
      preview:
        `expect_column_values_to_not_be_null(` +
        `column="${column}")`,
      expectation: {
        expectation_type: 'expect_column_values_to_not_be_null',
        kwargs: {
          column
        }
      }
    };
  }

  evidencePreview(
    evidence: Record<string, unknown> | null | undefined
  ): Array<{ key: string; value: string }> {
    if (!evidence || typeof evidence !== 'object') {
      return [];
    }

    const rows: Array<{ key: string; value: string }> = [];

    for (const [key, value] of Object.entries(evidence)) {
      this.pushEvidenceRow(rows, key, value);
    }

    return rows;
  }

  private pushEvidenceRow(
    rows: Array<{ key: string; value: string }>,
    key: string,
    value: unknown
  ): void {
    if (Array.isArray(value)) {
      // special case for regex examples
      if (key === 'regex_examples') {
        const preview = value.slice(0, 4).map(v => String(v)).join(', ');
        rows.push({
          key,
          value: value.length > 4 ? `${preview} …` : preview
        });
        return;
      }

      // range-like arrays such as [min, max]
      rows.push({
        key,
        value: value.map(v => String(v)).join(', ')
      });
      return;
    }

    if (value && typeof value === 'object') {
      // flatten one level deeper
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        this.pushEvidenceRow(rows, `${key}.${nestedKey}`, nestedValue);
      }
      return;
    }

    rows.push({
      key,
      value: String(value)
    });
  }

  hasMoreEvidence(evidence: Record<string, any>): boolean {
    return Object.keys(evidence ?? {}).length > 6;
  }

  adoptRule(rule: any) {

    const mapped = this.mapSuggestion(rule);

    const adoptedRule = {

      id: `${rule.attribute}_${mapped.label}`,

      column: rule.attribute,

      suggestion: rule.suggested_rule,

      mappingSupported: mapped.supported,

      previewLabel: mapped.label,

      previewFull: mapped.preview,

      mappedExpectation: mapped.expectation
    };

    this.adoptionService.addRule(adoptedRule);
  }

  toggleAccordion(index: number): void {
    this.openIndex = this.openIndex === index ? -1 : index;
  }
}
