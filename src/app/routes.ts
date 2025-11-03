import {Routes} from '@angular/router';
import { ConfigurationOverview } from './features/configuration/pages/configuration-overview';
import { ConfigurationState } from './features/configuration/pages/configuration-state';
import { Ds2Homescreen } from './features/homescreen/ds2-homescreen';
import { AppLayout } from './shared/layout/app-layout';

const routeConfig: Routes = [
  {
    path: '',
    component: Ds2Homescreen,
    title: 'DS2 Configurator',
  },
  { path : '',
    component: AppLayout,
    title: 'DS2 Configurations',
    children: [
      { path: 'configurations', component: ConfigurationOverview, title: 'Configurations' },
      {path: 'details/:id', component: ConfigurationState, title: 'Configuration Details'}
      ]
  }
];
export default routeConfig;