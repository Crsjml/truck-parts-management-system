# Tarlac Truck Parts - Management System

A full-stack enterprise-grade inventory, sales, and analytics platform built for Tarlac Truck Pitstop. This system provides a comprehensive administrative dashboard for managing logistics intelligence and wholesale spare parts, alongside a seamless public storefront for customer transactions.

## ⚡ Tech Stack

<details>
<summary><strong>Frontend Architecture</strong></summary>

- **React 18** – UI Component Library
- **Vite** – Next-generation Frontend Tooling
- **Tailwind CSS** – Utility-first Styling Framework (Custom Premium HSL Palette)
- **Phosphor Icons** – Professional Iconography
- **jsPDF** – Client-side dynamic PDF invoice generation

</details>

<details>
<summary><strong>Backend Architecture</strong></summary>

- **Node.js (v20)** – High-performance JS Runtime
- **Express.js** – Robust HTTP Server & Routing
- **MongoDB Atlas** – Managed Cloud NoSQL Database
- **Mongoose** – Object Data Modeling (ODM)
- **JSON Web Tokens (JWT)** – Secure Stateless Authentication

</details>

---

## 🐳 Quick Start (Docker)

1. **Setup Credentials**  
   Copy the environment template and configure your MongoDB connection string and secrets:
   ```bash
   cp atlas-credentials.env.example atlas-credentials.env
   ```

2. **Launch Services**  
   From the project root, build and start the orchestrated containers:
   ```bash
   docker compose up -d --build
   ```

3. **Access the Application**  
   - **Frontend UI:** `http://localhost:5173`
   - **Backend API:** `http://localhost:3001` (mapped to internal port `5000`)

---

## ⚙️ Local Development (Native)

If you prefer to run the services directly on your host machine without Docker orchestration:

```bash
# Execute the convenience startup script from the project root
./start-all.sh
```

> **Note:** The backend implements dynamic port selection and will intelligently fall back to `5001`, `5002`, etc., if port `5000` is currently occupied.

---

<p align="center">
  <i>Developed for academic and professional demonstration.</i>
</p>
