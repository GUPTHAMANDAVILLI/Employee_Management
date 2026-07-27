const express = require('express');
const cors = require('cors');
require('dotenv').config();

const {
  initDb,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database connection / setup
initDb();

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Employee Management API is running' });
});

// GET /api/employees (Paginated employee list with optional filter & report parameters)
app.get('/api/employees', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const dept = req.query.dept || '';
    const gender = req.query.gender || '';
    const minAge = req.query.minAge ? parseInt(req.query.minAge) : null;
    const maxAge = req.query.maxAge ? parseInt(req.query.maxAge) : null;
    const minSalary = req.query.minSalary ? parseFloat(req.query.minSalary) : null;
    const maxSalary = req.query.maxSalary ? parseFloat(req.query.maxSalary) : null;
    const sortBy = req.query.sortBy || 'id';
    const sortDir = req.query.sortDir || 'asc';

    const result = await getEmployees({
      page,
      limit,
      search,
      dept,
      gender,
      minAge,
      maxAge,
      minSalary,
      maxSalary,
      sortBy,
      sortDir
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to retrieve employee records' });
  }
});

// GET /api/employees/:id
app.get('/api/employees/:id', async (req, res) => {
  try {
    const employee = await getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ error: 'Failed to retrieve employee details' });
  }
});

// Helper validation function
function validateEmployeeData({ name, age, gender, email, dept, salary, id, newId }) {
  const errors = [];
  if (id !== undefined && id !== null && id !== '' && (isNaN(id) || parseInt(id) <= 0)) {
    errors.push('Employee ID must be a positive integer');
  }
  if (newId !== undefined && newId !== null && newId !== '' && (isNaN(newId) || parseInt(newId) <= 0)) {
    errors.push('Updated Employee ID must be a positive integer');
  }
  if (!name || typeof name !== 'string' || !name.trim()) errors.push('Name is required');
  if (age === undefined || age === null || isNaN(age) || age < 18 || age > 100) errors.push('Valid age (18-100) is required');
  if (gender && !['Male', 'Female', 'Other'].includes(gender)) errors.push('Gender must be Male, Female, or Other');
  if (!email || typeof email !== 'string' || !email.includes('@')) errors.push('Valid email address is required');
  if (!dept || typeof dept !== 'string' || !dept.trim()) errors.push('Department is required');
  if (salary === undefined || salary === null || isNaN(salary) || salary < 0) errors.push('Valid positive salary is required');
  return errors;
}

// POST /api/employees (Create new employee)
app.post('/api/employees', async (req, res) => {
  try {
    const { id, name, age, gender, email, dept, salary } = req.body;
    
    const errors = validateEmployeeData({ name, age, gender, email, dept, salary, id });
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const newEmployee = await createEmployee({
      id: id ? parseInt(id) : null,
      name: name.trim(),
      age: parseInt(age),
      gender: gender || 'Male',
      email: email.trim().toLowerCase(),
      dept: dept.trim(),
      salary: parseFloat(salary)
    });

    res.status(201).json(newEmployee);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: err.message || 'An employee with this email or ID already exists' });
    }
    console.error('Error creating employee:', err);
    res.status(500).json({ error: err.message || 'Failed to create employee record' });
  }
});

// PUT /api/employees/:id (Update existing employee)
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { newId, name, age, gender, email, dept, salary } = req.body;

    const errors = validateEmployeeData({ name, age, gender, email, dept, salary, newId });
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const updatedEmployee = await updateEmployee(id, {
      newId: newId ? parseInt(newId) : parseInt(id),
      name: name.trim(),
      age: parseInt(age),
      gender: gender || 'Male',
      email: email.trim().toLowerCase(),
      dept: dept.trim(),
      salary: parseFloat(salary)
    });

    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(updatedEmployee);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: err.message || 'An employee with this email or ID already exists' });
    }
    console.error('Error updating employee:', err);
    res.status(500).json({ error: err.message || 'Failed to update employee record' });
  }
});

// DELETE /api/employees/:id (Delete employee)
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteEmployee(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully', id: parseInt(id) });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee record' });
  }
});

// Start server locally if called directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
