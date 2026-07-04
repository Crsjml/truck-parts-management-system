// backend/src/models/StaffRole.js
import mongoose from 'mongoose';

const staffRoleSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    role: { type: String, enum: ['SUPERADMIN', 'STAFF'], default: 'STAFF' },
    permissions: {
      canManageCatalog: { type: Boolean, default: true },
      canViewFinances: { type: Boolean, default: false },
      canProcessOrders: { type: Boolean, default: true },
      canManageStaff: { type: Boolean, default: false } // Usually reserved for SUPERADMIN
    },
    addedBy: { type: String, default: 'system' }
  },
  { timestamps: true }
);

export default mongoose.model('StaffRole', staffRoleSchema);
