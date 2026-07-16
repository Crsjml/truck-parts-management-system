import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, WarningCircle, ArrowRight, ArrowLeft, 
  Package, ListDashes, Tag, Funnel, Truck, CurrencyDollar, Image, SquaresFour 
} from '@phosphor-icons/react';
import { z } from 'zod';
import Select from 'react-select';
import { customSelectStyles } from './ui/PurchasingAtoms';
import { getCategoryIconAndColor } from '../utils/categoryIcons';

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
  const [formCompatibility, setFormCompatibility] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');

  // Reset form when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormName('');
      setFormSku('');
      setFormOem('');
      setFormCategory('');
      setFormPrice('');
      setFormStock('');
      setFormMinStock('');
      setFormCompatibility('');
      setFormDescription('');
      setFormImage('');
      setFormErrors({});
      setServerError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateStep = (currentStep) => {
    const errors = {};
    if (currentStep === 1) {
      if (!formName.trim() || formName.length < 3) errors.name = "Part name must be at least 3 characters.";
      if (!formSku.trim()) errors.sku = "SKU is required.";
      if (!formOem.trim()) errors.oem = "OEM number is required.";
      if (!formCategory) errors.category = "Category is required.";
    } else if (currentStep === 3) {
      if (isNaN(parseFloat(formPrice)) || parseFloat(formPrice) < 0) errors.price = "Valid price required.";
      if (isNaN(parseInt(formStock)) || parseInt(formStock) < 0) errors.stock = "Valid stock required.";
      if (isNaN(parseInt(formMinStock)) || parseInt(formMinStock) < 0) errors.minStock = "Valid min stock required.";
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
      compatibility: formCompatibility.trim(),
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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Drawer backdrop click to close */}
          <div className="absolute inset-0" onClick={onClose} />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-xl h-full bg-secondary border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-background z-10">
              <div>
                <h3 className="text-xl font-bold text-foreground font-display">Add New Part</h3>
                <p className="text-xs text-muted-foreground mt-1">Step {step} of 3: {step === 1 ? 'Basic Info' : step === 2 ? 'Details & Compatibility' : 'Pricing & Stock'}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-secondary hover:bg-background rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                <X weight="bold" className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-secondary h-1.5 flex">
              <div className={`h-full bg-brandBlue-500 transition-all duration-300 ease-in-out ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
              
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="space-y-1.5 bg-secondary/30 p-4 rounded-xl border border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <SquaresFour weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Clone Existing Part Template
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          options={parts.map(p => ({ value: p.id, label: `${p.sku} - ${p.name}` }))}
                          value={cloneId ? { value: cloneId, label: parts.find(p => String(p.id) === String(cloneId))?.name || 'Selected' } : null}
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
                          if (formName || formSku || formOem || formPrice) {
                            if (!window.confirm("Are you sure you want to apply this template? This will overwrite your current inputs.")) return;
                          }
                          const p = parts.find(x => String(x.id) === String(cloneId));
                          if (p) {
                            setFormName(p.name + ' (Copy)');
                            setFormOem(p.oem || '');
                            setFormCategory(p.categoryId || p.category?.id || p.category || '');
                            setFormPrice(p.price || '');
                            setFormMinStock(p.min_stock || p.minStock || 0);
                            setFormStock(0);
                            setFormSku('');
                            setFormCompatibility(p.compatibility || '');
                            setFormDescription(p.description || '');
                            setFormErrors({});
                          }
                        }}
                        className="px-4 py-2 bg-brandBlue-500 hover:bg-brandBlue-600 text-white text-sm font-bold rounded-xl transition-colors shrink-0"
                      >
                        Apply Template
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 group">
                    <label className={`text-xs font-semibold uppercase flex items-center gap-1.5 transition-colors ${formName ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <Package weight="duotone" className={`w-4 h-4 ${formName ? 'text-emerald-500' : 'text-brandBlue-400'}`} /> Part Name *
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Starter Motor Assembly (24V)"
                      value={formName}
                      onChange={(e) => { setFormName(e.target.value); setFormErrors(prev => ({...prev, name: ''})); }}
                      className={`w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.name ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border focus:border-brandBlue-500'}`}
                    />
                    {formErrors.name && <p className="text-2xs text-red-400 font-semibold">{formErrors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 group">
                      <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                        <ListDashes weight="duotone" className="w-4 h-4 text-brandBlue-400" /> SKU *
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. ELC-STR"
                        value={formSku}
                        onChange={(e) => { setFormSku(e.target.value); setFormErrors(prev => ({...prev, sku: ''})); }}
                        className={`w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.sku ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border focus:border-brandBlue-500'}`}
                      />
                      {formErrors.sku && <p className="text-2xs text-red-400 font-semibold">{formErrors.sku}</p>}
                    </div>
                    <div className="space-y-1.5 group">
                      <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                        <Tag weight="duotone" className="w-4 h-4 text-brandBlue-400" /> OEM No. *
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1-81100-341-1"
                        value={formOem}
                        onChange={(e) => { setFormOem(e.target.value); setFormErrors(prev => ({...prev, oem: ''})); }}
                        className={`w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.oem ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border focus:border-brandBlue-500'}`}
                      />
                      {formErrors.oem && <p className="text-2xs text-red-400 font-semibold">{formErrors.oem}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Funnel weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Category *
                    </label>
                    <div className={`${formErrors.category ? 'rounded-xl ring-1 ring-red-500' : ''}`}>
                      <Select
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
                    {formErrors.category && <p className="text-2xs text-red-400 font-semibold">{formErrors.category}</p>}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Compatibility & Description */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                      <Truck weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Compatibility Models
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Isuzu ELF NPR, Forward, Hino 300"
                      value={formCompatibility}
                      onChange={(e) => setFormCompatibility(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                      <ListDashes weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Technical Description
                    </label>
                    <textarea 
                      rows="4"
                      placeholder="Enter part details, technical specs..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brandBlue-500 transition-all text-foreground resize-none custom-scrollbar"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-brandBlue-400" weight="duotone" /> Part Image
                    </label>
                    <div className="flex items-center gap-4 bg-background border border-border rounded-xl p-4">
                      <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-secondary flex items-center justify-center border border-border">
                        {formImage ? (
                          <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-6 h-6 text-muted-foreground/30" weight="duotone" />
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Image size must be smaller than 2MB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => setFormImage(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-2xs file:font-bold file:bg-secondary file:text-foreground file:hover:bg-background transition file:cursor-pointer"
                        />
                        <p className="text-3xs text-muted-foreground">PNG, JPG, WEBP. Max size: 2MB.</p>
                      </div>
                      {formImage && (
                        <button 
                          type="button"
                          onClick={() => setFormImage('')}
                          className="text-2xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Pricing & Stock */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="space-y-1.5 group">
                    <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                      <CurrencyDollar weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Retail Price (₱) *
                    </label>
                    <input 
                      type="number" 
                      step="0.01" min="0" placeholder="0.00"
                      value={formPrice}
                      onChange={(e) => { setFormPrice(e.target.value); setFormErrors(prev => ({...prev, price: ''})); }}
                      className={`w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.price ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border focus:border-brandBlue-500'}`}
                    />
                    {formErrors.price && <p className="text-2xs text-red-400 font-semibold">{formErrors.price}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 group">
                      <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                        <Package weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Initial Stock *
                      </label>
                      <input 
                        type="number" 
                        min="0" placeholder="0"
                        value={formStock}
                        onChange={(e) => { setFormStock(e.target.value); setFormErrors(prev => ({...prev, stock: ''})); }}
                        className={`w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.stock ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border focus:border-brandBlue-500'}`}
                      />
                      {formErrors.stock && <p className="text-2xs text-red-400 font-semibold">{formErrors.stock}</p>}
                    </div>

                    <div className="space-y-1.5 group">
                      <label className="text-xs font-semibold uppercase flex items-center gap-1.5 text-muted-foreground">
                        <WarningCircle weight="duotone" className="w-4 h-4 text-brandBlue-400" /> Min Stock Alert *
                      </label>
                      <input 
                        type="number" 
                        min="0" placeholder="5"
                        value={formMinStock}
                        onChange={(e) => { setFormMinStock(e.target.value); setFormErrors(prev => ({...prev, minStock: ''})); }}
                        className={`w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground ${formErrors.minStock ? 'border-red-500 ring-1 ring-red-500/20' : 'border-border focus:border-brandBlue-500'}`}
                      />
                      {formErrors.minStock && <p className="text-2xs text-red-400 font-semibold">{formErrors.minStock}</p>}
                    </div>
                  </div>

                  {serverError && (
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-sm font-semibold animate-fadeIn">
                      <WarningCircle weight="duotone" className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      <span>{serverError}</span>
                    </div>
                  )}
                </motion.div>
              )}

            </div>

            {/* Footer Navigation */}
            <div className="p-5 border-t border-border bg-background flex items-center justify-between">
              <button 
                type="button" 
                onClick={step === 1 ? onClose : prevStep}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-secondary hover:bg-background text-muted-foreground text-sm font-bold rounded-xl border border-border transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {step > 1 && <ArrowLeft weight="bold" className="w-4 h-4" />}
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              <button 
                type="button"
                onClick={step === 3 ? handleFormSubmit : nextStep}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/60 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center gap-2"
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
    </AnimatePresence>,
    document.body
  );
}
