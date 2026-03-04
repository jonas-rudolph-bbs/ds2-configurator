import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProfilingSection = 'summary' | 'columns' | 'anomalies' | 'rules';

@Component({
  standalone: true,
  selector: 'ds2-profiling-sidebar',
  imports: [CommonModule],
  template: `
  <div class="card shadow-sm">
    <div class="card-body">
      <div class="fw-semibold mb-2">Report</div>
      <div class="list-group">
        <button type="button"
          class="list-group-item list-group-item-action"
          [class.active]="active === 'summary'"
          (click)="select('summary')">
          Summary
        </button>
        <button type="button"
          class="list-group-item list-group-item-action"
          [class.active]="active === 'columns'"
          (click)="select('columns')">
          Columns
        </button>
        <button type="button"
          class="list-group-item list-group-item-action"
          [class.active]="active === 'anomalies'"
          (click)="select('anomalies')">
          Anomalies
        </button>
        <button type="button"
          class="list-group-item list-group-item-action"
          [class.active]="active === 'rules'"
          (click)="select('rules')">
          Rule candidates
        </button>
      </div>
    </div>
  </div>
  `,
})
export class ProfilingSidebarComponent {
  @Input() active: ProfilingSection = 'summary';
  @Output() selectSection = new EventEmitter<ProfilingSection>();

  select(section: ProfilingSection) {
    this.selectSection.emit(section);
  }
}
