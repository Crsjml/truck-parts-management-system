# Auth Login/Register Restructure Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute tasks. Dispatch specialized agents per task. Steps use checkbox syntax.

**Goal:** Remove magic link tab, collapse reset into inline link, adopt official Google branded button, add profile-completion flow for Google signups missing contact number.

**Architecture:** 
- AuthPortal: 2 tabs (Login/Register), forgot password as inline link from Login tab
- New GoogleSignInButton component: official Google button (light/dark aware)
- New CompleteProfileModal: required for first-time Google signups without contact number
- App.jsx: detect empty phoneNumber, trigger complete-profile modal

**Tech Stack:** React 18, Tailwind CSS, Supabase Auth, Zod validation

## Global Constraints

- No new DB columns/migration needed (empty `phoneNumber` is the signal)
- Google button must follow official Google light/dark button spec
- CompleteProfileModal must be non-dismissable (force one-time completion)
- Contact number validation: reuse `registerSchema.contactNumber` rule (min 10)
- Accessibility: CompleteProfileModal needs focus trap, ARIA attributes
- No changes to UpdatePasswordModal.jsx or backend

---

## File Structure

**Modify (3 files):**
- `frontend/src/components/AuthPortal.jsx` — Remove magic link/reset tabs, add forgot password inline link
- `frontend/src/App.jsx` — Add complete-profile trigger logic

**Create (2 files):**
- `frontend/src/components/GoogleSignInButton.jsx` — Official Google branded button (reusable)
- `frontend/src/components/CompleteProfileModal.jsx` — Profile completion modal with focus trap

---

## Task 1: Create GoogleSignInButton Component

**Files:**
- Create: `frontend/src/components/GoogleSignInButton.jsx`

**Interfaces:**
- Consumes: `onClick` prop (handler), `label` prop (optional, defaults to "Continue with Google")
- Produces: Themed Google button component (light/dark aware, official Google spec)

**Steps:**

- [ ] **Step 1: Write component with official Google button markup**

```jsx
// frontend/src/components/GoogleSignInButton.jsx
export default function GoogleSignInButton({ onClick, label = 'Continue with Google' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border font-bold transition-colors"
      style={{
        backgroundColor: 'var(--google-bg)',
        borderColor: 'var(--google-border)',
        color: 'var(--google-text)',
      }}
      // Light mode (default): white bg, dark grey text, light border
      // Dark mode: #131314 bg, white text, subtle/no border
    >
      {/* Official Google "G" logomark SVG — 4-color, theme-independent */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Google G in 4 colors */}
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span>{label}</span>
    </button>
  );
}
```

But use Tailwind CSS variables for theme switching instead of inline style. Let me revise:

