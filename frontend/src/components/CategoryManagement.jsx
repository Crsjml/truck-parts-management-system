import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Plus, Pencil, Trash, CaretRight, Warning, CheckCircle, CircleNotch, List, FolderSimplePlus, Table, MagnifyingGlass, WarningCircle, X, Palette, Star } from '@phosphor-icons/react';
import { fetchCategoriesList, createCategory, updateCategory, deleteCategory } from '../authStore';
import { ICON_MAP, COLOR_THEMES, autoSuggest, getCategoryIconAndColor } from '../utils/categoryIcons';

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
  
  // Feedback
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadCategories = async (preserveSelection = false) => {
    setLoading(true);
    const data = await fetchCategoriesList();
    setCategories(data);
    
    // Auto-select first parent if none selected
    const parents = data.filter(c => !c.parentCategory);
    if (!preserveSelection && parents.length > 0) {
      setSelectedParentId(parents[0]._id);
    } else if (preserveSelection && !parents.find(p => p._id === selectedParentId) && parents.length > 0) {
      setSelectedParentId(parents[0]._id);
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
      setEditId(cat._id);
      setName(cat.name);
      setParentCategory(cat.parentCategory ? cat.parentCategory._id : '');
      
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
  };

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
    if (!name.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    setSubmitLoading(true);
    setErrorMsg('');
    setNotice('');

    const payload = {
      name: name.trim(),
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

  const handleDelete = async (id, catName) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    
    setLoading(true);
    const result = await deleteCategory(id);
    setLoading(false);

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
  const topLevelCategories = categories.filter(c => !c.parentCategory);
  const totalSubCategories = categories.length - topLevelCategories.length;
  const getSubcategories = (parentId) => categories.filter(c => c.parentCategory && c.parentCategory._id === parentId);

  const selectedParent = topLevelCategories.find(c => c._id === selectedParentId) || topLevelCategories[0];
  const activeSubcategories = selectedParent ? getSubcategories(selectedParent._id) : [];

  // Flat view filtering
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderFeedback = () => {
    if (errorMsg) {
      return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] max-w-md w-full rounded-2xl border border-red-500/20 bg-red-950/80 backdrop-blur-md p-4 text-xs flex gap-3 items-start shadow-2xl animate-scaleUp text-red-100">
          <Warning className="text-red-500 shrink-0 mt-0.5 w-5 h-5" weight="duotone" />
          <div className="leading-snug">{errorMsg}</div>
          <button onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-white"><X /></button>
        </div>
      );
    }
    if (notice) {
      return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] max-w-md w-full rounded-2xl border border-emerald-500/20 bg-emerald-950/80 backdrop-blur-md p-4 text-xs flex gap-3 items-start shadow-2xl animate-scaleUp text-emerald-100">
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 w-5 h-5" weight="duotone" />
          <div className="leading-snug">{notice}</div>
          <button onClick={() => setNotice('')} className="ml-auto text-emerald-400 hover:text-white"><X /></button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn min-h-[500px]">
      {renderFeedback()}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border-l-4 border-l-brandBlue-400 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display flex items-center gap-2.5">
            <Tag weight="duotone" className="w-8 h-8 text-brandBlue-500" />
            Category Management
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Create, edit, and audit truck part categories. Subcategories are dynamically linked to catalogs for easy filtering.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => openForm()}
            className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5"
          >
            <Plus weight="bold" className="w-4 h-4" /> Add Category
          </button>
          
          <div className="flex bg-secondary border border-border p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'hierarchy' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List weight="bold" /> Hierarchy
            </button>
            <button
              onClick={() => setActiveTab('flat')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'flat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Table weight="bold" /> Flat List
            </button>
          </div>
        </div>
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
                <div className="p-4 text-center text-xs text-muted-foreground italic">No main categories found.</div>
              ) : (
                topLevelCategories.map(parent => {
                  const subCount = getSubcategories(parent._id).length;
                  const isSelected = selectedParentId === parent._id;
                  const { Icon: CatIcon, color, bg } = getCategoryIconAndColor(parent.name, parent.iconName, parent.colorTheme);
                  
                  return (
                    <div
                      key={parent._id}
                      onClick={() => setSelectedParentId(parent._id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-background border-brandBlue-500/30 shadow-sm' : 'border-transparent hover:bg-secondary/80'}`}
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
                    </div>
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
                      <button onClick={() => openForm(selectedParent)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(selectedParent._id, selectedParent.name)} className="p-2 hover:bg-red-950/20 rounded-lg text-muted-foreground hover:text-red-500 transition-colors border border-transparent hover:border-red-900/30"><Trash className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end relative z-10">
                    <button
                      onClick={() => openForm(null, selectedParent._id)}
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
                        <p className="text-xs text-muted-foreground">Click "Add Subcategory" to create one.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeSubcategories.map(child => {
                        const { color } = getCategoryIconAndColor(child.name, child.iconName, child.colorTheme);
                        return (
                          <div 
                            key={child._id} 
                            className={`flex flex-col p-4 bg-background border border-border hover:border-border/80 rounded-xl group/sub transition-all hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5 hover:shadow-[inset_2px_0_0_0_currentColor] ${color}`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-bold text-sm text-foreground/90">{child.name}</span>
                              <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <button onClick={() => openForm(child)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(child._id, child.name)} className="p-1.5 hover:bg-red-950/20 rounded-md text-muted-foreground hover:text-red-500"><Trash className="w-3.5 h-3.5" /></button>
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
                type="text" 
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
                  <tr><td colSpan="4" className="text-center py-8 text-muted-foreground text-xs italic">No matching categories.</td></tr>
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
                      <tr key={cat._id} className="hover:bg-secondary/40 transition-colors">
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
                          <button onClick={() => openForm(cat)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground inline-block mx-1 border border-transparent hover:border-border"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(cat._id, cat.name)} className="p-1.5 hover:bg-red-950/20 rounded-md text-muted-foreground hover:text-red-500 inline-block mx-1 border border-transparent hover:border-red-900/30"><Trash className="w-3.5 h-3.5" /></button>
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
          <div className="w-full max-w-4xl bg-secondary border border-border rounded-2xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0 bg-background/50">
              <h3 className="text-base font-bold text-foreground font-display flex items-center gap-2">
                <FolderSimplePlus className="text-accent w-5 h-5" weight="duotone" />
                {editId ? 'Modify Category' : 'Create New Category'}
              </h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <X weight="bold" className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
              <form id="categoryForm" onSubmit={handleFormSubmit} className="flex flex-col gap-6">
                
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
                      {parentCategory ? categories.find(c => c._id === parentCategory)?.name : 'None (Main Category)'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: Details & Colors */}
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category Name *</label>
                        <input
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
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Parent Category (Optional)</label>
                        <select
                          value={parentCategory}
                          onChange={(e) => setParentCategory(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brandBlue-500 text-foreground transition-all"
                        >
                          <option value="">-- None (Create as Main Category) --</option>
                          {topLevelCategories
                            .filter(c => c._id !== editId)
                            .map(c => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    {/* COLOR THEME PICKER */}
                    <div className="space-y-3 bg-background/50 p-5 rounded-2xl border border-border/50">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Palette className="text-brandBlue-500 w-4 h-4" weight="duotone" /> Color Theme
                        </label>
                      </div>
                      <div className="text-2xs text-muted-foreground leading-relaxed">
                        Select a vibrant theme. Colors marked with a dot are already in use.
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.keys(COLOR_THEMES).map(colorKey => {
                          const themeClasses = COLOR_THEMES[colorKey];
                          const bgClass = themeClasses.split(' ').find(c => c.startsWith('bg-'));
                          const borderClass = themeClasses.split(' ').find(c => c.startsWith('border-'));
                          const textClass = themeClasses.split(' ').find(c => c.startsWith('text-'));
                          const isColorSelected = colorTheme === colorKey;
                          
                          const isUsed = categories.some(c => {
                            if (c._id === editId) return false;
                            const actualColorTheme = c.colorTheme || autoSuggest(c.name)?.colorTheme || 'gray';
                            return actualColorTheme === colorKey;
                          });
                          
                          return (
                            <button
                              key={colorKey}
                              type="button"
                              onClick={() => selectColor(colorKey)}
                              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isColorSelected ? `bg-secondary border-brandBlue-500/50 shadow-sm` : 'bg-transparent border-border hover:bg-secondary/50'}`}
                              title={`${colorKey} ${isUsed ? '(Already Used)' : ''}`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border ${borderClass} ${bgClass} shrink-0`} />
                              <span className={`text-2xs font-bold uppercase tracking-wider ${isColorSelected ? textClass : 'text-muted-foreground'}`}>
                                {colorKey}
                              </span>
                              {isUsed && (
                                <div className="absolute right-0 top-0 -mr-1 -mt-1 w-2.5 h-2.5 rounded-full bg-foreground/30 border-2 border-background" title="Already in use" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Icon Picker */}
                  <div className="space-y-4 bg-background/50 p-5 rounded-2xl border border-border/50 h-full flex flex-col">
                    <div className="flex items-center justify-between shrink-0">
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="text-brandBlue-500 w-4 h-4" weight="duotone" /> Category Icon
                      </label>
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
              </form>
            </div>
            
            <div className="p-5 border-t border-border flex justify-end gap-3 shrink-0 bg-background/50">
              <button type="button" onClick={closeForm} className="px-6 py-2.5 bg-secondary border border-border hover:bg-muted text-foreground font-bold rounded-xl text-xs transition-colors shadow-sm">
                Cancel
              </button>
              <button form="categoryForm" type="submit" disabled={submitLoading} className="px-8 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                {submitLoading ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="bold" className="w-4 h-4" />}
                {editId ? 'Save Updates' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
