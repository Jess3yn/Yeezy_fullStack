const CART_STORAGE_KEY = 'yeezy.cart';
const CART_UPDATED_EVENT = 'yeezy-cart-updated';

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
}

export function getCart() {
  const storage = getBrowserStorage();
  if (!storage) {
    return [];
  }

  const value = storage.getItem(CART_STORAGE_KEY);
  if (!value) {
    return [];
  }

  try {
    const cart = JSON.parse(value);
    return Array.isArray(cart) ? cart : [];
  } catch {
    storage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

function saveCart(cart) {
  const storage = getBrowserStorage();
  if (!storage) {
    throw new Error('El carrito solo se puede modificar desde el navegador.');
  }

  storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addToCart(product, tipo) {
  const productId = String(product.id);
  const cart = getCart();
  const existing = cart.find(
    (item) => item.productoId === productId && item.tipo === tipo,
  );

  if (existing) {
    if (existing.cantidad >= Number(product.stock)) {
      throw new Error('No hay más unidades disponibles de este producto.');
    }
    existing.cantidad += 1;
    existing.nombre = product.nombre;
    existing.imagen = product.imagen || '';
    existing.precio = Number(product.precio);
    existing.stock = Number(product.stock);
  } else {
    if (Number(product.stock) < 1) {
      throw new Error('Este producto está agotado.');
    }
    cart.push({
      productoId: productId,
      tipo,
      nombre: product.nombre,
      imagen: product.imagen || '',
      precio: Number(product.precio),
      stock: Number(product.stock),
      cantidad: 1,
    });
  }

  saveCart(cart);
  return cart;
}

export function updateCartQuantity(productId, tipo, cantidad) {
  const cart = getCart();
  const item = cart.find(
    (entry) => entry.productoId === String(productId) && entry.tipo === tipo,
  );
  if (!item) {
    return cart;
  }

  const nextQuantity = Number(cantidad);
  if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
    return removeFromCart(productId, tipo);
  }
  if (nextQuantity > item.stock) {
    throw new Error('La cantidad supera el stock disponible.');
  }

  item.cantidad = nextQuantity;
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId, tipo) {
  const cart = getCart().filter(
    (item) => item.productoId !== String(productId) || item.tipo !== tipo,
  );
  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}

export function subscribeToCart(callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onUpdate = () => callback(getCart());
  window.addEventListener(CART_UPDATED_EVENT, onUpdate);
  window.addEventListener('storage', onUpdate);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, onUpdate);
    window.removeEventListener('storage', onUpdate);
  };
}
