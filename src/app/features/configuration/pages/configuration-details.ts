// import { Component, inject } from "@angular/core";
// import { ActivatedRoute } from "@angular/router";
// import { ConfigurationService } from "../services/configuration.service";
// import { HousingLocationInfo } from "../models/housinglocation";

// @Component({
//   selector: "app-configuration-details",
//   imports: [],
//   template: `
//     <div class="container-fluid">
//       <div class="row g-4">
//         <!-- Left: steps card -->
//         <div class="col-12 col-lg-4">
//           <div class="card ds2-card h-100">
//             <div class="card-header fw-semibold">Topics</div>
//             <div class="card-body">
//               <ol class="mb-0 ds2-steps">
//                 <li>topic 1</li>
//                 <li>topic 2</li>
//                 <li>topic 3</li>
//                 <li>topic 4</li>
//                 <li>+</li>
//               </ol>
//             </div>
//           </div>
//         </div>

//         <!-- Right: edit form -->
//         <div class="col-12 col-lg-8">
//           <div class="card ds2-card">
//             <div
//               class="card-header d-flex justify-content-between align-items-center"
//             >
//               <span class="fw-semibold">data quality topic</span>
             
//             </div>

//             <div class="card-body">
//               <form class="row g-3">
//                 <div class="col-12">
//                   <label class="form-label">Attribute</label>
//                   <input
//                     class="form-control"
//                     formControlName="name"
//                     placeholder="e.g., CO2"
//                   />
//                 </div>
//                 <div class="col-12">
//                   <label class="form-label">Expectation Rule</label>
//                   <input
//                     class="form-control"
//                     formControlName="name"
//                     placeholder="e.g., Expectation Rule"
//                   />
//                 </div>
//                 <div class="col-sm-2">
//                   <label class="form-label">Min</label>
//                   <input class="form-control" formControlName="city" />
//                 </div>

//                 <div class="col-sm-2">
//                   <label class="form-label">Max</label>
//                   <input class="form-control" formControlName="state" />
//                 </div>

//                 <div class="col-12">
//                   <label class="form-label">Expectation Handler</label>
//                   <input class="form-control" formControlName="address" />
//                 </div>

//                 <div class="col-12 d-flex justify-content-end gap-2 mt-2">
//                   <a routerLink="/" class="btn btn-outline-secondary">Cancel</a>
//                   <button type="submit" class="btn btn-ds2">Save</button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   `,
//   styleUrls: ["./configuration-details.css"],
// })
// export class ConfigurationDetails {
//   route: ActivatedRoute = inject(ActivatedRoute);
//   configService = inject(ConfigurationService);
//   housingLocation: HousingLocationInfo | undefined;
//   constructor() {
//     const housingLocationId = Number(this.route.snapshot.params["id"]);
//     this.housingLocation =
//       this.configService.getHousingLocationById(housingLocationId);
//   }
// }
