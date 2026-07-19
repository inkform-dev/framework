# PokéAPI Docs

Community documentation for [PokéAPI](https://pokeapi.co) — the free, open RESTful API for Pokémon data. Built on `@inkform/framework` with the Aurora theme (recolored to Pokédex red).

---

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Content structure

All documentation lives in `content/docs/`.

```
content/docs/
  docs.json          # navigation, site name, tabs
  openapi.json       # OpenAPI 3.1 spec (drives the API Reference tab)
  index.mdx          # Introduction
  quickstart.mdx     # Quickstart guide
  fair-use.mdx       # Fair Use Policy
  concepts/
    resources.mdx    # Resources & Endpoints
    pagination.mdx   # Pagination
    resource-lists.mdx
    patterns.mdx     # Common Patterns
  resources/
    pokemon.mdx      # Pokémon resource
    types.mdx        # Types resource
    moves.mdx        # Moves resource
    abilities.mdx    # Abilities resource
    evolution.mdx    # Evolution Chain resource
```

### Adding pages

1. Create a `.mdx` file under `content/docs/`.
2. Add frontmatter: `title` and `description`.
3. Register the page in `docs.json` under the appropriate tab/group.

### API Reference

The API Reference tab is auto-generated from `content/docs/openapi.json`.
Replace or extend the spec to add new endpoint pages.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | No | Production URL for canonical links |
| `NEXT_PUBLIC_DOCS_AI_ENABLED` | No | Set to `true` to enable the Ask AI widget |
| `ANTHROPIC_API_KEY` | Only if AI enabled | Used by `app/api/ask/route.ts` |

---

## Deploy to Vercel

1. Push to a GitHub repository.
2. Import the repo in the Vercel dashboard.
3. Set **Root directory** to the path of this folder if deploying from a monorepo.
4. Add `NEXT_PUBLIC_SITE_URL` as an environment variable.
5. Click **Deploy**.

---

## Ask AI widget

The Ask AI button is built in but disabled by default. Enable it:

1. Set `NEXT_PUBLIC_DOCS_AI_ENABLED=true`.
2. Add your `ANTHROPIC_API_KEY` as a server-side env var.
3. The LLM call is wired in `app/api/ask/route.ts`.
