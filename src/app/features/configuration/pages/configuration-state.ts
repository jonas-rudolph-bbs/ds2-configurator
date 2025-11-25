import { Component, OnInit, inject, DestroyRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { switchMap, map} from "rxjs/operators";
import { of } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ConfigurationDetails } from "../components/configuration-details/configuration-details";
import { ConfigurationEditForm } from "../components/configuration-edit-form/configuration-edit-form";
import {FormBuilder, FormGroup} from "@angular/forms";
import { TopicDefinition, TopicsMap, RuleSpec, RuleName, RULE_PARAMS_MAP } from "../services/configuration.types";


@Component({
  selector: "app-configuration-state",
  standalone: true,
  imports: [CommonModule, ConfigurationDetails, ConfigurationEditForm],
  templateUrl: "./configuration-state.html",
  styleUrls: ["./configuration-state.css"],
})
export class ConfigurationState implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(ConfigurationService);
  private destroyRef = inject(DestroyRef);

  private fb = inject(FormBuilder);

  id: string | null = null;
  cfg: TopicsMap | null = null;
  topics: [string, TopicDefinition][]= [];
  selectedTopic: string = "";
  edible: boolean = false;

  topicForms = new Map<string, Map<string, FormGroup[]>>();
  isSaving: boolean = false;

  // On component init, load configuration state based on route param "id"
  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((p) => p.get("id")),
        switchMap((id) => {
          this.id = id;
          if (!id) return of(null);
          return this.svc.getConfigurationState(id);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (cfg) => {
          if (!cfg) return;
          this.cfg = cfg.topics;
          this.topics = Object.entries(cfg.topics);
          console.log("Loaded configuration:", cfg);

          // Prebuild forms for all topics
          this.buildAllTopicForms(cfg.topics);

          if (this.topics && this.topics.length > 0) {
            this.selectedTopic = this.topics[0][0];
          }
        },
      });
  }

  // helper for the template
  selectTopic(topicName: string) {
    this.selectedTopic = topicName;
  }

  // Save button handler
  onSaveClicked(): void {
    if (!this.id) {
      console.warn("Cannot save: no id in route");
      return;
    }

    // 1. Validate all forms
    let allValid = true;

    for (const formsByEntryKey of this.topicForms.values()) {
      for (const groups of formsByEntryKey.values()) {
        for (const fg of groups) {
          fg.markAllAsTouched();
          if (fg.invalid) {
            allValid = false;
          }
        }
      }
    }

    if (!allValid) {
      console.warn("Not saving: some forms are invalid");
      return;
    }

    const payload: any = {};

    for (const [topicName, formsByEntryKey] of this.topicForms.entries()) {
      const topicPayload: any = {};

      for (const [entryKey, groups] of formsByEntryKey.entries()) {
        topicPayload[entryKey] = groups.map((fg) => {
          const rule = fg.get("rule")?.value;
          const paramsGroup = fg.get("params") as FormGroup | null;
          const params = paramsGroup ? paramsGroup.value : {};

          return {
            rule,
            params,
          };
        });
      }

      payload[topicName] = topicPayload;
    }

    console.log("Saving validation config with payload:", payload);

    // 3. Call service
    this.isSaving = true;
    this.svc
      .saveConfigurationState(this.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving = false;
          // close edit mode if you like
          this.edible = false;
        },
        error: (err) => {
          this.isSaving = false;
          console.error("Failed to save configuration state:", err);
        },
      });
  }

  // Build forms for all topics within the configuration
  private buildAllTopicForms(topics: TopicsMap): void {
    this.topicForms.clear();

    for (const [topicName, topicDef] of Object.entries(topics)) {
      const formsByEntryKey = new Map<string, FormGroup[]>();

      for (const [entryKey, specs] of Object.entries(topicDef)) {
        const groups =
          specs?.map((spec) => this.buildRuleForm(entryKey, spec, topicDef)) ?? [];
        formsByEntryKey.set(entryKey, groups);
      }

      this.topicForms.set(topicName, formsByEntryKey);
    }
  }

  // Build a form group for one rule spec
  private buildRuleForm(
    entryKey: string,
    spec: RuleSpec,
    topicDef: TopicDefinition
  ): FormGroup {
    const paramsGroup = this.fb.group({});

    // seed initial params from the spec
    for (const [paramKey, value] of Object.entries(spec.params ?? {})) {
      paramsGroup.addControl(paramKey, this.fb.control(value));
    }

    const fg = this.fb.group({
      attName: this.fb.control(entryKey ?? ""),
      rule: this.fb.control(spec.rule ?? ""),
      handler: this.fb.control(spec.handler ?? ""),
      params: paramsGroup,
      _entryKey: this.fb.control(entryKey),
    });

    // keep params in sync when the rule changes
    fg.get("rule")!.valueChanges.subscribe((newRule) => {
      this.syncParamsForRule(fg, newRule as RuleName, topicDef);
    });

    return fg;
  }

  // Synchronize the params form group when the rule changes
  private syncParamsForRule(
    fg: FormGroup,
    selectedRule: RuleName,
    topic: TopicDefinition,
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

    // 2. Get the attribute name from this form group
    const attName = fg.get("attName")?.value as string | undefined;
    const topicSpecsForAttr =
      attName && topic?.[attName] ? topic[attName] : [];

    // 3. Find the corresponding rule in the original topic (if any)
    const topicRuleSpec = topicSpecsForAttr.find(
      (spec) => spec.rule === selectedRule
    );
    console.log(
      "Syncing params for rule:",
      selectedRule,
      "found spec:",
      topicRuleSpec
    );

    // 4. Get the parameter template for this rule from RULE_PARAMS_MAP
    const template = RULE_PARAMS_MAP[selectedRule];
    type ParamKey = keyof typeof template;

    // 5. Re-add all controls with initial values
    (Object.keys(template) as ParamKey[]).forEach((key) => {
      const initialValue = topicRuleSpec?.params?.[key] ?? "";
      console.log("Adding param control:", key, "initialValue:", initialValue);

      paramsGroup.addControl(key as string, this.fb.control(initialValue));
    });
  }



  





}
