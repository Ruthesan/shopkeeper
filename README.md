# ShopKeeper 🏪

A full-stack **multi-tenant SaaS** inventory and sales management system for small Nigerian shop owners — with a live AI business analyst powered by Claude.

Every trader gets their own private account. Data is fully isolated per shop.

---

## What's new in v2

- **Full SaaS auth** — register/login with JWT, each shop sees only their own data
- **CSV bulk import** — paste your spreadsheet into a `.csv` and upload it in one click
- **Shop profile** — shop name, owner name, city stored at registration
- **Secure** — bcrypt passwords, 7-day JWT sessions, all routes protected

---

## Features

| Feature | Description |
|---|---|
| Auth | Register shop + login, JWT tokens, bcrypt passwords |
| Products | Add, edit, delete, search, restock |
| CSV Import | Bulk-load products from a spreadsheet; template downloadable in-app |
| Record Sales | Log sales, auto-decrement stock, auto-fill price |
| Low-Stock Alerts | Auto-fires on every sale when stock hits reorder threshold |
| Dashboard | Revenue chart, summary stats, active alerts |
| Analytics | Revenue + units charts (7/14/30d), top 5 sellers |
| Stockout Forecast | Days-until-stockout per product from 30-day velocity |
| AI Chat | Floating widget — ask questions in plain English, Claude answers with your live data |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Recharts |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| Infra | Docker + Docker Compose + GitHub Actions |

---

## Quick Start

### 1. Clone and configure

```bash
git clone <your-repo>
cd shopkeeper

cp backend/.env.example backend/.env
# Edit backend/.env — set ANTHROPIC_API_KEY and a strong SECRET_KEY
```

### 2. Run with Docker Compose

```bash
ANTHROPIC_API_KEY=sk-ant-... SECRET_KEY=your-secret docker compose up --build
```

- **App:** http://localhost:3000
- **API docs:** http://localhost:8000/docs

### 3. Local development (no Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in values
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install && npm run dev
# http://localhost:5173 — proxies /api → localhost:8000
```

---

## CSV Import Format

Download the template from the Products page, or use this format:

```csv
name,sku,category,unit_price,cost_price,stock_qty,reorder_threshold
Indomie Chicken 70g,IND-CHK-70,Noodles,150,90,200,30
Peak Milk Powder 400g,PKM-400,Dairy,2800,2000,50,10
```

**Required:** `name`, `unit_price`
**Optional:** `sku`, `category`, `cost_price`, `stock_qty` (defaults 0), `reorder_threshold` (defaults 10)

The importer handles Excel-exported CSVs (BOM, latin-1 encoding) automatically.

---

## Project Structure

```
shopkeeper/
├── backend/
│   ├── main.py             # FastAPI app
│   ├── database.py         # SQLAlchemy engine
│   ├── models.py           # Shop, User, Product, Sale, StockMovement, Alert
│   ├── schemas.py          # Pydantic schemas
│   ├── auth.py             # JWT + bcrypt utilities, get_current_user dep
│   └── routers/
│       ├── auth.py         # /register, /login, /me
│       ├── products.py     # CRUD + restock + CSV import
│       ├── sales.py        # Record sale + alert trigger
│       ├── alerts.py       # List + resolve
│       ├── analytics.py    # Summary, charts, top sellers, stockout
│       └── ai_chat.py      # Claude integration
│
├── frontend/
│   └── src/
│       ├── context/AuthContext.tsx   # JWT auth state + provider
│       ├── pages/AuthPage.tsx        # Login + Register (tabbed)
│       ├── pages/Products.tsx        # + CSV import modal + search
│       └── ... (all other pages unchanged)
│
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Environment Variables

```env
# backend/.env
DATABASE_URL=postgresql://shopkeeper:shopkeeper@localhost:5432/shopkeeper_db
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=a-long-random-string-at-least-32-chars
```

---

## API Endpoints

### Auth (public)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account + shop |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Current user info |

### All other endpoints require `Authorization: Bearer <token>`
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/products/` | List / create |
| POST | `/api/products/import/csv` | Bulk import from CSV |
| POST | `/api/products/{id}/restock` | Add stock |
| GET/POST | `/api/sales/` | List / record |
| GET | `/api/alerts/` | Active alerts |
| GET | `/api/analytics/summary` | Dashboard stats |
| GET | `/api/analytics/revenue-chart` | Daily revenue |
| GET | `/api/analytics/top-sellers` | Top 5 (30d) |
| GET | `/api/analytics/stockout-forecast` | Days until stockout |
| POST | `/api/chat/` | Ask AI a question |
