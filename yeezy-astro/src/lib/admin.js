import { authenticatedGraphqlRequest } from './auth.js';

export async function getPanel() {
  return authenticatedGraphqlRequest(`
    query Panel {
      adminResumen {
        ventasTotales
        totalPedidos
        totalUsuarios
        totalProductos
        sinStock
      }
      adminVentasPorDia {
        dia
        total
      }
      adminPedidos {
        id
        usuarioEmail
        productoNombre
        cantidad
        precioTotal
        createdAt
        pagoId
      }
      adminProductos {
        id
        tipo
        nombre
        categoria
        stock
        precio
      }
      adminUsuarios {
        id
        nombre
        email
        rol
      }
      categorias {
        id
        nombre
      }
    }
  `);
}

export async function actualizarProducto(producto) {
  await authenticatedGraphqlRequest(
    `mutation Actualizar($id: ID!, $nombre: String!, $precio: Decimal!, $stock: Int!) {
      actualizarProducto(id: $id, nombre: $nombre, precio: $precio, stock: $stock)
    }`,
    {
      id: String(producto.id),
      nombre: producto.nombre,
      precio: String(producto.precio),
      stock: Number(producto.stock),
    },
  );
}

export async function eliminarProducto(id) {
  await authenticatedGraphqlRequest(
    `mutation Eliminar($id: ID!) {
      eliminarProducto(id: $id)
    }`,
    { id: String(id) },
  );
}

export async function crearRopa(datos) {
  await authenticatedGraphqlRequest(
    `mutation CrearRopa($input: RopaInput!) {
      crearRopa(input: $input) {
        id
      }
    }`,
    {
      input: {
        nombre: datos.nombre,
        imagen: datos.imagen || null,
        stock: Number(datos.stock),
        precio: String(datos.precio),
        categoriaId: Number(datos.categoriaId),
        talla: datos.talla,
        genero: datos.genero,
      },
    },
  );
}

export async function crearDisco(datos) {
  await authenticatedGraphqlRequest(
    `mutation CrearDisco($input: DiscoInput!) {
      crearDisco(input: $input) {
        id
      }
    }`,
    {
      input: {
        nombre: datos.nombre,
        imagen: datos.imagen || null,
        stock: Number(datos.stock),
        precio: String(datos.precio),
        categoriaId: Number(datos.categoriaId),
        artista: datos.artista,
        duracion: datos.duracion ? Number(datos.duracion) : null,
        year: datos.year ? Number(datos.year) : null,
      },
    },
  );
}
