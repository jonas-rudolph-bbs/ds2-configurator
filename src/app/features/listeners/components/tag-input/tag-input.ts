// tag-input.ts
// Small chip input for string lists (e.g. listener `variables`): Enter or comma adds, × removes.
import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  standalone: true,
  selector: "app-tag-input",
  template: `
    <div class="form-control form-control-ds2 d-flex flex-wrap gap-1 align-items-center tag-input">
      @for (tag of tags; track tag) {
        <span class="badge rounded-pill text-bg-light border">
          {{ tag }}
          <button type="button" class="btn btn-sm p-0 ms-1 lh-1" [attr.aria-label]="'Remove ' + tag" (click)="remove(tag)">×</button>
        </span>
      }
      <input class="border-0 flex-grow-1" [placeholder]="tags.length ? '' : placeholder"
             (keydown)="onKeydown($event)" (blur)="add($any($event.target))" />
    </div>
  `,
  styles: `
    .tag-input { min-height: 38px; }
    .tag-input input { outline: none; min-width: 120px; }
  `,
})
export class TagInput {
  @Input() tags: string[] = [];
  @Input() placeholder = "Type and press Enter";
  @Output() tagsChange = new EventEmitter<string[]>();

  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      this.add(event.target as HTMLInputElement);
    }
  }

  add(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.tags.includes(value)) {
      this.tagsChange.emit([...this.tags, value]);
    }
    input.value = "";
  }

  remove(tag: string): void {
    this.tagsChange.emit(this.tags.filter((t) => t !== tag));
  }
}
