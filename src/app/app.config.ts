import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ScadaDataService } from './services/scada-data.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideAppInitializer(() => {
            inject(ScadaDataService)
        }),
        provideRouter(routes)
    ]
};
