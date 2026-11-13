import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'engineer-console', pathMatch: 'full' },
    {
        path: 'engineer-console',
        loadComponent: () =>
        import('./components/engineer-console/engineer-console.component').then(
            (m) => m.EngineerConsoleComponent
        ),
    },
];
