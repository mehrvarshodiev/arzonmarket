import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  phone: { type: String, unique: true, sparse: true, trim: true },
  telegramId: { type: String, unique: true, sparse: true },
  name: { type: String, trim: true, default: '' },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });
export default mongoose.model('User', userSchema);
