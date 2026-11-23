# YZY - e-commerce como PWA

Proyecto de Programación Web 2. Tienda en línea que recrea la página de Yeezy, con frontend en Astro y React, backend en Django con GraphQL y base de datos en Supabase.

Práctica P10 (Unidad 3.2): la tienda ahora es una PWA instalable.

## Carpetas

- `yeezy-astro`: frontend (Astro + React).
- `config`: backend (Django + Strawberry GraphQL).

## Cómo correrlo

Frontend:

```
cd yeezy-astro
npm install
npm run dev
```

Se abre en http://localhost:4321. Para probar la instalación hay que compilar, porque el service worker solo se genera en el build:

```
npm run build
npm run preview
```

Backend (necesita su archivo `config/.env` con los datos de la base de datos y de Mercado Pago):

```
cd config
pip install -r requirements.txt
python -m uvicorn config.asgi:application --port 8000
```

## Lo que se hizo para la PWA

1. Se instaló `@vite-pwa/astro` dentro de `yeezy-astro` y se agregó en `astro.config.mjs`.
2. El manifiesto se define en la misma configuración (name, short_name, start_url, scope, display standalone, theme_color, background_color, lang e icons).
3. Los colores salen de los tokens de la tienda: `#111111` (texto y botones) como theme_color y `#ffffff` (fondo) como background_color.
4. Iconos en `public/icons`: `icon-192.png`, `icon-512.png` e `icon-maskable-512.png` (logo dentro del 80% central).
5. `Layout.astro` tiene el `theme-color`, el link al manifiesto, el `apple-touch-icon` y el registro del service worker con `registerSW`.
6. Bono: `Nav.jsx` guarda el evento `beforeinstallprompt` y muestra un botón INSTALAR que abre el cuadro de instalación. Se oculta cuando la app ya se instaló.

El modo sin conexión queda para la práctica P3-3. Aquí solo se busca que sea instalable.

## Cómo comprobar que es instalable

1. `npm run build` y `npm run preview`, abrir la dirección que muestra la terminal en Chrome.
2. F12, pestaña Application, sección Manifest: deben verse los datos, los tres iconos y en Installability no debe haber errores.
3. En Application > Service Workers debe aparecer `sw.js` activado.
4. En la barra de direcciones aparece el icono de instalar, o el botón INSTALAR de la tienda.

En Lighthouse ya no existe la categoría PWA, por eso la instalabilidad se revisa en Application > Manifest.

## Supabase Storage images

Create a **public** Supabase Storage bucket named `product_images`. Copy `.env.example` to `.env` and set `PUBLIC_SUPABASE_URL` to the project's URL so the storefront can build public image URLs. `.env` is ignored by Git.

For uploads from the admin panel, configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the Django backend, not in Astro or any `PUBLIC_` variable. The admin panel authenticates uploads with the existing admin session, and the backend uses that private key to list and upload images in `product_images/products/`. Keep the bucket public so storefront product images can be displayed. The admin panel supports JPEG, PNG, GIF, and WebP files up to 10 MB.

For disc previews, admins can enter a YouTube video URL, a clip start in seconds, and a clip length in seconds. The existing `discos.duracion` value is used as the clip length (seconds) for this feature. The Bully catalog and admin preview use YouTube's official IFrame Player API to play that range (`start` through `start + duration`) in a visible, controllable YouTube video player; this does not extract or download audio.

For local uploads, copy `.env.storage.example` to `.env.storage` and fill in `SUPABASE_URL`, `PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Get the project URL from the Dashboard's **Connect** dialog. For this REST uploader, use the legacy `service_role` JWT from **Project Settings → API Keys** (normally begins with `eyJ`); the newer `sb_secret_...` key is not a JWT and is not accepted by this script as a Bearer token. The `.env.storage` file is ignored by Git. Never add the service-role key to the frontend, a committed file, or a `PUBLIC_` variable. Preview the 18 local PNGs and target URLs first with `npm run storage:dry-run`, then upload or replace the objects with `npm run storage:upload`. The script uploads files from `public/img` to `product_images/products/`.

The catalog uses the resulting public Storage URLs when `PUBLIC_SUPABASE_URL` is configured and falls back to `/img/...` otherwise. Astro reads public environment values when building; restart the dev server after changing `.env`.

## Login and registration

The login and registration forms call the Django Strawberry GraphQL endpoint at `PUBLIC_API_URL`. For local development, copy `.env.example` to `.env`; the example points to `http://127.0.0.1:8000/graphql/`. Start the backend from `config` with `python manage.py runserver 127.0.0.1:8000`, and run the Astro site with `npm run dev`. Registration creates the account and signs the user in; access and refresh tokens are kept in the browser's session storage and are cleared when that tab's session ends.

For a deployed Astro site, set `PUBLIC_API_URL` in Netlify to the public backend GraphQL URL, then rebuild the site. Configure `CORS_ALLOWED_ORIGINS` in the backend environment to include the exact Astro site origin (for example, `https://your-site.netlify.app`, with no path). Local development origins on ports 4321 are allowed by default. Do not put backend/database credentials or signing secrets in Astro's `PUBLIC_` variables.

The shop loads clothing through the authenticated `ropa` GraphQL query, and `/bully` loads discs through the authenticated `discos` query. These are queries, not mutations. The browser sends the session's access token and refreshes it when the backend reports that it expired; users need to sign in before either catalog can load. Clothing keeps the storefront shape `{ id, nombre, imagen, precio, seccion, stock }`, with `seccion` derived from its category and `destacado: true` for products assigned to `destacado`. The `/bully` page keeps `{ id, nombre, imagen, precio, stock }` and uses `/img/disco-default.svg` when the backend image is empty. Each record belongs to one category.

Product cards add items to a browser-local cart with the backend product ID and quantity. `/carrito` sends checkout through the authenticated `crearPedido` mutation; the backend locks rows, validates stock, deducts inventory, and creates an order per product in one transaction. The page then refreshes the current user's order history. `misPedidos` is authenticated and filters records by the user ID in the access token.