import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfilingResult } from '../../services/profiling.types';

@Component({
  standalone: true,
  selector: 'ds2-profiling-summary',
  imports: [CommonModule],
  templateUrl: './profiling-summary.component.html',
})
export class ProfilingSummaryComponent {
  @Input({ required: true }) result!: ProfilingResult;
}
