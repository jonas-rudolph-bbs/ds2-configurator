import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MappedExpectation {
  expectation_type: string;
  kwargs: Record<string, any>;
}

export interface AdoptedRule {
  id: string;
  column: string;
  suggestion: string;
  mappingSupported: boolean;
  previewLabel: string;
  previewFull: string;
  mappedExpectation?: MappedExpectation;
}

const STORAGE_KEY = 'ds2_adopted_profiling_rules';

@Injectable({
  providedIn: 'root'
})
export class ProfilingAdoptionService {

  private rules$ = new BehaviorSubject<AdoptedRule[]>([]);

  constructor() {
    this.load();
  }

  getRules() {
    return this.rules$.asObservable();
  }

  getCurrentRules(): AdoptedRule[] {
    return this.rules$.value;
  }

  addRule(rule: AdoptedRule) {
    const exists = this.rules$.value.find(r => r.id === rule.id);
    if (exists) return;

    const updated = [...this.rules$.value, rule];
    this.rules$.next(updated);
    this.persist(updated);
  }

  removeRule(ruleId: string) {
    const updated = this.rules$.value.filter(r => r.id !== ruleId);
    this.rules$.next(updated);
    this.persist(updated);
  }

  clear() {
    this.rules$.next([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private persist(rules: AdoptedRule[]) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }

  private load() {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      this.rules$.next(JSON.parse(stored));
    }
  }
}