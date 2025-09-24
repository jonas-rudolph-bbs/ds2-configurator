import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
  standalone: true,
  selector: "app-ds2-header",
  imports: [RouterModule],
  template: `
    <header class="d-flex flex-wrap justify-content-center py-3">
      <div
        class="container-fluid h-100 d-flex align-items-center position-relative px-3"
      >
        <!-- Left: logo with link -->
        <a
          routerLink="/"
          class="d-flex align-items-center text-decoration-none"
        >
          <img
            src="assets/ds2-logo.png"
            alt="DS2 Logo"
            width="100"
            class="me-2 ds2-logo"
          />
        </a>

        <!-- Center: title with link -->
        <h1
          class="header-title position-absolute top-50 start-50 translate-middle m-0 text-center"
        >
          <a routerLink="/" class="text-decoration-none text-dark">
            DDT Configurator
          </a>
        </h1>

        <!-- Right: window controls -->
        <div class="ms-auto">
          <button class="btn btn-ds2" routerLink="/">Login</button>
        </div>
      </div>
    </header>
  `,
  styleUrls: ["./ds2-header.css"],
})
export class Ds2Header {}
