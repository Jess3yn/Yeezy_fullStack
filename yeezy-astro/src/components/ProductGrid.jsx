import { useEffect, useRef, useState } from 'react';
import { addToCart } from '../lib/cart.js';

export default function ProductGrid({ productos, tipo }) {
  const [aviso, setAviso] = useState('');
  const avisoTimeout = useRef(null);

  useEffect(() => () => window.clearTimeout(avisoTimeout.current), []);

  function agregarAlCarrito(producto) {
    try {
      addToCart(producto, tipo);
      setAviso({ texto: `${producto.nombre} añadido al carrito.`, error: false });
    } catch (error) {
      setAviso({
        texto: error instanceof Error ? error.message : 'No se pudo añadir al carrito.',
        error: true,
      });
    }

    window.clearTimeout(avisoTimeout.current);
    avisoTimeout.current = window.setTimeout(() => setAviso(''), 3500);
  }

  return (
    <>
      <section className="grid">
        {productos.map((p) => (
          <div className="producto" key={p.id}>
            {tipo ? (
              <button
                className="imagen imagen-agregar"
                type="button"
                aria-label={`Añadir ${p.nombre} al carrito`}
                title={Number(p.stock) < 1 ? 'Agotado' : 'Añadir al carrito'}
                disabled={Number(p.stock) < 1}
                onClick={() => agregarAlCarrito(p)}
              >
                {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <div className="sin-imagen" />}
              </button>
            ) : (
              <div className="imagen">
                {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <div className="sin-imagen" />}
              </div>
            )}
            <p className="nombre">{p.nombre}</p>
            {p.precio != null && <p className="nombre">${Number(p.precio).toFixed(2)}</p>}
            {p.stock === 0 && <p className="estado">SOLD OUT</p>}
          </div>
        ))}
      </section>
      {aviso && (
        <p className={`cart-notice${aviso.error ? ' cart-notice-error' : ''}`} role={aviso.error ? 'alert' : 'status'}>
          {aviso.texto} {!aviso.error && <a href="/carrito">Ver carrito</a>}
        </p>
      )}
    </>
  );
}
