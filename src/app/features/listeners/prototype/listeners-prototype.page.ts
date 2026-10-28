// PROTOTYPE — "Three variants of the MQTT listener page, switchable via ?variant=A|B|C,
// on the throwaway route /listeners-prototype inside the existing layout."
// Run: npm run prototype:listeners  →  http://localhost:4200/listeners-prototype?variant=A
import { Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";
import { ListenerProtoStore } from "./listeners-prototype.store";
import { VariantA } from "./variant-a-table";
import { VariantB } from "./variant-b-flow";
import { VariantC } from "./variant-c-master-detail";
import { PrototypeSwitcher } from "../../../shared/components/prototype-switcher";

@Component({
  standalone: true,
  selector: "app-listeners-prototype",
  imports: [VariantA, VariantB, VariantC, PrototypeSwitcher],
  providers: [ListenerProtoStore], // one in-memory copy shared by all variants
  styles: `
    .state { position: fixed; right: 16px; bottom: 16px; z-index: 1999; width: 340px; font-size: 12px;
             background: #fffbe6; border: 1px solid #e6d58a; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.15); }
    .state summary { padding: 6px 10px; cursor: pointer; font-weight: 600; }
    .state pre { margin: 0; padding: 0 10px 8px; white-space: pre-wrap; }
  `,
  template: `
    @if (!store.loaded()) {
      <div class="d-flex justify-content-center align-items-center" style="min-height: 300px">
        <span class="spinner-border me-2"></span> Loading listeners…
      </div>
    } @else if (store.loadError()) {
      <div class="alert alert-warning">{{ store.loadError() }}</div>
    } @else {
      @switch (variant()) {
        @case ('B') { <proto-variant-b /> }
        @case ('C') { <proto-variant-c /> }
        @default { <proto-variant-a /> }
      }
    }

    <details class="state" [open]="stateOpen()" (toggle)="stateOpen.set($any($event.target).open)">
      <summary>Prototype state · {{ store.listeners().length }} listeners · {{ store.configs().length }} configs</summary>
      <pre>Changes are in memory only (backend untouched).
{{ store.log().join('\\n') }}</pre>
      <div class="px-2 pb-2"><button class="btn btn-sm btn-outline-secondary" (click)="store.reload()">Reload from backend</button></div>
    </details>

    <prototype-switcher [variants]="variants" [current]="variant()" [labels]="labels" />
  `,
})
export class ListenersPrototypePage {
  readonly store = inject(ListenerProtoStore);
  readonly variants = ["A", "B", "C"];
  readonly labels: Record<string, string> = { A: VariantA.label, B: VariantB.label, C: VariantC.label };
  readonly stateOpen = signal(false);

  private readonly route = inject(ActivatedRoute);
  private readonly param = toSignal(this.route.queryParamMap.pipe(map((p) => p.get("variant"))), { initialValue: null });
  readonly variant = computed(() => {
    const v = (this.param() ?? "A").toUpperCase();
    return this.variants.includes(v) ? v : "A";
  });
}
