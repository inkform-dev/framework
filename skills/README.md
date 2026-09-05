# Inkform framework skills for Claude Code

Agent skills that teach Claude Code how to work with `@inkform/framework`. Point Claude at
one and it does the integration and opens the PR.

| Skill | What it does |
|---|---|
| [`inkform-framework`](./inkform-framework/SKILL.md) | Adds MDX docs, a blog, or a changelog to a Next.js site — scaffolding a new site, or bolting onto an existing one without touching its layout. |

## Install

### Option 1 — install the plugin (one command)

```
/plugin marketplace add inkform-dev/framework
/plugin install inkform-framework@inkform-framework
```

Loads automatically in any repo from then on. Update with
`/plugin marketplace update inkform-framework`.

### Option 2 — copy the markdown

`SKILL.md` is self-contained. Drop it in either location:

```bash
# just you, every project
mkdir -p ~/.claude/skills/inkform-framework
curl -o ~/.claude/skills/inkform-framework/SKILL.md \
  https://raw.githubusercontent.com/inkform-dev/framework/main/skills/inkform-framework/SKILL.md

# or commit it to one repo, for everyone working in it
mkdir -p .claude/skills/inkform-framework
```

### Option 3 — just link the docs

No install:

```
Add a blog to this Next.js site following
https://framework.inkform.dev/guides/blog-in-existing-site — then open a PR.
```

The skill is worth installing when you're doing this across several sites: it also carries
the failure modes — the `transpilePackages` requirement, the Next ≥ 16 / React 19 floor, and
not transplanting the docs shell onto someone's existing site.

## Using it

```
Add an MDX blog to this site at /blog and open a PR.
```

## Related

Newsletter signup forms and the hosted platform API live in the platform repo's skill:
`/plugin marketplace add inkform-dev/cms`.
