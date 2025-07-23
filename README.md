# 📘 PositLearn

**PositLearn** is a centralized **E-learning platform** designed to streamline learning content, support team-based access, and guide users through complex project setups. It includes features like **progress tracking**, **gamification**, and an **admin dashboard** for content management.

---

## ✨ Features

* 📚 **Centralized learning content**
* 👥 **Team-based access & role management**
* 📈 **User progress tracking**
* 🏆 **Gamified learning experience**
* 🤖 **Quiz generation from YouTube videos**
* 🛠️ **Admin dashboard for managing modules & users**
* 🔐 **Secure authentication with Clerk**

---

## 🧩 Tech Stack

* 💻 **Frontend:** React + Ant Design
* ⚙️ **State Management:** Redux Toolkit, React Query
* 🚀 **Backend/API:** Express
* 🗃️ **Database:** PostgreSQL
* 🔐 **Authentication:** Clerk
* 🛠️ **ORM:** Prisma
* 📜 **Certificate Generation:** Blockchain-based using Solidity Smart Contracts and Ethers.js

---

## Libraries Used

| Library           | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| **React**         | Core library for building UI components.                                             |
| **Ant Design**    | UI component library for creating sleek, responsive designs.                         |
| **Redux Toolkit** | Simplifies Redux setup for state management.                                         |
| **React Query**   | Handles server state, data fetching, caching, and background updates.                |
| **Express**       | Backend framework for building RESTful APIs.                                         |
| **Prisma**        | ORM for PostgreSQL, simplifies database operations.                                  |
| **Clerk**         | Authentication & user management with support for social logins.                     |
| **Flask-CORS**    | Enables Cross-Origin Resource Sharing for Flask API.                               |
| **youtube-transcript-api**  | Fetches YouTube video transcripts for quiz generation.                               |
| **g4f**  | g4f is an open-source Python library that provides access to AI models for generating text.                             |
**googletrans**  | Handles translation for quiz content.                               |
| **Hardhat**       | Development environment for compiling, testing, and deploying smart contracts.       |
| **Ethers.js**     | JavaScript library for interacting with the Ethereum blockchain and smart contracts. |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Rohan-80800/PositLearn.git
```

### 2. Install Dependencies (Frontend & Backend)

Navigate to the `app` folder and install dependencies for both frontend and backend:

```bash
cd app
yarn install
```

> This uses **`concurrently`** to install all project dependencies.

---

## Prisma Setup

Navigate to `backend/prisma` to manage your schema and database:

### Generate Prisma Client

```bash
cd backend/prisma
yarn prisma generate
```

### Push Schema Changes to Database

```bash
yarn prisma db push
```

### Launch Prisma Studio

```bash
cd backend
yarn prisma studio
```

---

## Running the App

You can run the app in two ways — start both frontend and backend together, or run them individually.

### Run Both Frontend and Backend

```bash
cd app
yarn dev
```

### Run Frontend

```bash
cd app/frontend
yarn dev
```

### Run Backend

```bash
cd app/backend
yarn server
```
### Run Flask Backend

```bash
cd app/backend/pyhton
python app.py
```

---

## Code Quality

Run linting in the frontend to catch and fix style or syntax issues:

```bash
cd front
yarn lint
```

---

## Environment Variables

Create two separate `.env` files — one for the frontend and one for the backend — and place them in the appropriate folders:

---

### Frontend (`/app/front/.env`)

```env
# Clerk Publishable Key
PUBLISH_KEY=your_publish_key_here
VITE_CLERK_PUBLISHABLE_KEY="API_Key"

# Format for VITE_SERVER_URL - `http://localhost:3000/`
VITE_SERVER_URL=""

# YouTube API Key
VITE_Youtube_API="Youtube_API_Key"

# Contract Address
VITE_contractAddress="Deployed Contract Address"

# RPC URL
VITE_RPC_URL="RPC URL"

# Wallet Address
VITE_walletAddress="Account Address"

# Wallet Private Key
VITE_privateKey="Account Private Key"

```

### Backend (`/app/backend/.env`)

```env
# Format for DATABASE_URL - `postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>?schema=public`
DATABASE_URL=""

# GitHub OAuth Credentials
GITHUB_CLIENT_ID="your_github_client_id_here"
GITHUB_CLIENT_SECRET="your_github_client_secret_here"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Blockchain Configuration for Hardhat

# Account address for deployment
PRIVATE_KEY="Account for deployment"

# RPC URL for the blockchain network
RPC_URL="Blockchain RPC address"

# Flask Server URL
PYTHON_SERVER_URL="http://127.0.0.1:5000/"

# YouTube API Key
YOUTUBE_API_KEY="your_youtube_api_key"

```

---
