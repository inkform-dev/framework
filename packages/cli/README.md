# @inkform/cli

Scaffold a documentation site powered by
[`@inkform/framework`](https://github.com/inkform-dev/framework) — pick a
theme, get a deployable Next.js project. Like `npx shadcn`, but for docs.

```bash
npx @inkform/cli@latest init my-docs
```

## What it does

1. Asks where to create your project (or takes a directory argument). If that
   folder already exists and isn't empty, it moves the current contents into
   `existing-contents/` (and tells you), so nothing is overwritten.
2. Asks which theme you want — **Aurora**, **Fern**, **Cedar**, **Mono**,
   **Base**, or **Galley**.
3. Downloads that theme as a standalone Next.js app.
4. Optionally wires up your **OpenAPI spec** (path or URL) so the API Reference
   is generated from it. API docs are OpenAPI-first; everything else is MDX.
5. Prints the next steps and points you at the project's deploy guide.

## Usage

```bash
npx @inkform/cli@latest init [directory] [options]
```

| Option | Description |
| --- | --- |
| `-t, --theme <name>` | `aurora` \| `fern` \| `cedar` \| `mono` \| `base` \| `galley` |
| `-o, --openapi <src>` | path or URL to an OpenAPI spec for the API Reference |
| `--from <dir>` | scaffold from a local templates directory (development) |
| `-y, --yes` | accept defaults, skip optional prompts |
| `-h, --help` | show help |

### Examples

```bash
# interactive
npx @inkform/cli@latest init

# pick everything up front
npx @inkform/cli@latest init docs --theme mono

# generate the API Reference from your spec
npx @inkform/cli@latest init api-docs --theme fern --openapi https://example.com/openapi.json
```

Then:

```bash
cd my-docs
npm install
npm run dev
```

Open <http://localhost:3000>. Each scaffolded project ships a README with
content and deployment guides (Vercel + AWS Amplify).

## License

MIT.
