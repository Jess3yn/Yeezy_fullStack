import { graphqlRequest } from './api.js';

export async function login(datos) {
  const result = await graphqlRequest(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        usuario {
          id
          nombre
          email
          rol
        }
      }
    }`,
    { input: datos },
  );

  localStorage.setItem('accessToken', result.login.accessToken);
  localStorage.setItem('refreshToken', result.login.refreshToken);
  return result.login;
}

export async function registro(datos) {
  const result = await graphqlRequest(
    `mutation Registro($input: UsuarioInput!) {
      crearUsuario(input: $input) {
        id
        nombre
        email
        rol
      }
    }`,
    { input: datos },
  );

  if (!result.crearUsuario) {
    throw new Error('El backend no pudo crear la cuenta');
  }
  return result.crearUsuario;
}
