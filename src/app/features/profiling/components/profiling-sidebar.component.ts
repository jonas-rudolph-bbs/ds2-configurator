import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProfilingSection = 'summary' | 'columns' | 'anomalies' | 'rules';

@Component({
  standalone: true,
  selector: 'ds2-profiling-sidebar',
  imports: [CommonModule],
  templateUrl: './profiling-sidebar.component.html',
})
export class ProfilingSidebarComponent {
  @Input() active: ProfilingSection = 'summary';
  @Output() selectSection = new EventEmitter<ProfilingSection>();

  select(section: ProfilingSection) {
    this.selectSection.emit(section);
  }
}
