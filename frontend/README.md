# 🚀 PaySplit 

> **One virtual card. Split any online payment across multiple real cards — automatically.**

🌐 Live: https://www.paysplit.in

---

## 💡 Overview

PaySplit solves a fundamental limitation in online payments:

👉 **You cannot split a single transaction across multiple cards at checkout.**

We built a system that lets users:
- Use **one virtual card**
- Link **multiple real cards**
- Automatically split payments (e.g., 60% / 40%)

All while the merchant sees **only one transaction**.

---

## 🚨 The Problem

Online checkout systems are rigid:
- Only **one card per transaction**
- Users must manually manage balances
- Failed payments due to insufficient funds
- No native support for split payments

💥 **Example:**

You have:
- $8 on Visa
- $10 on Mastercard

Your order = $14
→ Payment fails or becomes inconvenient

---

## ✅ Our Solution

PaySplit introduces a **virtual card abstraction layer**:

1. User gets a **PaySplit virtual card**
2. Links multiple real cards inside the app
3. Defines split rules (e.g., 60/40)
4. Uses PaySplit card anywhere online
5. Backend automatically splits and processes payment

---

## ⚙️ How It Works

```
User → PaySplit Virtual Card → Stripe Issuing
                                      ↓
                             Webhook Trigger
                                      ↓
                          Split Engine (Backend)
                                      ↓
                  Charges Distributed Across Real Cards
```

### 🔄 Flow

1. User pays using PaySplit virtual card
2. Stripe triggers webhook (`/api/webhook/stripe/issuing`)
3. Backend fetches user split configuration
4. Payment is divided across linked cards (via Plaid ACH)
5. Transaction logged with fraud score

---

## 🧠 Core Features

- ✅ Virtual card provisioning (Stripe Issuing)
- ✅ Multi-card payment splitting
- ✅ Google OAuth authentication
- ✅ Bank linking (Plaid)
- ✅ Real-time fraud detection (XGBoost)
- ✅ Chrome Extension for checkout integration
- ✅ Analytics dashboard
- ✅ Webhook-based split engine
- ✅ Full AWS deployment (ECS Fargate)
- ✅ CI/CD with GitHub Actions

---

## 🏗️ Tech Stack

### Backend
- Python 3.11 + FastAPI
- Stripe Issuing (virtual cards)
- Plaid (bank linking & ACH)
- SQLAlchemy + SQLite *(PostgreSQL in progress)*
- XGBoost (fraud detection, sub-50ms inference)
- JWT Authentication
- Pydantic validation

### Frontend
- React + Vite + TypeScript
- Tailwind CSS
- Google OAuth
- Stripe Elements
- Chrome Extension (Manifest v3)

### Infrastructure
- AWS ECS Fargate (containerized services)
- AWS ECR (Docker registry)
- AWS ALB (routing & HTTPS)
- AWS ACM (SSL certificates)
- Docker (nginx + backend services)
- GitHub Actions (CI/CD pipeline)
- GoDaddy (domain management)

---

## 🧱 Architecture

```
User
 │
 ▼
https://www.paysplit.in
 │
 ▼
AWS ALB (HTTPS)
 │                  │
 │  /api/*          │  /*
 ▼                  ▼
Backend          Frontend
(FastAPI)        (React + nginx)
 │
 ├── Stripe Issuing (virtual cards)
 ├── Plaid (bank + ACH)
 ├── Fraud Model (XGBoost)
 └── Split Engine (webhooks)
```

---

## 🛠️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker
- Stripe CLI

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Environment Variables

**Backend**
```
STRIPE_SECRET_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
SECRET_KEY=
FRONTEND_URL=
CORS_ORIGINS=
```

**Frontend**
```
VITE_GOOGLE_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_API_BASE_URL=
```

---

## 🔄 CI/CD Pipeline

Every push to `main` triggers:

1. ✅ Tests (backend + frontend)
2. 🐳 Docker build (multi-arch)
3. 📦 Push to AWS ECR
4. 🚀 Deploy to ECS Fargate

---

## 📦 Repository Structure

```
PaySplit.AI/
├── backend/
│   ├── routes/
│   ├── main.py
│   └── services/
├── frontend/
│   ├── src/
│   └── components/
├── ml/
│   └── models/
├── .github/workflows/
└── docker-compose.yml
```

---

## ⚠️ Known Limitations

| Issue | Status |
|-------|--------|
| SQLite not production-ready | 🔄 Moving to PostgreSQL |
| Stripe live mode | ⏳ Pending approval |
| Real ACH execution | 🔄 In progress |
| Split persistence issues | 🔄 Fix with RDS |

---

## 👥 Team

### 🤝 Collaborative Build

We built PaySplit as a highly collaborative team — contributing across frontend, backend, payments, AI/ML, and infrastructure.  
Each member owned key areas while actively supporting and contributing to each other’s work to deliver the product end-to-end.

---

- **Anuroop Jajoba** — Co-Founder, Full Stack & AI/ML  
  - Built and shipped features across frontend and backend  
  - Designed and implemented real-time fraud detection using XGBoost  
  - Contributed to payment workflows, system architecture, and API design  
  - Led product UX and checkout flow optimization  

- **Raju Kotturi** — Co-Founder, Backend, Systems & AI  
  - Architected backend systems and scalable APIs using FastAPI  
  - Built core transaction logic and webhook-based split engine  
  - Contributed to AI-driven decisioning and system design  
  - Collaborated across full stack and infrastructure development  

- **Rishikesh Velpula** — Co-Founder, Full Stack, Payments & Infrastructure  
  - Built and shipped features across frontend and backend  
  - Led integration of Stripe Issuing and Plaid for payment workflows  
  - Designed and deployed AWS infrastructure (ECS, ALB, ECR) and CI/CD  
  - Contributed to system architecture, APIs, and end-to-end delivery  

---

## 📜 License

Private — All rights reserved © 2026 PaySplit AI