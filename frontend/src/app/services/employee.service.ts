import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Employee, PaginatedResponse } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = 'https://employee-management-afgp.onrender.com/api/employees';

  // Observable trigger to signal opening the Add Modal
  private openAddModalSubject = new Subject<void>();
  openAddModal$ = this.openAddModalSubject.asObservable();

  // Observable trigger to refresh employee list without reloading the window
  private refreshEmployeesSubject = new Subject<void>();
  refreshEmployees$ = this.refreshEmployeesSubject.asObservable();

  constructor(private http: HttpClient) { }

  triggerOpenAddModal(): void {
    this.openAddModalSubject.next();
  }

  triggerRefreshEmployees(): void {
    this.refreshEmployeesSubject.next();
  }

  getEmployees(page: number = 1, limit: number = 5, search: string = ''): Observable<PaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PaginatedResponse>(this.apiUrl, { params });
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  createEmployee(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }

  updateEmployee(id: number, employee: Employee): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, employee);
  }

  deleteEmployee(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(`${this.apiUrl}/${id}`);
  }
}
