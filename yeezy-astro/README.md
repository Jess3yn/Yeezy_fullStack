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