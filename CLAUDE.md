# Tarlac Truck Pitstop (TTP) - System Guidelines

These are the synced instructions for AI agents (Antigravity & Claude Code) and human developers working on this repository.

## 🏗️ Project Architecture
- **Frontend**: React + Vite (Port 5173). API requests use relative paths (`/api/*`) which Vite proxies to the backend automatically.
- **Backend**: Express.js + Mongoose (Port 5000 internally). 
- **Database**: MongoDB 7.
- **Orchestration**: Docker Compose.

## 🚀 Running the Project
The startup scripts automatically stop existing servers and handle backgrounding Mongo for a clean terminal.
- **Mac/Linux**: Use `make up` to start, `make down` to stop.
- **Windows**: Use `.\run.bat` to start, `docker-compose down` to stop.

## 📝 Commit & Jira Guidelines
We use the **GitHub for Jira** integration.
**CRITICAL**: Every commit message MUST contain the Jira ticket ID (e.g., `TTP-1`, `TTP-25`) to automatically link code to Atlassian Jira.
- ✅ Correct: `feat(TTP-12): implemented purchasing module`
- ✅ Correct: `fix(TTP-8): resolved docker port conflict`
- ❌ Incorrect: `feat(sprint-2): added purchasing` (Missing TTP ticket ID!)

## 🛠️ Code Style & Rules
- **No Hardcoded URLs**: Do NOT hardcode backend URLs (`http://localhost:5000`) in the frontend. Always use relative paths (`/api/health`) because Vite proxies it natively.
- **Clean Terminals**: Keep terminal logs clean. We suppress Mongo/Mongoose warnings by default in our compose file.
- **Premium UI/UX System**:
  - **Color Harmony**: Avoid default raw HTML colors. Use curated HSL palettes. For accents, use glowing drop shadows (e.g., `box-shadow` or `ring` classes with 10-20% opacity).
  - **Glassmorphism & Depth**: Favor translucent overlays over solid panels. Combine `rgba` backgrounds with `backdrop-filter: blur()`, subtle white borders, and heavy soft shadows (`box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15)`) to create depth.
  - **Micro-Interactions**: All interactive elements must feel alive. Use cubic-bezier transitions (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`). Implement scale-ups (`scale: 1.02`), group-hover effects, and icon nudges.
  - **Animations**: Components should gracefully enter the screen using keyframe animations like `fadeIn` and `scaleUp`.
  - **Icons**: Standardize on `lucide-react` for clean, modern vector icons.
