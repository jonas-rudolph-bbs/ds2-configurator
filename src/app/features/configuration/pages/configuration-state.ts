import { Component, OnInit, inject, DestroyRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { switchMap, map, finalize } from "rxjs/operators";
import { of } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ConfigurationDetails } from "../components/configuration-details/configuration-details";
import { ConfigurationEditForm } from "../components/configuration-edit-form/configuration-edit-form";
import { ConfigurationFormFactory } from "../forms/configuration-form.factory";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
} from "@angular/forms";
import {
  TopicDefinition,
  TopicsMap,
  RuleSpec,
  RuleName,
  RULE_PARAMS_MAP,
} from "../services/configuration.types";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: "app-configuration-state",
  standalone: true,
  imports: [
    CommonModule,
    ConfigurationDetails,
    ConfigurationEditForm,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: "./configuration-state.html",
  styleUrls: ["./configuration-state.scss"],
})
export class ConfigurationState implements OnInit {
  constructor(private router: Router) { }
  private route = inject(ActivatedRoute);
  private svc = inject(ConfigurationService);
  private destroyRef = inject(DestroyRef);
  private formFactory = inject(ConfigurationFormFactory);

  private fb = inject(FormBuilder);

  // state from backend
  id: string | null = null;
  cfg: TopicsMap | null = null;
  topics: [string, TopicDefinition][] = [];

  selectedTopic: string = "";
  edible: boolean = false;
  isSaving: boolean = false;
  configCreation: boolean | null = null;

  topicForms = new Map<string, Map<string, FormGroup[]>>();
  topicNameControls = new Map<string, FormControl<string>>();
  originalTopicNames = new Map<string, string>();
  saveAttempted = false;

  // On component init, load configuration state
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
          if (!cfg) {
            console.warn("No configuration found for id:", this.id);
            this.configCreation = true;
            return;
          }
          this.configCreation = false;
          this.cfg = cfg.topics;
          this.topics = Object.entries(cfg.topics);

          this.initTopicNameControls();

          // Prebuild forms for all topics
          this.buildTopicForms(cfg.topics);

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

  // getter for TopicName COntrol
  getTopicNameControl(topicName: string): FormControl<string> {
    const ctrl = this.topicNameControls.get(topicName);
    if (!ctrl) {
      // Defensive: create one on the fly if missing
      const fallback = new FormControl<string>(topicName, {
        nonNullable: true,
      });
      this.topicNameControls.set(topicName, fallback);
      this.originalTopicNames.set(topicName, topicName);
      return fallback;
    }
    return ctrl;
  }

