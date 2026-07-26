
# 👨‍💼 Employee Management System

A full-stack **Employee Management System** built with **Angular 22** on the frontend and **Node.js / Express** on the backend, backed by **PostgreSQL** — with a smart in-memory fallback when no database is available.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 22, TypeScript, RxJS |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (with in-memory fallback) |


---

## 📁 Project Structure

```
Emp management/
├── backend/               # Express REST API
│   ├── server.js          # API routes & middleware
│   ├── db.js              # PostgreSQL connection & CRUD logic
│   ├── .env               # Environment variables (not committed)
│   └── package.json
├── frontend/              # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # UI components (home, employee-list, etc.)
│   │   │   ├── models/        # TypeScript interfaces (Employee, PaginatedResponse)
│   │   │   ├── services/      # EmployeeService (HTTP client)
│   │   │   ├── app.routes.ts  # Angular routing
│   │   │   └── app.config.ts  # App configuration
│   │   ├── styles.css         # Global styles
│   │   └── main.ts
│   └── package.json
└── package.json           # Root scripts
```

---

## ✨ Features

- 📋 **List Employees** — Paginated table with 5 records per page
- 🔍 **Search** — Filter by name, email, or department in real-time
- ➕ **Add Employee** — Create a new employee record with full validation
- ✏️ **Edit Employee** — Update any employee details including their ID
- 🗑️ **Delete Employee** — Remove an employee with confirmation
- ⚡ **In-Memory Fallback** — Works even without a PostgreSQL connection
- ✅ **Validation** — Server-side input validation on all fields
- 🔁 **Auto-refresh** — Employee list updates without page reload

---

## 📦 Employee Data Model

```typescript
interface Employee {
  id?:         number;   // Optional custom ID
  name:        string;   // Full name
  age:         number;   // Must be 18–100
  email:       string;   // Must be unique
  dept:        string;   // Department
  salary:      number;   // Positive number
  created_at?: string;   // Auto-set by the database
}
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/employees?page=1&limit=5&search=` | Get paginated employees |
| `GET` | `/api/employees/:id` | Get single employee by ID |
| `POST` | `/api/employees` | Create new employee |
| `PUT` | `/api/employees/:id` | Update existing employee |
| `DELETE` | `/api/employees/:id` | Delete employee |

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) v9+
- [PostgreSQL](https://www.postgresql.org/) *(optional — app falls back to in-memory store)*
- [Angular CLI](https://angular.io/cli) v22+

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/employee-management.git
cd employee-management
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=emp_db
```

> 💡 If PostgreSQL is not available, the app automatically runs in **in-memory mode** with pre-seeded data — no extra setup needed!

Start the backend:

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The backend will run on **http://localhost:5000**

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm start
```

The Angular app will run on **http://localhost:4200**

---

### 4️⃣ Run Both Together (from root)

```bash
# Start backend
npm run start:backend

# Start frontend (in a separate terminal)
npm run start:frontend
```

---

## 🗃️ Database Details

- The backend **auto-creates** the `emp_db` database if it does not exist
- The `employees` table is **auto-created** on first run
- Initial **seed data** (5 employees) is inserted when the table is empty
- If PostgreSQL is **unreachable**, the app seamlessly switches to an **in-memory store**

### Schema

```sql
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100)    NOT NULL,
  age        INTEGER         NOT NULL,
  email      VARCHAR(150)    UNIQUE NOT NULL,
  dept       VARCHAR(100)    NOT NULL,
  salary     NUMERIC(12, 2)  NOT NULL,
  created_at TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ Validation Rules

| Field | Rule |
|-------|------|
| `name` | Required, non-empty string |
| `age` | Required, integer between **18 and 100** |
| `email` | Required, must contain `@`, must be **unique** |
| `dept` | Required, non-empty string |
| `salary` | Required, must be a **positive number** |
| `id` | Optional, must be a **positive integer** if provided |

---

## 🛠️ Available Scripts

### Root
| Script | Description |
|--------|-------------|
| `npm run start:backend` | Start the backend server |
| `npm run start:frontend` | Start the Angular dev server |
| `npm run build:frontend` | Build the Angular app for production |

### Backend (`/backend`)
| Script | Description |
|--------|-------------|
| `npm start` | Start with Node.js |
| `npm run dev` | Start with Nodemon (auto-restart) |

### Frontend (`/frontend`)
| Script | Description |
|--------|-------------|
| `npm start` | Start Angular dev server (`ng serve`) |
| `npm run build` | Build for production |
| `npm test` | Run unit tests with Vitest |

---

Output will be in `frontend/dist/`.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ using Angular and Express</p>
'@
