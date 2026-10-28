// PROTOTYPE variant B — "Data flow, grouped by validation configuration"
// Each config is a block; each listener is a flow  source → section → outputs.
// Create/edit is a 3-step wizard page (Input → Validation → Output).
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Listener, ListenerProtoStore } from "./listeners-prototype.store";
import { ProtoTagInput } from "./proto-tag-input";

@Component({
  standalone: true,
  selector: "proto-variant-b",
  imports: [FormsModule, ProtoTagInput],
  styles: `
    .cfg { border: 1px solid var(--shadow-color); border-radius: 12px; margin-bottom: 1.25rem; overflow: hidden; }
    .cfg-head { background: var(--third-background-color); border-left: 6px solid var(--primary-color); padding: .75rem 1rem; }
    .flow { display: grid; grid-template-columns: 24px minmax(180px, 1.1fr) 28px minmax(160px, 1fr) 28px minmax(260px, 1.4fr) auto; align-items: center; gap: .5rem; padding: .75rem 1rem; border-top: 1px solid var(--shadow-color); }
    .flow.off { opacity: .5; }
    .node { border: 1px solid var(--border-color); border-radius: 8px; padding: .35rem .6rem; background: #fff; }
    .node.src { border-color: var(--primary-color); background: var(--primary-color-20); }
    .arrow { text-align: center; color: var(--primary-color); font-size: 1.2rem; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.subscribed { background: #2e9d5b; } .dot.waiting { background: #e0a100; } .dot.disabled { background: #b5b5b5; }
    .steps .step { flex: 1; border-bottom: 4px solid var(--shadow-color); padding-bottom: .4rem; cursor: pointer; }
    .steps .step.active { border-color: var(--primary-color); font-weight: 600; }
  `,
  template: `
  @if (mode() === 'list') {
    <header class="d-flex justify-content-between align-items-start mb-4">
      <div>
        <h1 class="h3 mb-2">Data flows</h1>
        <p class="text-muted mb-0">MQTT topics flowing through each validation configuration.</p>
      </div>
      <button class="btn btn-ds2" (click)="edit(null, '')">Add listener</button>
    </header>

    @for (g of groups(); track g.id) {
      <div class="cfg">
        <div class="cfg-head d-flex justify-content-between align-items-center">
          <div><strong>{{ g.name }}</strong>
            <span class="text-muted small ms-2">{{ g.listeners.length }} listener(s) · sections: {{ g.topics.join(', ') || '—' }}</span></div>
          <button class="btn btn-sm btn-outline-secondary" (click)="edit(null, g.id)">+ Listener for this config</button>
        </div>
        @for (l of g.listeners; track l.id) {
          <div class="flow" [class.off]="!l.enabled">
            <span class="dot" [class]="store.statusOf(l)" [title]="store.statusOf(l)"></span>
            <div class="node src"><div class="small text-muted">{{ l.name }}</div><code>{{ l.source }}</code></div>
            <div class="arrow">→</div>
            <div class="node"><div class="small text-muted">section · batch {{ l.batch_size }}</div>{{ l.validation_topic }}</div>
            <div class="arrow">→</div>
            <div class="small">
              <div class="node mb-1">✔ <code>{{ store.effectivePublish(l)[0] }}</code></div>
              <div class="node">⚠ <code>{{ store.effectivePublish(l)[1] }}</code></div>
            </div>
            <div class="text-end small text-nowrap">
              <div><strong>{{ l.status?.message_count ?? 0 }}</strong> msgs
                @if (l.status?.error_count) { · <span class="text-danger">{{ l.status?.error_count }} invalid</span> }</div>
              <div class="text-muted">{{ store.ago(l.status?.last_message_at) }}</div>
              <button class="btn btn-sm btn-link p-0 me-2" (click)="store.toggle(l.id)">{{ l.enabled ? 'Pause' : 'Resume' }}</button>
              <button class="btn btn-sm btn-link p-0 me-2" (click)="edit(l, l.validation_config_id)">Edit</button>
              <button class="btn btn-sm btn-link p-0 text-danger" (click)="confirmDelete(l)">Delete</button>
            </div>
          </div>
        } @empty {
          <div class="px-3 py-3 text-muted small border-top">No MQTT data flows through this configuration yet.</div>
        }
      </div>
    } @empty {
      <div class="text-center border rounded-3 p-5 text-muted">Create a validation configuration first, then attach listeners to it.</div>
    }
  } @else {
    <!-- WIZARD PAGE -->
    <nav class="small mb-2"><a href="" (click)="$event.preventDefault(); mode.set('list')">Data flows</a> › {{ draft.id ? draft.name : 'New listener' }}</nav>
    <h1 class="h3 mb-3">{{ draft.id ? 'Edit data flow' : 'New data flow' }}</h1>
    <div class="d-flex gap-3 steps mb-4" style="max-width: 760px">
      @for (s of steps; track s; let i = $index) {
        <div class="step" [class.active]="step() === i" (click)="step.set(i)">{{ i + 1 }}. {{ s }}</div>
      }
    </div>
    @if (error()) { <div class="alert alert-danger" style="max-width: 760px">{{ error() }}</div> }

    <div style="max-width: 760px">
      @switch (step()) {
        @case (0) {
          <p class="text-muted">Where does the data come from?</p>
          <label class="form-label">Name</label>
          <input class="form-control mb-3" [(ngModel)]="draft.name" placeholder="e.g. Air Quality MQTT" />
          <label class="form-label">MQTT source topic</label>
          <input class="form-control mb-3" [(ngModel)]="draft.source" placeholder="e.g. air-quality" />
          <label class="form-label">Variables in the messages</label>
          <proto-tag-input [(tags)]="draft.variables"></proto-tag-input>
          <label class="form-label mt-3">Timestamp attribute</label>
          <input class="form-control" [(ngModel)]="draft.timestamp_attribute" placeholder="e.g. dateFrom" />
        }
        @case (1) {
          <p class="text-muted">Which rules check the data?</p>
          <label class="form-label">Validation configuration</label>
          <select class="form-select mb-3" [(ngModel)]="draft.validation_config_id" (ngModelChange)="draft.validation_topic = ''">
            <option value="" disabled>Select…</option>
            @for (c of store.configs(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          <label class="form-label">Topic section</label>
          <div class="d-flex flex-wrap gap-2 mb-3">
            @for (t of store.topicsOf(draft.validation_config_id); track t) {
              <button type="button" class="btn btn-sm" [class.btn-ds2]="draft.validation_topic === t"
                      [class.btn-outline-secondary]="draft.validation_topic !== t" (click)="draft.validation_topic = t">{{ t }}</button>
            } @empty { <span class="text-muted small">Select a configuration first.</span> }
          </div>
          <label class="form-label">Batch size (rows per validation run)</label>
          <input type="number" min="1" class="form-control" style="max-width: 160px" [(ngModel)]="draft.batch_size" />
        }
        @case (2) {
          <p class="text-muted">Where do the results go?</p>
          <label class="form-label">Validated data</label>
          <input class="form-control mb-3" [(ngModel)]="draft.publish_validated" [placeholder]="store.effectivePublish(draft)[0]" />
          <label class="form-label">Alarms</label>
          <input class="form-control mb-3" [(ngModel)]="draft.publish_alarm" [placeholder]="store.effectivePublish(draft)[1]" />
          <div class="form-check form-switch mb-3">
            <input class="form-check-input" type="checkbox" id="enb" [(ngModel)]="draft.enabled" />
            <label class="form-check-label" for="enb">Start listening right away</label>
          </div>
          <div class="border rounded-3 p-3 bg-light small">
            <strong>Summary:</strong> <code>{{ draft.source || '?' }}</code> → {{ draft.validation_config_id ? store.configName(draft.validation_config_id) : '?' }}
            › {{ draft.validation_topic || '?' }} (batch {{ draft.batch_size }}) → <code>{{ store.effectivePublish(draft)[0] }}</code>, <code>{{ store.effectivePublish(draft)[1] }}</code>
          </div>
        }
      }
      <div class="mt-4 d-flex gap-2">
        @if (step() > 0) { <button class="btn btn-outline-secondary" (click)="step.set(step() - 1)">Back</button> }
        @if (step() < 2) { <button class="btn btn-ds2" (click)="step.set(step() + 1)">Next</button> }
        @else { <button class="btn btn-ds2" (click)="save()">Save data flow</button> }
        <button class="btn btn-link" (click)="mode.set('list')">Cancel</button>
      </div>
    </div>
  }
  `,
})
export class VariantB {
  static readonly label = "Data flow by config";
  readonly store = inject(ListenerProtoStore);
  readonly mode = signal<"list" | "edit">("list");
  readonly step = signal(0);
  readonly error = signal<string | null>(null);
  readonly steps = ["Input", "Validation", "Output"];
  draft: Listener = this.store.blank();

  readonly groups = computed(() =>
    this.store.configs().map((c) => ({
      ...c,
      listeners: this.store.listeners().filter((l) => l.validation_config_id === c.id),
    }))
  );

  edit(l: Listener | null, configId: string): void {
    this.draft = l ? { ...l, variables: [...l.variables] } : { ...this.store.blank(), validation_config_id: configId };
    this.step.set(0);
    this.error.set(null);
    this.mode.set("edit");
  }

  confirmDelete(l: Listener): void {
    if (confirm(`Delete listener '${l.name}'? Its MQTT subscription stops immediately.`)) this.store.remove(l.id);
  }

  save(): void {
    const err = this.store.save(this.draft);
    this.error.set(err);
    if (!err) this.mode.set("list");
  }
}
