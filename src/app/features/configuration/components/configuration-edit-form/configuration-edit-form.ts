import { Component, Input } from "@angular/core";
import { TopicDefinition } from "../../services/configuration.types";
import { KeyValuePipe } from "@angular/common";
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  FormBuilder,
} from "@angular/forms";
import { RuleName, RULE_PARAMS_MAP, Handler } from "../../services/configuration.types";

@Component({
  selector: "app-configuration-edit-form",
  standalone: true,
  imports: [KeyValuePipe, ReactiveFormsModule],
  templateUrl: "./configuration-edit-form.html",
  styleUrls: ["./configuration-edit-form.scss"],
})
export class ConfigurationEditForm {
  @Input() topic?: TopicDefinition;

  fb = new FormBuilder();
  ruleOptions: RuleName[] = Object.keys(RULE_PARAMS_MAP) as RuleName[];
  handlerOptions: Handler[] = [];

  form = this.fb.group({
    attName: this.fb.control("", { nonNullable: true }),
    rule: this.fb.control("", { nonNullable: true }),
    params: this.fb.group({}),
  });

  paramKeys: string[] = [];

  ngOnInit(): void {
    // whenever rule changes, rebuild params form controls
    this.form.get("rule")!.valueChanges.subscribe((ruleName) => {
      // reset keys if nothing selected
      if (!ruleName) {
        this.paramKeys = [];
        this.form.setControl("params", this.fb.group({}));
        return;
      }

      // look up param shape for this rule
      const paramDef = RULE_PARAMS_MAP[ruleName as RuleName];

      // build a new group with one control per param key
      const newParamsGroup: Record<string, FormControl<any>> = {};
      Object.keys(paramDef).forEach((key) => {
        newParamsGroup[key] = this.fb.control("", {
          nonNullable: false, // allow optional fields to stay null/empty
        });
      });

      this.paramKeys = Object.keys(newParamsGroup);

      // swap the params group on the main form
      this.form.setControl("params", this.fb.group(newParamsGroup));
    });
  }
  get paramsGroup(): FormGroup {
    return this.form.get("params") as FormGroup;
  }
}
