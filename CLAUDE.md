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

### Installing ECC with Antigravity Target
To install Everything Claude Code (ECC) skills specifically for Antigravity, use the following scripts:

```bash
# Install ECC with Antigravity target
./install.sh --target antigravity typescript

# Or with multiple language modules
./install.sh --target antigravity typescript python go
```

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

## General Principles
- Generate concise, short solutions for new modules or code.
- Watch for over-engineering, oversized files needing refactor.
- Watch for weird syntax/style mismatching rest of codebase.
- Watch for obvious bugs.
- Prioritize concise, precise code and docs changes.
- No emojis or special characters in comments.
- Write activity-log.md in /docs to refer back if confused.
- Make to-do list, run major changes by user first.
- Review existing files before refactor or change.
- Markdown files use kebab naming (ex. some-description-changes.md).
- Don't auto-commit activity logs and docs.
- Comments: one-liner, one sentence.
- **Shared session log**: `docs/agent-session.md` — read on start to see what the other agent did, append when you finish a task.

## Code Quality
- Right data structures and algorithms for problem.
- Don't expose data needlessly (least privilege).
- No external libraries unless absolutely necessary.
- Use project dependency file for correct versions.
- Avoid redundancy unless improves usability.

## Version Control
- Commit after significant changes, clear messages.
- Keep commits focused, atomic.
- No auto-push any branch.

## AI Restrictions
- No customer personal data - names, contacts, account numbers, transactions (unless approved exemption).
- No credentials - passwords, API keys, tokens, connection strings.

## Active Implementation Tasks

### 1. CRITICAL: Fix auto-login bypass (does not create real Supabase session)
**File:** `frontend/src/App.jsx:330`
**Problem:** `handleAutoCustomerLogin` sets React state (`setSupabaseUser(mockUser)`) but never calls `supabase.auth.signInWithPassword()`. No real Supabase session exists in browser storage. Checkout sends `Authorization: Bearer undefined` and gets 401.
**Fix:** Replace mock bypass with real Supabase sign-in:
```javascript
const handleAutoCustomerLogin = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'lionel.messi@example.com',
      password: 'Password123!',
    });
    if (error) throw error;
    setActiveView('storefront');
    showToast('Logged in as Lionel Messi', 'success');
  } catch (err) {
    showToast(`Auto-login failed: ${err.message}`, 'error');
  }
};
```
The existing `onAuthStateChange` listener in `App.jsx:135` will automatically set `supabaseUser`/`isSignedIn` when the session changes.

### 2. Guard against missing session.url before redirect
**File:** `frontend/src/components/CustomerStorefront.jsx:158-160`
**Problem:** If API returns error/401, `session.url` is undefined and `window.location.href = undefined` navigates to `/undefined`, causing a page reload + logout.
**Fix:** Add guard before redirect:
```javascript
const session = await response.json();
if (session.error) throw new Error(session.error);
if (!session.url) throw new Error('Server returned no checkout URL');
window.location.href = session.url;
```

### 3. Better error messaging on checkout failure
**File:** `frontend/src/components/CustomerStorefront.jsx` catch block
**Fix:** Differentiate auth failures from other errors:
```javascript
catch (error) {
  console.error('Checkout error:', error);
  if (error.message?.includes('No checkout URL') || error.message?.includes('Failed')) {
    alert('Checkout service error. Please try again.');
  } else {
    alert('Session expired. Please log in again.');
  }
  setIsCheckingOut(false);
}
```

### Deferred (post-commit, not blocking)
- Extract `PartFormModal`, `PartDetailModal`, `InquiryModal` from `PartsCatalog.jsx` (1000 lines)
- Extract `StorefrontHeader`, `StorefrontHero`, `ProductDetailPanel` from `CustomerStorefront.jsx` (834 lines)
- Replace emoji `⚠` with icon component in `PartsCatalog.jsx:742`
- Validate Stripe API keys at startup instead of hardcoded fallbacks
