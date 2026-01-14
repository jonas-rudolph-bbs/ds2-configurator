import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Router } from "@angular/router";

@Component({
    standalone: true,
    selector: "app-ds2-about",
    imports: [RouterLink],
    templateUrl: "about.html", 
    styleUrls: ["./about.scss"]
}) export class Ds2About {
    constructor(private router: Router) {}

    appName: string = "DS2 DDT";
    environmentLabel: string = "DS2";
    version: string = "1.0.2"
    currentYear: number = 2026


    onBackClicked(): void {
        this.router.navigate(['/configurations']);
    }

}