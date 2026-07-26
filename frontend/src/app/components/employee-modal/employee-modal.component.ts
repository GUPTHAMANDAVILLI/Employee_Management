import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-employee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-modal.component.html',
  styleUrls: ['./employee-modal.component.css']
})
export class EmployeeModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() employee: Employee | null = null;
  @Input() isSaving = false;
  @Input() errorMessage = '';

  @Output() closeModal = new EventEmitter<void>();
  @Output() saveEmployee = new EventEmitter<Employee>();

  formData: Employee = {
    id: undefined,
    newId: undefined,
    name: '',
    age: '' as unknown as number,
    email: '',
    dept: 'Engineering',
    salary: '' as unknown as number
  };

  departments = ['Engineering', 'Marketing', 'Human Resources', 'Finance', 'Sales', 'Operations', 'Design', 'Product'];
  formErrors: { [key: string]: string } = {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] && this.employee) {
      this.formData = {
        ...this.employee,
        newId: this.employee.id
      };
      if (this.formData.dept && !this.departments.includes(this.formData.dept)) {
        this.departments = [...this.departments, this.formData.dept];
      }
    } else if (changes['isOpen'] && this.isOpen && !this.employee) {
      this.resetForm();
    }
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.formData = {
      id: undefined,
      newId: undefined,
      name: '',
      age: '' as unknown as number,
      email: '',
      dept: 'Engineering',
      salary: '' as unknown as number
    };
    this.formErrors = {};
  }

  onClose(): void {
    this.closeModal.emit();
  }

  validate(): boolean {
    this.formErrors = {};
    let isValid = true;

    const testId = this.employee ? this.formData.newId : this.formData.id;
    if (testId !== undefined && testId !== null && testId !== ('' as unknown)) {
      const idNum = Number(testId);
      if (isNaN(idNum) || idNum <= 0) {
        this.formErrors['id'] = 'ID must be a positive number';
        isValid = false;
      }
    }

    if (!this.formData.name || !this.formData.name.trim()) {
      this.formErrors['name'] = 'Name is required';
      isValid = false;
    }

    const ageNum = Number(this.formData.age);
    if (!this.formData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      this.formErrors['age'] = 'Age must be 18 to 100';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.formData.email || !emailRegex.test(this.formData.email)) {
      this.formErrors['email'] = 'Valid email is required';
      isValid = false;
    }

    if (!this.formData.dept || !this.formData.dept.trim()) {
      this.formErrors['dept'] = 'Department is required';
      isValid = false;
    }

    const salaryNum = Number(this.formData.salary);
    if (this.formData.salary === null || this.formData.salary === undefined || this.formData.salary === ('' as unknown) || isNaN(salaryNum) || salaryNum < 0) {
      this.formErrors['salary'] = 'Salary must be a positive number';
      isValid = false;
    }

    this.cdr.detectChanges();
    return isValid;
  }

  onSubmit(): void {
    if (this.validate()) {
      const payload: Employee = {
        ...this.formData,
        id: this.formData.id ? Number(this.formData.id) : undefined,
        newId: this.formData.newId ? Number(this.formData.newId) : undefined,
        age: Number(this.formData.age),
        salary: Number(this.formData.salary)
      };
      this.saveEmployee.emit(payload);
    }
  }
}
