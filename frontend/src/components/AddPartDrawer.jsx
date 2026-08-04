import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, WarningCircle, ArrowRight, ArrowLeft, 
  Package, ListDashes, CurrencyDollar, Image, SquaresFour 
} from '@phosphor-icons/react';
import { z } from 'zod';
import Select from 'react-select';
import { customSelectStyles } from './ui/PurchasingAtoms';
import { getCategoryIconAndColor } from '../utils/categoryIcons';
import { Drawer } from './ui/Drawer';
import CompatibilityEditor from './inventory/CompatibilityEditor';
import { normalizeCompatibilityRows, compatibilityRowsToPayload, compatibilityRowsToSummary } from '../utils/compatibilityModels';

const emptyConfirmDialog = () => ({ isOpen: false, title: '', message: '', confirmText: '', onConfirm: null });

const partSchema = z.object({
  name: z.string().min(3, "Part name must be at least 3 characters."),
  sku: z.string().min(1, "SKU is required."),
  oem: z.string().min(1, "OEM number is required."),
  category: z.string().min(1, "Category selection is required."),
  price: z.number().min(0, "Price must be a valid positive number."),
  stock: z.number().min(0, "Stock must be a non-negative number."),
  minStock: z.number().min(0, "Safety min stock must be non-negative.")
});

