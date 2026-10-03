import { useState } from 'react';
import ProductGrid from './ProductGrid.jsx';

const catalogos = [
  { tipo: 'ropa', titulo: 'MERCH' },
  { tipo: 'discos', titulo: 'BULLY' },
];

export default function CategoriasShop() {
  const [tipo, setTipo] = useState('ropa');

  return (
    <>
      <div className="encabezado">
        <div className="toggle">
          {catalogos.map((catalogo) => (
            <button
              key={catalogo.tipo}
              className={tipo === catalogo.tipo ? 'activo' : ''}
              onClick={() => setTipo(catalogo.tipo)}
            >
              {catalogo.titulo}
            </button>
          ))}
        </div>
      </div>
      <ProductGrid key={tipo} tipo={tipo} />
    </>
  );
}
