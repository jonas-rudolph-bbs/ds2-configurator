// configuration-edit-form.ts
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { CommonModule, KeyValuePipe } from "@angular/common";
import {
  TopicDefinition,
  RULES,
  HANDLERS,
  RuleName,
  RULE_PARAMS_MAP,
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
export class ConfigurationEditForm {
  @Input() topic: TopicDefinition | undefined;
  @Input() formByEntryKey: Map<string, FormGroup[]> | undefined;

  readonly rules: readonly Rule[] = RULES;
  readonly handlers: readonly { id: string; label: string }[] = HANDLERS;

  constructor(private fb: FormBuilder) {}

  // Public getter for the template
  getFormsFor(entryKey: string): FormGroup[] {
    return this.formByEntryKey?.get(entryKey) ?? [];
  }

  // helpers to get param keys from a FormGroup
  paramKeys(fg: FormGroup): string[] {
    const params = fg.get("params") as FormGroup | null;
    return params ? Object.keys(params.controls) : [];
  }

  onDeleteAttributeClick(attributeKey: string): void {
    this.formByEntryKey?.delete(attributeKey);
  }

  onAddRuleClick(): void {
    if (!this.formByEntryKey) {
      return;
    }

    // 1) Create a unique entryKey for the new attribute
    const base = "newAttribute";
    let index = 1;
    let entryKey = `${base}${index}`;
    while (this.formByEntryKey.has(entryKey)) {
      index++;
      entryKey = `${base}${index}`;
    }

    // 2) Default rule + handler (first in the dropdowns)
    const defaultRule = this.rules[0]?.id as RuleName;
    const defaultHandler = this.handlers[0]?.id ?? "";

    // 3) Build the FormGroup just like buildRuleForm does
    const fg = this.fb.group({
      attName: this.fb.control(entryKey ?? ""), // shown in the UI
      rule: this.fb.control(defaultRule), // RuleName
      handler: this.fb.control(defaultHandler),
      params: this.fb.group({}), // will be filled below
      _entryKey: this.fb.control(entryKey),
    });

    // keep params in sync when the rule changes
    fg.get("rule")!.valueChanges.subscribe((newRule) => {
      this.syncParamsForRule(fg, newRule as RuleName);
    });

    // initialize params for the default rule
    this.syncParamsForRule(fg, defaultRule);

    // 4) Insert as a **new attribute** with a single rule
    this.formByEntryKey.set(entryKey, [fg]);

  }

  private syncParamsForRule(fg: FormGroup, selectedRule: RuleName): void {
    if (!selectedRule) {
      fg.setControl("params", this.fb.group({}));
      return;
    }

    const template = RULE_PARAMS_MAP[selectedRule];
    if (!template) {
      fg.setControl("params", this.fb.group({}));
      return;
    }

    type ParamKey = keyof typeof template;

    const newParamsGroup = this.fb.group({});

    (Object.keys(template) as ParamKey[]).forEach((key) => {
      newParamsGroup.addControl(key as string, this.fb.control(""));
    });

    fg.setControl("params", newParamsGroup);
  }

  onInfoClicked(fg: FormGroup): void {
  const selectedRule = fg.get("rule")?.value as string | null | undefined;

  if (!selectedRule) {
    return;
  }
  const url = `https://greatexpectations.io/expectations/${selectedRule}/`;
  window.open(url, "_blank", "noopener,noreferrer");
}

}
