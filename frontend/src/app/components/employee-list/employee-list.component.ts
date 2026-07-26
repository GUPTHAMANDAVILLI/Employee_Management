import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmployeeService } from '../../services/employee.service';
import { Employee, PaginatedResponse } from '../../models/employee.model';
import { EmployeeModalComponent } from '../employee-modal/employee-modal.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeeModalComponent],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css']
})
export class EmployeeListComponent implements OnInit, OnDestroy {
  employees: Employee[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination state
  currentPage = 1;
  pageSize = 5;
  totalEmployees = 0;
  totalPages = 1;
  pageSizeOptions = [5, 10, 20, 50];

  // Search filter
  searchQuery = '';
  private searchSubject = new Subject<string>();

  // Modal State
  isModalOpen = false;
  selectedEmployee: Employee | null = null;
  isSaving = false;
  modalErrorMessage = '';

  // Delete Confirmation State
  isDeleteModalOpen = false;
  employeeToDelete: Employee | null = null;
  isDeleting = false;

  private subscription: Subscription = new Subscription();

  constructor(
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEmployees();

    // Debounced search input handler
    this.subscription.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.currentPage = 1;
        this.loadEmployees();
      })
    );

    // Listen for add modal triggers from Navbar
    this.subscription.add(
      this.employeeService.openAddModal$.subscribe(() => {
        this.openAddModal();
        this.cdr.detectChanges();
      })
    );

    // Listen for refresh triggers
    this.subscription.add(
      this.employeeService.refreshEmployees$.subscribe(() => {
        this.loadEmployees();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); // Ensure UI reflects loading state instantly

    this.employeeService.getEmployees(this.currentPage, this.pageSize, this.searchQuery).subscribe({
      next: (res: PaginatedResponse) => {
        this.employees = res.employees;
        this.totalEmployees = res.total;
        this.currentPage = res.page;
        this.totalPages = res.totalPages || 1;
        this.isLoading = false;
        this.cdr.detectChanges(); // Immediately update UI without needing clicks
      },
      error: (err) => {
        console.error('Error fetching employee list:', err);
        this.errorMessage = 'Failed to connect to backend server. Make sure Node.js server is running.';
        this.isLoading = false;
        this.cdr.detectChanges(); // Immediately update UI on error
      }
    });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadEmployees();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadEmployees();
    }
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const maxVisible = 5;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Modal Handlers
  openAddModal(): void {
    this.selectedEmployee = null;
    this.modalErrorMessage = '';
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditModal(employee: Employee): void {
    this.selectedEmployee = { ...employee };
    this.modalErrorMessage = '';
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedEmployee = null;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  saveEmployee(formData: Employee): void {
    this.isSaving = true;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();

    if (this.selectedEmployee && this.selectedEmployee.id) {
      // Update existing record
      this.employeeService.updateEmployee(this.selectedEmployee.id, formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadEmployees();
        },
        error: (err) => {
          this.isSaving = false;
          this.modalErrorMessage = err.error?.error || 'Failed to update employee record.';
          this.cdr.detectChanges();
        }
      });
    } else {
      // Create new record
      this.employeeService.createEmployee(formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.currentPage = 1;
          this.loadEmployees();
        },
        error: (err) => {
          this.isSaving = false;
          this.modalErrorMessage = err.error?.error || 'Failed to create employee record.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  // Delete Handlers
  openDeleteModal(employee: Employee): void {
    this.employeeToDelete = employee;
    this.isDeleteModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.employeeToDelete = null;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.employeeToDelete || this.employeeToDelete.id === undefined || this.employeeToDelete.id === null) return;

    this.isDeleting = true;
    this.cdr.detectChanges();

    this.employeeService.deleteEmployee(this.employeeToDelete.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        if (this.employees.length === 1 && this.currentPage > 1) {
          this.currentPage--;
        }
        this.loadEmployees();
      },
      error: (err) => {
        console.error('Error deleting employee:', err);
        alert('Failed to delete employee record.');
        this.isDeleting = false;
        this.closeDeleteModal();
      }
    });
  }

  getDepartmentBadgeClass(dept: string): string {
    switch ((dept || '').toLowerCase()) {
      case 'engineering': return 'badge-engineering';
      case 'marketing': return 'badge-marketing';
      case 'human resources': return 'badge-hr';
      case 'finance': return 'badge-finance';
      case 'sales': return 'badge-sales';
      default: return 'badge-default';
    }
  }
}
