// configuration-edit-form.ts
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";
import { CommonModule, KeyValuePipe } from "@angular/common";
import {
  TopicDefinition,
  RuleSpec,
  RULES,
  RULE_PARAMS_MAP,
  RuleName,
  HANDLERS
} from "../../services/configuration.types";

type Rule = (typeof RULES)[number];

@Component({
  selector: "app-configuration-edit-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, KeyValuePipe],
  templateUrl: "./configuration-edit-form.html",
  styleUrls: ["./configuration-edit-form.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationEditForm implements OnChanges {
  @Input() topic: TopicDefinition | undefined;

  readonly rules: readonly Rule[] = RULES;
  readonly handlers: readonly {id: string, label:  string}[] = HANDLERS;

  /**
   * A map of entryKey -> list of FormGroups (one per RuleSpec)
   */
  private formsByEntryKey = new Map<string, FormGroup[]>();

  constructor(private fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ("topic" in changes) {
      this.rebuildAllFormsForTopic();
    }
  }

  /**
   * Public getter for template
   */
  getFormsFor(entryKey: string): FormGroup[] {
    return this.formsByEntryKey.get(entryKey) ?? [];
  }

  /**
   * Param keys helper for the template
   */
  paramKeys(fg: FormGroup): string[] {
    const params = fg.get("params") as FormGroup | null;
    return params ? Object.keys(params.controls) : [];
  }

  /**
   * Build all forms once when topic changes
   */
  private rebuildAllFormsForTopic(): void {
    this.formsByEntryKey.clear();
    if (!this.topic) return;

    for (const [entryKey, specs] of Object.entries(this.topic)) {
      const groups =
        specs?.map((spec) => this.buildRuleForm(entryKey, spec)) ?? [];
      this.formsByEntryKey.set(entryKey, groups);
    }
  }

  /**
   * Build a single FormGroup for a RuleSpec
   */
  private buildRuleForm(entryKey: string, spec: RuleSpec): FormGroup {
    console.log("Building form for entryKey:", entryKey, "spec:", spec);
    const paramsGroup = this.fb.group({});
    // seed initial params from the spec
    for (const [paramKey, value] of Object.entries(spec.params ?? {})) {
      paramsGroup.addControl(paramKey, this.fb.control(value));
    }

    const fg = this.fb.group({
      attName: this.fb.control(entryKey ?? ""),
      rule: this.fb.control(spec.rule ?? ""),
      // handler as a real control (disabled by default if you don't want it edited)
      handler: this.fb.control(spec.handler ?? ""),
      params: paramsGroup,
      // it can be useful to keep entryKey if you need it on submit
      _entryKey: this.fb.control(entryKey),
    });

    // keep params in sync when the rule changes
    fg.get("rule")!.valueChanges.subscribe((newRule) => {
      this.syncParamsForRule(fg, newRule as RuleName, this.topic);
    });

    return fg;
  }

  /**
   * Synchronize the params sub-group with the param schema of the selected rule.
   * If preserveExisting is true, we keep any existing values if the key still exists.
   */
  private syncParamsForRule(
    fg: FormGroup,
    selectedRule: RuleName,
    topic: TopicDefinition | undefined,
    preserveExisting = true
  ): void {
    const paramsGroup = fg.get("params") as FormGroup;
    if (!paramsGroup) {
      return;
    }

    // 1. Remove ALL existing controls from the params group
    Object.keys(paramsGroup.controls).forEach((key) => {
      paramsGroup.removeControl(key);
    });

    // 2. Get the attribute name from this form group (as used in your template)
    const attName = fg.get("attName")?.value as string | undefined;
    const topicSpecsForAttr: RuleSpec[] =
      attName && this.topic?.[attName] ? this.topic[attName] : [];

    // 3. Find the corresponding rule in the original topic (if any)
    const topicRuleSpec = topicSpecsForAttr.find(
      (spec) => spec.rule === selectedRule
    ) as RuleSpec<RuleName> | undefined;
    console.log("Syncing params for rule:", selectedRule, "found spec:", topicRuleSpec);

    // 4. Get the parameter template for this rule from RULE_PARAMS_MAP
    const template = RULE_PARAMS_MAP[selectedRule];
    type ParamKey = keyof typeof template;

    // 5. Re-add all controls:
    //    - If topicRuleSpec exists → use topicRuleSpec.params[key]
    //    - Otherwise              → use template[key] (empty/default)
    (Object.keys(template) as ParamKey[]).forEach((key) => {
      const initialValue = topicRuleSpec?.params?.[key] ?? "";
      console.log("Adding param control:", key, "initialValue:", initialValue);

      paramsGroup.addControl(key as string, this.fb.control(initialValue));
    });
  }
}
