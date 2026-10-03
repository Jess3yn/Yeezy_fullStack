const graphqlUrl = (
  import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8000/graphql/'
).trim();

const storageKeys = {
  accessToken: 'yeezy.accessToken',
  refreshToken: 'yeezy.refreshToken',
  user: 'yeezy.user',
};

const authFields = `
  accessToken
  refreshToken
  usuario {
    id
    nombre
    email
    rol
  }
`;


async function graphqlRequest(query, variables, accessToken) {
  if (!graphqlUrl) {
    throw new Error('No url');
  }

  let response;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    response = await fetch(graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error("No connection");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Mala Respuesta');}
  if (!response.ok || result.errors?.length) {
    const message = result.errors?.map((error) => error.message).join(' ') ||
      "El backend responde:  ${response.status}";
    throw new Error(message);
  }
  return result.data;
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuth();
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
  try {
    const data = await graphqlRequest(
      `mutation RefrescarToken($refreshToken: String!) {
        refrescarToken(refreshToken: $refreshToken) {
          accessToken
          refreshToken } }`,
      { refreshToken }, );
    const auth = data?.refrescarToken;
    if (!auth?.accessToken || !auth?.refreshToken) {
      throw new Error('No token valido');
    }
    window.sessionStorage.setItem(storageKeys.accessToken, auth.accessToken);
    window.sessionStorage.setItem(storageKeys.refreshToken, auth.refreshToken);
    return auth.accessToken;
  } catch (error) {
    clearAuth();
    throw error instanceof Error
      ? error
      : new Error('Sesion Expirada');
  }
}

export async function authenticatedGraphqlRequest(query, variables = {}) {
  let accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error('Iniciar Sesion');
  }
  try {
    return await graphqlRequest(query, variables, accessToken);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('TOKEN_EXPIRADO')) {
      throw error;
    }
    accessToken = await refreshSession();
    return graphqlRequest(query, variables, accessToken);
  }
}

function saveAuth(auth) {
  if (typeof window === 'undefined') {
    throw new Error('window error');
  }

  window.sessionStorage.setItem(storageKeys.accessToken, auth.accessToken);
  window.sessionStorage.setItem(storageKeys.refreshToken, auth.refreshToken);
  window.sessionStorage.setItem(storageKeys.user, JSON.stringify(auth.usuario));
}

export function getAccessToken() {
  return typeof window === 'undefined' ? null
    : window.sessionStorage.getItem(storageKeys.accessToken);
}

export function getRefreshToken() {
  return typeof window === 'undefined'
    ? null : window.sessionStorage.getItem(storageKeys.refreshToken);
}

export function getCurrentUser() {
  if (typeof window === 'undefined') {
    return null;
  }
  const user = window.sessionStorage.getItem(storageKeys.user);
  if (!user) {
    return null;
  }
  try {
    return JSON.parse(user);
  } catch {
    clearAuth();
    return null;
  }
}

export function clearAuth() {
  if (typeof window === 'undefined') { return; }
  Object.values(storageKeys).forEach((key) => window.sessionStorage.removeItem(key));
}

export async function login(datos) {
  const data = await graphqlRequest(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        ${authFields}
      }
    }`,
    { input: datos },
  );

  const auth = data?.login;
  if (!auth?.accessToken || !auth?.refreshToken || !auth?.usuario) {
    throw new Error('El backend no devolvió los datos de sesión esperados.');
  }

  saveAuth(auth);
  return auth;
}

export async function registro(datos) {
  await graphqlRequest(
    `mutation CrearUsuario($input: UsuarioInput!) {
      crearUsuario(input: $input) {
        id
        nombre
        email
        rol
      }
    }`,
    { input: datos },
  );
  return login({ email: datos.email, password: datos.password });
}
