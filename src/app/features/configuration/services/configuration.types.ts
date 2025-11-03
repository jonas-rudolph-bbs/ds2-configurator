// configuration.types.ts

/** Root object from the API */
export interface ValidationRoot {
  validation: Record<string, TopicsMap>;
}

/**
 * Topics for a single validation state (e.g. "iot-data", "air-quality")
 * topic -> TopicDefinition
 */
export type TopicsMap = Record<string, TopicDefinition>;

/**
 * One topic definition maps attributes/columns to an array of rules.
 * attribute/column -> RuleSpec[]
 */
export type TopicDefinition = Record<string, RuleSpec[]>;

/** Optional handler names observed in payload */
export type Handler =
  | "SmoothingOutliers"
  | "RaiseAlarm"
  | "TimestampCorrection";

/** Parameter shapes by rule name observed in payload */
export interface RuleParamsMap {
  expect_column_values_to_not_be_null: {
    column: string;
  };
  expect_column_values_to_be_between: {
    column: string;
    min_value?: number;
    max_value?: number;
    strict_min?: boolean;
    strict_max?: boolean;
  };
  expect_column_values_to_match_regex: {
    column: string;
    regex: string;
  };
}

export const RULE_PARAMS_MAP = {
  expect_column_values_to_not_be_null: {
    column: "",
  },
  expect_column_values_to_be_between: {
    column: "",
    min_value: 0,
    max_value: 0,
    strict_min: false,
    strict_max: false,
  },
  expect_column_values_to_match_regex: {
    column: "",
    regex: "",
  },
} satisfies RuleParamsMap;

export type RuleName = keyof RuleParamsMap;

/** One rule instance for an attribute */
export type RuleSpec<K extends RuleName = RuleName> = {
  rule: K;
  params: RuleParamsMap[K];
  handler?: Handler;
};

/** Normalized shape for consumers (array rather than record) */
export interface ValidationState {
  id: string; // key from the "validation" record
  topics: TopicsMap; // value stored under that key
}
