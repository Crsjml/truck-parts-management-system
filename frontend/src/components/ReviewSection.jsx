import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, Trash, UserCircle, CaretDown, Check } from '@phosphor-icons/react';
import { fetchReviews, deleteReview, createReview } from '../authStore';

export default function ReviewSection({ partId, currentUserId, hasPurchased }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent', 'highest', 'lowest'
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewBody, setNewReviewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newRating) return;
    
    setSubmitting(true);
    const res = await createReview({
      partId,
      rating: newRating,
      body: newReviewBody
    });
    
    setSubmitting(false);
    
    if (res.ok) {
      setNewRating(0);
      setNewReviewBody('');
      await loadData();
    } else {
      alert(res.error || 'Failed to submit review. You might have already reviewed this part.');
    }
  };

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

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === 'highest') return b.rating - a.rating;
    if (sortOrder === 'lowest') return a.rating - b.rating;
    return new Date(b.createdAt) - new Date(a.createdAt); // recent
  });

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
        className={`w-4 h-4 ${i < Math.round(count) ? 'text-amber-500 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
      />
    ));
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6 mt-8 pt-6 border-t border-border">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Customer Reviews</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center">{renderStars(stats.averageRating)}</div>
            <span className="text-sm font-bold text-foreground">{stats.averageRating}</span>
            <span className="text-xs text-muted-foreground">({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})</span>
          </div>
        </div>

        {/* Sort Dropdown */}
        {reviews.length > 0 && (
          <div className="relative">
            <button 
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Sort by: {sortOrder === 'recent' ? 'Most Recent' : sortOrder === 'highest' ? 'Highest Rated' : 'Lowest Rated'}
              <CaretDown weight="bold" className={`w-4 h-4 transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isSortDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => { setSortOrder('recent'); setIsSortDropdownOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-secondary transition-colors">
                    Most Recent {sortOrder === 'recent' && <Check weight="bold" className="text-brandBlue-500" />}
                  </button>
                  <button onClick={() => { setSortOrder('highest'); setIsSortDropdownOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-secondary transition-colors border-t border-border/50">
                    Highest Rated {sortOrder === 'highest' && <Check weight="bold" className="text-brandBlue-500" />}
                  </button>
                  <button onClick={() => { setSortOrder('lowest'); setIsSortDropdownOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-secondary transition-colors border-t border-border/50">
                    Lowest Rated {sortOrder === 'lowest' && <Check weight="bold" className="text-brandBlue-500" />}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Review Form - Restricted to Verified Purchasers */}
      {currentUserId && hasPurchased && (
        <form onSubmit={handleSubmitReview} className="p-6 bg-secondary/30 backdrop-blur-sm rounded-3xl border border-border/50 shadow-sm mt-6">
          <h4 className="text-sm font-bold mb-4">Write a Review</h4>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setNewRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <Star
                  weight={(hoverRating || newRating) >= i ? "fill" : "regular"}
                  className={`w-6 h-6 ${(hoverRating || newRating) >= i ? 'text-amber-500 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'} transition-colors`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={newReviewBody}
            onChange={e => setNewReviewBody(e.target.value)}
            placeholder="Share your thoughts about this part..."
            className="w-full bg-background rounded-xl border border-border/50 px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none h-24 mb-4 text-foreground placeholder:text-muted-foreground/60"
          ></textarea>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || newRating === 0}
              className="px-6 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4 italic bg-background rounded-xl border border-border border-dashed mt-6">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          sortedReviews.map(review => (
            <div key={review.id} className="p-6 bg-secondary/30 backdrop-blur-sm rounded-3xl border border-border/50 relative group shadow-sm hover:shadow-md transition-all hover:bg-secondary/60 mt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <UserCircle weight="duotone" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      {review.userName}
                      {review.purchaseVerified && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-500 text-[9px] rounded-md uppercase tracking-wider font-bold" title="Verified Purchase">
                          <ShieldCheck weight="fill" className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">{renderStars(review.rating)}</div>
                      <span className="text-xs text-muted-foreground font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {review.userId === currentUserId && (
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/20"
                    title="Delete your review"
                  >
                    <Trash weight="duotone" className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {review.body && (
                <p className="text-sm text-foreground/80 mt-2 pl-[3.25rem] leading-relaxed font-medium">
                  "{review.body}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
