import { useEffect, useState } from 'react';
import { getAccessToken } from '../lib/auth.js';
import { crearPedido, getMisPedidos} from '../lib/api.js';
import { clearCart,
  getCart,
  removeFromCart,
  subscribeToCart,
  updateCartQuantity,
} from '../lib/cart.js';

const money = (value) => `$${Number(value).toFixed(2)}`;

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function CarritoCheckout() {
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setCart(getCart());
    return subscribeToCart(setCart);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hasSession = Boolean(getAccessToken());
    setAuthenticated(hasSession);

    if (!hasSession) {
      setLoadingOrders(false);
      return () => {
        cancelled = true;
      };
    }

    getMisPedidos()
      .then((items) => {
        if (!cancelled) setOrders(items);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOrders(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.precio) * Number(item.cantidad),
    0,
  );

  function changeQuantity(item, quantity) {
    setError('');
    try {
      updateCartQuantity(item.productoId, item.tipo, quantity);
      setCart(getCart());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la cantidad.');
    }
  }

  function deleteItem(item) {
    removeFromCart(item.productoId, item.tipo);
    setCart(getCart());
  }

  async function checkout() {
    setError('');
    setMessage('');
    if (cart.length === 0) {
      setError('El carrito está vacío.');
      return;
    }
    if (!getAccessToken()) {
      setAuthenticated(false);
      setError('Inicia sesión para confirmar tu pedido.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await crearPedido(cart);
      clearCart();
      setCart([]);
      setMessage(`Pedido confirmado. Se crearon ${created.length} registros de producto.`);
      try {
        const history = await getMisPedidos();
        setOrders(history);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `El pedido se creó, pero no se pudo actualizar el historial: ${cause.message}`
            : 'El pedido se creó, pero no se pudo actualizar el historial.',
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo confirmar el pedido.');
      setAuthenticated(Boolean(getAccessToken()));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="cart-page">
      <h1 className="form-titulo">TU CARRITO</h1>
      {!authenticated && (
        <p className="form-msg">
          <a href="/login">Inicia sesión</a> para pagar y ver tus pedidos anteriores.
        </p>
      )}
      {error && <p className="form-msg" role="alert">{error}</p>}
      {message && <p className="form-msg" role="status">{message}</p>}

      <section aria-label="Productos en el carrito">
        {cart.length === 0 ? (
          <p className="form-msg">Tu carrito está vacío.</p>
        ) : (
          <>
            {cart.map((item) => (
              <article className="cart-row" key={`${item.tipo}-${item.productoId}`}>
                <div className="cart-item-image">
                  {item.imagen
                    ? <img src={item.imagen} alt="" />
                    : <div className="sin-imagen" />}
                </div>
                <div className="cart-item-info">
                  <p className="nombre">{item.nombre}</p>
                  <p className="estado">{item.tipo === 'ropa' ? 'APPAREL' : 'DISC'}</p>
                  <p className="nombre">{money(item.precio)} c/u</p>
                </div>
                <label className="cart-quantity">
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={item.cantidad}
                    onChange={(event) => changeQuantity(item, event.target.value)}
                  />
                </label>
                <p className="nombre">{money(item.precio * item.cantidad)}</p>
                <button className="cart-remove" type="button" onClick={() => deleteItem(item)}>
                  Quitar
                </button>
              </article>
            ))}
            <div className="cart-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <button
              className="cart-checkout"
              type="button"
              onClick={checkout}
              disabled={submitting}
            >
              {submitting ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}
            </button>
          </>
        )}
      </section>

      <section className="order-history" aria-labelledby="order-history-title">
        <div className="order-heading">
          <h2 className="form-titulo" id="order-history-title">TUS PEDIDOS</h2>
        </div>
        {loadingOrders && <p className="form-msg" role="status">Cargando pedidos...</p>}
        {!loadingOrders && authenticated && orders.length === 0 && (
          <p className="form-msg">Todavía no tienes pedidos.</p>
        )}
        {!loadingOrders && orders.map((order) => (
          <article className="order-row" key={order.id}>
            <div>
              <p className="nombre">{order.nombre} × {order.cantidad}</p>
              <p className="estado">{displayDate(order.createdAt)}</p>
            </div>
            <strong>{money(order.precioTotal)}</strong>
          </article>
        ))}
      </section>
    </section>
  );
}
