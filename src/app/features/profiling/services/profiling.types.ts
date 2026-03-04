export type DecimalMode = 'DOT' | 'COMMA' | 'UNKNOWN' | string;


export interface ProfileTopValue {
  value: string | number | boolean | null;
  count: number;
  rate: number;
}

export interface RegexSuggestion {
  pattern: string;
  examples: any[];
}

type Range = [number, number];

export interface ColumnProfile {
  missing_rate?: number;
  type_freq?: Record<string, number>;
  numeric_rate?: number;
  timestamp_rate?: number;

  // Numeric hints
  suggested_quantile_range?: Range;
  suggested_irq_range?: Range ;
  suggested_mad_range?: Range;

  // String/categorical hints
  top_values?: [];
  regex_suggestion?: RegexSuggestion | null;
  decimal_mode?: DecimalMode;

  // Any extra fields coming from backend
  [key: string]: any;
}

export interface AnomalySummary {
  anomaly_count: number;
  anomaly_rate: number;
}

export interface AnomalyPreviewRow {
  anomaly_score: number;
  data: Record<string, any>;
}

export interface RuleCandidate {
  anomaly_class: string;
  attribute: string;
  suggested_rule: string;
  evidence?: Record<string, any>;
}

export interface ProfilingResult {
  row_count: number;
  column_count: number;
  attr_cols: string[];
  profiles: Record<string, ColumnProfile>;
  anomaly_summary: AnomalySummary;
  anomalies_preview: AnomalyPreviewRow[];
  rule_candidates: RuleCandidate[];
}
