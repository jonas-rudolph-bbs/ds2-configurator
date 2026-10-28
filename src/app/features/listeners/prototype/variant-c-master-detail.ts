// PROTOTYPE variant C — "Master-detail"
// Compact list left, selected listener right (status tiles + details, or the edit form in place).
// Deliberately challenges the decision "create/edit on a separate page".
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Listener, ListenerProtoStore } from "./listeners-prototype.store";
import { ProtoTagInput } from "./proto-tag-input";

@Component({
  standalone: true,
  selector: "proto-variant-c",
  imports: [FormsModule, ProtoTagInput],
  styles: `
    .pane { border: 1px solid var(--shadow-color); border-radius: 12px; height: calc(100vh - 230px); overflow: auto; }
    .item { padding: .65rem .9rem; border-bottom: 1px solid var(--shadow-color); cursor: pointer; }
    .item.active { background: var(--primary-color-20); border-left: 4px solid var(--primary-color); }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
    .dot.subscribed { background: #2e9d5b; } .dot.waiting { background: #e0a100; } .dot.disabled { background: #b5b5b5; }
    .tile { border: 1px solid var(--shadow-color); border-radius: 10px; padding: .75rem 1rem; }
    .tile .v { font-size: 1.4rem; font-weight: 600; }
    dt { font-weight: 500; color: var(--seondary-text-color); }
  `,
  template: `
    <header class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h3 mb-0">MQTT Listeners</h1>
      <button class="btn btn-ds2" (click)="startNew()">Add listener</button>
    </header>

    <div class="row g-3">
      <!-- MASTER -->
      <div class="col-4">
        <div class="pane">
          <div class="p-2 border-bottom">
            <input class="form-control form-control-sm" placeholder="Filter by name or topic…" [ngModel]="filter()" (ngModelChange)="filter.set($event)" />
          </div>
          @for (l of filtered(); track l.id) {
            <div class="item" [class.active]="selectedId() === l.id" (click)="select(l.id)">
              <div class="d-flex justify-content-between">
                <span><span class="dot" [class]="store.statusOf(l)"></span><strong>{{ l.name }}</strong></span>
                <span class="small text-muted">{{ l.status?.message_count ?? 0 }} msgs</span>
              </div>
              <div class="small text-muted"><code>{{ l.source }}</code> → {{ l.validation_topic }}</div>
            </div>
          } @empty {
            <div class="p-4 text-muted small text-center">No listeners. Use “Add listener”.</div>
          }
        </div>
      </div>

      <!-- DETAIL -->
      <div class="col-8">
        <div class="pane p-4">
          @if (editing()) {
            <h2 class="h5 mb-3">{{ draft.id ? 'Edit ' + draft.name : 'New listener' }}</h2>
            @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }
            <div class="row g-3">
              <div class="col-6"><label class="form-label">Name</label><input class="form-control" [(ngModel)]="draft.name" /></div>
              <div class="col-6"><label class="form-label">Source topic</label><input class="form-control" [(ngModel)]="draft.source" placeholder="e.g. air-quality" /></div>
              <div class="col-6"><label class="form-label">Validation configuration</label>
                <select class="form-select" [(ngModel)]="draft.validation_config_id" (ngModelChange)="draft.validation_topic = ''">
                  <option value="" disabled>Select…</option>
                  @for (c of store.configs(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                </select></div>
              <div class="col-6"><label class="form-label">Topic section</label>
                <select class="form-select" [(ngModel)]="draft.validation_topic" [disabled]="!draft.validation_config_id">
                  <option value="" disabled>Select…</option>
                  @for (t of store.topicsOf(draft.validation_config_id); track t) { <option [value]="t">{{ t }}</option> }
                </select></div>
              <div class="col-6"><label class="form-label">Publish validated</label><input class="form-control" [(ngModel)]="draft.publish_validated" [placeholder]="store.effectivePublish(draft)[0]" /></div>
              <div class="col-6"><label class="form-label">Publish alarms</label><input class="form-control" [(ngModel)]="draft.publish_alarm" [placeholder]="store.effectivePublish(draft)[1]" /></div>
              <div class="col-3"><label class="form-label">Batch size</label><input type="number" min="1" class="form-control" [(ngModel)]="draft.batch_size" /></div>
              <div class="col-4"><label class="form-label">Timestamp attribute</label><input class="form-control" [(ngModel)]="draft.timestamp_attribute" /></div>
              <div class="col-5 d-flex align-items-end"><div class="form-check form-switch mb-2">
                <input class="form-check-input" type="checkbox" id="enc" [(ngModel)]="draft.enabled" /><label class="form-check-label" for="enc">Enabled</label></div></div>
              <div class="col-12"><label class="form-label">Variables</label><proto-tag-input [(tags)]="draft.variables"></proto-tag-input></div>
            </div>
            <div class="mt-4 d-flex gap-2">
              <button class="btn btn-ds2" (click)="save()">Save</button>
              <button class="btn btn-outline-secondary" (click)="editing.set(false)">Cancel</button>
            </div>
          } @else if (selected(); as l) {
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div><h2 class="h5 mb-1">{{ l.name }}</h2><code>{{ l.source }}</code></div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" (click)="store.toggle(l.id)">{{ l.enabled ? 'Disable' : 'Enable' }}</button>
                <button class="btn btn-sm btn-ds2" (click)="startEdit(l)">Edit</button>
                <button class="btn btn-sm btn-outline-danger" (click)="del(l)">Delete</button>
              </div>
            </div>
            <div class="row g-2 mb-4">
              <div class="col-3"><div class="tile"><div class="small text-muted">Status</div><div class="v"><span class="dot" [class]="store.statusOf(l)"></span>{{ store.statusOf(l) }}</div></div></div>
              <div class="col-3"><div class="tile"><div class="small text-muted">Messages</div><div class="v">{{ l.status?.message_count ?? 0 }}</div></div></div>
              <div class="col-3"><div class="tile"><div class="small text-muted">Invalid (non-JSON)</div><div class="v" [class.text-danger]="l.status?.error_count">{{ l.status?.error_count ?? 0 }}</div></div></div>
              <div class="col-3"><div class="tile"><div class="small text-muted">Last message</div><div class="v" style="font-size:1rem">{{ store.ago(l.status?.last_message_at) }}</div></div></div>
            </div>
            <dl class="row mb-0">
              <dt class="col-4">Validation</dt><dd class="col-8">{{ store.configName(l.validation_config_id) }} › {{ l.validation_topic }}</dd>
              <dt class="col-4">Batch size</dt><dd class="col-8">{{ l.batch_size }}</dd>
              <dt class="col-4">Publishes validated</dt><dd class="col-8"><code>{{ store.effectivePublish(l)[0] }}</code> @if (!l.publish_validated) { <span class="text-muted small">(default)</span> }</dd>
              <dt class="col-4">Publishes alarms</dt><dd class="col-8"><code>{{ store.effectivePublish(l)[1] }}</code> @if (!l.publish_alarm) { <span class="text-muted small">(default)</span> }</dd>
              <dt class="col-4">Variables</dt><dd class="col-8">{{ l.variables.join(', ') || '—' }}</dd>
              <dt class="col-4">Timestamp attribute</dt><dd class="col-8">{{ l.timestamp_attribute || '—' }}</dd>
            </dl>
          } @else {
            <div class="text-muted text-center mt-5">Select a listener on the left, or add a new one.</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class VariantC {
  static readonly label = "Master-detail";
  readonly store = inject(ListenerProtoStore);
  readonly selectedId = signal<string | null>(null);
  readonly editing = signal(false);
  readonly error = signal<string | null>(null);
  readonly filter = signal("");
  draft: Listener = this.store.blank();

  readonly filtered = computed(() => {
    const f = this.filter().toLowerCase();
    return this.store.listeners().filter((l) => !f || l.name.toLowerCase().includes(f) || l.source.toLowerCase().includes(f));
  });
  readonly selected = computed(() => this.store.listeners().find((l) => l.id === this.selectedId()) ?? this.store.listeners()[0] ?? null);

  select(id: string): void {
    this.selectedId.set(id);
    this.editing.set(false);
  }

  startNew(): void {
    this.draft = this.store.blank();
    this.error.set(null);
    this.editing.set(true);
  }

  startEdit(l: Listener): void {
    this.draft = { ...l, variables: [...l.variables] };
    this.error.set(null);
    this.editing.set(true);
  }

  del(l: Listener): void {
    if (confirm(`Delete listener '${l.name}'?`)) {
      this.store.remove(l.id);
      this.selectedId.set(null);
    }
  }

  save(): void {
    const err = this.store.save(this.draft);
    this.error.set(err);
    if (!err) {
      this.editing.set(false);
      const match = this.store.listeners().find((l) => l.source === this.draft.source);
      if (match) this.selectedId.set(match.id);
    }
  }
}
