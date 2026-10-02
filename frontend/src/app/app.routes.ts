import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'products',
    canActivate: [authGuard], // protects the list and both form routes
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/products/product-list.component').then(m => m.ProductListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/products/product-form.component').then(m => m.ProductFormComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/products/product-form.component').then(m => m.ProductFormComponent),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  { path: '**', redirectTo: 'products' },
];
