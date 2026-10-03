# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Supabase Storage images

Create a **public** Supabase Storage bucket named `product_images`. Copy `.env.example` to `.env` and set `PUBLIC_SUPABASE_URL` to the project's URL so the storefront can build public image URLs. `.env` is ignored by Git.

For local uploads, copy `.env.storage.example` to `.env.storage` and fill in `SUPABASE_URL`, `PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Get the project URL from the Dashboard's **Connect** dialog. For this REST uploader, use the legacy `service_role` JWT from **Project Settings → API Keys** (normally begins with `eyJ`); the newer `sb_secret_...` key is not a JWT and is not accepted by this script as a Bearer token. The `.env.storage` file is ignored by Git. Never add the service-role key to the frontend, a committed file, or a `PUBLIC_` variable. Preview the 18 local PNGs and target URLs first with `npm run storage:dry-run`, then upload or replace the objects with `npm run storage:upload`. The script uploads files from `public/img` to `product_images/products/`.

The catalog uses the resulting public Storage URLs when `PUBLIC_SUPABASE_URL` is configured and falls back to `/img/...` otherwise. Astro reads public environment values when building; restart the dev server after changing `.env`.

## Login and registration

The login and registration forms call the Django Strawberry GraphQL endpoint at `PUBLIC_API_URL`. For local development, copy `.env.example` to `.env`; the example points to `http://127.0.0.1:8000/graphql/`. Start the backend from `config` with `python manage.py runserver 127.0.0.1:8000`, and run the Astro site with `npm run dev`. Registration creates the account and signs the user in; access and refresh tokens are kept in the browser's session storage and are cleared when that tab's session ends.

For a deployed Astro site, set `PUBLIC_API_URL` in Netlify to the public backend GraphQL URL, then rebuild the site. Configure `CORS_ALLOWED_ORIGINS` in the backend environment to include the exact Astro site origin (for example, `https://your-site.netlify.app`, with no path). Local development origins on ports 4321 are allowed by default. Do not put backend/database credentials or signing secrets in Astro's `PUBLIC_` variables.

The shop loads clothing through the authenticated `ropa` GraphQL query, and `/bully` loads discs through the authenticated `discos` query. These are queries, not mutations. The browser sends the session's access token and refreshes it when the backend reports that it expired; users need to sign in before either catalog can load. Clothing keeps the storefront shape `{ id, nombre, imagen, precio, seccion, stock }`, with `seccion` derived from its category and `destacado: true` for products assigned to `destacado`. The `/bully` page keeps `{ id, nombre, imagen, precio, stock }` and uses `/img/disco-default.svg` when the backend image is empty. Each record belongs to one category.

Product cards add items to a browser-local cart with the backend product ID and quantity. `/carrito` sends checkout through the authenticated `crearPedido` mutation; the backend locks rows, validates stock, deducts inventory, and creates an order per product in one transaction. The page then refreshes the current user's order history. `misPedidos` is authenticated and filters records by the user ID in the access token.
