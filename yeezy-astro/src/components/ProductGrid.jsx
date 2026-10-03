import { useEffect, useState } from 'react';
import { getAccessToken, graphqlRequest } from '../lib/api.js';
import { addToCart } from '../lib/cart.js';

const queries = {
  discos: `query {
    discos {
      id nombre imagen stock precio categoria artista duracion year
    }
  }`,
  ropa: `query {
    ropa {
      id nombre imagen stock precio categoria talla genero
    }
  }`,
};

export default function ProductGrid({ tipo }) {
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    if (!getAccessToken()) {
      setError('Inicia sesión para consultar el catálogo.');
      setCargando(false);
      return () => {
        activo = false;
      };
    }

    graphqlRequest(queries[tipo], {}, true)
      .then((data) => {
        if (activo) setProductos(data[tipo] || []);
      })
      .catch((requestError) => {
        if (activo) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar el catálogo.',
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [tipo]);

  if (cargando) {
    return <p className="estado-carga">Cargando catálogo…</p>;
  }
  if (error) {
    return (
      <p className="estado-carga" role="alert">
        {error} <a href="/login">Ir a login</a>
      </p>
    );
  }
  if (!productos.length) {
    return <p className="estado-carga">No hay productos disponibles.</p>;
  }

  return (
    <section className="grid">
      {productos.map((producto) => (
        <article className="producto" key={producto.id}>
          <div className="imagen">
            {producto.imagen ? (
              <img src={producto.imagen} alt={producto.nombre} />
            ) : (
              <div className="sin-imagen" />
            )}
          </div>
          <p className="nombre">{producto.nombre}</p>
          <p className="detalle">
            {tipo === 'discos'
              ? `${producto.artista} · ${producto.year}`
              : `${producto.talla} · ${producto.genero}`}
          </p>
          <p className="precio">${Number(producto.precio).toFixed(2)}</p>
          {producto.stock > 0 ? (
            <button
              className="boton-producto"
              type="button"
              onClick={() => {
                addToCart(producto);
                setMensaje(`${producto.nombre} agregado al carrito`);
              }}
            >
              AGREGAR AL CARRITO
            </button>
          ) : (
            <p className="estado">AGOTADO</p>
          )}
        </article>
      ))}
      <p className="mensaje-carrito" aria-live="polite">{mensaje}</p>
    </section>
  );
}
