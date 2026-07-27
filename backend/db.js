const { Pool, Client } = require('pg');
require('dotenv').config();

// PostgreSQL connection config
const dbHost = process.env.PGHOST || 'localhost';
const dbPort = parseInt(process.env.PGPORT || '5432');
const dbUser = process.env.PGUSER || 'postgres';
const dbPassword = process.env.PGPASSWORD || 'postgres';
const dbName = process.env.PGDATABASE || 'emp_db';

let pool;

if (process.env.DATABASE_URL) {
  // Production (Render + Neon)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Local PostgreSQL
  pool = new Pool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    connectionTimeoutMillis: 3000
  });
}

// Initial dataset with clean sequential IDs 1, 2, 3, 4, 5...
let inMemoryStore = [
  { id: 1, name: 'Alice Johnson', age: 28, gender: 'Female', email: 'alice.johnson@techcorp.com', dept: 'Engineering', salary: 85000, created_at: new Date('2026-01-15') },
  { id: 2, name: 'Bob Smith', age: 34, gender: 'Male', email: 'bob.smith@techcorp.com', dept: 'Marketing', salary: 65000, created_at: new Date('2026-02-01') },
  { id: 3, name: 'Charlie Davis', age: 41, gender: 'Male', email: 'charlie.davis@techcorp.com', dept: 'Human Resources', salary: 72000, created_at: new Date('2026-02-10') },
  { id: 4, name: 'Diana Prince', age: 29, gender: 'Female', email: 'diana.prince@techcorp.com', dept: 'Engineering', salary: 92000, created_at: new Date('2026-03-05') },
  { id: 5, name: 'Ethan Hunt', age: 38, gender: 'Male', email: 'ethan.hunt@techcorp.com', dept: 'Finance', salary: 88000, created_at: new Date('2026-03-20') }
];
let isPgConnected = false;