export default function AddPartDrawer({ 
  isOpen, 
  onClose, 
  onAddPart, 
  categoriesList,
  parts
}) {
  const [step, setStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cloneId, setCloneId] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formOem, setFormOem] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formMinStock, setFormMinStock] = useState('');

  const [confirmDialog, setConfirmDialog] = useState(emptyConfirmDialog);
  const [formCompatibleWith, setFormCompatibleWith] = useState(normalizeCompatibilityRows(''));
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');

  // Reset form when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCloneId('');
      setFormName('');
      setFormSku('');
      setFormOem('');
      setFormCategory('');
      setFormPrice('');
      setFormStock('');
      setFormMinStock('');
      setFormCompatibleWith(normalizeCompatibilityRows(''));
      setFormDescription('');
      setFormImage('');
      setFormErrors({});
      setServerError('');
      setIsSubmitting(false);
      setConfirmDialog(emptyConfirmDialog());
    } else {
      setConfirmDialog(emptyConfirmDialog());
    }
  }, [isOpen]);

  const validateStep = (currentStep) => {
    const errors = {};
    if (currentStep === 1) {
      const result = partSchema.pick({ name: true, sku: true, oem: true, category: true }).safeParse({
        name: formName.trim(),
        sku: formSku.trim(),
        oem: formOem.trim(),
        category: formCategory
      });
      if (!result.success) {
        result.error.issues.forEach(issue => {
          errors[issue.path[0]] = issue.message;
        });
      }
    } else if (currentStep === 3) {
      const result = partSchema.pick({ price: true, stock: true, minStock: true }).safeParse({
        price: isNaN(parseFloat(formPrice)) ? -1 : parseFloat(formPrice),
        stock: isNaN(parseInt(formStock)) ? -1 : parseInt(formStock),
        minStock: isNaN(parseInt(formMinStock)) ? -1 : parseInt(formMinStock)
      });
      if (!result.success) {
        result.error.issues.forEach(issue => {
          errors[issue.path[0]] = issue.message;
        });
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleFormSubmit = async () => {
    if (!validateStep(3)) return;
    
    setServerError('');
    setIsSubmitting(true);

    const partData = {
      name: formName.trim(),
      sku: formSku.trim(),
      oem: formOem.trim(),
      category_id: formCategory,
      price: parseFloat(formPrice),
      stock: parseInt(formStock),
      minStock: parseInt(formMinStock),
      compatibility: compatibilityRowsToSummary(formCompatibleWith),
      compatibleWith: compatibilityRowsToPayload(formCompatibleWith),
      description: formDescription.trim(),
      image: formImage
    };

    try {
      const result = await onAddPart(partData);
      if (result && !result.ok) {
        setServerError(result.error || 'An error occurred. Please try again.');
      } else {
        onClose();
      }
    } catch (err) {
      setServerError('Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !isSubmitting) return null;

  const isDirty = formName || formSku || formOem || formCategory || formPrice || formStock || formDescription || formImage || formCompatibleWith.some(c => c.brand || c.series || c.year);
  const filledCompatibilityRows = formCompatibleWith.filter(row => row.brand || row.series || row.year).length;
  const closeConfirmDialog = () => setConfirmDialog(emptyConfirmDialog());
  const requestClose = () => {
    if (isDirty) {
      setConfirmDialog({
        isOpen: true,
        title: 'Discard unsaved changes?',
        message: 'Your input will be lost.',
        confirmText: 'Discard',
        onConfirm: onClose
      });
      return;
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
          {/* Drawer backdrop click to close */}
          <div className="absolute inset-0" onClick={requestClose} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-part-drawer-title"
            className="relative w-full max-w-5xl h-[min(100%,calc(100vh-2rem))] sm:h-[min(100%,calc(100vh-3rem))] bg-secondary/95 border border-border shadow-[0_30px_90px_rgba(15,23,42,0.22)] rounded-3xl overflow-hidden flex flex-col backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 sm:px-8 border-b border-border bg-background/85 backdrop-blur-xl z-10">
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <h3 id="add-part-drawer-title" className="text-2xl sm:text-[1.65rem] font-bold text-foreground font-display">Add New Part</h3>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    Build a new catalog item with fitment, description, and stock controls in one clean flow.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-brandBlue-200 bg-brandBlue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brandBlue-700">
                    Step {step} of 3
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    {step === 1 ? 'Basic Info' : step === 2 ? 'Details & Compatibility' : 'Pricing & Stock'}
                  </span>
                  {cloneId && (
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground">
                      Template selected
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={requestClose}
                aria-label="Close add part drawer"
                className="shrink-0 p-2.5 bg-secondary hover:bg-background rounded-2xl text-muted-foreground hover:text-foreground transition-colors border border-border"
              >
                <X weight="bold" className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-secondary h-1.5 flex">
              <div className={`h-full bg-brandBlue-500 transition-all duration-300 ease-in-out ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 custom-scrollbar relative bg-secondary/60">
              
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="rounded-3xl border border-border bg-background/85 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                          <SquaresFour weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Start from a template
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Pull an existing part into this form, then edit the details that are different.
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-brandBlue-200 bg-brandBlue-50 px-3 py-1 text-[11px] font-semibold leading-none text-brandBlue-700 sm:self-center">
                        Optional shortcut
                      </span>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="flex-1">
                        <Select
                          options={parts.map(p => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                          value={cloneId ? (() => {
                            const selectedPart = parts.find(p => String(p.id) === String(cloneId));
                            return selectedPart ? { value: selectedPart.id, label: `${selectedPart.sku} - ${selectedPart.name}` } : null;
                          })() : null}
                          onChange={(selected) => setCloneId(selected?.value || '')}
                          placeholder="-- Select a part to clone its details --"
                          styles={customSelectStyles}
                          isClearable
                          classNamePrefix="react-select"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!cloneId) return;
                          
                          const applyTemplate = () => {
                            const p = parts.find(x => String(x.id) === String(cloneId));
                            if (p) {
                              setFormName(p.name + ' (Copy)');
                              setFormOem(p.oem || '');
                              setFormCategory(p.categoryId || p.category?.id || p.category || '');
                              setFormPrice(p.price || '');
                              setFormMinStock(p.min_stock || p.minStock || 0);
                              setFormStock(0);
                              setFormSku('');
                              setFormCompatibleWith(normalizeCompatibilityRows(p.compatibleWith?.length ? p.compatibleWith : p.compatibility || ''));
                              setFormDescription(p.description || '');
                              setFormImage(p.image || '');
                              setFormErrors({});
                            }
                          };

                          if (formName || formSku || formOem || formPrice) {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Apply Template?',
                              message: 'Are you sure you want to apply this template? This will overwrite your current inputs.',
                              confirmText: 'Apply Template',
                              onConfirm: applyTemplate
                            });
                            return;
                          }
                          
                          applyTemplate();
                        }}
                        className="px-4 py-2.5 bg-brandBlue-500 hover:bg-brandBlue-600 text-white text-sm font-bold rounded-2xl transition-colors shrink-0 shadow-sm shadow-brandBlue-500/15"
                      >
                        Apply Template
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-background/85 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Package weight="duotone" className="w-4 h-4 text-brandBlue-400" />
                        Core identity
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Name, SKU, OEM, and category drive search, filtering, and inventory reporting.
                      </p>
                    </div>

                    <div className="space-y-1.5 group">
                      <label htmlFor="add-part-name" className={`text-sm font-medium flex items-center gap-1.5 transition-colors ${formName ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Part Name *
                      </label>
                      <input 
                        id="add-part-name"
                        type="text" 
                        placeholder="e.g. Starter Motor Assembly (24V)"
                        value={formName}
                        onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({...prev, name: ''})); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}
                        className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.name ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-brandBlue-500'}`}
                      />
                      {formErrors.name && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.name}</p>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 group">
                        <label htmlFor="add-part-sku" className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                          SKU *
                        </label>
                        <input 
                          id="add-part-sku"
                          type="text" 
                          placeholder="e.g. ELC-STR"
                          value={formSku}
                          onChange={(e) => { setFormSku(e.target.value); setFormErrors(prev => ({...prev, sku: ''})); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}
                          className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.sku ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-brandBlue-500'}`}
                        />
                        {formErrors.sku && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.sku}</p>}
                      </div>
                      <div className="space-y-1.5 group">
                        <label htmlFor="add-part-oem" className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                          OEM No. *
                        </label>
                        <input 
                          id="add-part-oem"
                          type="text" 
                          placeholder="e.g. 1-81100-341-1"
                          value={formOem}
                          onChange={(e) => { setFormOem(e.target.value); setFormErrors(prev => ({...prev, oem: ''})); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); nextStep(); } }}
                          className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.oem ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-brandBlue-500'}`}
                        />
                        {formErrors.oem && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.oem}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="add-part-category" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        Category *
                      </label>
                      <div className={`${formErrors.category ? 'rounded-2xl ring-1 ring-destructive' : ''}`}>
                        <Select
                          inputId="add-part-category"
                          aria-invalid={!!formErrors.category}
                          aria-describedby={formErrors.category ? "category-error" : undefined}
                          options={categoriesList.filter(c => !c.parentCategory).map(parent => ({
                            label: parent.name,
                            options: [
                              { value: parent.id, label: `${parent.name} (Main)`, catName: parent.name, iconName: parent.iconName, colorTheme: parent.colorTheme },
                              ...categoriesList.filter(c => c.parentCategory && c.parentCategory.id?.toString() === parent.id?.toString()).map(sub => ({ value: sub.id, label: sub.name, catName: sub.name, iconName: sub.iconName, colorTheme: sub.colorTheme }))
                            ]
                          }))}
                          value={
                            formCategory 
                              ? (() => {
                                  const c = categoriesList.find(cat => String(cat.id) === String(formCategory));
                                  return c ? { value: c.id, label: c.name, catName: c.name, iconName: c.iconName, colorTheme: c.colorTheme } : null;
                                })()
                              : null
                          }
                          onChange={(selected) => { setFormCategory(selected?.value || ''); setFormErrors(prev => ({...prev, category: ''})); }}
                          placeholder="-- Select Category --"
                          styles={customSelectStyles}
                          isClearable
                          classNamePrefix="react-select"
                          formatOptionLabel={(option) => {
                            if (!option.catName) return <span>{option.label}</span>;
                            const { Icon, color } = getCategoryIconAndColor(option.catName, option.iconName, option.colorTheme);
                            return (
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${color}`} weight="duotone" />
                                <span>{option.label}</span>
                              </div>
                            );
                          }}
                        />
                      </div>
                      {formErrors.category && <p id="category-error" className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.category}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Compatibility & Description */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="rounded-3xl border border-border bg-background/85 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Package className="w-4 h-4 text-brandBlue-400" />
                          Fitment
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add one row per compatible truck or leave it blank for universal parts.
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                        {filledCompatibilityRows} filled row{filledCompatibilityRows === 1 ? '' : 's'}
                      </span>
                    </div>
                    <CompatibilityEditor rows={formCompatibleWith} onChange={setFormCompatibleWith} mode="add" />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-3xl border border-border bg-background/85 p-5 sm:p-6 shadow-sm space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                        <ListDashes className="w-4 h-4 text-brandBlue-400" />
                        Technical Description
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Capture the details that help staff match, verify, and sell the part quickly.
                      </p>
                      <textarea 
                        rows="6"
                        placeholder="Enter part details, technical specs..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="mt-2 w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground resize-none custom-scrollbar"
                      />
                    </div>

                    <div className="rounded-3xl border border-border bg-background/85 p-5 sm:p-6 shadow-sm space-y-3">
                      <div className="space-y-1">
                        <label htmlFor="part-image" className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <Image className="w-4 h-4 text-brandBlue-400" />
                          Part Image
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Use a clear image so the inventory card stays easy to scan.
                        </p>
                      </div>
                      <div className="flex items-center gap-4 bg-background border border-border rounded-2xl p-4">
                        <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-secondary flex items-center justify-center border border-border">
                          {formImage ? (
                            <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="w-6 h-6 text-muted-foreground/30" weight="duotone" />
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <input 
                            id="part-image"
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  setFormErrors(prev => ({...prev, image: 'Image size must be smaller than 2MB.'}));
                                  return;
                                }
                                setFormErrors(prev => ({...prev, image: ''}));
                                const reader = new FileReader();
                                reader.onloadend = () => setFormImage(reader.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brandBlue-50 file:text-brandBlue-600 hover:file:bg-brandBlue-100 transition-colors"
                          />
                          <p className="text-2xs text-muted-foreground/70">Max size: 2MB. Square ratio recommended.</p>
                        </div>
                        {formImage && (
                          <button 
                            type="button"
                            onClick={() => setFormImage('')}
                            className="text-2xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/30 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {formErrors.image && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.image}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Pricing & Stock */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="rounded-3xl border border-border bg-background/85 p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <CurrencyDollar className="w-4 h-4 text-brandBlue-400" />
                        Pricing
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set the retail and alert values that the POS, inventory alerts, and reorder flow will use.
                      </p>
                    </div>

                    <div className="space-y-1.5 group">
                      <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                        Retail Price (₱) *
                      </label>
                      <input 
                        type="number" 
                        step="0.01" min="0" placeholder="0.00"
                        value={formPrice}
                        onChange={(e) => { setFormPrice(e.target.value); setFormErrors(prev => ({...prev, price: ''})); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFormSubmit(e); } }}
                        className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.price ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-brandBlue-500'}`}
                      />
                      {formErrors.price && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.price}</p>}
                    </div>

                    <div className="rounded-3xl border border-border bg-secondary/30 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-brandBlue-400" />
                        Stock planning
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5 group">
                          <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                            Initial Stock *
                          </label>
                          <input 
                            type="number" 
                            min="0" placeholder="0"
                            value={formStock}
                            onChange={(e) => { setFormStock(e.target.value); setFormErrors(prev => ({...prev, stock: ''})); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFormSubmit(e); } }}
                            className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.stock ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-brandBlue-500'}`}
                          />
                          {formErrors.stock && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.stock}</p>}
                        </div>

                        <div className="space-y-1.5 group">
                          <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                            Min Stock Alert *
                          </label>
                          <input 
                            type="number" 
                            min="0" placeholder="5"
                            value={formMinStock}
                            onChange={(e) => { setFormMinStock(e.target.value); setFormErrors(prev => ({...prev, minStock: ''})); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFormSubmit(e); } }}
                            className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.minStock ? 'border-destructive ring-1 ring-destructive/20' : 'border-border focus:border-brandBlue-500'}`}
                          />
                          {formErrors.minStock && <p className="text-2xs text-destructive dark:text-destructive-foreground font-semibold">{formErrors.minStock}</p>}
                        </div>
                      </div>
                    </div>

                    {serverError && (
                      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive dark:text-destructive-foreground text-sm font-semibold animate-fadeIn">
                        <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5 text-destructive dark:text-destructive-foreground" />
                        <span>{serverError}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </div>

            {/* Footer Navigation */}
            <div className="p-4 sm:p-5 border-t border-border bg-background/90 backdrop-blur-xl flex items-center justify-between">
              <button 
                type="button" 
                onClick={step === 1 ? requestClose : prevStep}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-secondary hover:bg-background text-muted-foreground text-sm font-bold rounded-2xl border border-border transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {step > 1 && <ArrowLeft weight="bold" className="w-4 h-4" />}
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              <button 
                type="button"
                onClick={step === 3 ? handleFormSubmit : nextStep}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/60 text-white text-sm font-bold rounded-2xl shadow-lg shadow-accent/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <>
                    {step === 3 ? 'Save Part' : 'Next Step'}
                    {step < 3 && <ArrowRight weight="bold" className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirmDialog}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText }) {
  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose}
      labelledBy="confirm-title"
      describedBy="confirm-desc"
      wrapperClassName="flex items-center justify-center p-4 z-[140]"
      wrapperStyle={{ zIndex: 140 }}
      overlayClassName="bg-background/85 backdrop-blur-md"
      panelClassName="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden flex flex-col ring-1 ring-black/5"
      panelVariants={{
        initial: { opacity: 0, scale: 0.95, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 10 },
        transition: { duration: 0.2, ease: "easeOut" }
      }}
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-lg font-bold mb-2 flex items-center gap-2">
          <WarningCircle weight="duotone" className="w-5 h-5 text-destructive" />
          {title}
        </h2>
        <p id="confirm-desc" className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={() => {
              onClose();
              if (onConfirm) onConfirm();
            }}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
