# 🛒 Zamazon

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)

Zamazon is a modern, enterprise-grade e-commerce platform built on the MERN stack. While it features a seamless shopping experience, robust cart management, and an intuitive Admin dashboard, **the core of this application was engineered with a security-first mindset.**

---

## 🛡️ The Digital Fortress (Security Architecture)

A significant portion of development was dedicated to fortifying the application against modern web vulnerabilities. 

* **Zero-Knowledge Storage:** Passwords never touch the database in plain text. A Mongoose `pre-save` hook intercepts, salts, and heavily hashes passwords using `bcryptjs` before committing to MongoDB.
* **Dual-Key JWT & Redis System:** Implemented a highly sophisticated session management architecture. Short-lived (15-minute) Access Tokens minimize hijacking blast-radius, while 7-day Refresh Tokens are securely stored server-side in an in-memory **Redis** database. This grants absolute control to instantly revoke access upon suspicious activity or logout.
* **The Invisible Shield (XSS & CSRF Protection):** JWTs are delivered exclusively via `HTTP-Only` cookies, rendering them completely invisible to client-side JavaScript (neutralizing XSS attacks). Strict `sameSite` policies and `secure` flags ensure keys only travel over encrypted channels and prevent Cross-Site Request Forgery (CSRF).
* **Custom RBAC Middleware:** Relentless security checkpoints (`protectRoute` and `adminRoute`) intercept requests, verify cryptographic signatures, and enforce strict Role-Based Access Control before allowing interaction with protected API endpoints.
* **Payload Defenses & Strict CORS:** Defended against payload Denial of Service (DoS) attacks with a strict 5MB limit on incoming JSON payloads, alongside explicit CORS policies (`credentials: true`) to ensure the API only communicates with designated frontend origins.

---

## ✨ Application Features

### 👤 User Experience
* **Shopping Cart:** Persistent cart state, dynamic total calculation, and quantity management utilizing global state management (`zustand`).
* **Coupons & Discounts:** Secure application of gift coupons during the checkout flow.
* **Secure Checkout:** Fully integrated with Stripe for safe, reliable, and compliant payment processing.
* **Responsive UI:** A beautifully designed, mobile-friendly interface built from the ground up with Tailwind CSS.

### 💼 Admin & Store Management
* **Admin Dashboard:** Dedicated, protected view for users with administrative privileges.
* **Product Management:** Full CRUD capabilities for products. Images are uploaded and optimized securely via Cloudinary.
* **Analytics Hub:** Track sales performance, revenue metrics, and user growth through an interactive data tab.
* **Featured Products:** Pin selected items to feature dynamically on the homepage.

---

## 🛠️ Tech Stack

### Frontend
* **React 18** (Bootstrapped with Vite)
* **Tailwind CSS v4** for rapid, responsive styling
* **Axios** with interceptors for reliable API communication
* **Zustand** for lightweight, scalable global state management
* **React Router Dom** for client-side routing

### Backend
* **Node.js & Express.js (v5)**
* **MongoDB & Mongoose** for NoSQL database management
* **Redis** for token caching, session optimization, and high-speed data retrieval
* **Stripe API** for secure payment processing
* **Cloudinary** for highly-available image storage

---

## 📂 Project Structure

This project is configured as a **Monorepo**. The root directory serves as the backend, and the React application is housed inside the `frontend/` directory.

```text
Zamazon/
├── backend/
│   ├── controllers/      # Route logic (auth, cart, products, etc.)
│   ├── lib/              # DB configs, Cloudinary, Redis, Stripe setup
│   ├── middleware/       # Protected routes & authentication checks
│   ├── models/           # Mongoose schemas (User, Product, Order, Coupon)
│   ├── routes/           # Express API endpoints
│   └── server.js         # Entry point for backend server
├── frontend/
│   ├── public/           # Static assets (images, icons)
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # Axios config, utility functions
│   │   ├── pages/        # Main views (Home, Login, Admin, Cart, Checkout)
│   │   └── stores/       # Global state slices (useCartStore, etc.)
│   ├── package.json
│   └── vite.config.js
├── package.json          # Root package config & build scripts
└── README.md
```
---

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* MongoDB (Local or Atlas URL)
* Redis (Local or Upstash URL)
* A Stripe account
* A Cloudinary account

### 1. Clone the Repository

```bash
git clone https://github.com/bharath-akurathi/Zamazon.git
cd Zamazon
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

(You can also use `npm run build` from the root to install and build everything automatically).

### 3. Environment Variables

Create a `.env` file in the root of your project and configure the following variables:

```bash
# Application
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Caching
MONGO_URI=your_mongodb_connection_string
UPSTASH_REDIS_URL=your_redis_connection_url

# Security
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Stripe
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Run the Application

#### Backend (Development)

```bash
npm run dev
```

#### Frontend (Development)

Open a new terminal and run:

```bash
cd frontend
npm run dev
```
Your frontend should now be running on `http://localhost:5173` and communicating with the backend on `http://localhost:3000`.

---

## 🚢 Deployment Configuration (Monorepo)

The application is structured for easy deployment on platforms like Render or Vercel.

Ensure the root `package.json` build script includes `--include=dev` to prevent Vite build failures in strict production environments:

```json
"build": "npm install && npm install --include=dev --prefix frontend && npm run build --prefix frontend"
```

The Express server acts as a web server to deliver the compiled Vite frontend statically in production via a wildcard route. Ensure `NODE_ENV=production` is set in your hosting provider's environment variables.

---

## 📝 License

This project is licensed under the MIT License.