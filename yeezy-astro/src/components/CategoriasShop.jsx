import { useState } from 'react';
import ProductGrid from './ProductGrid.jsx';

const categorias = [
  { clave: 'destacado', titulo: 'FEATURED' },
  { clave: 'calzado', titulo: 'FOOTWEAR' },
  { clave: 'top', titulo: 'TOP' },
  { clave: 'bottom', titulo: 'BOTTOMS' },
  { clave: 'under', titulo: 'UNDERWEAR' },
  { clave: 'accesorio', titulo: 'ACCESORIES' },
  { clave: 'all', titulo: 'ALL' },
];

export default function CategoriasShop({ productos }) {
    const [activa, setActiva] = useState('all');
  
    const items = activa === 'all'
      ? productos
      : activa === 'destacado'
        ? productos.filter(p => p.destacado)
        : productos.filter(p => p.seccion === activa);

  return (
    <>
      <div className="encabezado">
        <div className="toggle">
          {categorias.map(c => (
            <button
              key={c.clave}
              className={activa === c.clave ? 'activo' : ''}
              onClick={() => setActiva(c.clave)}
            >
              {c.titulo}
            </button>
          ))}
        </div>
      </div>
      <ProductGrid productos={items} />
    </>
  );
}