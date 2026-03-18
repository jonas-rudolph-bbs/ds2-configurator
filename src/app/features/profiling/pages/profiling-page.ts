import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';

import { ProfilingService } from '../services/profiling.service';
import { ProfilingResult } from '../services/profiling.types';
import { ProfilingSidebarComponent, ProfilingSection } from '../components/profiling-sidebar.component';
import { ProfilingUploadComponent, UploadSubmit } from '../components/profiling-upload.component';
import { ProfilingSummaryComponent } from '../components/sections/profiling-summary.component';
import { ProfilingColumnsComponent } from '../components/sections/profiling-columns.component';
import { ProfilingAnomaliesComponent } from '../components/sections/profiling-anomalies.component';
import { ProfilingRulesComponent } from '../components/sections/profiling-rules.component';
import { ProfilingAdoptionPanelComponent } from '../components/profiling-adoption-panel/profiling-adoption-panel.component';

@Component({
  standalone: true,
  selector: 'ds2-profiling-page',
  imports: [
    CommonModule,
    ProfilingUploadComponent,
    ProfilingSidebarComponent,
    ProfilingSummaryComponent,
    ProfilingColumnsComponent,
    ProfilingAnomaliesComponent,
    ProfilingRulesComponent,
    ProfilingAdoptionPanelComponent
  ],
  templateUrl: './profiling-page.html',
  styleUrls: ['./profiling-page.scss'],
})
export class ProfilingPage {
  private readonly profilingService = inject(ProfilingService);

  // UI state
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly section = signal<ProfilingSection>('summary');

  // Data state
  readonly result = signal<ProfilingResult | null>(null);

  readonly hasResult = computed(() => !!this.result());

  onSelectSection(section: ProfilingSection) {
    this.section.set(section);
  }

  onUploadSubmit(submit: UploadSubmit) {
    this.error.set(null);
    this.loading.set(true);

    const obs = submit.kind === 'file'
      ? this.profilingService.profileJsonFile(submit.file)
      : this.profilingService.profileJsonPayload(submit.payload);

    obs.pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.section.set('summary');
        },
        error: (err) => {
          const msg =
            err?.error?.detail ||
            err?.error?.message ||
            err?.message ||
            'Profiling request failed.';
          this.error.set(String(msg));
        }
      });
  }
}
