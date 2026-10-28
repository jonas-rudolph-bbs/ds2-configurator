// PROTOTYPE — tiny tag input for `variables` (Enter or comma adds, × removes).
import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  standalone: true,
  selector: "proto-tag-input",
  template: `
    <div class="form-control d-flex flex-wrap gap-1 align-items-center" style="min-height: 38px">
      @for (t of tags; track t) {
        <span class="badge rounded-pill text-bg-light border">
          {{ t }} <button type="button" class="btn btn-sm p-0 ms-1 lh-1" (click)="remove(t)">×</button>
        </span>
      }
      <input class="border-0 flex-grow-1" style="outline: none; min-width: 120px"
             [placeholder]="tags.length ? '' : placeholder"
             (keydown)="onKey($event)" (blur)="add($any($event.target))" />
    </div>`,
})
export class ProtoTagInput {
  @Input() tags: string[] = [];
  @Input() placeholder = "Type and press Enter";
  @Output() tagsChange = new EventEmitter<string[]>();

  onKey(e: KeyboardEvent): void {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      this.add(e.target as HTMLInputElement);
    }
  }

  add(input: HTMLInputElement): void {
    const v = input.value.trim();
    if (v && !this.tags.includes(v)) this.tagsChange.emit([...this.tags, v]);
    input.value = "";
  }

  remove(t: string): void {
    this.tagsChange.emit(this.tags.filter((x) => x !== t));
  }
}
