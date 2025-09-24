import {Component, Input} from '@angular/core';
import {HousingLocationInfo} from '../models/housinglocation';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-housing-location',
  imports: [RouterModule],
  template: `
    <div class="card card-ds2">
      <img
        class="listing-photo"
        [src]="housingLocation.photo"
        alt="Exterior photo of {{ housingLocation.name }}"
        crossorigin
      />
      <h2 class="listing-heading">{{ housingLocation.name }}</h2>
      <p class="listing-location">{{ housingLocation.city }}, {{ housingLocation.state }}</p>
      <a [routerLink]="['/details', housingLocation.id]">Learn More</a>
</div>
  `,
  styleUrls: ['./housing-location.css'],
})
export class HousingLocation {
  // use Input binding for data from parents
  @Input() housingLocation!: HousingLocationInfo;
}
