import { Component, inject } from "@angular/core";
import { startWith, catchError, of, map } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { RouterModule } from "@angular/router";
import { AsyncPipe } from "@angular/common";

@Component({
  standalone: true,
  selector: "app-configuration-overview",
  imports: [RouterModule, AsyncPipe],
  templateUrl: "./configuration-overview.html",
  styleUrls: ["./configuration-overview.css"],
})
export class ConfigurationOverview {
  ids$ = this.configService.getAllConfigurationStates().pipe(
    map((states) => states.map((s) => s.id)),
    startWith([]), // show empty state immediately
    catchError(() => of([])) // render the table body (empty) on error
  );

  constructor(private configService: ConfigurationService) {}
}
