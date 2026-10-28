// PROTOTYPE tooling — floating variant switcher (←/→ keys too). Hidden outside dev mode.
import { Component, HostListener, Input, inject, isDevMode } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  standalone: true,
  selector: "prototype-switcher",
  styles: `
    .bar { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); z-index: 2000;
           background: #111; color: #fff; border-radius: 999px; padding: 6px 10px; display: flex; align-items: center; gap: 10px;
           box-shadow: 0 6px 24px rgba(0,0,0,.35); font: 500 14px system-ui, sans-serif; }
    button { background: #333; color: #fff; border: 0; border-radius: 999px; width: 30px; height: 30px; }
    button:hover { background: #555; }
    .tag { color: #ffd54a; font-size: 11px; letter-spacing: .08em; }
  `,
  template: `
    @if (dev) {
      <div class="bar">
        <span class="tag">PROTOTYPE</span>
        <button (click)="go(-1)" aria-label="Previous variant">←</button>
        <span>{{ current }} ({{ labels[current] }})</span>
        <button (click)="go(1)" aria-label="Next variant">→</button>
      </div>
    }
  `,
})
export class PrototypeSwitcher {
  @Input({ required: true }) variants: string[] = [];
  @Input({ required: true }) current = "A";
  @Input() labels: Record<string, string> = {};
  readonly dev = isDevMode();
  private readonly router = inject(Router);

  go(step: number): void {
    const i = this.variants.indexOf(this.current);
    const next = this.variants[(i + step + this.variants.length) % this.variants.length];
    this.router.navigate([], { queryParams: { variant: next }, queryParamsHandling: "merge", replaceUrl: true });
  }

  @HostListener("document:keydown", ["$event"])
  onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (e.key === "ArrowLeft") this.go(-1);
    if (e.key === "ArrowRight") this.go(1);
  }
}
