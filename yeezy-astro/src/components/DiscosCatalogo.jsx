import { useEffect, useState } from 'react';
import ProductGrid from './ProductGrid.jsx';
import { getDiscos } from '../lib/api.js';

export default function DiscosCatalogo() {
  const [discos, setDiscos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;

    getDiscos()
      .then((items) => {
        if (!cancelado) setDiscos(items);
      })
      .catch((cause) => {
        if (!cancelado) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los discos.');
        }})
      .finally(() => {
        if (!cancelado) setCargando(false);
 });

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <>
      {cargando && <p className="form-msg" role="status">Cargando discos...</p>}
      {error && (
        <p className="form-msg" role="alert">
          {error} <a href="/login">Inicia sesión</a>
        </p>
      )}
      {!cargando && !error && <ProductGrid productos={discos} tipo="disco" />}
    </>
  );
}
