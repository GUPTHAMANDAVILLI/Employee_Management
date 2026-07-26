const { Pool, Client } = require('pg');
require('dotenv').config();

// PostgreSQL connection config
const dbHost = process.env.PGHOST || 'localhost';
const dbPort = parseInt(process.env.PGPORT || '5432');
const dbUser = process.env.PGUSER || 'postgres';
const dbPassword = process.env.PGPASSWORD || 'postgres';
const dbName = process.env.PGDATABASE || 'emp_db';

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  connectionTimeoutMillis: 3000
});

// Initial dataset with clean sequential IDs 1, 2, 3, 4, 5...
let inMemoryStore = [
  { id: 1, name: 'Alice Johnson', age: 28, email: 'alice.johnson@techcorp.com', dept: 'Engineering', salary: 85000, created_at: new Date('2026-01-15') },
  { id: 2, name: 'Bob Smith', age: 34, email: 'bob.smith@techcorp.com', dept: 'Marketing', salary: 65000, created_at: new Date('2026-02-01') },
  { id: 3, name: 'Charlie Davis', age: 41, email: 'charlie.davis@techcorp.com', dept: 'Human Resources', salary: 72000, created_at: new Date('2026-02-10') },
  { id: 4, name: 'Diana Prince', age: 29, email: 'diana.prince@techcorp.com', dept: 'Engineering', salary: 92000, created_at: new Date('2026-03-05') },
  { id: 5, name: 'Ethan Hunt', age: 38, email: 'ethan.hunt@techcorp.com', dept: 'Finance', salary: 88000, created_at: new Date('2026-03-20') }
];
let isPgConnected = false;

// Initial DB setup query
const createTableQuery = `
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  dept VARCHAR(100) NOT NULL,
  salary NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const seedData = [
  ['Alice Johnson', 28, 'alice.johnson@techcorp.com', 'Engineering', 85000],
  ['Bob Smith', 34, 'bob.smith@techcorp.com', 'Marketing', 65000],
  ['Charlie Davis', 41, 'charlie.davis@techcorp.com', 'Human Resources', 72000],
  ['Diana Prince', 29, 'diana.prince@techcorp.com', 'Engineering', 92000],
  ['Ethan Hunt', 38, 'ethan.hunt@techcorp.com', 'Finance', 88000]
];

async function ensureDatabaseExists() {
  const rootClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
    connectionTimeoutMillis: 3000
  });

  try {
    await rootClient.connect();
    const checkDbRes = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (checkDbRes.rowCount === 0) {
      console.log(`Database '${dbName}' does not exist. Creating database '${dbName}'...`);
      await rootClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database '${dbName}' created successfully.`);
    }
    await rootClient.end();
    return true;
  } catch (err) {
    await rootClient.end().catch(() => {});
    return false;
  }
}

async function initDb() {
  try {
    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      if (connErr.code === '3D000' || connErr.message.includes('does not exist')) {
        const created = await ensureDatabaseExists();
        if (created) {
          client = await pool.connect();
        } else {
          throw connErr;
        }
      } else {
        throw connErr;
      }
    }

    console.log(`Successfully connected to PostgreSQL database '${dbName}' on ${dbHost}:${dbPort}`);
    isPgConnected = true;

    await client.query(createTableQuery);

    const countRes = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(countRes.rows[0].count) === 0) {
      console.log('Seeding initial employee dataset into PostgreSQL...');
      for (const emp of seedData) {
        await client.query(
          'INSERT INTO employees (name, age, email, dept, salary) VALUES ($1, $2, $3, $4, $5)',
          emp
        );
      }
      console.log('Seeding complete.');
    }
    client.release();
  } catch (err) {
    console.warn('PostgreSQL database connection warning:', err.message);
    console.log('Notice: Running responsive in-memory database mode for smooth execution.');
    isPgConnected = false;
  }
}

