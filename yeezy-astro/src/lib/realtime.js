import { createClient } from 'graphql-ws';
import { getAccessToken, getFreshAccessToken } from './auth.js';
import { normalizarProductoNuevo } from './api.js';

const apiUrl = (
  import.meta.env.PUBLIC_API_URL || 'http://127.0.0.1:8000/graphql/'
).trim();

// https://.../graphql/  ->  wss://.../graphql/
const wsUrl = apiUrl.replace(/^http/i, 'ws');

let client = null;

function getClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!client) {
    client = createClient({
      url: wsUrl,
      // Se conecta al primer subscribe y se cierra cuando ya no hay suscriptores.
      lazy: true,
      // El servidor gratuito se duerme y corta conexiones: reintenta solo.
      retryAttempts: 10,
      // Mantiene viva la conexión a través del proxy de Render.
      keepAlive: 25_000,
      // El navegador no puede mandar headers en un WebSocket: el token va aquí.
      // Se evalúa en cada (re)conexión, así que siempre usa un token vigente.
      connectionParams: async () => ({
        Authorization: `Bearer ${await getFreshAccessToken()}`,
      }),
    });
  }

  return client;
}

const consultaProductoNuevo = `
  subscription ProductoNuevo {
    productoNuevo {
      id
      tipo
      nombre
      imagen
      stock
      precio
      categoria
      artista
      duracion
      year
      talla
    }
  }
`;

/**
 * Avisa cuando se crea un producto del tipo indicado ('disco' o 'ropa').
 * Devuelve una función para cancelar la suscripción.
 */
export function suscribirProductoNuevo(tipo, onProducto) {
  const cliente = getClient();
  // Sin sesión no hay token: no se intenta conectar.
  if (!cliente || !getAccessToken()) {
    return () => {};
  }

  return cliente.subscribe(
    { query: consultaProductoNuevo },
    {
      next: ({ data }) => {
        const producto = data?.productoNuevo;
        if (!producto || producto.tipo !== tipo) return;
        try {
          onProducto(normalizarProductoNuevo(producto));
        } catch (error) {
          console.error('Producto nuevo inválido', error);
        }
      },
      error: (error) => {
        console.warn('Subscription cerrada', error);
      },
      complete: () => {},
    },
  );
}