// Initial DB setup query
const createTableQuery = `
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(20) DEFAULT 'Male',
  email VARCHAR(150) UNIQUE NOT NULL,
  dept VARCHAR(100) NOT NULL,
  salary NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const seedData = [
  ['Alice Johnson', 28, 'Female', 'alice.johnson@techcorp.com', 'Engineering', 85000],
  ['Bob Smith', 34, 'Male', 'bob.smith@techcorp.com', 'Marketing', 65000],
  ['Charlie Davis', 41, 'Male', 'charlie.davis@techcorp.com', 'Human Resources', 72000],
  ['Diana Prince', 29, 'Female', 'diana.prince@techcorp.com', 'Engineering', 92000],
  ['Ethan Hunt', 38, 'Male', 'ethan.hunt@techcorp.com', 'Finance', 88000]
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
    await rootClient.end().catch(() => { });
    return false;
  }
}

async function initDb() {
  try {
    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      if (
        !process.env.DATABASE_URL &&
        (connErr.code === '3D000' || connErr.message.includes('does not exist'))
      ) {
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
    
    // Add gender column if it doesn't exist yet in existing table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='gender') THEN
          ALTER TABLE employees ADD COLUMN gender VARCHAR(20) DEFAULT 'Male';
        END IF;
      END $$;
    `);

    const countRes = await client.query('SELECT COUNT(*) FROM employees');
    if (parseInt(countRes.rows[0].count) === 0) {
      console.log('Seeding initial employee dataset into PostgreSQL...');
      for (const emp of seedData) {
        await client.query(
          'INSERT INTO employees (name, age, gender, email, dept, salary) VALUES ($1, $2, $3, $4, $5, $6)',
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
async function getEmployees({
  page = 1,
  limit = 5,
  search = '',
  dept = '',
  gender = '',
  minAge = null,
  maxAge = null,
  minSalary = null,
  maxSalary = null,
  sortBy = 'id',
  sortDir = 'asc'
}) {
  const offset = (page - 1) * limit;

  if (isPgConnected) {
    try {
      let conditions = [];
      let params = [];

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(dept) LIKE $${params.length})`);
      }

      if (dept) {
        params.push(dept.toLowerCase());
        conditions.push(`LOWER(dept) = $${params.length}`);
      }

      if (gender) {
        params.push(gender.toLowerCase());
        conditions.push(`LOWER(gender) = $${params.length}`);
      }

      if (minAge != null && !isNaN(minAge)) {
        params.push(parseInt(minAge));
        conditions.push(`age >= $${params.length}`);
      }

      if (maxAge != null && !isNaN(maxAge)) {
        params.push(parseInt(maxAge));
        conditions.push(`age <= $${params.length}`);
      }

      if (minSalary != null && !isNaN(minSalary)) {
        params.push(parseFloat(minSalary));
        conditions.push(`salary >= $${params.length}`);
      }

      if (maxSalary != null && !isNaN(maxSalary)) {
        params.push(parseFloat(maxSalary));
        conditions.push(`salary <= $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

      // Total matching records
      const countQuery = `SELECT COUNT(*) FROM employees${whereClause}`;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Summary statistics across matching records
      const statsQuery = `
        SELECT 
          AVG(salary) as avg_salary,
          MIN(salary) as min_salary,
          MAX(salary) as max_salary
        FROM employees${whereClause}
      `;
      const statsResult = await pool.query(statsQuery, params);
      const stats = statsResult.rows[0] || {};
      const avgSalary = stats.avg_salary ? parseFloat(stats.avg_salary) : 0;
      const minSalaryVal = stats.min_salary ? parseFloat(stats.min_salary) : 0;
      const maxSalaryVal = stats.max_salary ? parseFloat(stats.max_salary) : 0;

      // Top department in matching records
      const topDeptQuery = `
        SELECT dept, COUNT(*) as count 
        FROM employees${whereClause} 
        GROUP BY dept 
        ORDER BY count DESC 
        LIMIT 1
      `;
      const topDeptResult = await pool.query(topDeptQuery, params);
      const topDept = topDeptResult.rows[0] ? topDeptResult.rows[0].dept : 'N/A';

      // Sorting & Pagination
      const validSortFields = ['id', 'name', 'age', 'salary', 'dept', 'gender', 'created_at'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'id';
      const sortOrder = sortDir.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const dataParams = [...params, limit, offset];
      const dataQuery = `
        SELECT * FROM employees${whereClause}
        ORDER BY ${sortField} ${sortOrder}
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;

      const dataResult = await pool.query(dataQuery, dataParams);
      const employees = dataResult.rows.map(row => ({
        ...row,
        gender: row.gender || 'Male',
        salary: parseFloat(row.salary),
        age: parseInt(row.age)
      }));

      return {
        employees,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit) || 1,
        avgSalary,
        minSalary: minSalaryVal,
        maxSalary: maxSalaryVal,
        topDept
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

  if (dept) {
    filtered = filtered.filter(e => e.dept.toLowerCase() === dept.toLowerCase());
  }

  if (gender) {
    filtered = filtered.filter(e => (e.gender || 'Male').toLowerCase() === gender.toLowerCase());
  }

  if (minAge != null && !isNaN(minAge)) {
    filtered = filtered.filter(e => e.age >= parseInt(minAge));
  }

  if (maxAge != null && !isNaN(maxAge)) {
    filtered = filtered.filter(e => e.age <= parseInt(maxAge));
  }

  if (minSalary != null && !isNaN(minSalary)) {
    filtered = filtered.filter(e => e.salary >= parseFloat(minSalary));
  }

  if (maxSalary != null && !isNaN(maxSalary)) {
    filtered = filtered.filter(e => e.salary <= parseFloat(maxSalary));
  }

  // Summary stats
  const total = filtered.length;
  const totalSalarySum = filtered.reduce((sum, e) => sum + e.salary, 0);
  const avgSalary = total > 0 ? Math.round(totalSalarySum / total) : 0;
  const salaries = filtered.map(e => e.salary);
  const minSalaryVal = salaries.length > 0 ? Math.min(...salaries) : 0;
  const maxSalaryVal = salaries.length > 0 ? Math.max(...salaries) : 0;

  // Department counts
  const deptCounts = {};
  filtered.forEach(e => {
    deptCounts[e.dept] = (deptCounts[e.dept] || 0) + 1;
  });
  let topDept = 'N/A';
  let maxCount = 0;
  Object.keys(deptCounts).forEach(d => {
    if (deptCounts[d] > maxCount) {
      maxCount = deptCounts[d];
      topDept = d;
    }
  });

  // Sorting
  const sortMult = sortDir.toLowerCase() === 'desc' ? -1 : 1;
  filtered.sort((a, b) => {
    let valA = a[sortBy] ?? a.id;
    let valB = b[sortBy] ?? b.id;
    if (typeof valA === 'string') {
      return valA.localeCompare(valB) * sortMult;
    }
    return (valA - valB) * sortMult;
  });

  const paginated = filtered.slice(offset, offset + limit);

  return {
    employees: paginated,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit) || 1,
    avgSalary,
    minSalary: minSalaryVal,
    maxSalary: maxSalaryVal,
    topDept
  };
}

async function getEmployeeById(id) {
  const empId = parseInt(id);
  if (isPgConnected) {
    try {
      const res = await pool.query('SELECT * FROM employees WHERE id = $1', [empId]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return { ...row, gender: row.gender || 'Male', salary: parseFloat(row.salary), age: parseInt(row.age) };
      }
      return null;
    } catch (err) {
      console.error('Postgres error in getEmployeeById:', err.message);
    }
  }

  return inMemoryStore.find(e => e.id === empId) || null;
}

async function createEmployee({ id, name, age, gender = 'Male', email, dept, salary }) {
  const ageVal = parseInt(age);
  const salaryVal = parseFloat(salary);
  const genderVal = gender || 'Male';

  let targetId = id ? parseInt(id) : null;

  if (isPgConnected) {
    try {
      let query;
      let params;

      if (targetId && !isNaN(targetId)) {
        query = `
          INSERT INTO employees (id, name, age, gender, email, dept, salary)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        params = [targetId, name, ageVal, genderVal, email, dept, salaryVal];
      } else {
        query = `
          INSERT INTO employees (name, age, gender, email, dept, salary)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        params = [name, ageVal, genderVal, email, dept, salaryVal];
      }

      const res = await pool.query(query, params);
      const row = res.rows[0];
      return { ...row, gender: row.gender || genderVal, salary: parseFloat(row.salary), age: parseInt(row.age) };
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
    gender: genderVal,
    email,
    dept,
    salary: salaryVal,
    created_at: new Date()
  };
  inMemoryStore.push(newEmp);
  return newEmp;
}

async function updateEmployee(id, { newId, name, age, gender = 'Male', email, dept, salary }) {
  const currentEmpId = parseInt(id);
  const targetId = (newId && !isNaN(parseInt(newId))) ? parseInt(newId) : currentEmpId;
  const ageVal = parseInt(age);
  const salaryVal = parseFloat(salary);
  const genderVal = gender || 'Male';

  if (isPgConnected) {
    try {
      const query = `
        UPDATE employees
        SET id = $1, name = $2, age = $3, gender = $4, email = $5, dept = $6, salary = $7
        WHERE id = $8
        RETURNING *
      `;
      const res = await pool.query(query, [targetId, name, ageVal, genderVal, email, dept, salaryVal, currentEmpId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return { ...row, gender: row.gender || genderVal, salary: parseFloat(row.salary), age: parseInt(row.age) };
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
    gender: genderVal,
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
