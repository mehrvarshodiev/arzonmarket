import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const CartContext = createContext(null);
const readCart = () => { try { return JSON.parse(localStorage.getItem('am_cart') || '[]'); } catch { return []; } };
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  useEffect(() => { localStorage.setItem('am_cart', JSON.stringify(items)); }, [items]);
  const add = product => setItems(old => { const found = old.find(i => i._id === product._id); return found ? old.map(i => i._id === product._id ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i) : [...old, { ...product, quantity: 1 }]; });
  const setQuantity = (id, quantity) => setItems(old => quantity <= 0 ? old.filter(i => i._id !== id) : old.map(i => i._id === id ? { ...i, quantity: Math.min(99, Math.max(1, Number(quantity) || 1)) } : i));
  const remove = id => setItems(old => old.filter(i => i._id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.quantity, 0), total = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const value = useMemo(() => ({ items, add, setQuantity, remove, clear, count, total }), [items, count, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
