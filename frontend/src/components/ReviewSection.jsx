import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, Trash, UserCircle, CaretDown, Check, Pencil } from '@phosphor-icons/react';
import { fetchReviews, deleteReview, createReview, updateReview } from '../authStore';

export default function ReviewSection({ partId, currentUserId, hasPurchased, showToast }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent', 'highest', 'lowest'

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewBody, setNewReviewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newRating) return;
    
    setSubmitting(true);
    let res;
    if (editingReviewId) {
      res = await updateReview(editingReviewId, { rating: newRating, body: newReviewBody });
    } else {
      res = await createReview({
        partId,
        rating: newRating,
        body: newReviewBody
      });
    }
    
    setSubmitting(false);
    
    if (res.ok) {
      setNewRating(0);
      setNewReviewBody('');
      setEditingReviewId(null);
      await loadData();
      showToast?.(`Review ${editingReviewId ? 'updated' : 'posted'} successfully`, 'success');
    } else {
      showToast?.(res.error || `Failed to ${editingReviewId ? 'update' : 'submit'} review.`, 'error');
    }
  };

  const handleEditClick = (review) => {
    setEditingReviewId(review.id);
    setNewRating(review.rating);
    setNewReviewBody(review.body || '');
    document.getElementById('review-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setNewRating(0);
    setNewReviewBody('');
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
    const res = await deleteReview(reviewId);
    if (res.ok) {
      await loadData();
      showToast?.('Review deleted successfully', 'success');
    } else {
      showToast?.(res.error || 'Failed to delete review', 'error');
    }
    setConfirmingDeleteId(null);
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
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="appearance-none flex items-center gap-2 pl-4 pr-10 py-2 rounded-xl bg-secondary/50 border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="recent">Sort by: Most Recent</option>
              <option value="highest">Sort by: Highest Rated</option>
              <option value="lowest">Sort by: Lowest Rated</option>
            </select>
            <CaretDown weight="bold" className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground" />
          </div>
        )}
      </div>

      {/* Add / Edit Review Form - Restricted to Verified Purchasers */}
      {currentUserId && hasPurchased && (!reviews.some(r => r.userId === currentUserId) || editingReviewId) && (
        <form id="review-form-section" onSubmit={handleSubmitReview} className="p-6 bg-secondary/30 backdrop-blur-sm rounded-3xl border border-border/50 shadow-sm mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold">{editingReviewId ? 'Edit Your Review' : 'Write a Review'}</h4>
            {editingReviewId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-muted-foreground hover:text-foreground font-semibold">
                Cancel
              </button>
            )}
          </div>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => setNewRating(i)}
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                aria-label={`Rate ${i} stars`}
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
              {submitting ? 'Submitting...' : editingReviewId ? 'Update Review' : 'Post Review'}
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
          sortedReviews.map(review => {
            const isOwn = review.userId === currentUserId;
            return (
            <div key={review.id} className={`p-6 bg-secondary/30 backdrop-blur-sm rounded-3xl border transition-all hover:bg-secondary/60 mt-6 relative group shadow-sm hover:shadow-md ${
              isOwn 
                ? 'border-accent/40 ring-2 ring-accent/20' 
                : 'border-border/50'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent overflow-hidden">
                    {review.userAvatar ? (
                      <img
                        src={review.userAvatar}
                        alt={review.userName}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <UserCircle weight="duotone" className={`w-6 h-6 ${review.userAvatar ? 'hidden' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      {review.userDisplayName || review.userName}
                      {isOwn && (
                        <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                          Your review
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">{renderStars(review.rating)}</div>
                      <span className="text-xs text-muted-foreground font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {isOwn && (
                  <div className="flex items-center gap-1">
                    {confirmingDeleteId === review.id ? (
                      <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                        <span className="text-xs font-bold text-red-500">Delete?</span>
                        <button 
                          onClick={() => handleDelete(review.id)}
                          className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditClick(review)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-500/20"
                          aria-label="Edit review"
                        >
                          <Pencil weight="duotone" className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button 
                          onClick={() => setConfirmingDeleteId(review.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                          aria-label="Delete review"
                        >
                          <Trash weight="duotone" className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {review.body && (
                <p className="text-sm text-foreground/80 mt-2 pl-[3.25rem] leading-relaxed font-medium">
                  "{review.body}"
                </p>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
