import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthPortal from '../components/AuthPortal';

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('AuthPortal register password strength', () => {
  const renderRegister = () =>
    render(<AuthPortal mode="customer" initialTab="register" onClose={() => {}} />);

  it('reserves the strength label line before any password is typed', () => {
    renderRegister();
    const label = screen.getByTestId('password-strength-label');
    expect(label.textContent.length).toBeGreaterThan(0);
  });

  it('announces the strength label politely once a password is typed', () => {
    renderRegister();
    const label = screen.getByTestId('password-strength-label');
    expect(label).toHaveAttribute('aria-live', 'polite');

    const password = screen.getByPlaceholderText('8+ chars, 1 number, 1 caps or symbol');
    fireEvent.change(password, { target: { value: 'Str0ngPass!' } });

    expect(label).toHaveTextContent('Strong');
  });
});

describe('AuthPortal Email Verification & Existing User flows', () => {
  it('renders Resend Verification Email button when notice is unverified', () => {
    render(<AuthPortal mode="customer" initialTab="login" initialNotice="UNVERIFIED_EMAIL" />);
    expect(screen.getByText(/Please verify your email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend verification email/i })).toBeInTheDocument();
  });
});

