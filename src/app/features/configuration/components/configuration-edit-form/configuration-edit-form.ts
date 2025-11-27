// configuration-edit-form.ts
import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from "@angular/forms";
import { CommonModule, KeyValuePipe } from "@angular/common";
import {
  TopicDefinition,
  RULES,
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
export class ConfigurationEditForm {
  @Input() topic: TopicDefinition | undefined;
  @Input() formByEntryKey: Map<string, FormGroup[]> | undefined;

  readonly rules: readonly Rule[] = RULES;
  readonly handlers: readonly {id: string, label:  string}[] = HANDLERS;


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

}
