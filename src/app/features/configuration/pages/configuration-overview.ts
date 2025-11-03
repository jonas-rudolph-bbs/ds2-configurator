import { Component, inject } from "@angular/core";
import { startWith, catchError, of, map } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { RouterModule } from "@angular/router";
import { AsyncPipe } from "@angular/common";
import { ValidationState } from "../services/configuration.types";

@Component({
  standalone: true,
  selector: "app-configuration-overview",
  imports: [RouterModule, AsyncPipe],
  templateUrl: "./configuration-overview.html",
  styleUrls: ["./configuration-overview.css"],
})
export class ConfigurationOverview {
  // ids$ = this.configService.getAllConfigurationStates().pipe(
  //   map((states) => states.map((s) => s.id)),
  //   startWith([]), // show empty state immediately
  //   catchError(() => of([])) // render the table body (empty) on error
  // );

  // constructor(private configService: ConfigurationService) {}

  private readonly configService: ConfigurationService = inject(ConfigurationService);

  // 1) First: get the configs (states)
  states$ = this.configService.getAllConfigurationStates().pipe(
    startWith([] as ValidationState[]),          // show empty immediately
    catchError(() => of([] as ValidationState[]))// render empty on error
  );

  // 2) Then: map those to just the IDs
  ids$ = this.states$.pipe(
    map(states => states.map(s => s.id))
  );

}
