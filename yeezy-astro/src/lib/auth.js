export async function login(datos) {
    return { ok: true, usuario: { email: datos.email } };
  }
  
  export async function registro(datos) {
    return { ok: true, usuario: { nombre: datos.nombre, email: datos.email } };
  }