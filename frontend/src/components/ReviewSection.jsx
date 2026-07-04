import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, Trash, UserCircle, WarningCircle } from '@phosphor-icons/react';
import { fetchReviews, createReview, deleteReview } from '../authStore';

export default function ReviewSection({ partId, currentUserId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Check if current user has already reviewed
  const hasReviewed = currentUserId ? reviews.some(r => r.userId === currentUserId) : false;

  const loadData = async () => {
    setLoading(true);
    const data = await fetchReviews(partId);
    setReviews(data.reviews || []);
    setStats(data.stats || { totalReviews: 0, averageRating: 0 });
    setLoading(false);
  };

  useEffect(() => {
    if (partId) loadData();
  }, [partId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const res = await createReview({ partId, rating, body });
    if (res.ok) {
      setBody('');
      setRating(5);
      await loadData();
    } else {
      setFormError(res.error || 'Failed to submit review');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    
    const res = await deleteReview(reviewId);
    if (res.ok) {
      await loadData();
    } else {
      alert(res.error || 'Failed to delete review');
    }
  };

  const renderStars = (count) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        weight={i < Math.round(count) ? "fill" : "regular"} 
        className={`w-4 h-4 ${i < Math.round(count) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
      />
    ));
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6 mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Customer Reviews</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center">{renderStars(stats.averageRating)}</div>
            <span className="text-sm font-bold text-foreground">{stats.averageRating}</span>
            <span className="text-xs text-muted-foreground">({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})</span>
          </div>
        </div>
      </div>

      {/* Write a review form */}
      {currentUserId && !hasReviewed ? (
        <form onSubmit={handleSubmit} className="bg-secondary/50 p-4 rounded-xl border border-border space-y-4">
          <h4 className="text-sm font-bold text-foreground">Write a Review</h4>
          
          {formError && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center gap-2 text-red-500 text-xs font-semibold">
              <WarningCircle weight="fill" className="w-4 h-4" />
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Rating *</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star 
                    weight={rating >= star ? "fill" : "regular"} 
                    className={`w-6 h-6 ${rating >= star ? 'text-amber-400 drop-shadow-md' : 'text-slate-300 dark:text-slate-600'}`} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Your Review (Optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How was the fitment? Did it meet your expectations?"
              rows="3"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600 transition-all text-foreground resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-brandBlue-600 hover:bg-brandBlue-700 text-white text-sm font-bold rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      ) : currentUserId && hasReviewed ? (
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-500 text-sm font-semibold flex items-center gap-2">
          <ShieldCheck weight="duotone" className="w-5 h-5" />
          You have already reviewed this part. Thank you for your feedback!
        </div>
      ) : null}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4 italic bg-background rounded-xl border border-border border-dashed">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="p-4 bg-background rounded-xl border border-border relative group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    <UserCircle weight="fill" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {review.userName}
                      {review.purchaseVerified && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-500 text-3xs rounded uppercase tracking-wider" title="Verified Purchase">
                          <ShieldCheck weight="fill" /> Verified
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center">{renderStars(review.rating)}</div>
                      <span className="text-2xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {review.userId === currentUserId && (
                  <button 
                    onClick={() => handleDelete(review._id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-950/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete your review"
                  >
                    <Trash weight="duotone" className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {review.body && (
                <p className="text-sm text-muted-foreground mt-3 pl-11 leading-relaxed">
                  {review.body}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
