export default function Nav({ activa }) {
  return (
    <header className="nav">
      <div className="nav-top">
        <nav className="menu">
          <a className={activa === 'shop' ? 'activo' : ''} href="/">SHOP</a>
          <a className={activa === 'bully' ? 'activo' : ''} href="/bully">BULLY</a>
          <a className={activa === 'tour' ? 'activo' : ''} href="/tour">TOUR</a>
          <a className={activa === 'merch' ? 'activo' : ''} href="/merch">MERCH</a>
        </nav>
        <div className="iconos">
  <a className="cuenta" href="/login">
    <svg viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="8" r="4" fill="none" stroke="#111" strokeWidth="1.5" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="#111" strokeWidth="1.5" />
    </svg>
  </a>
  <a className="carrito" href="/carrito" aria-label="Abrir carrito">
    <svg viewBox="0 0 24 24" width="18" height="18">
      <rect x="4" y="9" width="16" height="12" rx="2" fill="none" stroke="#111" strokeWidth="1.5" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" fill="none" stroke="#111" strokeWidth="1.5" />
    </svg>
  </a>
</div>
      </div>
    </header>
  );
}