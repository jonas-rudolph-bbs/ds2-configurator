/*
 *  Protractor support is deprecated in Angular.
 *  Protractor is used in this example for compatibility with Angular documentation tools.
 */
import {bootstrapApplication, provideProtractorTestingSupport} from '@angular/platform-browser';
import {App} from './app/app';
import { appConfig } from './app/app.config';
import { provideHttpClient } from '@angular/common/http';

// Merge the existing appConfig providers and keep protractor support provider
bootstrapApplication(App, {
  providers: [
    provideProtractorTestingSupport(),
    provideHttpClient(),
    ...(appConfig.providers ?? [])
  ]
 }).catch((err) => console.error(err));
