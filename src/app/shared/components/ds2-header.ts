import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
  standalone: true,
  selector: "app-ds2-header",
  imports: [RouterModule],
  templateUrl: "./ds2-header.html",
  styleUrls: ["./ds2-header.css"],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Ds2Header {}
