export interface Employee {
  id?: number;
  newId?: number;
  name: string;
  age: number;
  email: string;
  dept: string;
  salary: number;
  created_at?: string;
}

export interface PaginatedResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
