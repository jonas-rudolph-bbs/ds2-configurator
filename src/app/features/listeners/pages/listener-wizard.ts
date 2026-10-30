import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { forkJoin, of } from "rxjs";
import { catchError, finalize } from "rxjs/operators";
import { ListenerService } from "../services/listener.service";
import { ConfigurationService } from "../../configuration/services/configuration.service";
import { ValidationState } from "../../configuration/services/configuration.types";
import { Listener, ListenerInput, apiErrorMessage, effectivePublishTopics } from "../services/listener.types";
import { TagInput } from "../components/tag-input/tag-input";

const DEFAULT_BATCH_SIZE = 5;

const trimmedRequired: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  (c.value ?? "").toString().trim() ? null : { trimmedRequired: true };

/** MQTT wildcards aren't supported as listener source (backend rule) */
const noWildcards: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  /[+#]/.test(c.value ?? "") ? { wildcard: true } : null;

const integer: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  Number.isInteger(Number(c.value)) ? null : { integer: true };

type FieldName =
  | "name" | "source" | "variables" | "timestamp_attribute"
  | "validation_config_id" | "validation_topic" | "batch_size"
  | "publish_validated" | "publish_alarm" | "enabled";

interface WizardStep {
  title: string;
  hint: string;
  fields: FieldName[];
}

@Component({
  standalone: true,
  selector: "app-listener-wizard",
  imports: [ReactiveFormsModule, TagInput],
  templateUrl: "./listener-wizard.html",
  styleUrls: ["./listener-wizard.scss"],
})
export class ListenerWizard implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listenerService = inject(ListenerService);
  private readonly configService = inject(ConfigurationService);

  readonly steps: WizardStep[] = [
    { title: "Input", hint: "Where does the data come from?", fields: ["name", "source", "variables", "timestamp_attribute"] },
    { title: "Validation", hint: "Which rules check the data?", fields: ["validation_config_id", "validation_topic", "batch_size"] },
    { title: "Output", hint: "Where do the results go?", fields: ["publish_validated", "publish_alarm", "enabled"] },
  ];

  readonly form = new FormGroup({
    name: new FormControl("", { nonNullable: true, validators: [trimmedRequired, Validators.maxLength(100)] }),
    source: new FormControl("", { nonNullable: true, validators: [trimmedRequired, noWildcards] }),
    variables: new FormControl<string[]>([], { nonNullable: true }),
    timestamp_attribute: new FormControl("", { nonNullable: true }),
    validation_config_id: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    validation_topic: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
    batch_size: new FormControl(DEFAULT_BATCH_SIZE, { nonNullable: true, validators: [Validators.required, Validators.min(1), integer] }),
    publish_validated: new FormControl("", { nonNullable: true }),
    publish_alarm: new FormControl("", { nonNullable: true }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  listenerId: string | null = null;
  configs: ValidationState[] = [];
  currentStep = 0;
  loading = true;
  notFound = false;
  isSaving = false;
  saveError: string | null = null;

  get isEdit(): boolean {
    return this.listenerId !== null;
  }

  ngOnInit(): void {
    this.listenerId = this.route.snapshot.paramMap.get("id");
    const preselectedConfig = this.route.snapshot.queryParamMap.get("config");

    forkJoin({
      configs: this.configService.getAllConfigurationStates().pipe(catchError(() => of([] as ValidationState[]))),
      listener: this.listenerId
        ? this.listenerService.getListener(this.listenerId).pipe(catchError(() => of(null)))
        : of(null),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe(({ configs, listener }) => {
        this.configs = [...configs].sort((a, b) =>
          (a.metadata.name || a.id).localeCompare(b.metadata.name || b.id, "de-DE", { sensitivity: "base" })
        );
        if (this.isEdit && !listener) {
          this.notFound = true;
          return;
        }
        if (listener) {
          this.applyListener(listener);
        } else if (preselectedConfig) {
          this.form.controls.validation_config_id.setValue(preselectedConfig);
        }
      });
  }

  // ---------- template helpers ----------

  configName(id: string): string {
    const cfg = this.configs.find((c) => c.id === id);
    return cfg ? cfg.metadata.name || cfg.id : id;
  }

  /** Topic sections of the selected validation configuration */
  get sections(): string[] {
    const cfg = this.configs.find((c) => c.id === this.form.controls.validation_config_id.value);
    return Object.keys(cfg?.topics ?? {});
  }

  get publishDefaults(): { validated: string; alarm: string } {
    return effectivePublishTopics({ source: this.form.controls.source.value.trim(), publish_validated: null, publish_alarm: null });
  }

  get effectivePublish(): { validated: string; alarm: string } {
    const v = this.form.getRawValue();
    return effectivePublishTopics({
      source: v.source.trim(),
      publish_validated: v.publish_validated.trim() || null,
      publish_alarm: v.publish_alarm.trim() || null,
    });
  }

  showError(field: FieldName): boolean {
    const c = this.form.controls[field];
    return c.invalid && (c.touched || c.dirty);
  }

  stepInvalid(index: number): boolean {
    return this.steps[index].fields.some((f) => this.form.controls[f].invalid);
  }

  // ---------- actions ----------

  onConfigChanged(): void {
    // a section only exists within its configuration
    this.form.controls.validation_topic.setValue("");
  }

  selectSection(section: string): void {
    this.form.controls.validation_topic.setValue(section);
    this.form.controls.validation_topic.markAsTouched();
  }

  onVariablesChange(tags: string[]): void {
    this.form.controls.variables.setValue(tags);
    this.form.controls.variables.markAsDirty();
  }

  goToStep(index: number): void {
    this.currentStep = index;
  }

  onNext(): void {
    this.markStepTouched(this.currentStep);
    if (!this.stepInvalid(this.currentStep)) {
      this.currentStep++;
    }
  }

  onBack(): void {
    this.currentStep--;
  }

  onCancel(): void {
    this.router.navigate(["/listeners"]);
  }

  onSave(): void {
    this.saveError = null;
    this.form.markAllAsTouched();
    const firstInvalid = this.steps.findIndex((_, i) => this.stepInvalid(i));
    if (firstInvalid !== -1) {
      this.currentStep = firstInvalid;
      return;
    }

    const payload = this.toPayload();
    const request = this.listenerId
      ? this.listenerService.updateListener(this.listenerId, payload)
      : this.listenerService.createListener(payload);

    this.isSaving = true;
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.isSaving = false))
      )
      .subscribe({
        next: () => this.router.navigate(["/listeners"]),
        error: (err) => {
          // 400 (rule violation) / 404 (deleted meanwhile): keep the user's input, show the backend message
          this.saveError = apiErrorMessage(err, "Unexpected error occurred while saving the listener.");
          this.currentStep = this.stepForError(this.saveError);
        },
      });
  }

  // ---------- internal ----------

  private applyListener(l: Listener): void {
    this.form.setValue({
      name: l.name,
      source: l.source,
      variables: [...(l.variables ?? [])],
      timestamp_attribute: l.timestamp_attribute ?? "",
      validation_config_id: l.validation_config_id,
      validation_topic: l.validation_topic,
      batch_size: l.batch_size,
      publish_validated: l.publish_validated ?? "",
      publish_alarm: l.publish_alarm ?? "",
      enabled: l.enabled,
    });
  }

  private toPayload(): ListenerInput {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      source: v.source.trim(),
      enabled: v.enabled,
      validation_config_id: v.validation_config_id,
      validation_topic: v.validation_topic,
      publish_validated: v.publish_validated.trim() || null,
      publish_alarm: v.publish_alarm.trim() || null,
      batch_size: Number(v.batch_size),
      variables: v.variables,
      timestamp_attribute: v.timestamp_attribute.trim() || null,
    };
  }

  private markStepTouched(index: number): void {
    this.steps[index].fields.forEach((f) => this.form.controls[f].markAsTouched());
  }

  /** Jump to the step whose fields the backend complained about */
  private stepForError(message: string): number {
    const m = message.toLowerCase();
    if (m.startsWith("a publish topic")) return 2;   // own publish topic = another listener's source
    if (m.includes("source") || m.includes("subscribes") || m.includes("wildcard") || m.includes("'name'")) return 0;
    if (m.includes("validation") || m.includes("batch_size")) return 1;
    return this.currentStep;
  }
}
