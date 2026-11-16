# Fridge Rescue

A Lithuanian recipe discovery app built with Next.js. Search TheMealDB, open a complete recipe, save favorites with Supabase, and get cooking help or recipe adaptations from OpenRouter AI.

## Run locally

1. Install [Node.js 20.9 or newer](https://nodejs.org/).
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in your project values.
4. Run `npm run dev` and open http://localhost:3000.

Ingredient search and recipe details use TheMealDB's public API and work without credentials. Ingredient search follows TheMealDB's `filter.php?i=` endpoint; use a single ingredient such as `chicken` or `salmon`.

Select **Pagal patiekalo pavadinimą** to search existing meal names (for example, `Arrabiata` or `Teriyaki`). This uses `search.php?s=` through `/api/meals/search?q=Arrabiata&mode=name`. Use English ingredient and meal names. The default `mode=ingredient` preserves ingredient search; numeric IDs work in either mode.

You can also search by a numeric TheMealDB recipe ID, such as `52772`. Copy an ID using **Kopijuoti ID** on a result card or recipe page. Open a result to load full details through `lookup.php?i=`: name, photo, category, country or region, ingredients with quantities, and cooking instructions. Clipboard copying requires localhost or HTTPS; the ID can also be selected and copied manually.

## Configure Supabase

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. In **SQL Editor**, run the migrations in order: `supabase/migrations/20261116000000_create_saved_recipes.sql`, then `supabase/migrations/20261116010000_add_saved_recipe_category_and_note.sql`.
4. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` while developing.

Email and password sign-up/sign-in are provided by Supabase Auth. If email confirmation is enabled, confirm the signup from the email before signing in. The saved-recipe table uses Row Level Security so a user can only see, add, update, or remove their own saved recipes. The signed-in user's recipes, title and category filters, category and note editor, and remove actions are all available in **Paskyra → Mano išsaugoti receptai**.

## Configure OpenRouter AI

1. Create an API key in your OpenRouter account.
2. Set `OPENROUTER_API_KEY` in `.env.local`. This is a server-only secret; never prefix it with `NEXT_PUBLIC_` or commit it.
3. Optionally set `OPENROUTER_MODEL` to a model available in your OpenRouter account. If omitted, the server uses `openrouter/auto`.
4. Homepage AI help and recipe adaptation require a signed-in Supabase user. The server verifies the user's access token before sending the question, ingredients, or recipe to OpenRouter.

## Where requests run

- The browser renders the app and uses Supabase Auth and its publishable key for sign-in and row-level-protected saved recipes.
- Next.js Route Handlers `/api/meals/search` and `/api/meals/[id]` call TheMealDB, validate inputs, and cache responses briefly.
- The `/api/ai` and `/api/recipes/adapt` Route Handlers verify the user's Supabase session and call OpenRouter using the private API key. AI help follows the flow browser → `/api/ai` → OpenRouter → `/api/ai` → browser; the OpenRouter key is read only by the server.

## Environment variables

| Variable | Used in | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | For accounts and saved recipes / AI access |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | For accounts and saved recipes / AI access |
| `OPENROUTER_API_KEY` | Server only | For AI help and recipe adaptation |
| `OPENROUTER_MODEL` | Server only | Optional model selection |
| `NEXT_PUBLIC_APP_URL` | Server request metadata | Optional; defaults to `http://localhost:3000` |

`.env.local` is ignored by Git. Use `.env.example` to document variable names without secrets.
