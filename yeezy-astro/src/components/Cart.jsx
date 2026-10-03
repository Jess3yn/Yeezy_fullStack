import { useEffect, useState } from 'react';
import { clearCart, readCart, removeFromCart, setCartQuantity } from '../lib/cart.js';
import { crearPedido } from '../lib/api.js';

export default function Cart() {
  const [items, setItems] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const sync = () => setItems(readCart());
    sync();
    window.addEventListener('yeezy-cart-updated', sync);
    return () => window.removeEventListener('yeezy-cart-updated', sync);
  }, []);

  const total = items.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0,
  );

  async function confirmarPedido() {
    setError('');
    setMensaje('');
    setEnviando(true);

    try {
      const pedidos = await crearPedido(
        items.map((item) => ({
          productoId: String(item.id),
          cantidad: item.cantidad,
        })),
      );
      clearCart();
      setItems([]);
      setMensaje(`Pedido creado correctamente (${pedidos.length} producto(s)).`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo crear el pedido.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="carrito-contenido">
      <h1 className="form-titulo">TU CARRITO</h1>
      {items.length === 0 ? (
        <p className="estado-carga">El carrito está vacío.</p>
      ) : (
        <>
          <div className="carrito-lista">
            {items.map((item) => (
              <article className="carrito-item" key={item.id}>
                <div className="carrito-imagen">
                  {item.imagen
                    ? <img src={item.imagen} alt={item.nombre} />
                    : <div className="sin-imagen" />}
                </div>
                <div className="carrito-info">
                  <p className="nombre">{item.nombre}</p>
                  <p>${item.precio.toFixed(2)} c/u</p>
                  <label>
                    Cantidad
                    <input
                      type="number"
                      min="0"
                      max={item.stock}
                      value={item.cantidad}
                      onChange={(event) => {
                        const cantidad = Number.parseInt(event.target.value, 10);
                        if (Number.isFinite(cantidad)) {
                          setItems(setCartQuantity(item.id, cantidad));
                        }
                      }}
                    />
                  </label>
                  <button
                    className="boton-texto"
                    type="button"
                    onClick={() => {
                      setItems(removeFromCart(item.id));
                    }}
                  >
                    QUITAR
                  </button>
                </div>
                <strong>${(item.precio * item.cantidad).toFixed(2)}</strong>
              </article>
            ))}
          </div>
          <p className="carrito-total">Subtotal: ${total.toFixed(2)}</p>
          <p className="estado-carga">
            El total final y el stock se verifican en el servidor.
          </p>
          <button
            className="boton-producto"
            type="button"
            disabled={enviando || items.length === 0}
            onClick={confirmarPedido}
          >
            {enviando ? 'PROCESANDO…' : 'CONFIRMAR PEDIDO'}
          </button>
        </>
      )}
      {error && (
        <p className="form-msg" role="alert">
          {error} {error.includes('No autenticado') && <a href="/login">Inicia sesión</a>}
        </p>
      )}
      {mensaje && <p className="form-msg" role="status">{mensaje}</p>}
      {!items.length && (
        <a className="form-link" href="/bully">VOLVER A COMPRAR</a>
      )}
    </section>
  );
}
