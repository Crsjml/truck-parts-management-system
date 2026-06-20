// frontend/src/components/CategoryManagement.jsx
import React, { useState, useEffect } from 'react';
import { Tag, Plus, Pencil, Trash, CaretRight, Warning, CheckCircle, CircleNotch, List, FolderSimplePlus, Bell } from '@phosphor-icons/react';
import { fetchCategoriesList, createCategory, updateCategory, deleteCategory } from '../authStore';

export default function CategoryManagement({ onAddLog }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  
  // Feedback
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    const data = await fetchCategoriesList();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setName('');
    setParentCategory('');
    setEditId(null);
    setErrorMsg('');
    setNotice('');
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
      parentCategory: parentCategory || null
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
    
    resetForm();
    loadCategories();
  };

  const startEdit = (cat) => {
    setEditId(cat._id);
    setName(cat.name);
    setParentCategory(cat.parentCategory ? cat.parentCategory._id : '');
    setErrorMsg('');
    setNotice('');
  };

  const handleDelete = async (id, catName) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    
    setLoading(true);
    const result = await deleteCategory(id);
    setLoading(false);

    if (!result.ok) {
      setErrorMsg(result.error || 'Failed to delete category.');
      return;
    }

    setNotice(`Category "${catName}" deleted successfully!`);
    if (onAddLog) {
      onAddLog('system', `Deleted category: "${catName}".`);
    }
    loadCategories();
  };

  // Build Hierarchy Tree
  const topLevelCategories = categories.filter(c => !c.parentCategory);
  const getSubcategories = (parentId) => categories.filter(c => c.parentCategory && c.parentCategory._id === parentId);

  const renderFeedback = () => {
    if (errorMsg) {
      return (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs flex gap-3 items-start animate-scaleUp text-red-600 dark:text-red-400">
          <Warning className="text-red-500 shrink-0 mt-0.5 w-4.5 h-4.5" weight="duotone" />
          <div className="leading-snug">{errorMsg}</div>
        </div>
      );
    }
    if (notice) {
      return (
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs flex gap-3 items-start animate-scaleUp text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 w-4.5 h-4.5" weight="duotone" />
          <div className="leading-snug">{notice}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 border-l-4 border-l-brandBlue-400 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brandBlue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display flex items-center gap-2.5">
            <Tag weight="duotone" className="w-8 h-8 text-brandBlue-500" />
            Category & Subcategory Management
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Create, edit, and audit truck part categories and subcategories. Subcategories are dynamically linked to parts catalogs for easy filtering.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Create/Edit Form */}
        <div className="glass-panel p-6 rounded-2xl h-fit border border-slate-200/50 dark:border-white/5 bg-slate-100/40 dark:bg-slate-900/30 backdrop-blur-2xl">
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
              <FolderSimplePlus weight="duotone" className="w-5 h-5 text-accent" />
              <h3 className="text-base font-bold text-foreground font-display">
                {editId ? 'Modify Category' : 'Create New Category'}
              </h3>
            </div>

            {renderFeedback()}

            {/* Category Name */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Pistons & Cylinders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
              />
            </div>

            {/* Parent Category (Optional for nested subcategories) */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Parent Category (Optional)</label>
              <select
                value={parentCategory}
                onChange={(e) => setParentCategory(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
              >
                <option value="">-- None (Creates Top-Level Category) --</option>
                {topLevelCategories
                  .filter(c => c._id !== editId) // Prevent category from being its own parent in the select options
                  .map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))
                }
              </select>
              <span className="text-[9px] text-muted-foreground block mt-1 leading-snug">
                Select a parent category if you want to create a subcategory (e.g. selecting "Engine" for "Turbochargers").
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitLoading}
                className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitLoading ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Plus weight="bold" className="w-3.5 h-3.5" />}
                {editId ? 'Save Updates' : 'Add Category'}
              </button>
              
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-secondary hover:bg-slate-700 text-muted-foreground border border-border font-semibold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Tree Listing */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <List weight="duotone" className="w-5 h-5 text-brandBlue-400" />
              <h3 className="text-base font-bold text-foreground font-display">Seeded & Custom Hierarchy</h3>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-secondary text-muted-foreground border border-border uppercase tracking-wider">
              {categories.length} Categories Total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
              <CircleNotch className="w-4 h-4 animate-spin text-accent" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">No categories defined yet. Add some on the left panel!</p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {topLevelCategories.map(parent => {
                const subCats = getSubcategories(parent._id);
                return (
                  <div 
                    key={parent._id} 
                    className="p-4 rounded-2xl bg-secondary/40 border border-slate-200/50 dark:border-white/5 space-y-3 shadow-sm hover:shadow-md transition-all duration-300 group"
                  >
                    {/* Parent Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-brandBlue-400" weight="fill" />
                        <span className="font-extrabold text-foreground text-sm font-display tracking-tight">{parent.name}</span>
                        <span className="text-[9px] bg-brandBlue-500/10 dark:bg-brandBlue-900/30 text-brandBlue-600 dark:text-brandBlue-400 border border-brandBlue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Parent
                        </span>
                      </div>
                      <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(parent)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
                          title="Rename/Edit Parent Category"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(parent._id, parent.name)}
                          className="p-1.5 hover:bg-red-950/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors border border-border"
                          title="Delete Parent Category"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories (Children) List */}
                    <div className="pl-6 border-l border-slate-900 space-y-2.5">
                      {subCats.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic pl-2">No subcategories defined.</p>
                      ) : (
                        subCats.map(child => (
                          <div 
                            key={child._id} 
                            className="flex items-center justify-between py-1.5 px-3 bg-background border border-border rounded-xl text-xs group/sub"
                          >
                            <div className="flex items-center gap-1.5">
                              <CaretRight className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-semibold text-muted-foreground text-xs">{child.name}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEdit(child)}
                                className="p-1 hover:bg-slate-700 rounded text-muted-foreground hover:text-foreground transition-colors border border-border"
                                title="Rename/Edit Subcategory"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(child._id, child.name)}
                                className="p-1 hover:bg-red-950/10 rounded text-muted-foreground hover:text-red-500 transition-colors border border-border"
                                title="Delete Subcategory"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
