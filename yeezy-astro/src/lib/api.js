import { authenticatedGraphqlRequest } from './auth.js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const defaultDiscImage = '/img/disco-default.svg';

function imageUrl(filename) {
  return supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/product_images/products/${encodeURIComponent(filename)}`
    : `/img/${filename}`;
}

function categorySlug(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function numericId(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function numericPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error('El backend devolvió un precio de producto inválido.');
  }
  return number;
}

function productImage(value) {
  if (!value) {
    return '';
  }

  const image = String(value).trim();
  if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
    return image;
  }

  return imageUrl(image.replace(/^products\//, ''));
}

export async function getProductos() {
  const data = await authenticatedGraphqlRequest(`
    query Ropa {
      ropa {
        id
        nombre
        imagen
        stock
        precio
        categoria
      }
    }
  `);

  if (!Array.isArray(data?.ropa)) {
    throw new Error('El backend no devolvió la lista de ropa esperada.');
  }

  return data.ropa.map((producto) => {
    const seccion = categorySlug(producto.categoria);
    return {
      id: numericId(producto.id),
      nombre: producto.nombre,
      imagen: productImage(producto.imagen),
      precio: numericPrice(producto.precio),
      seccion,
      ...(seccion === 'destacado' ? { destacado: true } : {}),
      stock: Number(producto.stock),
    };
  });
}

export async function getDiscos() {
  const data = await authenticatedGraphqlRequest(`
    query Discos {
      discos {
        id
        nombre
        imagen
        stock
        precio
      }
    }
  `);

  if (!Array.isArray(data?.discos)) {
    throw new Error('El backend no devolvió la lista de discos esperada.');
  }

  return data.discos.map((disco) => ({
    id: numericId(disco.id),
    nombre: disco.nombre,
    imagen: productImage(disco.imagen) || defaultDiscImage,
    precio: numericPrice(disco.precio),
    stock: Number(disco.stock),
  }));
}

export async function crearPedido(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El carrito está vacío.');
  }

  const data = await authenticatedGraphqlRequest(
    `mutation CrearPedido($datos: [ItemInput!]!) {
      crearPedido(datos: $datos) {
        id
      }
    }`,
    {
      datos: items.map((item) => ({
        productoId: String(item.productoId),
        cantidad: Number(item.cantidad),
      })),
    },
  );

  if (!Array.isArray(data?.crearPedido)) {
    throw new Error('El backend no confirmó la creación del pedido.');
  }

  return data.crearPedido;
}

export async function getMisPedidos() {
  const data = await authenticatedGraphqlRequest(`
    query MisPedidos {
      misPedidos {
        id
        productoId
        productoNombre
        imagen
        cantidad
        precioTotal
        createdAt
      }
    }
  `);

  if (!Array.isArray(data?.misPedidos)) {
    throw new Error('El backend no devolvió tu historial de pedidos.');
  }

  return data.misPedidos.map((pedido) => ({
    id: numericId(pedido.id),
    productoId: numericId(pedido.productoId),
    nombre: pedido.productoNombre,
    imagen: productImage(pedido.imagen),
    cantidad: Number(pedido.cantidad),
    precioTotal: numericPrice(pedido.precioTotal),
    createdAt: pedido.createdAt,
  }));
}
