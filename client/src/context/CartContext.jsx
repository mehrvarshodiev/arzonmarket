import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const CartContext = createContext(null);
const readCart = () => { try { return JSON.parse(localStorage.getItem('am_cart') || '[]'); } catch { return []; } };
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  useEffect(() => { localStorage.setItem('am_cart', JSON.stringify(items)); }, [items]);
  const add = product => setItems(old => {
    const amount = Math.min(99, Math.max(1, Number(product.quantityToAdd) || 1));
    const color = product.selectedColor || '';
    const variantKey = product._id + '::' + color;
    const found = old.find(i => (i._cartKey || i._id) === variantKey || (!i.selectedColor && !color && i._id === product._id));
    const clean = { ...product }; delete clean.quantityToAdd;
    return found
      ? old.map(i => ((i._cartKey || i._id) === variantKey || (!i.selectedColor && !color && i._id === product._id)) ? { ...i, quantity: Math.min(99, i.quantity + amount) } : i)
      : [...old, { ...clean, _cartKey: variantKey, quantity: amount }];
  });
  const setQuantity = (id, quantity) => setItems(old => quantity <= 0 ? old.filter(i => (i._cartKey || i._id) !== id && i._id !== id) : old.map(i => ((i._cartKey || i._id) === id || i._id === id) ? { ...i, quantity: Math.min(99, Math.max(1, Number(quantity) || 1)) } : i));
  const remove = id => setItems(old => old.filter(i => (i._cartKey || i._id) !== id && i._id !== id));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.quantity, 0), total = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const value = useMemo(() => ({ items, add, setQuantity, remove, clear, count, total }), [items, count, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
