import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { EmployeeListComponent } from './components/employee-list/employee-list.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home - Employee Management' },
  { path: 'employees', component: EmployeeListComponent, title: 'Employee Directory - Employee Management' },
  { path: '**', redirectTo: '' }
];
