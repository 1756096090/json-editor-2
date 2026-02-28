import { Routes } from '@angular/router';
import { JsonWorkbenchComponent } from './features/json-workbench/json-workbench.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'workbench'
  },
  {
    path: 'workbench',
    component: JsonWorkbenchComponent
  },
  {
    path: '**',
    redirectTo: 'workbench'
  }
];
