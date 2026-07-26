import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import GoogleSignInButton from '../components/GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('renders default label "Continue with Google"', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('renders custom label when passed', () => {
    render(<GoogleSignInButton label="Sign in with Google" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<GoogleSignInButton onClick={handleClick} />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders SVG icon', () => {
    const { container } = render(<GoogleSignInButton />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg.querySelectorAll('path').length).toBe(4);
  });
});
