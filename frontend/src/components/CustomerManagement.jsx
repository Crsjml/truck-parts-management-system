import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Storefront, MagnifyingGlass, ArrowsClockwise, CircleNotch, LinkSimple, Warning, CaretUp, CaretDown, CaretLeft, CaretRight, Envelope, Phone, CurrencyDollar, CalendarBlank, Package, User, PencilSimple, TrashSimple, X, Buildings, Receipt, ArrowLeft, Globe, ShoppingBag, Clock, CreditCard, Money, Bank, DeviceMobileSpeaker, Truck, CheckCircle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCustomers, mergeCustomer, createCustomer, updateCustomer, deleteCustomer, fetchCustomerTransactions, updateTransactionStatus } from '../authStore';

const fmt = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_STYLE = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ORDER_PLACED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  READY_FOR_PICKUP: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  CANCELLED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

const STATUS_LABEL = {
  ORDER_PLACED: 'Order Placed',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
const PAYMENT_ICON = { CASH: Money, CARD: CreditCard, CHEQUE: Bank, ONLINE: Globe, GCASH: DeviceMobileSpeaker };

export default function CustomerManagement({ showToast }) {
  const [tab, setTab] = useState('online');
  const [online, setOnline] = useState([]);
  const [ftf, setFtf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('totalSpend');
  const [sortDir, setSortDir] = useState('desc');
  const [onlinePage, setOnlinePage] = useState(1);
  const [ftfPage, setFtfPage] = useState(1);
  const itemsPerPage = 10;

  // Row Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // CRUD & Modals state
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [crudMode, setCrudMode] = useState('create'); // 'create' | 'edit'
  const [selectedCustomer, setSelectedCustomer] = useState(null); // customer being edited
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formIsFtf, setFormIsFtf] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Merge modal state
  const [merging, setMerging] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [selectedOnline, setSelectedOnline] = useState('');

  // Customer dashboard drawer
  const [dashboardCustomer, setDashboardCustomer] = useState(null);
  const [dashTxOnline, setDashTxOnline] = useState([]);
  const [dashTxFtf, setDashTxFtf] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashTab, setDashTab] = useState('online');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchCustomers();
    setOnline(data.online || []);
    setFtf(data.ftf || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 and clear selections when search/sort/tab changes
  useEffect(() => { setOnlinePage(1); setFtfPage(1); setSelectedIds([]); }, [search, sortKey, sortDir]);
  useEffect(() => { setOnlinePage(1); setFtfPage(1); setSelectedIds([]); }, [tab]);

  const toggleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (data) => {
    const pageIds = data.map(c => c.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const exportSelectedToCsv = () => {
    const allData = [...online, ...ftf];
    const targets = allData.filter(c => selectedIds.includes(c.id));
    if (targets.length === 0) return;

    const headers = ['ID', 'Type', 'Display Name', 'Company Name', 'Email', 'Phone', 'Orders Count', 'Total Spend (PHP)', 'Created Date'];
    const rows = targets.map(c => [
      `"${c.id}"`,
      `"${c.authId?.startsWith('temp-ftf') ? 'Face-to-Face' : 'Online'}"`,
      `"${(c.displayName || '').replace(/"/g, '""')}"`,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      `"${c.email || ''}"`,
      `"${c.phoneNumber || ''}"`,
      c.orderCount || 0,
      c.totalSpend || 0,
      `"${c.createdAt || c.lastOrderDate || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_roster_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.(`Exported ${targets.length} customer profile(s) to CSV`, 'success');
  };

  const openDashboard = async (customer, type) => {
    setDashboardCustomer({ ...customer, type });
    setDashLoading(true);
    setDashTxOnline([]); setDashTxFtf([]);
    const result = await fetchCustomerTransactions(customer.id);
    setDashTxOnline(result.online || []);
    setDashTxFtf(result.ftf || []);
    setDashTab(type === 'online' ? 'online' : 'ftf');
    setDashLoading(false);
  };
  const closeDashboard = () => { setDashboardCustomer(null); setDashTxOnline([]); setDashTxFtf([]); };

  const handleUpdateDashTxStatus = async (txId, newStatus) => {
    const res = await updateTransactionStatus(txId, newStatus);
    if (res.ok) {
      setDashTxOnline(prev => prev.map(t => t.id === txId ? { ...t, status: newStatus } : t));
      showToast?.(`Order status updated to ${STATUS_LABEL[newStatus] || newStatus}`, 'success');
    } else {
      showToast?.(res.error || 'Failed to update order status', 'error');
    }
  };

  const openCreateModal = (isFtfType = true) => {
    setCrudMode('create');
    setSelectedCustomer(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormIsFtf(isFtfType);
    setFormError('');
    setIsCrudModalOpen(true);
  };

  const openEditModal = (c, isFtfType) => {
    setCrudMode('edit');
    setSelectedCustomer(c);
    setFormName(c.displayName || '');
    setFormEmail(c.email || '');
    setFormPhone(c.phoneNumber || '');
    setFormCompany(c.companyName || '');
    setFormIsFtf(isFtfType);
    setFormError('');
    setIsCrudModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setFormError('');

    const name = formName.trim();
    const email = formEmail.trim();
    const phone = formPhone.trim();
    const company = formCompany.trim();

    if (!name) {
      setFormError('Name is required.');
      return;
    }

    if (!formIsFtf && !email) {
      setFormError('Email is required for online customers.');
      return;
    }

    setSaving(true);
    let result;
    if (crudMode === 'create') {
      result = await createCustomer({
        displayName: name,
        email: email || undefined,
        phoneNumber: phone,
        companyName: company,
        isFtf: formIsFtf
      });
    } else {
      result = await updateCustomer(selectedCustomer.id, {
        displayName: name,
        email: email || undefined,
        phoneNumber: phone,
        companyName: company
      });
    }
    setSaving(false);

    if (result.ok) {
      showToast?.(
        crudMode === 'create' ? 'Customer created successfully' : 'Customer updated successfully',
        'success'
      );
      setIsCrudModalOpen(false);
      load();
    } else {
      setFormError(result.error || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCustomer(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);

    if (result.ok) {
      showToast?.('Customer deleted successfully', 'success');
      load();
    } else {
      showToast?.(result.error || 'Failed to delete customer', 'error');
    }
  };

  const handleMerge = async () => {
    if (!mergeTarget || !selectedOnline) return;
    setMerging(mergeTarget.authId);
    const result = await mergeCustomer({
      authId: selectedOnline,
      tempAuthId: mergeTarget.authId,
      customerEmail: mergeTarget.email || undefined,
      customerContact: mergeTarget.phoneNumber || undefined
    });
    setMerging(null);
    setMergeTarget(null);
    setSelectedOnline('');
    if (result.ok) {
      showToast?.(`Merged ${result.count} transaction(s) successfully`, 'success');
      load();
    } else {
      showToast?.(result.error || 'Merge failed', 'error');
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <CaretUp weight="bold" className="w-3 h-3" /> : <CaretDown weight="bold" className="w-3 h-3" />)
    : <CaretDown weight="regular" className="w-3 h-3 opacity-30" />;

  const q = search.toLowerCase().trim();
  const filteredOnline = online
    .filter(c => !q || c.displayName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phoneNumber.includes(q) || c.companyName.toLowerCase().includes(q))
    .sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'totalSpend') return (a.totalSpend - b.totalSpend) * m;
      if (sortKey === 'orderCount') return (a.orderCount - b.orderCount) * m;
      if (sortKey === 'displayName') return a.displayName.localeCompare(b.displayName) * m;
      if (sortKey === 'createdAt') return (new Date(a.createdAt) - new Date(b.createdAt)) * m;
      return 0;
    });

  const filteredFtf = ftf
    .filter(c => !q || c.displayName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phoneNumber.includes(q) || c.companyName.toLowerCase().includes(q))
    .sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'totalSpend') return (a.totalSpend - b.totalSpend) * m;
      if (sortKey === 'orderCount') return (a.orderCount - b.orderCount) * m;
      if (sortKey === 'displayName') return a.displayName.localeCompare(b.displayName) * m;
      if (sortKey === 'lastOrderDate') return (new Date(a.lastOrderDate || 0) - new Date(b.lastOrderDate || 0)) * m;
      return 0;
    });
  const totalOnlinePages = Math.ceil(filteredOnline.length / itemsPerPage);
  const paginatedOnline = filteredOnline.slice((onlinePage - 1) * itemsPerPage, onlinePage * itemsPerPage);
  const totalFtfPages = Math.ceil(filteredFtf.length / itemsPerPage);
  const paginatedFtf = filteredFtf.slice((ftfPage - 1) * itemsPerPage, ftfPage * itemsPerPage);

  const dashboardTransactions = [...dashTxOnline, ...dashTxFtf];
  const dashboardOrderCount = dashboardTransactions.length || dashboardCustomer?.orderCount || 0;
  const dashboardTotalSpend = dashboardTransactions.length > 0
    ? dashboardTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0)
    : dashboardCustomer?.totalSpend || 0;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight font-display">Customer Management</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage online accounts and face-to-face clients</p>
        </div>
        <button
          onClick={() => openCreateModal(tab === 'ftf')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-sm shadow-md shadow-accent/20 hover:bg-accent/90 active:scale-[0.98] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <UserPlus weight="bold" className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Overview Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-secondary/50 border border-border rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Users weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Online Clients</div>
            <div className="text-xl font-black text-foreground mt-0.5">{online.length}</div>
          </div>
        </div>
        <div className="p-4 bg-secondary/50 border border-border rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Storefront weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">FTF Clients</div>
            <div className="text-xl font-black text-foreground mt-0.5">{ftf.length}</div>
          </div>
        </div>
        <div className="p-4 bg-secondary/50 border border-border rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Package weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Sales Count</div>
            <div className="text-xl font-black text-foreground mt-0.5 font-semibold">
              {[...online, ...ftf].reduce((sum, c) => sum + (c.orderCount || 0), 0)}
            </div>
          </div>
        </div>
        <div className="p-4 bg-secondary/50 border border-border rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <CurrencyDollar weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Spend</div>
            <div className="text-xl font-black text-foreground mt-0.5 font-mono">
              {fmt([...online, ...ftf].reduce((sum, c) => sum + (c.totalSpend || 0), 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-secondary border border-border rounded-xl p-1 gap-1 shrink-0">
          <button
            onClick={() => setTab('online')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'online'
                ? 'bg-background text-foreground shadow-sm border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
            <UserPlus weight="duotone" className="w-4 h-4 text-accent" />
            Online Clients
          </button>
          <button
            onClick={() => setTab('ftf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'ftf'
                ? 'bg-background text-foreground shadow-sm border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <Storefront weight="duotone" className="w-4 h-4 text-amber-500" />
            Face-to-Face Clients
          </button>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Refresh customer list"
            aria-label="Refresh customer list"
          >
            <ArrowsClockwise weight="bold" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-secondary/80 border border-border rounded-xl text-xs">
          <span className="font-semibold text-foreground">
            {selectedIds.length} customer profile(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={exportSelectedToCsv}
              className="px-3 py-1.5 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors shadow-sm"
            >
              Export Selected (CSV)
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CircleNotch weight="bold" className="w-8 h-8 animate-spin mb-3 text-accent" />
          <p className="text-sm font-semibold animate-pulse">Syncing customer database...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'online' ? (
              <>
                <OnlineTable
                  data={paginatedOnline}
                  sortKey={sortKey}
                  toggleSort={toggleSort}
                  SortIcon={SortIcon}
                  onEdit={(c) => openEditModal(c, false)}
                  onDelete={(c) => setDeleteTarget(c)}
                  onView={(c) => openDashboard(c, 'online')}
                  selectedIds={selectedIds}
                  toggleSelectRow={toggleSelectRow}
                  toggleSelectAll={toggleSelectAll}
                />
                {filteredOnline.length > 0 && totalOnlinePages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground font-medium pl-1">
                      Showing {(onlinePage - 1) * itemsPerPage + 1} to {Math.min(onlinePage * itemsPerPage, filteredOnline.length)} of {filteredOnline.length} clients
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setOnlinePage(p => Math.max(1, p - 1))}
                        disabled={onlinePage === 1}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Previous page"
                      >
                        <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold text-foreground px-2">{onlinePage} / {totalOnlinePages}</span>
                      <button
                        onClick={() => setOnlinePage(p => Math.min(totalOnlinePages, p + 1))}
                        disabled={onlinePage === totalOnlinePages}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Next page"
                      >
                        <CaretRight weight="bold" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <FtfTable
                  data={paginatedFtf}
                  sortKey={sortKey}
                  toggleSort={toggleSort}
                  SortIcon={SortIcon}
                  onEdit={(c) => openEditModal(c, true)}
                  onDelete={(c) => setDeleteTarget(c)}
                  onMerge={(c) => setMergeTarget(c)}
                  onView={(c) => openDashboard(c, 'ftf')}
                  merging={merging}
                  selectedIds={selectedIds}
                  toggleSelectRow={toggleSelectRow}
                  toggleSelectAll={toggleSelectAll}
                />
                {filteredFtf.length > 0 && totalFtfPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground font-medium pl-1">
                      Showing {(ftfPage - 1) * itemsPerPage + 1} to {Math.min(ftfPage * itemsPerPage, filteredFtf.length)} of {filteredFtf.length} clients
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setFtfPage(p => Math.max(1, p - 1))}
                        disabled={ftfPage === 1}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Previous page"
                      >
                        <CaretLeft weight="bold" className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold text-foreground px-2">{ftfPage} / {totalFtfPages}</span>
                      <button
                        onClick={() => setFtfPage(p => Math.min(totalFtfPages, p + 1))}
                        disabled={ftfPage === totalFtfPages}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label="Next page"
                      >
                        <CaretRight weight="bold" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* CRUD Modal (Create / Edit) */}
      <AnimatePresence>
        {isCrudModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCrudModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-background border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <User weight="duotone" className="w-5 h-5 text-accent" />
                  {crudMode === 'create' ? 'Add New Customer' : 'Edit Customer'}
                </h3>
                <button onClick={() => setIsCrudModalOpen(false)} className="p-1 hover:bg-secondary rounded-lg text-muted-foreground transition-colors">
                  <X weight="bold" className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="space-y-4 pt-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                    {formError}
                  </div>
                )}

                {crudMode === 'create' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Customer Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormIsFtf(true)}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs transition-colors ${formIsFtf ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-border bg-secondary text-muted-foreground'}`}
                      >
                        Face-to-Face (FTF)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsFtf(false)}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs transition-colors ${!formIsFtf ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-secondary text-muted-foreground'}`}
                      >
                        Online Customer
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name / Display Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Juan dela Cruz"
                    className={`w-full px-4.5 py-2.5 bg-secondary border rounded-xl text-sm text-foreground focus:outline-none transition-colors ${
                      formError && !formName.trim()
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-border focus:ring-2 focus:ring-accent/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Email Address {!formIsFtf && <span className="text-accent">*</span>}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required={!formIsFtf}
                    placeholder="e.g. juan@example.com"
                    className={`w-full px-4.5 py-2.5 bg-secondary border rounded-xl text-sm text-foreground focus:outline-none transition-colors ${
                      formError && !formIsFtf && !formEmail.trim()
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-border focus:ring-2 focus:ring-accent/30'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full px-4.5 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Company Name (Optional)</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Dela Cruz Logistics"
                    className="w-full px-4.5 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
                  <button
                    type="button"
                    onClick={() => setIsCrudModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-accent/20"
                  >
                    {saving && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
                    Save Customer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-background border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <TrashSimple weight="duotone" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Delete Customer Account?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget.displayName}</span>? This will remove their profile.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                <p className="text-xs text-red-700 dark:text-red-400">
                  Note: Deleting this customer will NOT delete their invoice history. Their transactions will be preserved under "Walk-in" with their name details intact, but unlinked from this profile.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  disabled={deleting}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {deleting ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : <TrashSimple weight="bold" className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Merge Modal */}
      <AnimatePresence>
        {mergeTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMergeTarget(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-background border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-5"
            >
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <LinkSimple weight="duotone" className="w-5 h-5 text-accent" />
                  Link to Online Account
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Merge <span className="font-semibold text-foreground">{mergeTarget.displayName}</span>'s walk-in transactions into an existing online account.
                </p>
              </div>

              <div className="p-3 bg-secondary border border-border rounded-xl space-y-1.5">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">FTF Record</div>
                <div className="text-sm text-foreground font-bold">{mergeTarget.displayName}</div>
                {mergeTarget.email && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Envelope weight="duotone" className="w-3.5 h-3.5" /> {mergeTarget.email}
                  </div>
                )}
                {mergeTarget.phoneNumber && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone weight="duotone" className="w-3.5 h-3.5" /> {mergeTarget.phoneNumber}
                  </div>
                )}
                <div className="text-xs text-muted-foreground font-medium">
                  {mergeTarget.orderCount} order(s) · {fmt(mergeTarget.totalSpend)}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Select Online Account</label>
                <select
                  value={selectedOnline}
                  onChange={(e) => setSelectedOnline(e.target.value)}
                  className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">Choose an account...</option>
                  {online.map(c => (
                    <option key={c.authId} value={c.authId}>
                      {c.displayName} — {c.email}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOnline && (() => {
                const targetAccount = online.find(c => c.authId === selectedOnline);
                if (!targetAccount) return null;
                return (
                  <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                        <CheckCircle weight="fill" className="w-3.5 h-3.5" /> Migration Preview
                      </span>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {mergeTarget.orderCount} transaction(s)
                      </span>
                    </div>
                    <div className="text-xs text-foreground font-medium">
                      Linking <strong className="font-bold text-accent">{fmt(mergeTarget.totalSpend)}</strong> of walk-in sales history to:
                    </div>
                    <div className="flex items-center gap-2.5 p-2 bg-background border border-border/80 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                        {(targetAccount.displayName || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-bold text-foreground truncate">{targetAccount.displayName}</div>
                        <div className="text-muted-foreground truncate">{targetAccount.email}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 pt-1 border-t border-accent/10">
                      <Warning weight="duotone" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        This action permanently links all of <strong>{mergeTarget.displayName}</strong>'s walk-in transactions to {targetAccount.displayName}. The walk-in customer profile will be merged.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setMergeTarget(null); setSelectedOnline(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={!selectedOnline || !!merging}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-accent/20"
                >
                  {merging ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : <LinkSimple weight="bold" className="w-4 h-4" />}
                  Merge Records
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Customer Dashboard Drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {dashboardCustomer && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDashboard}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md shrink-0">
                <button
                  onClick={closeDashboard}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft weight="bold" className="w-4 h-4" />
                  Back to List
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { closeDashboard(); openEditModal(dashboardCustomer, dashboardCustomer.type === 'ftf'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PencilSimple weight="bold" className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  <button
                    onClick={closeDashboard}
                    className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
                  >
                    <X weight="bold" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Profile Section */}
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0
                      ${dashboardCustomer.type === 'online'
                        ? 'bg-accent/10 border border-accent/20 text-accent'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                      {(dashboardCustomer.displayName || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-foreground">{dashboardCustomer.displayName}</h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider
                          ${dashboardCustomer.type === 'online'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                          {dashboardCustomer.type === 'online' ? <Globe weight="fill" className="w-2.5 h-2.5" /> : <Storefront weight="fill" className="w-2.5 h-2.5" />}
                          {dashboardCustomer.type === 'online' ? 'Online' : 'Face-to-Face'}
                        </span>
                      </div>
                      {dashboardCustomer.companyName && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <Buildings weight="duotone" className="w-3.5 h-3.5" />
                          {dashboardCustomer.companyName}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {dashboardCustomer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Envelope weight="duotone" className="w-3.5 h-3.5" /> {dashboardCustomer.email}
                          </div>
                        )}
                        {dashboardCustomer.phoneNumber && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone weight="duotone" className="w-3.5 h-3.5" /> {dashboardCustomer.phoneNumber}
                          </div>
                        )}
                        {dashboardCustomer.createdAt && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarBlank weight="duotone" className="w-3.5 h-3.5" /> Since {fmtDate(dashboardCustomer.createdAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="p-3 bg-secondary/50 rounded-xl text-center">
                      <div className="text-lg font-black text-foreground">
                        {dashboardOrderCount}
                      </div>
                      <div className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Total Orders</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-xl text-center">
                      <div className="text-lg font-black text-accent font-mono">
                        {fmt(dashboardTotalSpend)}
                      </div>
                      <div className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Total Spend</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-xl text-center">
                      <div className="text-lg font-black text-foreground">
                        {dashboardTransactions.length > 0
                          ? fmt(dashboardTotalSpend / dashboardTransactions.length)
                          : '—'}
                      </div>
                      <div className="text-2xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Avg. Order</div>
                    </div>
                  </div>
                </div>

                {/* Purchase History Tabs */}
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Receipt weight="duotone" className="w-4 h-4 text-accent" />
                      Purchase History
                    </h3>
                    {dashLoading && <CircleNotch weight="bold" className="w-4 h-4 animate-spin text-accent" />}
                  </div>

                  {/* Sub-tabs: Online | FTF */}
                  <div className="flex bg-secondary border border-border rounded-xl p-1 gap-1 mb-4 w-fit">
                    <button
                      onClick={() => setDashTab('online')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        dashTab === 'online'
                          ? 'bg-background text-foreground shadow-sm border border-border font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      <Globe weight="duotone" className="w-3.5 h-3.5 text-accent" />
                      Online Orders
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        dashTab === 'online' ? 'bg-accent/10 text-accent' : 'bg-secondary-foreground/10'
                      }`}>
                        {dashTxOnline.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setDashTab('ftf')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        dashTab === 'ftf'
                          ? 'bg-background text-foreground shadow-sm border border-border font-bold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <ShoppingBag weight="duotone" className="w-3.5 h-3.5 text-amber-500" />
                      Walk-in / FTF
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        dashTab === 'ftf' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-secondary-foreground/10'
                      }`}>
                        {dashTxFtf.length}
                      </span>
                    </button>
                  </div>

                  {dashLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CircleNotch weight="bold" className="w-7 h-7 animate-spin mb-2 text-accent" />
                      <p className="text-xs font-semibold">Loading purchase history...</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={dashTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <TransactionList
                          transactions={dashTab === 'online' ? dashTxOnline : dashTxFtf}
                          type={dashTab}
                          onStatusUpdate={dashTab === 'online' ? handleUpdateDashTxStatus : null}
                        />
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Online Clients Table ──────────────────────────────────────────────────── */
function OnlineTable({ data, sortKey, toggleSort, SortIcon, onEdit, onDelete, onView, selectedIds = [], toggleSelectRow, toggleSelectAll }) {
  if (data.length === 0) return <EmptyState icon={UserPlus} message="No online customers found" />;

  const allSelected = data.length > 0 && data.every(c => selectedIds.includes(c.id));

  return (
    <div className="bg-secondary/30 border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all customers on page"
                  checked={allSelected}
                  onChange={() => toggleSelectAll?.(data)}
                  className="rounded border-border text-accent focus:ring-accent/30 cursor-pointer"
                />
              </th>
              <SortTh label="Customer" k="displayName" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} />
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
              <SortTh label="Orders" k="orderCount" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} align="center" />
              <SortTh label="Total Spend" k="totalSpend" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} align="right" />
              <SortTh label="Joined" k="createdAt" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} align="right" />
              <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map(c => (
              <tr
                key={c.id}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${c.displayName}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onView(c);
                  }
                }}
                className={`hover:bg-secondary/25 transition-colors cursor-pointer group focus:outline-none focus:bg-secondary/40 ${
                  selectedIds.includes(c.id) ? 'bg-accent/5' : ''
                }`}
                onClick={() => onView(c)}
              >
                <td className="w-10 px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.displayName}`}
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelectRow?.(c.id)}
                    className="rounded border-border text-accent focus:ring-accent/30 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                      {(c.displayName || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground group-hover:text-accent transition-colors truncate max-w-[180px] md:max-w-[240px]" title={c.displayName}>{c.displayName}</div>
                      {c.companyName && <div className="text-xs text-muted-foreground truncate max-w-[180px] md:max-w-[240px]" title={c.companyName}>{c.companyName}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5 min-w-0">
                    {c.email && <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate max-w-[180px] md:max-w-[220px]" title={c.email}><Envelope weight="duotone" className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{c.email}</span></div>}
                    {c.phoneNumber && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone weight="duotone" className="w-3.5 h-3.5 shrink-0" /> {c.phoneNumber}</div>}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-xs font-bold">
                    <Package weight="duotone" className="w-3.5 h-3.5" /> {c.orderCount}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">{fmt(c.totalSpend)}</td>
                <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{fmtDate(c.createdAt)}</td>
                <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(c)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Edit Profile"
                      aria-label={`Edit profile for ${c.displayName}`}
                    >
                      <PencilSimple weight="bold" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-colors"
                      title="Delete Customer"
                      aria-label={`Delete customer ${c.displayName}`}
                    >
                      <TrashSimple weight="bold" className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── FTF Clients Table ─────────────────────────────────────────────────────── */
function FtfTable({ data, sortKey, toggleSort, SortIcon, onEdit, onDelete, onMerge, onView, merging, selectedIds = [], toggleSelectRow, toggleSelectAll }) {
  if (data.length === 0) return <EmptyState icon={Storefront} message="No face-to-face clients found" />;

  const allSelected = data.length > 0 && data.every(c => selectedIds.includes(c.id));

  return (
    <div className="bg-secondary/30 border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-10 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all customers on page"
                  checked={allSelected}
                  onChange={() => toggleSelectAll?.(data)}
                  className="rounded border-border text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                />
              </th>
              <SortTh label="Customer" k="displayName" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} />
              <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact</th>
              <SortTh label="Orders" k="orderCount" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} align="center" />
              <SortTh label="Total Spend" k="totalSpend" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} align="right" />
              <SortTh label="Last Purchase" k="lastOrderDate" sortKey={sortKey} toggleSort={toggleSort} SortIcon={SortIcon} align="right" />
              <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map(c => (
              <tr
                key={c.id}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${c.displayName}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onView(c);
                  }
                }}
                className={`hover:bg-secondary/25 transition-colors cursor-pointer group focus:outline-none focus:bg-secondary/40 ${
                  selectedIds.includes(c.id) ? 'bg-amber-500/5' : ''
                }`}
                onClick={() => onView(c)}
              >
                <td className="w-10 px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.displayName}`}
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelectRow?.(c.id)}
                    className="rounded border-border text-amber-500 focus:ring-amber-500/30 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm shrink-0">
                      {(c.displayName || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground group-hover:text-amber-500 transition-colors truncate max-w-[180px] md:max-w-[240px]" title={c.displayName}>{c.displayName}</div>
                      <div className="text-2xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Storefront weight="fill" className="w-2.5 h-2.5 shrink-0" /> Walk-in
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="space-y-0.5 min-w-0">
                    {c.email && <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate max-w-[180px] md:max-w-[220px]" title={c.email}><Envelope weight="duotone" className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{c.email}</span></div>}
                    {c.phoneNumber && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone weight="duotone" className="w-3.5 h-3.5 shrink-0" /> {c.phoneNumber}</div>}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold">
                    <Package weight="duotone" className="w-3.5 h-3.5" /> {c.orderCount}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground">{fmt(c.totalSpend)}</td>
                <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{fmtDate(c.lastOrderDate)}</td>
                <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onMerge(c)}
                      disabled={merging === c.authId}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-accent/10 text-accent hover:bg-accent hover:text-white border border-accent/20 hover:border-accent transition-colors disabled:opacity-50"
                      title="Link to online account"
                      aria-label={`Link customer ${c.displayName} to an online account`}
                    >
                      {merging === c.authId ? <CircleNotch weight="bold" className="w-3 animate-spin" /> : <LinkSimple weight="bold" className="w-3" />}
                      Link
                    </button>
                    <button
                      onClick={() => onEdit(c)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Edit Customer"
                      aria-label={`Edit profile for ${c.displayName}`}
                    >
                      <PencilSimple weight="bold" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-colors"
                      title="Delete Customer"
                      aria-label={`Delete customer ${c.displayName}`}
                    >
                      <TrashSimple weight="bold" className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Transaction List ──────────────────────────────────────────────────────── */
function TransactionList({ transactions, type, onStatusUpdate }) {
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatusChange = async (txId, newStatus) => {
    setUpdatingId(txId);
    await onStatusUpdate?.(txId, newStatus);
    setUpdatingId(null);
  };
  if (!transactions || !transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
        <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-3">
          {type === 'online' ? <Globe weight="duotone" className="w-6 h-6" /> : <ShoppingBag weight="duotone" className="w-6 h-6" />}
        </div>
        <p className="text-sm font-semibold">No {type === 'online' ? 'online' : 'walk-in'} purchases found</p>
        <p className="text-xs mt-1 opacity-60">
          {type === 'online' ? 'Online orders placed through the storefront will appear here.' : 'In-store / POS transactions will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const PayIcon = PAYMENT_ICON[tx.paymentMethod] || Money;
        const statusCls = STATUS_STYLE[tx.status] || 'bg-secondary text-muted-foreground';
        return (
          <div key={tx.id} className={`border rounded-xl overflow-hidden transition-colors
            ${type === 'online' ? 'border-accent/20 bg-accent/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
            {/* Invoice header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/10">
              <div className="flex items-center gap-2">
                <Receipt weight="duotone" className={`w-4 h-4 ${type === 'online' ? 'text-accent' : 'text-amber-500'}`} />
                <span className="font-mono text-xs font-bold text-foreground">{tx.invoiceNumber}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold ${statusCls}`}>
                  {STATUS_LABEL[tx.status] || tx.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-foreground bg-secondary/35 px-2 py-0.5 rounded border border-border">
                  <PayIcon weight="duotone" className="w-3.5 h-3.5" />
                  {tx.paymentMethod}
                </span>
                <span className="flex items-center gap-1">
                  <Clock weight="duotone" className="w-3.5 h-3.5" />
                  {fmtDateTime(tx.transactionDate)}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="px-4 py-2.5 space-y-1.5 divide-y divide-border/25">
              {tx.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs pt-1.5 first:pt-0">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package weight="duotone" className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <span className="text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-bold">×{item.quantity}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{fmt(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Footer totals */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-secondary/5">
              <div className="flex gap-3 text-2xs text-muted-foreground">
                {tx.discount > 0 && <span>Discount: {tx.discount}%</span>}
                <span>Tax: {tx.tax}%</span>
                {tx.processedBy && <span>By: {tx.processedBy}</span>}
              </div>
              <div className="font-mono font-black text-foreground text-sm">{fmt(tx.total)}</div>
            </div>

            {/* Admin pickup actions — only for actionable online orders */}
            {onStatusUpdate && tx.status === 'ORDER_PLACED' && (
              <div className="px-4 py-2.5 border-t border-border/50 bg-blue-500/5">
                <button
                  onClick={() => handleStatusChange(tx.id, 'READY_FOR_PICKUP')}
                  disabled={updatingId === tx.id}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm shadow-blue-500/20 active:scale-[0.98]"
                >
                  {updatingId === tx.id
                    ? <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                    : <Truck weight="duotone" className="w-3.5 h-3.5" />}
                  Mark Ready for Pickup
                </button>
              </div>
            )}
            {onStatusUpdate && tx.status === 'READY_FOR_PICKUP' && (
              <div className="px-4 py-2.5 border-t border-border/50 bg-emerald-500/5">
                <button
                  onClick={() => handleStatusChange(tx.id, 'COMPLETED')}
                  disabled={updatingId === tx.id}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20 active:scale-[0.98]"
                >
                  {updatingId === tx.id
                    ? <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle weight="duotone" className="w-3.5 h-3.5" />}
                  Mark as Picked Up
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Shared Components ─────────────────────────────────────────────────────── */
const ALIGN_MAP = {
  left: { th: 'text-left', flex: 'justify-start' },
  center: { th: 'text-center', flex: 'justify-center' },
  right: { th: 'text-right', flex: 'justify-end' },
};

function SortTh({ label, k, sortKey, toggleSort, SortIcon, align = 'left' }) {
  const alignConfig = ALIGN_MAP[align] || ALIGN_MAP.left;
  return (
    <th
      onClick={() => toggleSort(k)}
      className={`px-4 py-3 ${alignConfig.th} text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none`}
    >
      <span className={`inline-flex items-center gap-1 ${alignConfig.flex}`}>
        {label} <SortIcon k={k} />
      </span>
    </th>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-4">
        <Icon weight="duotone" className="w-8 h-8" />
      </div>
      <p className="text-sm font-semibold">{message}</p>
      <p className="text-xs mt-1 opacity-60">Customers will appear here once they make purchases or create accounts.</p>
    </div>
  );
}
