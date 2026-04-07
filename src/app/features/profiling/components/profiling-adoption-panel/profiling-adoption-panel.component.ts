import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  flashBody = false;
  rules$ = this.adoptionService.getRules();

  private previousCount = 0;
  private sub?: Subscription;
  private flashTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private adoptionService: ProfilingAdoptionService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sub = this.rules$.subscribe(rules => {
      const currentCount = rules.length;

      if (currentCount > this.previousCount) {
        this.triggerFlash();
      }

      this.previousCount = currentCount;
    });
  }

  toggle() {
    this.expanded = !this.expanded;
  }

  removeRule(id: string) {
    this.adoptionService.removeRule(id);
  }

  clearAll() {
    this.adoptionService.clear();
  }

  private triggerFlash() {
    this.flashBody = false;

    if (this.flashTimeout) {
      clearTimeout(this.flashTimeout);
    }

    setTimeout(() => {
      this.flashBody = true;
      this.flashTimeout = setTimeout(() => {
        this.flashBody = false;
      }, 700);
    });
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