# Pomo.Material v3 🎯

A sleek, minimalist, multi-user Pomodoro focus engine built with React, Tailwind CSS, and Upstash Redis. This version features a secure cloud identity layer, letting multiple users register and manage independent, isolated task decks and custom categories on a single deployment.

---

## ✨ Features

* **Multi-User Cloud Isolation:** Secure registration and login gates powered by serverless cryptographic verification. Each user gets an independent data partition.
* **Task-Aware Focus Engine:** Link active task cards directly to your countdown timer to maintain zero-in visibility on your current objective.
* **Dynamic Taxonomy Customization:** Create, configure, and delete your own custom workflow buckets (e.g., `Project 101`, `Firm Initiative`, `Personal`) directly through the UI.
* **Cross-Device Session Sync:** Powered by Upstash Redis to securely persist active queues, completed task logs, and category profiles across mobile and desktop browsers.
* **Native Cryptographic Hashing:** Uses Node.js's native `crypto` library (PBKDF2) to securely salt and hash user credentials before they touch the cloud.
* **Zero-Dependency Auth Maintenance:** Eliminates heavy external npm compiled binaries (like native bcrypt) to ensure lightning-fast serverless execution on Vercel Edge infrastructure.

---

## 🛠️ Architecture & Tech Stack

* **Frontend UI:** React 19 + Vite (Modern SPA Framework)
* **Styling & Design:** Tailwind CSS + Lucide React Icons (Dark-theme Material Aesthetics)
* **Backend Framework:** Vercel Serverless Edge Functions
* **Database Layer:** Upstash Redis (Durable, Low-Latency Key-Value Cloud Storage)
* **Security Middleware:** Native Node.js `crypto` API (PBKDF2 Hashing Engine)

---

## 🗄️ Database Schema Key Mapping

Data structures are securely partitioned in Upstash Redis using the user's standardized username as a namespace boundary:

* `pomo_user:[username]` ➡️ Object containing the unique password hash and random cryptographic salt.
* `pomo_tasks:[username]` ➡️ Array containing active task objects (text, bucket selection, due date).
* `pomo_completed:[username]` ➡️ Array logging completed task metadata and completion timestamps.
* `pomo_buckets:[username]` ➡️ Array defining user-customized dropdown workflow categories.

---

## 🚀 Deployment & Environment Setup

To deploy this workspace instance, configure the following environmental parameters on your Vercel hosting platform:

### 1. Database Provisioning
1. Navigate to your **Vercel Project Dashboard**.
2. Go to the **Storage** tab and provision a new **Upstash Redis** database instance.
3. Link the database to your project. Vercel will automatically inject `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` variables.

### 2. Deployment
Commit the updated code directly to your `main` branch. Vercel will automatically run the build sequence, parse the Node native `crypto` layer, and expose your global application workspace live to your web URL.

---

## 📂 Repository File Blueprint

```text
├── api/
│   └── sync.js           # Multi-tenant API handling Registration, Login, and Cloud CRUD
├── src/
│   ├── App.jsx           # Monolithic Frontend layout, state engines, and UI views
│   └── main.jsx          # React SPA entry mounting point
├── package.json          # Dependency configurations and build scripts
└── README.md             # Project documentation