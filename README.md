# 🚀 PaySplit.AI

> **One virtual card. Split any online payment across multiple real cards — automatically.**

🌐 Live: [https://www.paysplit.in](https://www.paysplit.in)

---

## 💡 Overview

PaySplit solves a fundamental limitation in online payments:

👉 **You cannot split a single transaction across multiple cards at checkout.**

We built a system that lets users:
- Use **one virtual card** at any online checkout
- Link **multiple real cards** inside the app
- Automatically split payments across them (e.g., 60% / 40%)

All while the merchant sees **only one transaction**.

---

## 🚨 The Problem

Online checkout systems are rigid:
- Only **one card per transaction**
- Users manually manage balances across cards
- Payments fail due to insufficient funds on a single card
- No native support for split payments anywhere

💥 **Example:**

You have:
- $8 on Visa
- $10 on Mastercard

Your order = $14  
→ Payment fails. PaySplit fixes this.

---

## ✅ Our Solution

PaySplit introduces a **virtual card abstraction layer**:

1. User receives a **PaySplit virtual card** (via Stripe Issuing)
2. Links multiple real cards inside the app (via Plaid)
3. Defines split rules (e.g., 60/40)
4. Uses the PaySplit card anywhere online
5. Backend intercepts the Stripe webhook and automatically splits the charge across linked cards

---

## ⚙️ How It Works

```
User → PaySplit Virtual Card → Stripe Issuing
                                      ↓
                             Issuing Webhook
                                      ↓
                          Split Engine (FastAPI)
                                      ↓
                  Charges Distributed Across Real Cards (Plaid ACH)
                                      ↓
                      Transaction logged + Fraud scored (XGBoost)
```

### 🔄 Payment Flow

1. User pays with their PaySplit virtual card at checkout
2. Stripe fires an Issuing webhook to `/api/webhook/stripe/issuing`
3. Split Engine fetches the user's stored split configuration
4. Payment is divided proportionally across linked cards via Plaid ACH
5. Transaction is written to the DB with a real-time XGBoost fraud score

---

## 🧠 Core Features

- ✅ Virtual card provisioning (Stripe Issuing)
- ✅ Webhook-driven automatic payment splitting
- ✅ Multi-card linking (Plaid bank + ACH)
- ✅ Real-time fraud detection (XGBoost, sub-50ms inference)
- ✅ Google OAuth authentication
- ✅ Chrome Extension for checkout integration
- ✅ Analytics dashboard + split transaction history
- ✅ Multi-person group splits
- ✅ PostgreSQL on AWS RDS
- ✅ Full AWS deployment (ECS Fargate + ALB + ACM)
- ✅ CI/CD with GitHub Actions

---

## 🏗️ Tech Stack

### Backend
- Python 3.11 + FastAPI
- Stripe Issuing (virtual card provisioning)
- Plaid (bank linking & ACH transfers)
- PostgreSQL on AWS RDS + SQLAlchemy + Alembic
- XGBoost (fraud detection, sub-50ms inference)
- Google OAuth + JWT authentication
- Pydantic v2 validation

### Frontend
- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Stripe Elements
- Chrome Extension (Manifest v3)

### Infrastructure
- AWS ECS Fargate (containerized backend + frontend services)
- AWS ECR (Docker image registry)
- AWS ALB (HTTPS routing + health checks)
- AWS ACM (SSL/TLS certificates)
- AWS RDS (PostgreSQL)
- Docker (nginx + Python 3.11 containers)
- GitHub Actions (CI/CD: test → build → ECR push → ECS deploy)
- GoDaddy (domain)

---

## 🧱 Architecture

```
User
 │
 ▼
https://www.paysplit.in
 │
 ▼
AWS ALB (HTTPS + SSL via ACM)
 │                        │
 │  /api/*                │  /*
 ▼                        ▼
Backend (FastAPI)     Frontend (React + nginx)
on ECS Fargate        on ECS Fargate
 │
 ├── Stripe Issuing  → virtual card provisioning
 ├── Stripe Webhook  → split engine trigger
 ├── Plaid ACH       → real card charges
 ├── XGBoost ML      → fraud scoring per transaction
 └── PostgreSQL RDS  → persistent split config + transaction log
```

---

## 🛠️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- Stripe CLI (for local webhook forwarding)

### Run with Docker Compose

```bash
docker-compose up --build
```

Frontend: `http://localhost:3000`  
Backend API: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### Backend (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload --port 8000
```

### Frontend (without Docker)

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

### Forward Stripe webhooks locally

```bash
stripe listen --forward-to localhost:8000/api/webhook/stripe/issuing
```

### Environment Variables

**Backend `.env`**
```
STRIPE_SECRET_KEY=sk_test_...
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
SECRET_KEY=
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost/paysplit
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

**Frontend `.env.local`**
```
VITE_GOOGLE_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🔄 CI/CD Pipeline

Every push to `main` automatically:

1. ✅ Runs backend tests (pytest) and builds frontend (npm ci + vite build)
2. 🐳 Builds multi-service Docker images (backend + frontend)
3. 📦 Pushes images to AWS ECR
4. 🚀 Updates ECS Fargate task definitions and triggers rolling deployment

Zero-downtime deploys — the ALB health check at `/health` gates traffic until new tasks are healthy.

---

## 📦 Repository Structure

```
PaySplit.AI/
├── backend/
│   ├── routes/          # FastAPI route handlers
│   ├── models/          # SQLAlchemy ORM models
│   ├── services/        # Business logic (settlements, auth, pipeline)
│   ├── alembic/         # Database migrations
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, SplitApp, VirtualCard, Analytics…
│   │   ├── components/  # UI components (shadcn/ui)
│   │   └── services/
│   └── Dockerfile
├── ml/
│   ├── fraud_xgb/       # XGBoost fraud model (train, evaluate, predict)
│   ├── fraud_tf/        # TensorFlow fraud model
│   ├── artifacts/       # Trained model files
│   └── pipeline/
├── .github/workflows/   # GitHub Actions CI/CD
└── docker-compose.yml
```

---

## ⚠️ Status & Roadmap

| Item | Status |
|------|--------|
| PostgreSQL on AWS RDS | ✅ Live |
| ECS Fargate deployment | ✅ Live |
| CI/CD pipeline | ✅ Live |
| Stripe sandbox mode | ✅ Working |
| Stripe live mode | ⏳ Pending Issuing approval |
| Real ACH execution via Plaid | 🔄 In progress |
| Fraud model v2 (better recall) | 🔄 In progress |

---

## 👥 Team

---

### Anuroop Jajoba — Co-Founder, Software Engineer & DevOps

- **Payment infrastructure:** Integrated Stripe Issuing (virtual card provisioning) and Plaid (bank linking + ACH), built the webhook-driven split engine that intercepts Stripe Issuing events and distributes charges across multiple real cards in real time
- **DevOps & infrastructure:** Containerized the full stack with Docker (nginx + Python 3.11), built the GitHub Actions CI/CD pipeline (test → Docker build → ECR push → ECS Fargate deploy), configured AWS ALB health checks and ECS task role, managed SSL via ACM
- **Database:** Migrated from SQLite to PostgreSQL on AWS RDS, wrote and chained Alembic migration versions, resolved schema type mismatches across the payment models
- **Auth & features:** Implemented Google OAuth with redirect URI handling and automatic DB migration for `google_id`, built Chrome Extension (Manifest v3), split transaction history API and model, Apple Wallet-style virtual card UI

---

### Raju Kotturi — Co-Founder, Backend & AI/ML

- **Fraud detection:** Designed and trained the XGBoost fraud detection pipeline with imbalanced class handling (scale_pos_weight), integrated model into FastAPI backend with sub-50ms inference at startup load
- **Frontend:** Built the core dashboard, analytics, payment, and split slider pages; implemented dark/light theme; designed blog and about pages
- **Backend:** Contributed to FastAPI API design, multi-person splits feature, and database schema

---

### Rishikesh Velpula — Co-Founder, Full Stack Engineer

- **Analytics & reporting:** Built the analytics and reporting API layer — transaction history aggregation, spend breakdown endpoints, and dashboard data APIs consumed by the React frontend
- **Backend:** Contributed to FastAPI route development, database schema design, and backend feature delivery across the payment and reporting surfaces
- **Frontend:** Contributed to frontend pages and UI components across the dashboard experience
- **Documentation & DX:** Authored the project README, maintained developer setup documentation, and kept the repository clean (removed local DB artifacts to prevent credential leaks)

---

## 📜 License

Private — All rights reserved © 2026 PaySplit AI