```jsx
// frontend/src/components/GoogleSignInButton.jsx
export default function GoogleSignInButton({ onClick, label = 'Continue with Google' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg font-bold transition-colors
        bg-white border border-gray-300 text-gray-800 hover:bg-gray-50
        dark:bg-[#131314] dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
      aria-label={label}
    >
      {/* Official Google "G" logomark SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span>{label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create test file**

```jsx
// frontend/src/components/__tests__/GoogleSignInButton.test.jsx
import { render, screen } from '@testing-library/react';
import GoogleSignInButton from '../GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('renders with default label', () => {
    render(<GoogleSignInButton onClick={() => {}} />);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<GoogleSignInButton onClick={() => {}} label="Sign in with Google" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<GoogleSignInButton onClick={onClick} />);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('renders Google G SVG logo', () => {
    render(<GoogleSignInButton onClick={() => {}} />);
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd frontend && npm test -- GoogleSignInButton.test.jsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GoogleSignInButton.jsx frontend/src/components/__tests__/GoogleSignInButton.test.jsx
git commit -m "feat(TTP-12): create GoogleSignInButton component with official Google branding"
```

---

## Task 2: Create CompleteProfileModal Component

**Files:**
- Create: `frontend/src/components/CompleteProfileModal.jsx`
- Test: `frontend/src/components/__tests__/CompleteProfileModal.test.jsx`

**Interfaces:**
- Consumes: `onComplete` callback (fired after successful profile update)
- Produces: Non-dismissable modal with contact number field, focus trap, ARIA attributes

**Steps:**

- [ ] **Step 1: Write failing test for modal rendering and form submission**

```jsx
// frontend/src/components/__tests__/CompleteProfileModal.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompleteProfileModal from '../CompleteProfileModal';

describe('CompleteProfileModal', () => {
  it('renders with contact number input', () => {
    render(<CompleteProfileModal onComplete={() => {}} />);
    expect(screen.getByPlaceholderText(/phone|contact/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<CompleteProfileModal onComplete={() => {}} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('has dialog role and aria-modal', () => {
    const { container } = render(<CompleteProfileModal onComplete={() => {}} />);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('is non-dismissable (no close button)', () => {
    render(<CompleteProfileModal onComplete={() => {}} />);
    expect(screen.queryByRole('button', { name: /close|dismiss/i })).not.toBeInTheDocument();
  });

  it('calls onComplete after successful submit', async () => {
    const onComplete = jest.fn();
    render(<CompleteProfileModal onComplete={onComplete} />);
    
    const input = screen.getByPlaceholderText(/phone|contact/i);
    fireEvent.change(input, { target: { value: '09171234567' } });
    
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it('shows error message on validation failure', async () => {
    render(<CompleteProfileModal onComplete={() => {}} />);
    
    const input = screen.getByPlaceholderText(/phone|contact/i);
    fireEvent.change(input, { target: { value: '123' } }); // Too short
    
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/at least 10/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- CompleteProfileModal.test.jsx
```

Expected: FAIL — Component does not exist

- [ ] **Step 3: Write CompleteProfileModal component**

```jsx
// frontend/src/components/CompleteProfileModal.jsx
import { useState, useEffect, useRef } from 'react';
import { updateCustomerProfile } from '../stores/authStore';
import { z } from 'zod';

const contactNumberSchema = z.string().min(10, 'Contact number must be at least 10 digits');

export default function CompleteProfileModal({ onComplete }) {
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const submitBtnRef = useRef(null);

  // Focus trap: focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus trap: keep focus cycling within modal
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      const focusableElements = [inputRef.current, submitBtnRef.current];
      const focusedIdx = focusableElements.indexOf(document.activeElement);
      
      if (e.shiftKey && focusedIdx === 0) {
        e.preventDefault();
        submitBtnRef.current?.focus();
      } else if (!e.shiftKey && focusedIdx === focusableElements.length - 1) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    const result = contactNumberSchema.safeParse(contactNumber);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await updateCustomerProfile({ contactNumber });
      onComplete?.();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-heading"
        onKeyDown={handleKeyDown}
        className="bg-card rounded-2xl p-6 w-full max-w-md border border-border/40"
      >
        <h2 id="complete-profile-heading" className="text-lg font-bold mb-4">
          Complete Your Profile
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please provide your contact number to complete your account setup.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="contact-number" className="block text-sm font-bold mb-2">
              Contact Number
            </label>
            <input
              ref={inputRef}
              id="contact-number"
              type="tel"
              placeholder="e.g., 09171234567"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-describedby={error ? 'contact-error' : undefined}
              disabled={loading}
            />
            {error && (
              <p id="contact-error" className="text-sm text-destructive mt-1">
                {error}
              </p>
            )}
          </div>

          <button
            ref={submitBtnRef}
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Contact Number'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- CompleteProfileModal.test.jsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CompleteProfileModal.jsx frontend/src/components/__tests__/CompleteProfileModal.test.jsx
git commit -m "feat(TTP-12): create CompleteProfileModal for profile completion flow with a11y"
```

---

## Task 3: Refactor AuthPortal.jsx (Remove Magic Link, Add Forgot Password Inline)

**Files:**
- Modify: `frontend/src/components/AuthPortal.jsx` (lines 460-503 remove, ~700 refactor for forgot link, replace Google buttons)

**Interfaces:**
- Consumes: Existing state (activeTab, form state, handlers)
- Produces: 2-tab AuthPortal (Login/Register), forgot password as inline link from Login, official Google buttons

**Steps:**

- [ ] **Step 1: Read current AuthPortal.jsx structure**

Understand:
- Lines 1-50: imports, state setup
- Lines 460-503: Magic Link tab button and related code (REMOVE)
- Lines 509-516, 634-641: Google buttons (REPLACE with GoogleSignInButton)
- Lines 699-708: Login form area (ADD forgot password link here)
- Lines 765-795: Magic Link tab JSX (REMOVE)
- Lines 300-334: handleMagicLinkRequest handler (REMOVE)

- [ ] **Step 2: Add GoogleSignInButton import**

After line 2 (existing imports):
```jsx
import GoogleSignInButton from './GoogleSignInButton';
```

- [ ] **Step 3: Remove Magic Link tab button**

Delete lines 460-503 (the 4th tab button for Magic Link)

- [ ] **Step 4: Remove Reset tab button**

Delete the 3rd tab button (Reset)

- [ ] **Step 5: Update Login tab to have only Login/Register buttons**

The tab buttons should now be only 2: Login and Register

- [ ] **Step 6: Replace Google button on Login tab**

Replace lines 634-641 with:
```jsx
<GoogleSignInButton 
  onClick={handleGoogleSignIn}
  label="Continue with Google"
/>
```

- [ ] **Step 7: Replace Google button on Register tab**

Replace lines 509-516 with:
```jsx
<GoogleSignInButton 
  onClick={handleGoogleSignIn}
  label="Continue with Google"
/>
```

- [ ] **Step 8: Add forgot password inline link in Login tab**

Around line 699 (near the "Remember me" checkbox), add:
```jsx
<a
  href="#"
  onClick={(e) => {
    e.preventDefault();
    setActiveTab('forgot');
  }}
  className="text-xs text-primary hover:underline"
>
  Forgot password?
</a>
```

- [ ] **Step 9: Update forgot password view to show back button**

In the forgot password JSX section (lines 733-763), add:
```jsx
<button
  onClick={() => setActiveTab('login')}
  className="mb-4 flex items-center gap-2 text-sm font-bold text-primary hover:opacity-80"
>
  <ArrowLeft size={16} weight="bold" /> Back to Login
</button>
```

- [ ] **Step 10: Remove Magic Link tab JSX**

Delete lines 765-795 (entire Magic Link tab JSX block)

- [ ] **Step 11: Remove handleMagicLinkRequest function**

Delete lines 300-334 (the handler function)

- [ ] **Step 12: Run tests to verify AuthPortal still works**

```bash
cd frontend && npm test -- AuthPortal
```

Expected: Existing tests pass (tab switching, form submission, etc.)

- [ ] **Step 13: Manual test in browser**

- Open http://localhost:5173
- Verify: Only 2 tabs visible (Login, Register)
- Login tab: Verify "Forgot password?" link visible
- Click "Forgot password?" → verify forgot password form shows with "Back to Login" button
- Click "Back to Login" → verify returns to login form
- Verify Google button present in both tabs with official Google colors (light and dark modes)

- [ ] **Step 14: Commit**

```bash
git add frontend/src/components/AuthPortal.jsx
git commit -m "refactor(TTP-12): remove magic link tab, add inline forgot password, use GoogleSignInButton"
```

---

## Task 4: Modify App.jsx to Trigger Complete Profile Modal

**Files:**
- Modify: `frontend/src/App.jsx` (lines 148-158 add logic, add render branch ~437-446)

**Interfaces:**
- Consumes: Existing profile-fetch effect, customerProfile state
- Produces: Profile-complete redirect when phoneNumber is empty

**Steps:**

- [ ] **Step 1: Add CompleteProfileModal import**

After existing component imports (around line 5):
```jsx
import CompleteProfileModal from './components/CompleteProfileModal';
```

- [ ] **Step 2: Update profile-fetch effect to detect empty phoneNumber**

In the existing `useEffect` for fetching profile (lines 148-158), add logic after `setCustomerProfile(p)`:

```jsx
useEffect(() => {
  const fetchProfile = async () => {
    try {
      const profile = await fetchCustomerProfile();
      if (profile) {
        setCustomerProfile(profile);
        // NEW: Detect empty phoneNumber, trigger complete-profile
        if (!profile.phoneNumber) {
          setActiveView('complete-profile');
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  if (supabaseUser) fetchProfile();
}, [supabaseUser]);
```

- [ ] **Step 3: Add render branch for complete-profile view**

Add before the final `return` statement (before line 470 or so):

```jsx
if (activeView === 'complete-profile') {
  return (
    <CompleteProfileModal
      onComplete={() => {
        showToast('Profile updated!', 'success');
        setActiveView('storefront');
        // Optionally refetch profile to confirm
        fetchCustomerProfile();
      }}
    />
  );
}
```

- [ ] **Step 4: Test in browser**

- Google sign up (new account without existing contact number)
- Should be redirected to complete-profile modal after auth
- Submit contact number
- Should redirect to storefront
- Log out and log back in
- Complete-profile modal should NOT appear (phoneNumber now set)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(TTP-12): add profile-completion trigger for Google signups without contact number"
```

---

## Task 5: End-to-End Test & Polish

**Files:**
- Test file: `docs/plan-e2e-auth-profile.md` (reference, no changes)

**Interfaces:**
- Consumes: All 4 previous tasks completed
- Produces: Verified functionality (password signup, Google signup, profile completion, theme switching)

**Steps:**

- [ ] **Step 1: Password signup test**

- Navigate to Register tab
- Fill form with: Full Name, Email, Contact Number, Password
- Submit
- Expected: Account created, redirected to storefront (no complete-profile modal)
- Complete-profile should NOT appear since password signups require contactNumber

- [ ] **Step 2: Google signup test (new account)**

- Navigate to Login tab
- Click "Continue with Google"
- Complete Google OAuth flow
- Expected: Redirected to complete-profile modal
- Fill contact number, submit
- Expected: Redirected to storefront
- Verify modal does not reappear after logout/login

- [ ] **Step 3: Forgot password flow**

- Login tab
- Click "Forgot password?" link
- Verify form appears with "Back to Login" button
- Click "Back to Login"
- Expected: Returns to login form

- [ ] **Step 4: Dark/light mode test**

- Toggle dark mode via FloatingSettingsWidget
- Verify Google button switches to dark spec (dark bg, white text, no border)
- Switch back to light mode
- Verify Google button switches back (white bg, dark text, light border)

- [ ] **Step 5: Accessibility check**

- Open DevTools → Accessibility tab
- Test complete-profile modal:
  - Can reach input with Tab
  - Focus stays within modal (Tab cycles between input and button)
  - ARIA labels present (aria-modal, aria-labelledby)
  - Dialog role present

- [ ] **Step 6: Clean up and verify no console errors**

- Open DevTools → Console
- Perform all above tests
- Expected: No red errors in console
- Some warnings are OK (React keys, etc.)

- [ ] **Step 7: Commit final changes (if any)**

```bash
git add -A
git commit -m "test(TTP-12): verify auth restructure — password signup, Google signup, forgot password, dark mode"
```

---

## Completion Criteria

✅ All 5 tasks committed
✅ GoogleSignInButton renders with official Google button spec (light/dark aware)
✅ CompleteProfileModal non-dismissable, has focus trap, ARIA attributes
✅ AuthPortal: only Login/Register tabs, forgot password inline link, Google buttons replaced
✅ App.jsx: triggers complete-profile modal when phoneNumber empty
✅ Password signups: no modal (phoneNumber already set)
✅ Google signups: redirected to modal, profile completion required once
✅ Forgot password: inline link, back button works
✅ Dark/light toggle: Google button matches spec in both modes
✅ Accessibility: focus trap, ARIA, no console errors
✅ Manual e2e tests pass

