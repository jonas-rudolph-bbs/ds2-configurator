import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Ds2Header } from './shared/components/ds2-header';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterModule, Ds2Header],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  title = 'homes';
}