  // Save button handler
  onSaveClicked(): void {
    if (!this.id) {
      console.warn("Cannot save: no id in route");
      return;
    }

    this.saveAttempted = true;

    // 1. Validate all forms
    let allValid = true;

    // validate topic name controls
    for (const ctrl of this.topicNameControls.values()) {
      ctrl.markAsTouched();
      if (ctrl.invalid) {
        allValid = false;
      }
    }

    // validate all rule forms
    for (const formsByEntryKey of this.topicForms.values()) {
      for (const groups of formsByEntryKey.values()) {
        for (const fg of groups) {
          fg.markAllAsTouched();
          console.log("Attribute Formgroup:", fg.invalid);
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

    const topicNameMap = new Map<string, string>();
    for (const [topicName] of this.topics) {
      const ctrl = this.getTopicNameControl(topicName);
      const newName = ctrl.value.trim();
      const finalName = newName || topicName;
      topicNameMap.set(topicName, finalName);
    }

    // 2. Build payload from forms
    const payload: any = {};
    for (const [topicName, formsByEntryKey] of this.topicForms.entries()) {
      const finalTopicName = topicNameMap.get(topicName) ?? topicName;
      const topicPayload: any = {};

      for (const [entryKey, groups] of formsByEntryKey.entries()) {
        if (!groups.length) continue;

        const firstGroup = groups[0];
        const newAttributeKey = firstGroup.get("attName")?.value.trim();
        const finalAttributeKey = newAttributeKey || entryKey;

        topicPayload[finalAttributeKey] = groups.map((fg) => {
          const rule = fg.get("rule")?.value;
          const paramsGroup = fg.get("params") as FormGroup | null;
          const params = paramsGroup ? paramsGroup.value : {};
          const handler = fg.get("handler")?.value || "";

          return {
            rule,
            params,
            handler,
          };
        });
      }

      payload[finalTopicName] = topicPayload;
    }

    // 3. Call service
    this.isSaving = true;
    this.svc
      .saveConfigurationState(this.id, payload)
      .pipe(
        switchMap(() => this.svc.getConfigurationState(this.id!)),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: (cfg) => {
          if (!cfg) return;
          this.cfg = cfg.topics;
          this.topics = Object.entries(cfg.topics);
          this.buildTopicForms(cfg.topics);
          if (this.topics && this.topics.length > 0) {
            this.selectedTopic = this.topics[0][0];
          }
          this.edible = false;
        },
        error: (err) => {
          console.error(
            "Error saving configuration or reloading configuration state:",
            err
          );
        },
      });
  }

  // construct the list of TopicName Controls
  private initTopicNameControls(): void {
    this.topicNameControls.clear();
    this.originalTopicNames.clear();

    // helper used by uniqueness validator
    const getAllNames = () => Array.from(this.topicNameControls.values()).map((c) => c.value);

    for (const [topicName] of this.topics) {
      const ctrl = this.formFactory.createTopicNameControl(topicName, getAllNames);
      this.topicNameControls.set(topicName, ctrl);
      this.originalTopicNames.set(topicName, topicName);
    }

    // After all controls exist, force uniqueness validators to re-run once
    for (const ctrl of this.topicNameControls.values()) {
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }


  // Build forms for all topics within the configuration
  private buildTopicForms(topics: TopicsMap): void {
    this.topicForms.clear();

    for (const [topicName, topicDef] of Object.entries(topics)) {
      const formsByEntryKey = new Map<string, FormGroup[]>();
      const getAllAttributeNames = () =>
        Array.from(formsByEntryKey.values())
          .flat()
          .map(fg => (fg.get("attName")?.value ?? "").toString());

      for (const [entryKey, rules] of Object.entries(topicDef)) {
        const groups = (rules ?? []).map((spec: RuleSpec) =>
          this.formFactory.buildRuleForm(entryKey, getAllAttributeNames, spec)
        );
        formsByEntryKey.set(entryKey, groups);
      }

      this.topicForms.set(topicName, formsByEntryKey);
    }
  }

  onTopicDeleteClick(): void {
    this.topicForms.delete(this.selectedTopic);
    delete this.cfg?.[this.selectedTopic];
    this.topics = this.topics.filter(
      ([name, _]) => name !== this.selectedTopic
    );
    this.selectedTopic = this.topics?.[0][0];


  }

  // Handler for "Add Topic" button
  onAddTopicClick(): void {
    const baseName = "NewTopic";
    let index = 1;
    let newTopicName = baseName;

    // Make sure the topic name is unique
    const existingNames = new Set(this.topicForms.keys());
    while (existingNames.has(newTopicName)) {
      index++;
      newTopicName = `${baseName} ${index}`;
    }

    // Ensure cfg exists
    if (!this.cfg) {
      this.cfg = {};
    }

    // Create empty TopicDefinition for the new topic
    this.cfg[newTopicName] = {};

    // Append to topics array so the left list updates
    this.topics = [...this.topics, [newTopicName, this.cfg[newTopicName]]];

    // Create and register the topic name control
    const ctrl = new FormControl<string>(newTopicName, { nonNullable: true });
    this.topicNameControls.set(newTopicName, ctrl);
    this.originalTopicNames.set(newTopicName, newTopicName);

    // Create an empty form map for this topic (no attributes yet)
    this.topicForms.set(newTopicName, new Map<string, FormGroup[]>());

    // Select the new topic and switch to edit mode so the name can be changed
    this.selectedTopic = newTopicName;
    this.edible = true;
  }


  onCancelClicked(): void {
    this.edible = false;
    if (this.configCreation) {
      // Navigate away or reset state as needed
      this.configCreation = false;
      this.id = null;
      this.cfg = null;
      this.topics = [];
      this.topicForms.clear();
      this.topicNameControls.clear();
      this.originalTopicNames.clear();
      this.router.navigate(['/configurations']); // Navigate back to overview

    }
  }

  onBackClicked(): void {
    this.router.navigate(['/configurations']);
  }
}
