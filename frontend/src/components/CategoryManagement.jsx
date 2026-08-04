import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Plus, Pencil, Trash, CaretRight, Warning, CheckCircle, CircleNotch, List, FolderSimplePlus, Table, MagnifyingGlass, WarningCircle, X, Palette, Star } from '@phosphor-icons/react';
import { fetchCategoriesList, createCategory, updateCategory, deleteCategory } from '../authStore';
import { ICON_MAP, COLOR_THEMES, autoSuggest, getCategoryIconAndColor } from '../utils/categoryIcons';

const COLOR_THEME_LABELS = {
  primary: 'Brand Blue',
  secondary: 'Cool Gray',
  success: 'Mint',
  warning: 'Gold',
  danger: 'Red',
  info: 'Sky Blue'
};

const RECOMMENDED_COLOR_THEMES = ['blue', 'emerald', 'amber', 'red', 'purple', 'gray'];

const formatThemeLabel = (colorKey) =>
  COLOR_THEME_LABELS[colorKey] || colorKey.replace(/-/g, ' ');

export default function CategoryManagement({ onAddLog }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Layout State
  const [activeTab, setActiveTab] = useState('hierarchy'); // 'hierarchy' | 'flat'
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State (Modal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [iconName, setIconName] = useState('Wrench');
  const [colorTheme, setColorTheme] = useState('gray');
  const [manualOverride, setManualOverride] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [showMoreColors, setShowMoreColors] = useState(false);
  const nameInputRef = useRef(null);
  
  // Feedback
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const loadCategories = async (preserveSelection = false) => {
    setLoading(true);
    const data = await fetchCategoriesList();
    setCategories(data);
    
    // Auto-select first parent if none selected
    const parents = data.filter(c => !c.parentCategory);
    if (!preserveSelection && parents.length > 0) {
      setSelectedParentId(parents[0].id);
    } else if (preserveSelection && !parents.find(p => p.id === selectedParentId) && parents.length > 0) {
      setSelectedParentId(parents[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openForm = (cat = null, parentId = '') => {
    setErrorMsg('');
    setNotice('');
    if (cat) {
      setEditId(cat.id);
      setName(cat.name);
      setParentCategory(cat.parentCategory ? cat.parentCategory.id : '');
      
      const suggested = autoSuggest(cat.name);
      setIconName(cat.iconName || (suggested ? suggested.iconName : 'Wrench'));
      setColorTheme(cat.colorTheme || (suggested ? suggested.colorTheme : 'gray'));
      setManualOverride(true);
    } else {
      setEditId(null);
      setName('');
      setParentCategory(parentId);
      setIconName('Wrench');
      setColorTheme('gray');
      setManualOverride(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditId(null);
    setName('');
    setParentCategory('');
    setIconName('Wrench');
    setColorTheme('gray');
    setErrorMsg('');
    setIsAppearanceOpen(false);
    setShowMoreColors(false);
  };

  useEffect(() => {
    if (!isFormOpen) return;
    const frame = requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen || submitLoading) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeForm();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, submitLoading]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    
    if (!manualOverride) {
      const suggestion = autoSuggest(val);
      if (suggestion) {
        setIconName(suggestion.iconName);
        setColorTheme(suggestion.colorTheme);
      }
    }
  };

  const selectIcon = (name) => {
    setIconName(name);
    setManualOverride(true);
  };

  const selectColor = (key) => {
    setColorTheme(key);
    setManualOverride(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMsg('Category name is required.');
      return;
    }

    const duplicateCategory = categories.find(cat =>
      cat.id !== editId
      && cat.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateCategory) {
      setErrorMsg(`"${trimmedName}" already exists. Use a unique category name so staff can tell categories apart.`);
      return;
    }

    setSubmitLoading(true);
    setErrorMsg('');
    setNotice('');

    const payload = {
      name: trimmedName,
      parentCategory: parentCategory || null,
      iconName,
      colorTheme
    };

    let result;
    if (editId) {
      result = await updateCategory(editId, payload);
    } else {
      result = await createCategory(payload);
    }

    setSubmitLoading(false);

    if (!result.ok) {
      setErrorMsg(result.error || 'Failed to save category.');
      return;
    }

    setNotice(editId ? 'Category updated successfully!' : 'Category created successfully!');
    if (onAddLog) {
      onAddLog('system', `${editId ? 'Updated' : 'Created'} category: "${payload.name}"${payload.parentCategory ? ' (Subcategory)' : ''}.`);
    }
    
    closeForm();
    loadCategories(true);
    
    // Clear success notice after 3s
    setTimeout(() => setNotice(''), 3000);
  };

  const requestDelete = (category) => {
    setErrorMsg('');
    setNotice('');
    setDeleteTarget(category);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name: catName } = deleteTarget;
    setLoading(true);
    const result = await deleteCategory(id);
    setLoading(false);
    setDeleteTarget(null);

    if (!result.ok) {
      // Show error via notice system so it floats at the top
      setErrorMsg(result.error || 'Failed to delete category.');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    setNotice(`Category "${catName}" deleted successfully!`);
    if (onAddLog) {
      onAddLog('system', `Deleted category: "${catName}".`);
    }
    loadCategories(true);
    setTimeout(() => setNotice(''), 3000);
  };

  // Build Hierarchy Tree
  const topLevelCategories = categories.filter(c => !c.parentCategoryId);
  const totalSubCategories = categories.length - topLevelCategories.length;
  const getSubcategories = (parentId) => categories.filter(c => c.parentCategoryId === parentId);

  const selectedParent = topLevelCategories.find(c => c.id === selectedParentId) || topLevelCategories[0];
  const activeSubcategories = selectedParent ? getSubcategories(selectedParent.id) : [];

  // Flat view filtering
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const orphanCategories = categories.filter(c => c.parentCategoryId && !c.parentCategory);
  const duplicatedNames = categories.filter((cat, index, list) =>
    list.findIndex(item => item.name.trim().toLowerCase() === cat.name.trim().toLowerCase()) !== index
  );
  const reviewIssueCount = orphanCategories.length + duplicatedNames.length;
  const reviewIssues = [
    ...orphanCategories.map(cat => ({
      id: `orphan-${cat.id}`,
      title: cat.name,
      detail: 'Subcategory is missing a valid main category. Edit it and choose a parent category.'
    })),
    ...duplicatedNames.map(cat => ({
      id: `duplicate-${cat.id}`,
      title: cat.name,
      detail: 'Another category already uses this name. Rename one so staff can tell them apart.'
    }))
  ];
  const allColorThemeKeys = Object.keys(COLOR_THEMES);
  const visibleColorThemeKeys = showMoreColors
    ? allColorThemeKeys
    : Array.from(new Set([...RECOMMENDED_COLOR_THEMES, colorTheme])).filter(key => COLOR_THEMES[key]);

  const renderInlineError = () => (
    <div role="alert" className="mx-5 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs flex gap-3 items-start text-red-700 dark:text-red-200">
      <Warning className="text-red-500 shrink-0 mt-0.5 w-4 h-4" weight="duotone" />
      <div className="leading-relaxed">{errorMsg}</div>
      <button type="button" aria-label="Dismiss error" onClick={() => setErrorMsg('')} className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-white">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderFeedback = () => {
    if (isFormOpen && errorMsg) {
      return null;
    }

    if (errorMsg) {
      const alert = (
        <div role="alert" className="fixed top-20 right-6 z-[300] max-w-md w-[calc(100%-2rem)] rounded-2xl border border-red-500/20 bg-red-950/95 backdrop-blur-md p-4 text-xs flex gap-3 items-start shadow-2xl animate-scaleUp text-red-100">
          <Warning className="text-red-500 shrink-0 mt-0.5 w-5 h-5" weight="duotone" />
          <div className="leading-snug">{errorMsg}</div>
          <button type="button" aria-label="Dismiss error" onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-white"><X /></button>
        </div>
      );
      return createPortal(alert, document.body);
    }
    if (notice) {
      const status = (
        <div role="status" className="fixed top-20 right-6 z-[300] max-w-md w-[calc(100%-2rem)] rounded-2xl border border-emerald-500/20 bg-emerald-950/95 backdrop-blur-md p-4 text-xs flex gap-3 items-start shadow-2xl animate-scaleUp text-emerald-100">
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 w-5 h-5" weight="duotone" />
          <div className="leading-snug">{notice}</div>
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')} className="ml-auto text-emerald-400 hover:text-white"><X /></button>
        </div>
      );
      return createPortal(status, document.body);
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn min-h-[500px]">
      {renderFeedback()}

      {/* Header Toolbar */}
      <div className="rounded-2xl glass-panel p-5 md:p-6 border border-border shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="space-y-3">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-display flex items-center gap-2.5">
                <Tag weight="duotone" className="w-8 h-8 text-brandBlue-500" />
                Category Management
              </h1>
              <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                Organize catalog groups so staff can find, filter, and maintain truck parts faster.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
              <span>{topLevelCategories.length} main {topLevelCategories.length === 1 ? 'category' : 'categories'}</span>
              <span className="text-border">/</span>
              <span>{totalSubCategories} {totalSubCategories === 1 ? 'subcategory' : 'subcategories'}</span>
              {reviewIssueCount > 0 && (
                <>
                  <span className="text-border">/</span>
                  <button
                    type="button"
                    onClick={() => setIsReviewOpen(open => !open)}
                    aria-expanded={isReviewOpen}
                    aria-controls="category-review-issues"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors"
                  >
                    <WarningCircle className="w-3.5 h-3.5" weight="duotone" />
                    Review {reviewIssueCount} {reviewIssueCount === 1 ? 'issue' : 'issues'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row xl:justify-end gap-3">
          <div className="flex bg-secondary border border-border p-1 rounded-xl sm:min-w-56">
            <button
              type="button"
              onClick={() => setActiveTab('hierarchy')}
              aria-pressed={activeTab === 'hierarchy'}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'hierarchy' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List weight="bold" /> Hierarchy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('flat')}
              aria-pressed={activeTab === 'flat'}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'flat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Table weight="bold" /> Flat List
            </button>
          </div>

          <button
            type="button"
            onClick={() => openForm()}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Plus weight="bold" className="w-4 h-4 shrink-0" /> <span>Add Category</span>
          </button>
          </div>
        </div>

        {reviewIssueCount > 0 && isReviewOpen && (
          <div id="category-review-issues" className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Category issues to fix</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {reviewIssues.map(issue => (
                <div key={issue.id} className="rounded-lg border border-amber-500/20 bg-background/70 p-3">
                  <div className="text-sm font-bold text-foreground">{issue.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{issue.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && categories.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
          <CircleNotch className="w-5 h-5 animate-spin text-accent" /> Loading categories...
        </div>
      ) : activeTab === 'hierarchy' ? (
        /* ── TWO-PANE HIERARCHY VIEW ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANE: Master List (Main Categories) */}
          <div className="lg:col-span-4 glass-panel rounded-2xl flex flex-col border border-border overflow-hidden h-[600px]">
            <div className="p-4 border-b border-border bg-secondary/50 flex items-center justify-between shrink-0">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <List className="text-brandBlue-500 w-4 h-4" /> Main Categories
              </span>
              <span className="px-2 py-0.5 bg-brandBlue-500/10 text-brandBlue-500 rounded-md text-2xs font-bold">
                {topLevelCategories.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {topLevelCategories.length === 0 ? (
                <div className="p-5 text-center text-xs text-muted-foreground">
                  <FolderSimplePlus className="mx-auto mb-2 w-8 h-8 opacity-60" weight="duotone" />
                  <p className="font-bold text-foreground">No main categories yet</p>
                  <p className="mt-1">Start with a broad group like Engine, Brakes, or Electrical.</p>
                  <button
                    type="button"
                    onClick={() => openForm()}
                    className="mt-4 px-4 py-2 rounded-xl bg-accent text-white font-bold"
                  >
                    Add first category
                  </button>
                </div>
              ) : (
                topLevelCategories.map(parent => {
                  const subCount = getSubcategories(parent.id).length;
                  const isSelected = selectedParentId === parent.id;
                  const { Icon: CatIcon, color, bg } = getCategoryIconAndColor(parent.name, parent.iconName, parent.colorTheme);
                  
                  return (
                    <button
                      type="button"
                      key={parent.id}
                      onClick={() => setSelectedParentId(parent.id)}
                      aria-pressed={isSelected}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${isSelected ? 'bg-background border-brandBlue-500/30 shadow-sm' : 'border-transparent hover:bg-secondary/80'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-border/30 ${bg}`}>
                          {CatIcon && <CatIcon className={`w-4 h-4 ${color}`} weight="duotone" />}
                        </div>
                        <div>
                          <span className={`block text-sm font-bold ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>{parent.name}</span>
                          <span className="text-2xs text-muted-foreground">{subCount} subcategories</span>
                        </div>
                      </div>
                      <CaretRight className={`w-4 h-4 ${isSelected ? 'text-brandBlue-500' : 'text-muted-foreground/30'}`} weight="bold" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Detail View (Subcategories) */}
          <div className="lg:col-span-8 glass-panel rounded-2xl flex flex-col border border-border overflow-hidden h-[600px]">
            {selectedParent ? (
              <>
                <div className="p-6 border-b border-border bg-secondary/30 relative overflow-hidden shrink-0">
                  <div className={`absolute -right-10 -top-10 w-48 h-48 blur-3xl opacity-10 pointer-events-none ${getCategoryIconAndColor(selectedParent.name, selectedParent.iconName, selectedParent.colorTheme).bg}`} />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-border/50 shadow-inner ${getCategoryIconAndColor(selectedParent.name, selectedParent.iconName, selectedParent.colorTheme).bg}`}>
                        {(() => {
                          const { Icon: CatIcon, color } = getCategoryIconAndColor(selectedParent.name, selectedParent.iconName, selectedParent.colorTheme);
                          return CatIcon && <CatIcon className={`w-6 h-6 ${color}`} weight="duotone" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-bold text-foreground">{selectedParent.name}</h2>
                        <span className="text-xs text-muted-foreground">{activeSubcategories.length} Subcategories under this group</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={`Edit ${selectedParent.name}`}
                        onClick={() => openForm(selectedParent)}
                        className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${selectedParent.name}`}
                        onClick={() => requestDelete(selectedParent)}
                        className="p-2 hover:bg-red-950/20 rounded-lg text-muted-foreground hover:text-red-500 transition-colors border border-transparent hover:border-red-900/30"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end relative z-10">
                    <button
                      type="button"
                      onClick={() => openForm(null, selectedParent.id)}
                      className="px-4 py-2 bg-background border border-border hover:border-brandBlue-500/50 hover:text-brandBlue-500 text-muted-foreground font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Plus weight="bold" className="w-3.5 h-3.5" /> Add Subcategory
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-background/30">
                  {activeSubcategories.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60 min-h-[200px]">
                      <FolderSimplePlus className="w-12 h-12 text-muted-foreground" weight="duotone" />
                      <div>
                        <p className="text-sm font-bold text-foreground">No Subcategories</p>
                        <p className="text-xs text-muted-foreground">Create a smaller group so staff can filter this section faster.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openForm(null, selectedParent.id)}
                        className="px-4 py-2 rounded-xl bg-background border border-border text-xs font-bold text-foreground hover:border-brandBlue-500/50"
                      >
                        Add subcategory
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeSubcategories.map(child => {
                        const { color } = getCategoryIconAndColor(child.name, child.iconName, child.colorTheme);
                        return (
                          <div 
                            key={child.id} 
                            className="flex flex-col p-4 bg-background border border-border hover:border-border/80 rounded-xl transition-all hover:shadow-md hover:shadow-black/5"
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-bold text-sm text-foreground/90">{child.name}</span>
                              <div className="flex gap-1">
                                <button type="button" aria-label={`Edit ${child.name}`} onClick={() => openForm(child)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                                <button type="button" aria-label={`Delete ${child.name}`} onClick={() => requestDelete(child)} className="p-1.5 hover:bg-red-950/20 rounded-md text-muted-foreground hover:text-red-500"><Trash className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            <span className="text-2xs text-muted-foreground mt-1 flex items-center gap-1"><CaretRight className={color} /> Parent: {selectedParent.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a main category to view details.</div>
            )}
          </div>
        </div>
      ) : (
        /* ── FLAT LIST VIEW ── */
        <div className="glass-panel p-6 rounded-2xl flex flex-col border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground font-display flex items-center gap-2">
              <Table className="text-brandBlue-500 w-5 h-5" /> All Categories List
            </h3>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input 
                id="category-search"
                type="text" 
                aria-label="Search categories"
                placeholder="Search categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-brandBlue-500 text-foreground w-64"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/80 border-b border-border text-xs uppercase text-muted-foreground font-bold">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-muted-foreground text-xs">
                      <FolderSimplePlus className="mx-auto mb-2 w-8 h-8 opacity-60" weight="duotone" />
                      <p className="font-bold text-foreground">{searchQuery ? 'No categories match this search.' : 'No categories yet.'}</p>
                      <p className="mt-1">{searchQuery ? 'Clear the search or create a new category if this is missing.' : 'Create your first category to start organizing the catalog.'}</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 rounded-xl border border-border bg-background text-foreground font-bold"
                          >
                            Clear search
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openForm()}
                          className="px-4 py-2 rounded-xl bg-accent text-white font-bold"
                        >
                          Add category
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map(cat => {
                    const { Icon: CatIcon, color, bg } = getCategoryIconAndColor(cat.name, cat.iconName, cat.colorTheme);
                    
                    let ParentIcon = null;
                    let parentColor = '';
                    if (cat.parentCategory) {
                      const parentProps = getCategoryIconAndColor(cat.parentCategory.name, cat.parentCategory.iconName, cat.parentCategory.colorTheme);
                      ParentIcon = parentProps.Icon;
                      parentColor = parentProps.color;
                    }
                    
                    return (
                      <tr key={cat.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-border/30 ${bg}`}>
                              {CatIcon && <CatIcon className={`w-4 h-4 ${color}`} weight="duotone" />}
                            </div>
                            <span className="font-bold text-foreground text-xs">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-2xs font-bold ${!cat.parentCategory ? 'bg-brandBlue-500/10 text-brandBlue-500 border border-brandBlue-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                            {!cat.parentCategory ? 'MAIN' : 'SUB'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {cat.parentCategory ? (
                            <div className="flex items-center gap-1.5 opacity-80">
                              {ParentIcon && <ParentIcon className={`w-3.5 h-3.5 ${parentColor}`} weight="duotone" />}
                              <span>{cat.parentCategory.name}</span>
                            </div>
                          ) : '--'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" aria-label={`Edit ${cat.name}`} onClick={() => openForm(cat)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground inline-block mx-1 border border-transparent hover:border-border"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" aria-label={`Delete ${cat.name}`} onClick={() => requestDelete(cat)} className="p-1.5 hover:bg-red-950/20 rounded-md text-muted-foreground hover:text-red-500 inline-block mx-1 border border-transparent hover:border-red-900/30"><Trash className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL WITH ICON/COLOR PICKER ── */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={editId ? 'category-dialog-edit-title' : 'category-dialog-create-title'}
            className="w-full max-w-3xl bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0 bg-background/50">
              <h3
                id={editId ? 'category-dialog-edit-title' : 'category-dialog-create-title'}
                className="text-base font-bold text-foreground font-display flex items-center gap-2"
              >
                <FolderSimplePlus className="text-accent w-5 h-5" weight="duotone" />
                {editId ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button type="button" aria-label="Close category dialog" onClick={closeForm} className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
            {errorMsg && renderInlineError()}
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <form id="categoryForm" noValidate onSubmit={handleFormSubmit} className="flex flex-col gap-6">
                
                {/* LIVE PREVIEW BOX (Full Width) */}
                <div className="flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-secondary/30 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border border-border/30 shadow-sm ${COLOR_THEMES[colorTheme]?.split(' ').find(c => c.startsWith('bg-')) || 'bg-secondary'}`}>
                      {(() => {
                        const IconComponent = ICON_MAP[iconName] || ICON_MAP['Wrench'];
                        const textClass = COLOR_THEMES[colorTheme]?.split(' ').find(c => c.startsWith('text-')) || 'text-foreground';
                        return <IconComponent className={`w-7 h-7 ${textClass}`} weight="duotone" />;
                      })()}
                    </div>
                    <div>
                      <div className="text-2xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Live Preview</div>
                      <div className="text-lg font-bold text-foreground font-display">{name || 'Category Name'}</div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-2xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Parent</div>
                    <div className="text-sm font-semibold text-foreground/80">
                      {parentCategory ? categories.find(c => c.id === parentCategory)?.name : 'None (Main Category)'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Details */}
                  <div className="space-y-6">
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label htmlFor="category-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category Name *</label>
                        <input
                          id="category-name"
                          ref={nameInputRef}
                          type="text"
                          required
                          placeholder="e.g. Engine Components"
                          value={name}
                          onChange={handleNameChange}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 text-foreground transition-all"
                        />
                        {!manualOverride && name && autoSuggest(name) && (
                          <p className="text-2xs text-brandBlue-500 flex items-center gap-1 mt-1 animate-fadeIn">
                            <Star weight="fill" /> Auto-suggested icon and color applied.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="category-parent" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parent Category (Optional)</label>
                        <select
                          id="category-parent"
                          value={parentCategory}
                          onChange={(e) => setParentCategory(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 text-foreground transition-all"
                        >
                          <option value="">-- None (Create as Main Category) --</option>
                          {topLevelCategories
                            .filter(c => c.id !== editId)
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-expanded={isAppearanceOpen}
                      aria-controls="category-appearance-controls"
                      onClick={() => setIsAppearanceOpen(open => !open)}
                      className="w-full flex items-center justify-between rounded-2xl border border-border bg-background/50 p-4 text-left"
                    >
                      <span>
                        <span className="block text-xs font-bold text-foreground uppercase tracking-wider">Appearance overrides</span>
                        <span className="mt-1 block text-2xs text-muted-foreground">Optional: choose a custom icon and color, or let the name auto-suggest them.</span>
                      </span>
                      <CaretRight className={`w-4 h-4 text-muted-foreground transition-transform ${isAppearanceOpen ? 'rotate-90' : ''}`} weight="bold" />
                    </button>
                  </div>

                  {isAppearanceOpen && (
                  <div id="category-appearance-controls" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* COLOR THEME PICKER */}
                  <div className="space-y-3 bg-background/50 p-5 rounded-2xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Palette className="text-brandBlue-500 w-4 h-4" weight="duotone" /> Category Color
                      </div>
                    </div>
                    <div className="text-2xs text-muted-foreground leading-relaxed">
                      Pick a simple visual cue for this category. The system will suggest one from the name when it can.
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {visibleColorThemeKeys.map(colorKey => {
                        const themeClasses = COLOR_THEMES[colorKey];
                        const bgClass = themeClasses.split(' ').find(c => c.startsWith('bg-'));
                        const borderClass = themeClasses.split(' ').find(c => c.startsWith('border-'));
                        const textClass = themeClasses.split(' ').find(c => c.startsWith('text-'));
                        const isColorSelected = colorTheme === colorKey;
                        const colorLabel = formatThemeLabel(colorKey);
                        
                        return (
                          <button
                            key={colorKey}
                            type="button"
                            aria-label={`Use ${colorLabel} category color`}
                            onClick={() => selectColor(colorKey)}
                            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isColorSelected ? `bg-secondary border-brandBlue-500/50 shadow-sm` : 'bg-transparent border-border hover:bg-secondary/50'}`}
                            title={colorLabel}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full border ${borderClass} ${bgClass} shrink-0`} />
                            <span className={`text-2xs font-bold uppercase tracking-wider ${isColorSelected ? textClass : 'text-muted-foreground'}`}>
                              {colorLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMoreColors(open => !open)}
                      className="text-2xs font-bold uppercase tracking-wider text-brandBlue-600 dark:text-brandBlue-400 hover:underline"
                    >
                      {showMoreColors ? 'Show recommended colors' : 'More colors'}
                    </button>
                  </div>

                  {/* Icon Picker */}
                  <div className="space-y-4 bg-background/50 p-5 rounded-2xl border border-border/50 h-full flex flex-col">
                    <div className="flex items-center justify-between shrink-0">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="text-brandBlue-500 w-4 h-4" weight="duotone" /> Category Icon
                      </div>
                    </div>
                    <div className="text-2xs text-muted-foreground leading-relaxed shrink-0">
                      Choose a recognizable icon to pair with your color theme.
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 flex-1 content-start">
                      {Object.keys(ICON_MAP).map(iconKey => {
                        const IconComponent = ICON_MAP[iconKey];
                        const isIconSelected = iconName === iconKey;
                        const activeColor = COLOR_THEMES[colorTheme]?.split(' ').find(c => c.startsWith('text-')) || 'text-foreground';
                        const activeBg = COLOR_THEMES[colorTheme]?.split(' ').find(c => c.startsWith('bg-')) || 'bg-secondary';
                        
                        return (
                          <button
                            key={iconKey}
                            type="button"
                            aria-label={`Use ${iconKey} icon`}
                            onClick={() => selectIcon(iconKey)}
                            className={`flex flex-col items-center justify-center p-3 gap-2 rounded-xl transition-all ${isIconSelected ? `border border-border/50 shadow-sm ${activeBg} ${activeColor}` : 'text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm border border-transparent'}`}
                            title={iconKey}
                          >
                            <IconComponent weight={isIconSelected ? 'duotone' : 'regular'} className="w-6 h-6" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-5 border-t border-border flex justify-end gap-3 shrink-0 bg-background/50">
              <button type="button" onClick={closeForm} className="px-6 py-2.5 bg-secondary border border-border hover:bg-muted text-foreground font-bold rounded-xl text-xs transition-colors shadow-sm">
                Cancel
              </button>
              <button form="categoryForm" type="submit" disabled={submitLoading} className="px-8 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                {submitLoading ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="bold" className="w-4 h-4" />}
                {editId ? 'Save Updates' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-secondary shadow-2xl overflow-hidden animate-scaleUp"
          >
            <div className="p-5 border-b border-border bg-background/50 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <WarningCircle className="w-5 h-5" weight="duotone" />
              </div>
              <div>
                <h3 id="delete-category-title" className="text-base font-bold text-foreground font-display">Delete category?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This removes <span className="font-bold text-foreground">"{deleteTarget.name}"</span> from category management. Make sure no staff are relying on it for catalog filtering.
                </p>
              </div>
            </div>
            <div className="p-5 flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground hover:bg-secondary"
              >
                Keep category
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                Delete category
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
