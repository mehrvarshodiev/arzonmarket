import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, default: '', maxlength: 5000 },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0, default: null },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  brand: { type: String, required: true, trim: true, maxlength: 80 },
  images: { type: [String], default: [] },
  specs: { type: [{ key: { type: String, trim: true }, value: { type: String, trim: true } }], default: [] },
  featured: { type: Boolean, default: false },
  stock: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ featured: -1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
