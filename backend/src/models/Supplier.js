import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Company', 'Person'], default: 'Company' },
    contactPerson: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    paymentTerms: { type: String, trim: true, default: 'Net 30' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    notes: { type: String, trim: true, default: '' },
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Add text index for search
supplierSchema.index({ name: 'text', contactPerson: 'text', email: 'text' });

export default mongoose.model('Supplier', supplierSchema);
