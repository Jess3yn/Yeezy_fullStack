import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth.js';
import {
  getPanel,
  actualizarProducto,
  eliminarProducto,
  crearRopa,
  crearDisco,
} from '../lib/admin.js';
import '../styles/pago-admin.css';

const dinero = (valor) => `$${Number(valor).toFixed(2)}`;
const fecha = (valor) => new Date(valor).toLocaleString();

const pestanas = [
  { clave: 'resumen', titulo: 'RESUMEN' },
  { clave: 'pedidos', titulo: 'PEDIDOS' },
  { clave: 'productos', titulo: 'PRODUCTOS' },
  { clave: 'usuarios', titulo: 'USUARIOS' },
];

const productoVacio = {
  tipo: 'ropa',
  nombre: '',
  imagen: '',
  precio: '',
  stock: '',
  categoriaId: '',
  talla: '',
  genero: 'MALE',
  artista: '',
  duracion: '',
  year: '',
};

export default function AdminPanel() {
  const [usuario, setUsuario] = useState(null);
  const [listo, setListo] = useState(false);
  const [panel, setPanel] = useState(null);
  const [pestana, setPestana] = useState('resumen');
  const [productos, setProductos] = useState([]);
  const [nuevo, setNuevo] = useState(productoVacio);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setUsuario(getCurrentUser());
    setListo(true);
  }, []);

  async function cargar() {
    try {
      const datos = await getPanel();
      setPanel(datos);
      setProductos(datos.adminProductos);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  useEffect(() => {
    if (usuario && usuario.rol === 'ADMIN') cargar();
  }, [usuario]);

  function cambiar(id, campo, valor) {
    setProductos(productos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  }

  async function guardar(producto) {
    setMensaje('');
    try {
      await actualizarProducto(producto);
      setMensaje('Producto actualizado.');
      cargar();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function borrar(producto) {
    if (!window.confirm(`¿Eliminar ${producto.nombre}?`)) return;
    setMensaje('');
    try {
      await eliminarProducto(producto.id);
      setMensaje('Producto eliminado.');
      cargar();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  async function agregar(evento) {
    evento.preventDefault();
    setMensaje('');
    try {
      if (nuevo.tipo === 'ropa') await crearRopa(nuevo);
      else await crearDisco(nuevo);
      setNuevo(productoVacio);
      setMensaje('Producto creado.');
      cargar();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  function campo(nombre) {
    return {
      value: nuevo[nombre],
      onChange: (e) => setNuevo({ ...nuevo, [nombre]: e.target.value }),
    };
  }

  if (!listo) return null;

  if (!usuario) {
    return (
      <section className="admin-page">
        <p className="form-msg"><a href="/login">Inicia sesión</a> para entrar.</p>
      </section>
    );
  }

  if (usuario.rol !== 'ADMIN') {
    return (
      <section className="admin-page">
        <p className="form-msg">Esta página es solo para administradores.</p>
      </section>
    );
  }

  const maximo = panel
    ? Math.max(1, ...panel.adminVentasPorDia.map((v) => Number(v.total)))
    : 1;

  return (
    <section className="admin-page">
      <h1 className="form-titulo">ADMIN</h1>
      <div className="encabezado">
        <div className="toggle">
          {pestanas.map((p) => (
            <button
              key={p.clave}
              className={pestana === p.clave ? 'activo' : ''}
              onClick={() => setPestana(p.clave)}
            >
              {p.titulo}
            </button>
          ))}
        </div>
      </div>
      {mensaje && <p className="form-msg" role="status">{mensaje}</p>}
      {!panel && !mensaje && <p className="form-msg">Cargando...</p>}

      {panel && pestana === 'resumen' && (
        <>
          <div className="admin-tarjetas">
            <div className="admin-tarjeta"><span>VENTAS</span><strong>{dinero(panel.adminResumen.ventasTotales)}</strong></div>
            <div className="admin-tarjeta"><span>PEDIDOS</span><strong>{panel.adminResumen.totalPedidos}</strong></div>
            <div className="admin-tarjeta"><span>USUARIOS</span><strong>{panel.adminResumen.totalUsuarios}</strong></div>
            <div className="admin-tarjeta"><span>PRODUCTOS</span><strong>{panel.adminResumen.totalProductos}</strong></div>
            <div className="admin-tarjeta"><span>SIN STOCK</span><strong>{panel.adminResumen.sinStock}</strong></div>
          </div>
          <p className="seccion">VENTAS DE LOS ULTIMOS 14 DIAS</p>
          {panel.adminVentasPorDia.length === 0 && <p className="form-msg">Todavía no hay ventas.</p>}
          <div className="admin-barras">
            {panel.adminVentasPorDia.map((v) => (
              <div className="admin-barra" key={v.dia}>
                <span className="admin-barra-valor">{dinero(v.total)}</span>
                <div className="admin-barra-col" style={{ height: `${(Number(v.total) / maximo) * 100}%` }}></div>
                <span className="admin-barra-dia">{v.dia.slice(5)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {panel && pestana === 'pedidos' && (
        <div className="admin-tabla-wrap">
          <table className="admin-tabla">
            <thead>
              <tr><th>ID</th><th>CLIENTE</th><th>PRODUCTO</th><th>CANT.</th><th>TOTAL</th><th>FECHA</th><th>PAGO MP</th></tr>
            </thead>
            <tbody>
              {panel.adminPedidos.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.usuarioEmail}</td>
                  <td>{p.productoNombre}</td>
                  <td>{p.cantidad}</td>
                  <td>{dinero(p.precioTotal)}</td>
                  <td>{fecha(p.createdAt)}</td>
                  <td>{p.pagoId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panel && pestana === 'productos' && (
        <>
          <div className="admin-tabla-wrap">
            <table className="admin-tabla">
              <thead>
                <tr><th>ID</th><th>TIPO</th><th>NOMBRE</th><th>CATEGORIA</th><th>PRECIO</th><th>STOCK</th><th></th></tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.tipo}</td>
                    <td><input value={p.nombre} onChange={(e) => cambiar(p.id, 'nombre', e.target.value)} /></td>
                    <td>{p.categoria}</td>
                    <td><input type="number" step="0.01" min="0" value={p.precio} onChange={(e) => cambiar(p.id, 'precio', e.target.value)} /></td>
                    <td><input type="number" min="0" value={p.stock} onChange={(e) => cambiar(p.id, 'stock', e.target.value)} /></td>
                    <td className="admin-acciones">
                      <button onClick={() => guardar(p)}>GUARDAR</button>
                      <button onClick={() => borrar(p)}>ELIMINAR</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="seccion">NUEVO PRODUCTO</p>
          <form className="form admin-form" onSubmit={agregar}>
            <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
              <option value="ropa">ROPA</option>
              <option value="disco">DISCO</option>
            </select>
            <input placeholder="NOMBRE" required {...campo('nombre')} />
            <input placeholder="IMAGEN (nombre del archivo)" {...campo('imagen')} />
            <input type="number" step="0.01" min="0" placeholder="PRECIO" required {...campo('precio')} />
            <input type="number" min="0" placeholder="STOCK" required {...campo('stock')} />
            <select required {...campo('categoriaId')}>
              <option value="">CATEGORIA</option>
              {panel.categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {nuevo.tipo === 'ropa' ? (
              <>
                <input placeholder="TALLA" required {...campo('talla')} />
                <select {...campo('genero')}>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                </select>
              </>
            ) : (
              <>
                <input placeholder="ARTISTA" required {...campo('artista')} />
                <input type="number" min="0" placeholder="DURACION (min)" {...campo('duracion')} />
                <input type="number" min="0" placeholder="AÑO" {...campo('year')} />
              </>
            )}
            <button type="submit">CREAR</button>
          </form>
        </>
      )}

      {panel && pestana === 'usuarios' && (
        <div className="admin-tabla-wrap">
          <table className="admin-tabla">
            <thead>
              <tr><th>ID</th><th>NOMBRE</th><th>CORREO</th><th>ROL</th></tr>
            </thead>
            <tbody>
              {panel.adminUsuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
