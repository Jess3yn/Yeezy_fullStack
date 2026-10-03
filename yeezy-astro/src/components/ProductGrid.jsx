export default function ProductGrid({ productos }) {
  return (
    <section className="grid">
      {productos.map(p => (
        <div className="producto" key={p.id}>
          <div className="imagen">
            {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <div className="sin-imagen" />}
          </div>
          <p className="nombre">{p.nombre}</p>
          {p.stock === 0 && <p className="estado">SOLD OUT</p>}
        </div>
      ))}
    </section>
  );
}
