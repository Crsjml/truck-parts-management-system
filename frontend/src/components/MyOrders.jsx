import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../context/SettingsContext';
import { Package, CheckCircle, Truck, Star, X, ClipboardText, ShieldCheck } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createReview, updateReview, fetchMyReviewedParts } from '../authStore';
import OrderCard from './OrderCard';
import { buildInvoicePdf } from '../utils/invoicePdf';

export default function MyOrders({ customerName, customerEmail, userId, transactions, onReorder, showToast }) {
  const { displayCurrency, formatBaseCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('All');
  const [purchaseType, setPurchaseType] = useState('online'); // 'online' | 'ftf'
  
  // Review Modal State
  const [reviewModal, setReviewModal] = useState({ isOpen: false, mode: 'create', reviewId: null, partId: null, partName: '', partImage: null });
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewBody, setNewReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  
  const closeReviewModal = () => {
    setReviewModal({ isOpen: false, mode: 'create', reviewId: null, partId: null, partName: '', partImage: null });
    setNewRating(0);
    setHoverRating(0);
    setNewReviewBody('');
  };
  
  useEffect(() => {
    if (userId) {
      fetchMyReviewedParts().then(reviews => setMyReviews(reviews));
    }
  }, [userId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newRating || !reviewModal.partId) return;
    setSubmittingReview(true);
    
    const res = reviewModal.mode === 'edit'
      ? await updateReview(reviewModal.reviewId, { rating: newRating, body: newReviewBody })
      : await createReview({
          partId: reviewModal.partId,
          rating: newRating,
          body: newReviewBody
        });
        
    setSubmittingReview(false);
    
    if (res.ok) {
      if (showToast) showToast(`Review ${reviewModal.mode === 'edit' ? 'updated' : 'submitted'} successfully!`, 'success');
      
      setMyReviews(prev => {
        if (reviewModal.mode === 'edit') {
          return prev.map(r => r.id === reviewModal.reviewId ? res.review : r);
        } else {
          return [...prev, res.review];
        }
      });
      closeReviewModal();
    } else {
      if (showToast) showToast(res.error || `Failed to ${reviewModal.mode === 'edit' ? 'update' : 'submit'} review.`, 'error');
    }
  };

  const customerTx = (transactions || []).filter(
    (tx) => 
      (tx.userId && userId && tx.userId === userId) ||
      (tx.customerEmail && customerEmail && tx.customerEmail.toLowerCase() === customerEmail.toLowerCase()) ||
      (tx.customerName && customerName && tx.customerName.toLowerCase() === customerName.toLowerCase()) ||
      (tx.customerName && customerEmail && tx.customerName.toLowerCase() === customerEmail.toLowerCase()) ||
      (tx.customerEmail && customerName && tx.customerEmail.toLowerCase().includes(customerName.toLowerCase().replace(/\s+/g, '.')))
  ).map(tx => ({
    ...tx,
    status: tx.status || 'ORDER_PLACED' 
  })).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

  const onlineTx = customerTx.filter(tx => tx.userId && !tx.userId.startsWith('temp-'));
  const ftfTx = customerTx.filter(tx => !tx.userId || tx.userId.startsWith('temp-'));

  const activeTxList = purchaseType === 'online' ? onlineTx : ftfTx;

  const filteredTx = activeTxList.filter(tx => {
    if (activeTab === 'All') return true;
    return tx.status === activeTab;
  });

  const tabs = [
    { id: 'All', label: 'All Purchases', icon: Package },
    { id: 'ORDER_PLACED', label: 'Order Placed', icon: ClipboardText },
    { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: Truck },
    { id: 'COMPLETED', label: 'Completed', icon: CheckCircle },
  ];

  const handleDownloadPDF = (tx, e) => {
    if (e) e.stopPropagation();
    if (!tx) return;
    try {
      buildInvoicePdf(tx, { formatCurrency: formatBaseCurrency, displayCurrency, duplicate: true });
      if (showToast) showToast('Invoice downloaded', 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Couldn\'t generate invoice — try again', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-secondary/80 backdrop-blur-xl border border-border/50 p-8 shadow-sm group transition-all hover:shadow-xl hover:border-accent/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none transition-all duration-700 group-hover:bg-accent/10 group-hover:scale-110" />
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground font-display mb-2">Order History</p>
        <h1 className="text-3xl font-bold text-foreground font-display">My Purchases</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-2xl leading-relaxed">
          Track pickup availability, download past invoices, and review your purchase history. Click on any order to view details.
        </p>
      </div>

      {/* Unified Filter Section */}
      <div className="flex flex-col gap-5 w-full bg-card/30 backdrop-blur-xl rounded-[2rem] border border-border/50 p-4 shadow-sm">
        
        {/* Top Row: Purchase Type Toggle */}
        <div className="flex bg-secondary/80 border border-border/50 rounded-2xl p-1 gap-1 w-full sm:max-w-md">
          <button
            onClick={() => { setPurchaseType('online'); setActiveTab('All'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all ${
              purchaseType === 'online'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="truncate">Online Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${purchaseType === 'online' ? 'bg-accent/10 text-accent' : 'bg-secondary/80 text-muted-foreground'}`}>
              {onlineTx.length}
            </span>
          </button>
          <button
            onClick={() => { setPurchaseType('ftf'); setActiveTab('All'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-5 py-2.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all ${
              purchaseType === 'ftf'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="truncate">Walk-in</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${purchaseType === 'ftf' ? 'bg-accent/10 text-accent' : 'bg-secondary/80 text-muted-foreground'}`}>
              {ftfTx.length}
            </span>
          </button>
        </div>

        {/* Bottom Row: Status Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar scroll-fade-edges gap-2.5 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-secondary/80 border-accent/40 text-foreground shadow-sm' 
                  : 'bg-background border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
              aria-label={`View ${tab.label}`}
            >
              <tab.icon weight={activeTab === tab.id ? "fill" : "duotone"} className={`w-4.5 h-4.5 ${activeTab === tab.id ? 'text-accent' : ''}`} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'bg-secondary text-muted-foreground'}`}>
                {tab.id === 'All' ? activeTxList.length : activeTxList.filter(tx => tx.status === tab.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Main View */}
      {filteredTx.length === 0 ? (
        <div className="rounded-[2.5rem] border border-border/50 bg-secondary/80 backdrop-blur-xl p-16 text-center shadow-sm flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full" />
            <div className="relative w-24 h-24 bg-background rounded-full border border-border/50 flex items-center justify-center shadow-xl">
               <Package weight="duotone" className="w-12 h-12 text-muted-foreground" />
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                 className="absolute inset-0 rounded-full border border-dashed border-muted-foreground/30 pointer-events-none" 
               />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-3">No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} records found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">Submitting a quote request or placing an order will generate a record here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTx.map(tx => (
            <OrderCard
              key={tx.id || tx.invoiceNumber}
              transaction={tx}
              reviewedPartIds={myReviews.map(r => r.partId)}
              formatCurrency={formatBaseCurrency}
              onDownloadPDF={(txn) => handleDownloadPDF(txn, null)}
              onReview={(partId, partName, partImage, isEdit) => {
                if (isEdit) {
                  const existing = myReviews.find(r => r.partId === partId);
                  if (existing) {
                    setReviewModal({ isOpen: true, mode: 'edit', reviewId: existing.id, partId, partName, partImage });
                    setNewRating(existing.rating);
                    setNewReviewBody(existing.body || '');
                    setHoverRating(0);
                  }
                } else {
                  setReviewModal({ isOpen: true, mode: 'create', reviewId: null, partId, partName, partImage });
                  setNewRating(0);
                  setNewReviewBody('');
                  setHoverRating(0);
                }
              }}
              onReorder={(items) => {
                if (onReorder) {
                  const reorderPayload = Array.isArray(items) ? { items } : items;
                  onReorder(reorderPayload);
                }
              }}
            />
          ))}
        </div>
      )}
      {/* Review Modal */}
      {createPortal(
        <AnimatePresence>
          {reviewModal.isOpen && (
          <motion.div 
            key="review-modal-container"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              key="review-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
              onClick={closeReviewModal}
            />
            <motion.div
              key="review-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-secondary border border-border shadow-2xl rounded-3xl overflow-hidden p-6"
            >
              <button 
                onClick={closeReviewModal}
                className="absolute top-4 right-4 p-2 bg-background hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
              
              <h3 className="text-xl font-bold font-display text-foreground mb-4">{reviewModal.mode === 'edit' ? 'Edit Review' : 'Write a Review'}</h3>
              
              <div className="flex items-center gap-4 p-3 bg-background rounded-2xl border border-border/50 mb-6">
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {reviewModal.partImage ? (
                    <img src={reviewModal.partImage} alt={reviewModal.partName} className="w-full h-full object-cover" />
                  ) : (
                    <Package weight="duotone" className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-2 leading-tight">{reviewModal.partName}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1 mt-1">
                    <ShieldCheck weight="fill" className="w-3.5 h-3.5" /> Verified Purchase
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex gap-2 justify-center mb-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewRating(i)}
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        weight={(hoverRating || newRating) >= i ? "fill" : "regular"}
                        className={`w-8 h-8 ${(hoverRating || newRating) >= i ? 'text-amber-500 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'} transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={newReviewBody}
                  onChange={e => setNewReviewBody(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className="w-full bg-background rounded-xl border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none h-28 text-foreground placeholder:text-muted-foreground/60"
                  required
                ></textarea>
                
                <button
                  type="submit"
                  disabled={submittingReview || newRating === 0}
                  className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {submittingReview ? 'Submitting...' : reviewModal.mode === 'edit' ? 'Update Review' : 'Post Review'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
