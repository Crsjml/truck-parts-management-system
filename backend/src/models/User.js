// backend/src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email:                    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash:            { type: String, required: true },
    role:                     { type: String, enum: ['admin', 'customer'], default: 'customer' },

    // Profile fields (customers)
    full_name:                { type: String, trim: true, default: '' },
    contact_number:           { type: String, trim: true, default: '' },

    // Email verification (customers)
    verified:                 { type: Boolean, default: false },
    verification_code:        { type: String, default: null },
    verification_expires_at:  { type: Date,   default: null },

    // Security: failed login tracking
    failed_attempts:          { type: Number, default: 0 },
    locked_until:             { type: Date,   default: null },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
