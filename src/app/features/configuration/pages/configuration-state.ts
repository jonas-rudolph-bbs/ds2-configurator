import { Component, OnInit, inject, DestroyRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { switchMap, map, tap, shareReplay } from "rxjs/operators";
import { of } from "rxjs";
import { ConfigurationService } from "../services/configuration.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { TopicDefinition } from "../services/configuration.types";
import { ConfigurationDetails } from "../components/configuration-details/configuration-details";
import { ConfigurationEditForm } from "../components/configuration-edit-form/configuration-edit-form";
import { TopicsMap } from "../services/configuration.types";


@Component({
  selector: "app-configuration-state",
  standalone: true,
  imports: [CommonModule, ConfigurationDetails, ConfigurationEditForm],
  templateUrl: "./configuration-state.html",
  styleUrls: ["./configuration-state.css"],
})
export class ConfigurationState implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(ConfigurationService);
  private destroyRef = inject(DestroyRef);

  id: string | null = null;
  cfg: TopicsMap | null = null;
  topics: [string, TopicDefinition][]= [];
  selectedTopic: string = "";
  edible: boolean = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((p) => p.get("id")),
        switchMap((id) => {
          this.id = id;
          if (!id) return of(null);
          return this.svc.getConfigurationState(id);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (cfg) => {
          if (!cfg) return;
          this.cfg = cfg.topics;
          this.topics = Object.entries(cfg.topics);
          console.log("Loaded configuration:", cfg);

          if (this.topics && this.topics.length > 0) {
            this.selectedTopic = this.topics[0][0];
          }
        },
      });
  }

  selectTopic(topicName: string) {
    this.selectedTopic = topicName;
  }

}
