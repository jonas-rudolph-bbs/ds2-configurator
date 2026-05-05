// configuration-edit-form.ts
import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray } from "@angular/forms";
import { CommonModule, KeyValuePipe } from "@angular/common";
import { ConfigurationFormFactory } from "../../forms/configuration-form.factory";
import {
  TopicDefinition,
  RULES,
  HANDLERS,
  RuleSpec
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
  @Input() formByEntryKey?: Map<string, FormGroup>;

  readonly rules: readonly Rule[] = RULES;
  readonly handlers: readonly { id: string; label: string }[] = HANDLERS;

  constructor(private formFactory: ConfigurationFormFactory) { }

  getAttributeForm(entryKey: string): FormGroup | null {
    return this.formByEntryKey?.get(entryKey) ?? null;
  }

  getRulesArray(attrForm: FormGroup): FormArray {
    return attrForm.get('rules') as FormArray;
  }

  // helpers to get param keys from a FormGroup
  paramKeys(fg: FormGroup): string[] {
    const params = fg.get("params") as FormGroup | null;
    return params ? Object.keys(params.controls) : [];
  }

  private deleteAttribute(attributeKey: string): void {
    this.formByEntryKey?.delete(attributeKey);
  }

  onAddAttributeClick(): void {
    if (!this.formByEntryKey) {
      return;
    }

    const base = "newAttribute";
    let index = 1;
    let entryKey = `${base}${index}`;

    while (this.formByEntryKey.has(entryKey)) {
      index++;
      entryKey = `${base}${index}`;
    }

    const getAllAttributeNames = () =>
      Array.from(this.formByEntryKey?.values() ?? [])
        .map((fg) => (fg.get("attName")?.value ?? "").toString());

    const initialRules: RuleSpec[] = [{} as RuleSpec];

    const attrForm = this.formFactory.buildAttributeForm(
      entryKey,
      getAllAttributeNames,
      initialRules
    );

    this.formByEntryKey.set(entryKey, attrForm);
  }


  onInfoClicked(fg: FormGroup): void {
    const selectedRule = fg.get("rule")?.value as string | null | undefined;

    if (!selectedRule) {
      return;
    }
    const url = `https://greatexpectations.io/expectations/${selectedRule}/`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  onAddRuleClick(entryKey: string): void {
    const attrForm = this.formByEntryKey?.get(entryKey);
    const rules = attrForm?.get("rules") as FormArray | null;

    if (!rules) {
      return;
    }

    rules.push(this.formFactory.buildRuleFormWithoutAttName());
  }

  onDeleteRuleClick(entryKey: string, index: number): void {
    const attrForm = this.formByEntryKey?.get(entryKey);
    const rules = attrForm?.get("rules") as FormArray | null;

    if (!rules) {
      return;
    }

    rules.removeAt(index);

    if (rules.length === 0) {
      this.deleteAttribute(entryKey);
    }
  }

  getRuleFormGroups(attrForm: FormGroup): FormGroup[] {
    const arr = attrForm.get('rules') as FormArray;
    return arr.controls as FormGroup[];
  }

  keepOriginalOrder = (): number => 0;

}
