// PROTOTYPE variant A — "Table + separate edit page"
// Same look as the Configurations overview; create/edit replaces the list (own page).
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Listener, ListenerProtoStore } from "./listeners-prototype.store";
import { ProtoTagInput } from "./proto-tag-input";

@Component({
  standalone: true,
  selector: "proto-variant-a",
  imports: [FormsModule, ProtoTagInput],
  styles: `
    .ds2-table { border: 1px solid var(--shadow-color); border-radius: 12px; overflow: hidden; }
    .ds2-table thead { border-bottom: 4px solid var(--primary-color); }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
    .dot.subscribed { background: #2e9d5b; } .dot.waiting { background: #e0a100; } .dot.disabled { background: #b5b5b5; }
    .section-title { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--seondary-text-color); }
  `,
  template: `
  @if (mode() === 'list') {
    <header class="d-flex justify-content-between align-items-start">
      <div class="mb-5">
        <h1 class="h3 mb-2">MQTT Listeners</h1>
        <p class="text-muted mb-0">Which validation configuration runs on which MQTT topic.</p>
      </div>
      <button class="btn btn-ds2" (click)="edit(null)">Add listener</button>
    </header>

    @if (store.listeners().length === 0) {
      <div class="text-center border rounded-3 p-5 text-muted">
        <p class="h5">No listeners yet</p>
        <p>A listener subscribes to an MQTT topic and validates its messages with a validation configuration.</p>
        <button class="btn btn-ds2" (click)="edit(null)">Create the first listener</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 ds2-table">
          <thead class="table-light">
            <tr>
              <th>Status</th><th>Name</th><th>Source topic</th><th>Validation</th>
              <th>Publishes to</th><th class="text-end">Messages</th><th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (l of store.listeners(); track l.id) {
              <tr [class.text-muted]="!l.enabled">
                <td class="text-nowrap"><span class="dot" [class]="store.statusOf(l)"></span>{{ label(l) }}</td>
                <td>{{ l.name }}</td>
                <td><code>{{ l.source }}</code></td>
                <td>{{ store.configName(l.validation_config_id) }} <span class="text-muted">› {{ l.validation_topic }}</span></td>
                <td class="small">
                  <div>✔ <code>{{ store.effectivePublish(l)[0] }}</code></div>
                  <div>⚠ <code>{{ store.effectivePublish(l)[1] }}</code></div>
                </td>
                <td class="text-end small">
                  {{ l.status?.message_count ?? 0 }}
                  @if (l.status?.error_count) { <span class="text-danger"> / {{ l.status?.error_count }} invalid</span> }
                  <div class="text-muted">{{ store.ago(l.status?.last_message_at) }}</div>
                </td>
                <td class="text-end text-nowrap">
                  <div class="form-check form-switch d-inline-block me-2 align-middle" title="Enabled">
                    <input class="form-check-input" type="checkbox" [checked]="l.enabled" (change)="store.toggle(l.id)" />
                  </div>
                  <button class="btn btn-link text-decoration-none" (click)="edit(l)">Edit</button>
                  @if (confirmId() === l.id) {
                    <button class="btn btn-sm btn-danger" (click)="store.remove(l.id); confirmId.set(null)">Delete?</button>
                    <button class="btn btn-sm btn-link" (click)="confirmId.set(null)">Cancel</button>
                  } @else {
                    <button class="btn btn-link text-danger text-decoration-none" (click)="confirmId.set(l.id)">Delete</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  } @else {
    <!-- EDIT PAGE -->
    <nav class="small mb-2"><a href="" (click)="$event.preventDefault(); mode.set('list')">MQTT Listeners</a> › {{ draft.id ? draft.name : 'New listener' }}</nav>
    <h1 class="h3 mb-4">{{ draft.id ? 'Edit listener' : 'New listener' }}</h1>

    @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }

    <div class="row g-4" style="max-width: 1100px">
      <div class="col-md-6">
        <p class="section-title">General</p>
        <label class="form-label">Name</label>
        <input class="form-control mb-3" [(ngModel)]="draft.name" placeholder="e.g. Air Quality MQTT" />
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="en" [(ngModel)]="draft.enabled" />
          <label class="form-check-label" for="en">Enabled (subscribed)</label>
        </div>

        <p class="section-title mt-4">Incoming data</p>
        <label class="form-label">Source topic</label>
        <input class="form-control mb-3" [(ngModel)]="draft.source" placeholder="e.g. air-quality" />
        <div class="row">
          <div class="col-4"><label class="form-label">Batch size</label>
            <input type="number" min="1" class="form-control" [(ngModel)]="draft.batch_size" /></div>
          <div class="col-8"><label class="form-label">Timestamp attribute</label>
            <input class="form-control" [(ngModel)]="draft.timestamp_attribute" placeholder="e.g. dateFrom" /></div>
        </div>
        <label class="form-label mt-3">Variables</label>
        <proto-tag-input [(tags)]="draft.variables" placeholder="co, no2, … (Enter)"></proto-tag-input>
      </div>

      <div class="col-md-6">
        <p class="section-title">Validation</p>
        <label class="form-label">Validation configuration</label>
        <select class="form-select mb-3" [(ngModel)]="draft.validation_config_id" (ngModelChange)="draft.validation_topic = ''">
          <option value="" disabled>Select…</option>
          @for (c of store.configs(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
        <label class="form-label">Topic section</label>
        <select class="form-select mb-3" [(ngModel)]="draft.validation_topic" [disabled]="!draft.validation_config_id">
          <option value="" disabled>{{ draft.validation_config_id ? 'Select…' : 'Select a configuration first' }}</option>
          @for (t of store.topicsOf(draft.validation_config_id); track t) { <option [value]="t">{{ t }}</option> }
        </select>

        <p class="section-title mt-4">Output</p>
        <label class="form-label">Publish validated data to</label>
        <input class="form-control mb-3" [(ngModel)]="draft.publish_validated" [placeholder]="store.effectivePublish(draft)[0]" />
        <label class="form-label">Publish alarms to</label>
        <input class="form-control" [(ngModel)]="draft.publish_alarm" [placeholder]="store.effectivePublish(draft)[1]" />
        <div class="form-text">Leave empty to use the default shown.</div>
      </div>
    </div>

    <div class="mt-4 d-flex gap-2">
      <button class="btn btn-ds2" (click)="save()">Save</button>
      <button class="btn btn-outline-secondary" (click)="mode.set('list')">Cancel</button>
    </div>
  }
  `,
})
export class VariantA {
  static readonly label = "Table + edit page";
  readonly store = inject(ListenerProtoStore);
  readonly mode = signal<"list" | "edit">("list");
  readonly error = signal<string | null>(null);
  readonly confirmId = signal<string | null>(null);
  draft: Listener = this.store.blank();

  label(l: Listener): string {
    return { subscribed: "Subscribed", waiting: "Not connected", disabled: "Disabled" }[this.store.statusOf(l)];
  }

  edit(l: Listener | null): void {
    this.draft = l ? { ...l, variables: [...l.variables] } : this.store.blank();
    this.error.set(null);
    this.mode.set("edit");
  }

  save(): void {
    const err = this.store.save(this.draft);
    this.error.set(err);
    if (!err) this.mode.set("list");
  }
}
