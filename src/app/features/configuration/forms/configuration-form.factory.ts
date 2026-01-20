import { Injectable } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { RuleName, RULE_PARAMS_MAP, RuleSpec } from "../services/configuration.types";

/**
 * Small, testable factory:
 * - Builds controls/groups
 * - Attaches validators
 * - Rebuilds params group when rule changes
 */
@Injectable({ providedIn: "root" })
export class ConfigurationFormFactory {
  constructor(private fb: FormBuilder) { }

  // -----------------------
  // Validators (pure helpers)
  // -----------------------

  /** Required after trimming whitespace */
  trimmedRequired(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value ?? "").toString().trim();
      return v.length ? null : { trimmedRequired: true };
    };
  }


  /** Ensures that no whitespaces are in the names */
  noWhitespace(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      const hasSpace = v.match(/\s/) !== null;
      return hasSpace ? { noWhitespace : true} : null;
    }
  }


  /**
   * Ensures uniqueness against a dynamic set of values.
   * We pass a function so it always sees the latest values.
   */
  uniqueAmong(getAllValues: () => string[], normalize: (s: string) => string = (s) => s.trim()): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = normalize((control.value ?? "").toString());
      if (!value) return null;

      const all = getAllValues().map(normalize).filter(Boolean);

      // Count occurrences; allow exactly one (itself)
      const count = all.filter((x) => x === value).length;
      return count > 1 ? { notUnique: true } : null;
    };
  }



  // -----------------------
  // Topic name controls
  // -----------------------

  createTopicNameControl(
    initialName: string,
    getAllTopicNames: () => string[]
  ): FormControl<string> {
    return new FormControl<string>(initialName, {
      nonNullable: true,
      validators: [
        this.trimmedRequired(),
        this.uniqueAmong(getAllTopicNames, (s) => s.trim().toLowerCase()),
        this.noWhitespace(),
        Validators.maxLength(200),
      ],
    });
  }

  // -----------------------
  // Rule form groups
  // -----------------------

  buildRuleForm(entryKey: string, getAllAttributeNames: () => string[], spec?: RuleSpec): FormGroup {
    const initialRule = (spec?.rule ?? "") as RuleName;
    const fg = this.fb.group({
      attName: new FormControl<string>(entryKey, {
        nonNullable: true,
        validators: [
          this.trimmedRequired(),
          this.uniqueAmong(getAllAttributeNames, (s) => s.trim().toLowerCase()),
          this.noWhitespace(),
          Validators.maxLength(200),
        ],
      }),

      rule: new FormControl<RuleName>(initialRule, {
        nonNullable: true,
        validators: [this.trimmedRequired()],
      }),

      handler: new FormControl<string>(spec?.handler ?? "", {
        nonNullable: true,
        validators: [Validators.maxLength(200)],
      }),

      // params are dynamic based on rule; build initial from spec or defaults
      params: this.buildParamsGroup(initialRule, spec?.params),
    });

    // Whenever rule changes -> rebuild params group
    fg.get("rule")!.valueChanges.subscribe((newRule) => {
      const currentParams = (fg.get("params") as FormGroup).value;
      fg.setControl("params", this.buildParamsGroup(newRule, currentParams));
      // keep validity up-to-date after rebuilding controls
      fg.get("params")!.updateValueAndValidity({ emitEvent: false });
      fg.updateValueAndValidity({ emitEvent: false });
    });

    return fg;
  }

  buildParamsGroup(rule: RuleName, existingParams?: Record<string, any>): FormGroup {
    // RULE_PARAMS_MAP is your “schema template”
    const template = (RULE_PARAMS_MAP as any)[rule] ?? {};

    const group: Record<string, FormControl<any>> = {};
    for (const [paramName, defaultValue] of Object.entries(template)) {
      const initial = existingParams?.[paramName] ?? defaultValue;

      group[paramName] = new FormControl(initial, {
        nonNullable: true,
        validators: this.getParamValidators(rule, paramName),
      });
    }

    return this.fb.group(group);
  }

  /**
   * Central place to define param validators, per rule + param name.
   * Start simple; expand as you add real constraints.
   */
  private getParamValidators(rule: RuleName, paramName: string): ValidatorFn[] {
    // Example placeholder rules; adapt to your real ones
    const v: ValidatorFn[] = [];

    // common cases
    if (paramName.toLowerCase().includes("min") || paramName.toLowerCase().includes("max")) {
      // if it's numeric, you might enforce number-ness or range
      // (Angular doesn’t have a built-in “is number” validator; you can add one)
    }

    // Example: required params for certain rules
    // if (rule === "someRule" && paramName === "threshold") v.push(Validators.required);

    return v;
  }
}
