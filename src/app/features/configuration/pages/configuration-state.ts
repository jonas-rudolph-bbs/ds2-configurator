import { Component, OnInit, inject, DestroyRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { switchMap, map, finalize } from "rxjs/operators";
import { of } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ConfigurationDetails } from "../components/configuration-details/configuration-details";
import { ConfigurationEditForm } from "../components/configuration-edit-form/configuration-edit-form";
import { ConfigurationFormMapper } from "../forms/configuration-form.mapper";
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import {
  TopicDefinition,
  TopicsMap,
  ValidationConfigMetadata
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
  private formMapper = inject(ConfigurationFormMapper);


  // state from backend
  id: string | null = null;
  metadata: ValidationConfigMetadata = {};
  configNameControl = new FormControl<string>("", {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(100),
    ],
  });
  cfg: TopicsMap | null = null;
  topics: [string, TopicDefinition][] = [];

  selectedTopic: string = "";
  edible: boolean = false;
  isSaving: boolean = false;
  configCreation: boolean | null = null;

  topicForms = new Map<string, Map<string, FormGroup>>();
  topicNameControls = new Map<string, FormControl<string>>();
  originalTopicNames = new Map<string, string>();
  saveAttempted = false;

  // On component init, load configuration state
  ngOnInit(): void {
    const navState = history.state;
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
            console.warn("No configuration found for id test:", this.id);

            const adoptedRules = navState?.adoptedRules;
            const topicName = navState?.topicName;

            if (adoptedRules && topicName) {
              const tempCfg = this.buildTopicsMapFromAdoptedRules(topicName, adoptedRules);
              this.metadata = this.buildDefaultMetadata(this.id!);
              this.applyFormStateFromTopics(tempCfg, topicName);
              this.configCreation = true;
              this.edible = true;

              return;
            }
            this.metadata = this.buildDefaultMetadata(this.id!);
            this.configCreation = true;
            return;
          }
          this.configCreation = false;
          this.applyMetadata(cfg.metadata);
          this.applyFormStateFromTopics(cfg.topics);
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

  private applyFormStateFromTopics(
    topicsMap: TopicsMap,
    selectedTopic?: string
  ): void {
    const formState = this.formMapper.buildFormStateFromTopics(topicsMap);

    this.cfg = topicsMap;
    this.topics = formState.topics;
    this.topicForms = formState.topicForms;
    this.topicNameControls = formState.topicNameControls;
    this.originalTopicNames = formState.originalTopicNames;
    this.selectedTopic = selectedTopic ?? formState.selectedTopic;
  }

  // Save button handler
  onSaveClicked(): void {
    if (!this.id) {
      console.warn("Cannot save: no id in route");
      return;
    }
    this.saveAttempted = true;

    this.configNameControl.markAsTouched();

    const allValid = this.formMapper.validateAll(this.topicNameControls, this.topicForms);
    const metadataValid = this.configNameControl.valid;

    if (!allValid || !metadataValid) {
      console.warn("Validation failed. Please fix the errors and try again.");
      return;
    }


    const topicsPayload = this.formMapper.buildSavePayload(
      this.topics,
      this.topicNameControls,
      this.topicForms
    );

    const payload = {
      metadata: {
        ...this.metadata,
        name: this.configNameControl.value.trim(),
        updated_at: new Date().toISOString(),
      },
      topics: topicsPayload,
    };

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
          this.applyMetadata(cfg.metadata);
          this.applyFormStateFromTopics(cfg.topics);
          this.edible = false;
          this.configCreation = false;
        },
        error: (err) => {
          console.error(
            "Error saving configuration or reloading configuration state:",
            err
          );
        },
      });
  }


  private buildTopicsMapFromAdoptedRules(topicName: string, adoptedRules: any[]): any {
    const topicDefinition: Record<string, any[]> = {};

    for (const adoptedRule of adoptedRules) {
      if (!adoptedRule?.mappingSupported || !adoptedRule?.mappedExpectation) {
        continue;
      }

      const expectationType = adoptedRule.mappedExpectation.expectation_type;
      const kwargs = adoptedRule.mappedExpectation.kwargs ?? {};
      const column = adoptedRule.column ?? kwargs.column;

      if (!column) {
        continue;
      }

      if (!topicDefinition[column]) {
        topicDefinition[column] = [];
      }

      topicDefinition[column].push({
        rule: expectationType,
        params: kwargs,
        handler: ''
      });
    }

    return {
      [topicName]: topicDefinition
    };
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
    this.topicForms.set(newTopicName, new Map<string, FormGroup>());

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
      this.metadata = {};
      this.configNameControl.reset("");
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

  private buildDefaultMetadata(id: string): ValidationConfigMetadata {
    const now = new Date().toISOString();

    return {
      name: id,
      created_at: now,
      updated_at: now,
    };
  }

  private applyMetadata(metadata: ValidationConfigMetadata | undefined): void {
    this.metadata = metadata ?? {};

    this.configNameControl.setValue(
      typeof this.metadata.name === "string" && this.metadata.name.trim()
        ? this.metadata.name
        : this.id ?? "",
      { emitEvent: false }
    );
  }
}
