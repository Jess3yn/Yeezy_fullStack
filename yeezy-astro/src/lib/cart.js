const CART_KEY = 'yeezy-cart';

export function readCart() {
  if (typeof localStorage === 'undefined') return [];

  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('yeezy-cart-updated'));
  return cart;
}

export function addToCart(product) {
  const cart = readCart();
  const existing = cart.find((item) => String(item.id) === String(product.id));

  if (existing) {
    existing.cantidad = Math.min(existing.cantidad + 1, Number(product.stock));
  } else {
    cart.push({
      id: String(product.id),
      nombre: product.nombre,
      precio: Number(product.precio),
      imagen: product.imagen,
      stock: Number(product.stock),
      cantidad: 1,
    });
  }

  return saveCart(cart);
}

export function setCartQuantity(productId, cantidad) {
  const cart = readCart()
    .map((item) =>
      String(item.id) === String(productId)
        ? { ...item, cantidad: Math.min(Number(cantidad), item.stock) }
        : item,
    )
    .filter((item) => item.cantidad > 0);
  return saveCart(cart);
}

export function removeFromCart(productId) {
  return saveCart(readCart().filter((item) => String(item.id) !== String(productId)));
}

export function clearCart() {
  return saveCart([]);
}
