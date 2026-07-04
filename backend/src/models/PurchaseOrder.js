import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: [
      {
        partId: { type: mongoose.Schema.Types.ObjectId, ref: 'Part', required: true },
        name: { type: String, required: true },
        sku: { type: String },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 }
      }
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: { 
      type: String, 
      enum: ['Draft', 'RFQ Sent', 'Confirmed', 'Received', 'Cancelled'], 
      default: 'Draft' 
    },
    billingStatus: {
      type: String,
      enum: ['Waiting Bills', 'Bills Received'],
      default: 'Waiting Bills'
    },
    sourceRfq:        { type: String, default: '' },           // link back to RFQ reference
    createdBy:        { type: String, default: 'Admin' },      // staff member name
    confirmationDate: { type: Date },                          // set when status → Confirmed
    orderDate:        { type: Date, default: Date.now },
    expectedDeliveryDate: { type: Date },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// Indexes - poNumber index is created by unique:true on the field
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
