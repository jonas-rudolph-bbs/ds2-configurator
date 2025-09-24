import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  standalone: true,
  selector: 'app-ds2-homescreen',
  imports: [RouterLink],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center flex-grow-1">
      <h1 class="mt-5">Welcome to the DS2 Homescreen</h1>
      <button class="btn btn-ds2" [routerLink]="['/configurations']">Get Started</button>
    </div>
  `,
  styles: ``
})
export class Ds2Homescreen {

}
