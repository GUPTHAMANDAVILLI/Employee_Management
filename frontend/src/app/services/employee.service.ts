import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Employee, PaginatedResponse, EmployeeFilters } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

  private apiUrl = 'https://employee-management-afgp.onrender.com/api/employees';
  private openAddModalSubject = new Subject<void>();
  openAddModal$ = this.openAddModalSubject.asObservable();

  private refreshEmployeesSubject = new Subject<void>();
  refreshEmployees$ = this.refreshEmployeesSubject.asObservable();

  constructor(private http: HttpClient) { }

  triggerOpenAddModal(): void {
    this.openAddModalSubject.next();
  }

  triggerRefreshEmployees(): void {
    this.refreshEmployeesSubject.next();
  }

  getEmployees(page: number = 1, limit: number = 5, filters: Partial<EmployeeFilters> = {}): Observable<PaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.dept) params = params.set('dept', filters.dept);
    if (filters.gender) params = params.set('gender', filters.gender);
    if (filters.minAge != null) params = params.set('minAge', filters.minAge.toString());
    if (filters.maxAge != null) params = params.set('maxAge', filters.maxAge.toString());
    if (filters.minSalary != null) params = params.set('minSalary', filters.minSalary.toString());
    if (filters.maxSalary != null) params = params.set('maxSalary', filters.maxSalary.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);

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
