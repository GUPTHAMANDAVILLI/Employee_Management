export interface Employee {
  id?: number;
  newId?: number;
  name: string;
  age: number;
  email: string;
  dept: string;
  salary: number;
  gender?: string;
  created_at?: string;
}

export interface PaginatedResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  // Report summary stats
  avgSalary?: number;
  minSalary?: number;
  maxSalary?: number;
  topDept?: string;
}

export interface EmployeeFilters {
  search: string;
  dept: string;
  gender: string;
  minAge: number | null;
  maxAge: number | null;
  minSalary: number | null;
  maxSalary: number | null;
  sortBy: string;
  sortDir: string;
}
