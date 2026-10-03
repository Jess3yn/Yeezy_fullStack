const GRAPHQL_URL =
  import.meta.env.PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:8000/graphql/';

export async function graphqlRequest(query, variables = {}, authenticated = false) {
  const token =
    authenticated && typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`formato inválido:  ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al conectar con el backend`);
  }
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('; '));
  }
  if (!result.data) {
    throw new Error('El backend no devolvió datos');
  }

  return result.data;
}

export function getAccessToken() {
  return typeof localStorage === 'undefined'
    ? null
    : localStorage.getItem('accessToken');
}

export async function crearPedido(datos) {
  const result = await graphqlRequest(
    `mutation CrearPedido($datos: [ItemInput!]!) {
      crearPedido(datos: $datos) {
        id
        cantidad
        precioTotal
        createdAt
      }
    }`,
    { datos },
    true,
  );

  return result.crearPedido;
}
