import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  photoURL: {
    type: String,
    default: '' // Base64 string for avatar
  },
  savedParts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part'
  }]
}, { 
  timestamps: true 
});

export default mongoose.model('Customer', customerSchema);
