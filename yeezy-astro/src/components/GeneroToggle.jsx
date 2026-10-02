export default function GeneroToggle({ genero }) {
  return (
    <div className="encabezado">
      <div className="toggle">
        <a className={genero === 'hombre' ? 'activo' : ''} href="/?genero=hombre">MALE</a>
        <a className={genero === 'mujer' ? 'activo' : ''} href="/?genero=mujer">FEMALE</a>
      </div>
    </div>
  );
}
