import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReviewSection from '../components/ReviewSection';

// Mock the authStore functions
vi.mock('../authStore', () => ({
  fetchReviews: vi.fn(),
  createReview: vi.fn(),
  deleteReview: vi.fn()
}));

import { fetchReviews, createReview } from '../authStore';

describe('ReviewSection Component Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders correctly with no reviews', async () => {
    fetchReviews.mockResolvedValueOnce({ reviews: [], stats: { totalReviews: 0, averageRating: 0 } });
    
    render(<ReviewSection partId="1" />);
    
    expect(screen.getByText(/loading reviews/i)).toBeInTheDocument();
    
    // Wait for async fetch to complete
    const noReviewsText = await screen.findByText(/no reviews yet/i);
    expect(noReviewsText).toBeInTheDocument();
  });

  it('renders existing reviews', async () => {
    const mockReviews = [
      { id: '1', userName: 'John Doe', rating: 5, body: 'Great product!', createdAt: new Date().toISOString() }
    ];
    fetchReviews.mockResolvedValueOnce({ reviews: mockReviews, stats: { totalReviews: 1, averageRating: 5 } });
    
    render(<ReviewSection partId="1" />);
    
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Great product!')).toBeInTheDocument();
  });

  it('handles submit interaction', async () => {
    fetchReviews.mockResolvedValue({ reviews: [], stats: { totalReviews: 0, averageRating: 0 } });
    createReview.mockResolvedValue({ ok: true });
    
    render(<ReviewSection partId="1" currentUserId="user123" />);
    
    // Wait for loading to finish
    await screen.findByText(/no reviews yet/i);
    
    const submitBtn = screen.getByRole('button', { name: /submit review/i });
    expect(submitBtn).toBeInTheDocument();
    
    // Attempting to submit empty shouldn't crash
    fireEvent.click(submitBtn);
    
    // Wait for form submission handling
    await waitFor(() => {
      expect(createReview).toHaveBeenCalled();
    });
  });
});
