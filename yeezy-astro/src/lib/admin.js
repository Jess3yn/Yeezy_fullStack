import { authenticatedGraphqlRequest, getFreshAccessToken } from './auth.js';

const graphqlUrl = (
  import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8000/graphql/'
).trim();
const productImagesUrl = graphqlUrl.replace(/graphql\/?$/, 'admin/product-images/');

async function productImagesRequest(options = {}) {
  const accessToken = await getFreshAccessToken();
  const response = await fetch(productImagesUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`El servidor respondió con un formato no válido (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result?.error || `No se pudieron cargar las imágenes (${response.status}).`);
  }
  return result;
}

export async function getProductImages() {
  const data = await productImagesRequest();
  if (!Array.isArray(data?.images)) {
    throw new Error('El servidor no devolvió la lista de imágenes esperada.');
  }
  return data.images;
}

export async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const data = await productImagesRequest({ method: 'POST', body: formData });
  if (!data?.name || !data?.url) {
    throw new Error('El servidor no confirmó la imagen subida.');
  }
  return data;
}

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
        categoriaId
        stock
        precio
        imagen
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
    `mutation Actualizar($id: ID!, $nombre: String!, $precio: Decimal!, $stock: Int!, $imagen: String, $categoriaId: Int!) {
      actualizarProducto(id: $id, nombre: $nombre, precio: $precio, stock: $stock, imagen: $imagen, categoriaId: $categoriaId)
    }`,
    {
      id: String(producto.id),
      nombre: producto.nombre,
      precio: String(producto.precio),
      stock: Number(producto.stock),
      imagen: producto.imagen || null,
      categoriaId: Number(producto.categoriaId),
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

export async function crearCategoria(nombre) {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) {
    throw new Error('El nombre de la categoría es obligatorio.');
  }

  const data = await authenticatedGraphqlRequest(
    `mutation CrearCategoria($input: CategoriaInput!) {
      crearCategoria(input: $input) {
        id
        nombre
      }
    }`,
    { input: { nombre: nombreLimpio } },
  );

  if (!data?.crearCategoria?.id || !data.crearCategoria.nombre) {
    throw new Error('El backend no devolvió la categoría creada.');
  }

  return data.crearCategoria;
}

export async function renombrarCategoria(id, nombre) {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) {
    throw new Error('El nombre de la categoría es obligatorio.');
  }

  await authenticatedGraphqlRequest(
    `mutation RenombrarCategoria($id: ID!, $nombre: String!) {
      renombrarCategoria(id: $id, nombre: $nombre)
    }`,
    { id: String(id), nombre: nombreLimpio },
  );
}

export async function eliminarCategoria(id) {
  await authenticatedGraphqlRequest(
    `mutation EliminarCategoria($id: ID!) {
      eliminarCategoria(id: $id)
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
