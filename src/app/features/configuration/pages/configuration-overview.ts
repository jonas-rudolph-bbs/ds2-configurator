import { Component, inject } from "@angular/core";
import { startWith, catchError, of, map } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { Router, RouterModule } from "@angular/router";
import { AsyncPipe } from "@angular/common";
import { ValidationState } from "../services/configuration.types";
import { take } from "rxjs/operators";
import { Modal } from 'bootstrap';

@Component({
  standalone: true,
  selector: "app-configuration-overview",
  imports: [RouterModule, AsyncPipe],
  templateUrl: "./configuration-overview.html",
  styleUrls: ["./configuration-overview.css"],
})
export class ConfigurationOverview {
  constructor(private router: Router) {}

  private readonly configService: ConfigurationService =
    inject(ConfigurationService);
  errorMessage: string | null = null;

  // 1) First: get the configs (states)
  states$ = this.configService.getAllConfigurationStates().pipe(
    startWith([] as ValidationState[]), // show empty immediately
    catchError(() => of([] as ValidationState[])) // render empty on error
  );

  // 2) Then: map those to just the IDs
  ids$ = this.states$.pipe(map((states) => states.map((s) => s.id)));

  onAddConfigurationClick(): void {
    this.ids$.pipe(take(1)).subscribe((ids) => {
      let newId: string;

      // create a UUID that does not exist yet in the list
      do {
        newId = crypto.randomUUID(); // browser built-in UUID generator
      } while (ids.includes(newId));

      // navigate to /details/<newId>
      this.router.navigate(["/details", newId]);
    });
  }

  onDeleteClick(id: string): void {
    this.configService.deleteConfiguration(id).subscribe({
      next: () => {
        // simplest: reload list after delete
        this.states$ = this.configService.getAllConfigurationStates();
        this.ids$ = this.states$.pipe(map((states) => states.map((s) => s.id)));
      },
      error: (err) => {
        console.error('Error deleting configuration:', err);
        this.errorMessage = err?.error?.detail ?? 'Unexpected error occurred while deleting the configuration.';

        const element = document.getElementById('errorModal');
        if (element) {
          const modal = Modal.getOrCreateInstance(element);
          modal.show();
        }
      },
    });
  }
}
