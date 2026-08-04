import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Package, CheckCircle, Truck, Star, X, ClipboardText } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createReview } from '../authStore';
import OrderCard from './OrderCard';
import { buildInvoicePdf } from '../utils/invoicePdf';

export default function MyOrders({ customerName, customerEmail, userId, transactions, onReorder, showToast }) {
  const { displayCurrency, formatBaseCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('All');
  const [purchaseType, setPurchaseType] = useState('online'); // 'online' | 'ftf'
  
  // Review Modal State
  const [reviewModal, setReviewModal] = useState({ isOpen: false, partId: null, partName: '' });
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewBody, setNewReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newRating || !reviewModal.partId) return;
    setSubmittingReview(true);
    const res = await createReview({
      partId: reviewModal.partId,
      rating: newRating,
      body: newReviewBody
    });
    setSubmittingReview(false);
    if (res.ok) {
      if (showToast) showToast('Review submitted successfully!', 'success');
      setReviewModal({ isOpen: false, partId: null, partName: '' });
      setNewRating(0);
      setNewReviewBody('');
    } else {
      if (showToast) showToast(res.error || 'Failed to submit review.', 'error');
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

      {/* Segmented Controls for Purchase Type Separation */}
      <div className="flex bg-secondary/80 border border-border/50 rounded-2xl p-1 gap-1 max-w-md">
        <button
          onClick={() => { setPurchaseType('online'); setActiveTab('All'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            purchaseType === 'online'
              ? 'bg-foreground text-background shadow-md shadow-black/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Online Orders
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${purchaseType === 'online' ? 'bg-background/25 text-background' : 'bg-secondary text-muted-foreground'}`}>
            {onlineTx.length}
          </span>
        </button>
        <button
          onClick={() => { setPurchaseType('ftf'); setActiveTab('All'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            purchaseType === 'ftf'
              ? 'bg-foreground text-background shadow-md shadow-black/10'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Walk-in Purchases
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${purchaseType === 'ftf' ? 'bg-background/25 text-background' : 'bg-secondary text-muted-foreground'}`}>
            {ftfTx.length}
          </span>
        </button>
      </div>

      {/* Segmented Controls (Status Tabs) */}
      <div className="flex overflow-x-auto pb-4 no-scrollbar gap-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === tab.id 
                ? 'bg-foreground text-background border-foreground shadow-xl shadow-black/10 scale-[1.02]' 
                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border/80'
            }`}
            aria-label={`View ${tab.label}`}
          >
            <tab.icon weight={activeTab === tab.id ? "fill" : "duotone"} className="w-5 h-5" />
            {tab.label}
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-background/20 text-background' : 'bg-secondary text-muted-foreground'}`}>
              {tab.id === 'All' ? activeTxList.length : activeTxList.filter(tx => tx.status === tab.id).length}
            </span>
          </button>
        ))}
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
              formatCurrency={formatBaseCurrency}
              onDownloadPDF={(txn) => handleDownloadPDF(txn, null)}
              onReview={(partId, partName) => {
                setReviewModal({ isOpen: true, partId, partName });
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
      <AnimatePresence>
        {reviewModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setReviewModal({ isOpen: false, partId: null, partName: '' })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-secondary border border-border shadow-2xl rounded-3xl overflow-hidden p-6"
            >
              <button 
                onClick={() => setReviewModal({ isOpen: false, partId: null, partName: '' })}
                className="absolute top-4 right-4 p-2 bg-background hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
              >
                <X weight="bold" className="w-4 h-4" />
              </button>
              
              <h3 className="text-xl font-bold font-display text-foreground mb-1">Write a Review</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-1">For: <span className="font-bold text-foreground">{reviewModal.partName}</span></p>

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
                  className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