// Database helper functions
async function getEmployees({ page = 1, limit = 5, search = '' }) {
  const offset = (page - 1) * limit;

  if (isPgConnected) {
    try {
      let countQuery = 'SELECT COUNT(*) FROM employees';
      let dataQuery = 'SELECT * FROM employees';
      const params = [];
      const dataParams = [];

      if (search) {
        countQuery += ' WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(dept) LIKE $1';
        dataQuery += ' WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(dept) LIKE $1';
        params.push(`%${search.toLowerCase()}%`);
        dataParams.push(`%${search.toLowerCase()}%`);
      }

      dataQuery += ` ORDER BY id ASC LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
      dataParams.push(limit, offset);

      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await pool.query(dataQuery, dataParams);
      const employees = dataResult.rows.map(row => ({
        ...row,
        salary: parseFloat(row.salary),
        age: parseInt(row.age)
      }));

      return {
        employees,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit) || 1
      };
    } catch (err) {
      console.error('Postgres error in getEmployees, falling back to memory store:', err.message);
    }
  }

  // Fallback memory implementation
  let filtered = [...inMemoryStore];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.dept.toLowerCase().includes(q)
    );
  }

  // Sort ascending by ID: #1, #2, #3, #4...
  filtered.sort((a, b) => a.id - b.id);

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    employees: paginated,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit) || 1
  };
}

async function getEmployeeById(id) {
  const empId = parseInt(id);
  if (isPgConnected) {
    try {
      const res = await pool.query('SELECT * FROM employees WHERE id = $1', [empId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return { ...row, salary: parseFloat(row.salary), age: parseInt(row.age) };
      }
      return null;
    } catch (err) {
      console.error('Postgres error in getEmployeeById:', err.message);
    }
  }

  return inMemoryStore.find(e => e.id === empId) || null;
}

async function createEmployee({ id, name, age, email, dept, salary }) {
  const ageVal = parseInt(age);
  const salaryVal = parseFloat(salary);

  let targetId = id ? parseInt(id) : null;

  if (isPgConnected) {
    try {
      let query;
      let params;

      if (targetId && !isNaN(targetId)) {
        query = `
          INSERT INTO employees (id, name, age, email, dept, salary)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        params = [targetId, name, ageVal, email, dept, salaryVal];
      } else {
        query = `
          INSERT INTO employees (name, age, email, dept, salary)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        params = [name, ageVal, email, dept, salaryVal];
      }

      const res = await pool.query(query, params);
      const row = res.rows[0];
      return { ...row, salary: parseFloat(row.salary), age: parseInt(row.age) };
    } catch (err) {
      console.error('Postgres error in createEmployee:', err.message);
      if (err.code === '23505' && err.detail && err.detail.includes('Key (id)=')) {
        const customErr = new Error(`An employee with ID #${targetId} already exists.`);
        customErr.code = '23505';
        throw customErr;
      }
      throw err;
    }
  }

  // Check email uniqueness in memory store
  const existingEmail = inMemoryStore.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (existingEmail) {
    const error = new Error('An employee with this email already exists.');
    error.code = '23505';
    throw error;
  }

  if (targetId && !isNaN(targetId)) {
    const existingId = inMemoryStore.find(e => e.id === targetId);
    if (existingId) {
      const error = new Error(`An employee with ID #${targetId} already exists.`);
      error.code = '23505';
      throw error;
    }
  } else {
    const maxExistingId = inMemoryStore.reduce((max, emp) => (emp.id > max ? emp.id : max), 0);
    targetId = maxExistingId + 1;
  }

  const newEmp = {
    id: targetId,
    name,
    age: ageVal,
    email,
    dept,
    salary: salaryVal,
    created_at: new Date()
  };
  inMemoryStore.push(newEmp);
  return newEmp;
}

async function updateEmployee(id, { newId, name, age, email, dept, salary }) {
  const currentEmpId = parseInt(id);
  const targetId = (newId && !isNaN(parseInt(newId))) ? parseInt(newId) : currentEmpId;
  const ageVal = parseInt(age);
  const salaryVal = parseFloat(salary);

  if (isPgConnected) {
    try {
      const query = `
        UPDATE employees
        SET id = $1, name = $2, age = $3, email = $4, dept = $5, salary = $6
        WHERE id = $7
        RETURNING *
      `;
      const res = await pool.query(query, [targetId, name, ageVal, email, dept, salaryVal, currentEmpId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return { ...row, salary: parseFloat(row.salary), age: parseInt(row.age) };
    } catch (err) {
      console.error('Postgres error in updateEmployee:', err.message);
      if (err.code === '23505' && err.detail && err.detail.includes('Key (id)=')) {
        const customErr = new Error(`An employee with ID #${targetId} already exists.`);
        customErr.code = '23505';
        throw customErr;
      }
      throw err;
    }
  }

  const index = inMemoryStore.findIndex(e => e.id === currentEmpId);
  if (index === -1) return null;

  // Check email uniqueness among other records
  const existingEmail = inMemoryStore.find(e => e.email.toLowerCase() === email.toLowerCase() && e.id !== currentEmpId);
  if (existingEmail) {
    const error = new Error('An employee with this email already exists.');
    error.code = '23505';
    throw error;
  }

  // Check ID uniqueness if changing ID
  if (targetId !== currentEmpId) {
    const existingId = inMemoryStore.find(e => e.id === targetId && e.id !== currentEmpId);
    if (existingId) {
      const error = new Error(`An employee with ID #${targetId} already exists.`);
      error.code = '23505';
      throw error;
    }
  }

  inMemoryStore[index] = {
    ...inMemoryStore[index],
    id: targetId,
    name,
    age: ageVal,
    email,
    dept,
    salary: salaryVal
  };
  return inMemoryStore[index];
}

async function deleteEmployee(id) {
  const empId = parseInt(id);
  if (isPgConnected) {
    try {
      const res = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [empId]);
      return res.rows.length > 0;
    } catch (err) {
      console.error('Postgres error in deleteEmployee:', err.message);
      throw err;
    }
  }

  const index = inMemoryStore.findIndex(e => e.id === empId);
  if (index !== -1) {
    inMemoryStore.splice(index, 1);
    return true;
  }
  return false;
}

module.exports = {
  pool,
  initDb,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
