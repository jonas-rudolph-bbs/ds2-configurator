import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProfilingAdoptionService } from '../../services/profiling-adoption.service';

@Component({
  standalone: true,
  selector: 'app-profiling-adoption-panel',
  templateUrl: './profiling-adoption-panel.component.html',
  imports: [CommonModule],
  styleUrls: ['./profiling-adoption-panel.component.css']
})
export class ProfilingAdoptionPanelComponent {
  expanded = false;
  rules$ = this.adoptionService.getRules();

  constructor(
    private adoptionService: ProfilingAdoptionService,
    private router: Router
  ) {}

  toggle() {
    this.expanded = !this.expanded;
  }

  removeRule(id: string) {
    this.adoptionService.removeRule(id);
  }

  clearAll() {
    this.adoptionService.clear();
  }

  openConfig() {
    const rules = this.adoptionService.getCurrentRules();
    const supported = rules.filter(r => r.mappingSupported);

    if (supported.length === 0) {
      alert('No adopted rules can be converted into expectations.');
      return;
    }

    console.log('Adopted rules to be converted:', supported);

    const topic = prompt('Topic name for configuration:');
    if (!topic) return;

    const id = crypto.randomUUID();

    this.router.navigate(['/details', id], {
      state: {
        adoptedRules: supported,
        topicName: topic
      }
    });

    this.adoptionService.clear();
  }
}