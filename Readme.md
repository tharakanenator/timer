# Pomo.Material v2 🎯

A sleek, minimalist, cloud-synced Pomodoro focus engine built with React, Tailwind CSS, and Upstash Redis. Designed to track deep-work blocks seamlessly across multiple devices with a secure token-gate authorization system.

---

## ✨ Features

* **Task-Aware Focus Engine:** Link specific tasks directly to your countdown timer to maintain zero-in visibility on active objectives.
* **Dynamic Metadata Classification:** Define your own workflow buckets directly through the UI dashboard (e.g., `Project`, `Firm Initiative`, `Personal`). Targets map dynamically to your custom categories alongside explicit calendar due dates.
* **Cross-Device Cloud Sync:** Powered by Upstash Redis to securely save active decks and completed archives across mobile and desktop browsers instantly.
* **Token-Gate Authentication:** Protects your personal productivity datasets and metrics behind an encrypted master passcode layer.
* **Audit Logging:** Automatic high-fidelity timestamping captures precise dates and times for both target initialization and task completion.
* **Gamified Rewards:** Integrated with interactive reward animations and milestone tracking components to build streak consistency.

---

## 🛠️ Architecture & Tech Stack

* **Frontend UI:** React 19 + Vite (Modern SPA Framework)
* **Styling Architecture:** Tailwind CSS + Lucide React Icons (Dark-theme Material Aesthetics)
* **Backend Middleware:** Vercel Serverless Edge Functions
* **Database Infrastructure:** Upstash Redis (Durable Key-Value Cloud Storage)

---

## 🚀 Environment Setup & Deployment

To run this application or deploy your own clone via Vercel, you must configure your cloud environment variables.

### 1. Database Provisioning
1. Navigate to your **Vercel Project Dashboard**.
2. Go to the **Storage** tab and provision a new **Upstash Redis** database instance.
3. Link the database to your project. Vercel will automatically inject the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` configurations securely.

### 2. Encryption Gate Configuration
1. In your Vercel project, go to **Settings** ➡️ **Environment Variables**.
2. Add a new secret variable with the following configurations (Ensure **Production**, **Preview**, and **Development** targets are checked):
   * **Key:** `APP_SECRET_PASSCODE`
   * **Value:** `YourCustomSecretPasscode`

---

## 📂 Repository File Blueprint

```text
├── api/
│   └── sync.js           # Serverless API endpoint controlling DB transactions & Auth Checks
├── src/
│   ├── App.jsx           # Core application layer, state engines, and UI layouts
│   └── main.jsx          # React SPA mounting point
├── package.json          # Dependency logs and compilation scripts
└── README.md             # Project documentation