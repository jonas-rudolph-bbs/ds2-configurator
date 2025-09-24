import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { Observable, map } from "rxjs";
import { ValidationState } from "../services/configuration.types";
import { ConfigurationService } from "../services/configuration.service";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-configuration-overview",
  imports: [RouterModule, AsyncPipe],
  templateUrl: "./configuration-overview.html",
  styleUrls: ["./configuration-overview.css"],
})
export class ConfigurationOverview {
  ids$ = this.configService.getAllConfigurationStates().pipe(
    map(states => states.map(s => s.id))
  );

  constructor(private configService: ConfigurationService) {}

}
