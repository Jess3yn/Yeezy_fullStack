import { useEffect, useState } from 'react';
import ProductGrid from './ProductGrid.jsx';
import { getProductos } from '../lib/api.js';

const catalogos = [
  { clave: 'destacado', titulo: 'FEATURED' },
  { clave: 'calzado', titulo: 'FOOTWEAR' },
  { clave: 'top', titulo: 'TOP' },
  { clave: 'bottom', titulo: 'BOTTOMS' },
  { clave: 'under', titulo: 'UNDERWEAR' },
  { clave: 'accesorio', titulo: 'ACCESSORIES' },
  { clave: 'all', titulo: 'ALL' },
];

export default function CategoriasShop() {
  const [activa, setActiva] = useState('all');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    getProductos()
      .then((items) => {
        if (!cancelado) setProductos(items);
      })
      .catch((cause) => {
        if (!cancelado) {
          setProductos([]);
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.');
        }})
      .finally(() => {
        if (!cancelado) setCargando(false); });

    return () => {
      cancelado = true;
    };
  }, []);

  const items = activa === 'all'
    ? productos
    : activa === 'destacado' ? productos.filter((producto) => producto.destacado) : productos.filter((producto) => producto.seccion === activa);

  return (
    <>
      <div className="encabezado">
        <div className="toggle">
          {catalogos.map((categoria) => (
            <button
            key={categoria.clave}
            className={activa === categoria.clave ? 'activo' : ''}
            onClick={() => setActiva(categoria.clave)}
            >
            {categoria.titulo}
            </button>
          ))}
        </div>
      </div>
      {cargando && <p className="form-msg" role="status">Cargando ropa...</p>}
      {error && (
        <p className="form-msg" role="alert">
          {error} <a href="/login">Inicia sesión</a>
        </p>
      )}
      {!cargando && !error && <ProductGrid productos={items} tipo="ropa" />}
    </>
  );
}
