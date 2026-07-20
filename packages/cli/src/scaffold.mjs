/**
 * inkform-docs — scaffold a documentation site powered by
 * @inkform/framework. Pick a theme, get a deployable Next.js project.
 *
 * Flow:
 *   1. ask for (or take) a project directory
 *   2. if it exists and is non-empty, move its contents into ./existing-contents
 *   3. ask for (or take) a theme
 *   4. download that theme template (from GitHub by default; --from <dir> locally)
 *   5. wire it up (project name, optional OpenAPI spec) and print next steps
 */
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const REPO = 'inkform/framework';
const TEMPLATE_REF = process.env.INKFORM_DOCS_REF || 'main';

const THEMES = [
  { value: 'aurora', label: 'Aurora', hint: 'classic dark docs (Nextra-style)' },
  { value: 'fern', label: 'Fern', hint: 'clean & friendly, emerald green' },
  { value: 'cedar', label: 'Cedar', hint: 'warm & editorial, burnt orange' },
  { value: 'mono', label: 'Mono', hint: 'monospace / brutalist / terminal' },
  { value: 'base', label: 'Base', hint: 'minimal & neutral (start simple)' },
  { value: 'galley', label: 'Galley', hint: 'warm paper & ink, one editorial red accent' },
];
const THEME_VALUES = new Set(THEMES.map((t) => t.value));

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme' || a === '-t') opts.theme = argv[++i];
    else if (a === '--openapi' || a === '-o') opts.openapi = argv[++i];
    else if (a === '--from') opts.from = argv[++i];
    else if (a === '--yes' || a === '-y') opts.yes = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (!a.startsWith('-')) opts._.push(a);
  }
  return opts;
}

function help() {
  console.log(`
${pc.bold('inkform-docs')} — scaffold a docs site powered by @inkform/framework

${pc.bold('Usage')}
  npx @inkform/cli@latest init [directory] [options]

${pc.bold('Options')}
  -t, --theme <name>     ${[...THEME_VALUES].join(' | ')}
  -o, --openapi <src>    path or URL to an OpenAPI spec for the API Reference
      --from <dir>        scaffold from a local templates dir (development)
  -y, --yes              accept defaults, skip prompts where possible
  -h, --help             show this help

${pc.bold('Example')}
  npx @inkform/cli@latest init my-docs --theme fern
`);
}

const onCancel = () => {
  p.cancel('Scaffolding cancelled.');
  process.exit(0);
};

function slugify(name) {
  return (
    String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'my-docs'
  );
}

/** Create the target dir, relocating any existing contents to ./existing-contents. */
async function prepareDir(targetDir, { yes }) {
  if (!existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
    return;
  }
  const entries = (await fs.readdir(targetDir)).filter((e) => e !== 'existing-contents');
  if (entries.length === 0) return;

  p.log.warn(
    `${pc.yellow(path.basename(targetDir))} already exists and is not empty (${entries.length} item${
      entries.length === 1 ? '' : 's'
    }).`,
  );
  if (!yes) {
    const go = await p.confirm({
      message: `Move its current contents into ${pc.cyan('existing-contents/')} and scaffold here?`,
      initialValue: true,
    });
    if (p.isCancel(go) || !go) onCancel();
  }

  const stash = path.join(targetDir, 'existing-contents');
  await fs.mkdir(stash, { recursive: true });
  for (const entry of entries) {
    await fs.rename(path.join(targetDir, entry), path.join(stash, entry));
  }
  p.log.info(`Moved ${entries.length} item${entries.length === 1 ? '' : 's'} → ${pc.cyan('existing-contents/')}`);
}

/** Copy a local template dir (development override via --from). */
async function copyLocalTemplate(fromRoot, theme, targetDir) {
  const src = path.resolve(fromRoot, theme);
  if (!existsSync(src)) throw new Error(`Local template not found: ${src}`);
  const SKIP = new Set([
    'node_modules',
    '.next',
    'out',
    '.vercel',
    'existing-contents',
    '.git',
    '.turbo',
    'tsconfig.tsbuildinfo',
  ]);
  async function copyDir(from, to) {
    await fs.mkdir(to, { recursive: true });
    for (const dirent of await fs.readdir(from, { withFileTypes: true })) {
      if (SKIP.has(dirent.name)) continue;
      const f = path.join(from, dirent.name);
      const t = path.join(to, dirent.name);
      if (dirent.isDirectory()) await copyDir(f, t);
      else await fs.copyFile(f, t);
    }
  }
  await copyDir(src, targetDir);
}

/** Download a theme template from GitHub via giget. */
async function downloadTemplate(theme, targetDir) {
  const { downloadTemplate: dl } = await import('giget');
  await dl(`github:${REPO}/templates/${theme}#${TEMPLATE_REF}`, {
    dir: targetDir,
    force: true,
    install: false,
  });
}

async function applyOpenApi(targetDir, src) {
  const dest = path.join(targetDir, 'content', 'docs', 'openapi.json');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  let raw;
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Could not fetch OpenAPI spec (${res.status}) from ${src}`);
    raw = await res.text();
  } else {
    raw = await fs.readFile(path.resolve(src), 'utf8');
  }
  await fs.writeFile(dest, raw);
  p.log.info(`API Reference will be generated from your spec → ${pc.cyan('content/docs/openapi.json')}`);
}

/** Set the scaffolded project's package + docs names. */
async function rename(targetDir, displayName) {
  const slug = slugify(displayName);
  const pkgPath = path.join(targetDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
    pkg.name = slug;
    pkg.version = '0.1.0';
    delete pkg.description;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
  const docsPath = path.join(targetDir, 'content', 'docs', 'docs.json');
  if (existsSync(docsPath)) {
    const docs = JSON.parse(await fs.readFile(docsPath, 'utf8'));
    docs.name = displayName;
    await fs.writeFile(docsPath, JSON.stringify(docs, null, 2) + '\n');
  }
}

export async function run(argv) {
  const opts = parseArgs(argv);
  if (opts.help) return help();

  // `init` is the only/default command; tolerate it as the first positional.
  const positionals = opts._[0] === 'init' ? opts._.slice(1) : opts._;

  console.log('');
  p.intro(pc.bgCyan(pc.black(' inkform-docs ')));

  // 1. project directory
  let dirInput = positionals[0];
  if (!dirInput) {
    const v = await p.text({
      message: 'Where should we create your docs?',
      placeholder: 'my-docs',
      defaultValue: 'my-docs',
      validate: (val) => (val && val.includes('..') ? 'Please use a simple folder name.' : undefined),
    });
    if (p.isCancel(v)) onCancel();
    dirInput = v || 'my-docs';
  }
  const displayName = path.basename(dirInput);
  const targetDir = path.resolve(process.cwd(), dirInput);

  // 2. theme
  let theme = opts.theme;
  if (theme && !THEME_VALUES.has(theme)) {
    p.log.warn(`Unknown theme "${theme}". Choose one below.`);
    theme = undefined;
  }
  if (!theme) {
    const v = await p.select({ message: 'Pick a theme', options: THEMES, initialValue: 'aurora' });
    if (p.isCancel(v)) onCancel();
    theme = v;
  }

  // 3. optional OpenAPI spec
  let openapi = opts.openapi;
  if (openapi === undefined && !opts.yes) {
    const wants = await p.confirm({
      message: 'Do you have an OpenAPI spec for the API Reference? (you can add one later)',
      initialValue: false,
    });
    if (p.isCancel(wants)) onCancel();
    if (wants) {
      const v = await p.text({
        message: 'Path or URL to your OpenAPI spec (JSON or YAML)',
        placeholder: './openapi.json',
      });
      if (p.isCancel(v)) onCancel();
      openapi = v || undefined;
    }
  }

  // 4. prepare dir + fetch template
  await prepareDir(targetDir, opts);

  const s = p.spinner();
  s.start(`Scaffolding the ${pc.cyan(theme)} theme`);
  try {
    if (opts.from) await copyLocalTemplate(opts.from, theme, targetDir);
    else await downloadTemplate(theme, targetDir);
  } catch (err) {
    s.stop('Failed to fetch the template.');
    throw err;
  }
  s.stop(`Created the ${pc.cyan(theme)} theme in ${pc.cyan(path.relative(process.cwd(), targetDir) || '.')}`);

  // 5. wire up
  await rename(targetDir, displayName);
  if (openapi) {
    try {
      await applyOpenApi(targetDir, openapi);
    } catch (err) {
      p.log.warn(`Kept the sample OpenAPI spec — ${err.message}`);
    }
  }

  const rel = path.relative(process.cwd(), targetDir);
  p.note(
    [
      rel ? pc.gray('cd ') + rel : null,
      pc.gray('npm install'),
      pc.gray('npm run dev'),
    ]
      .filter(Boolean)
      .join('\n'),
    'Next steps',
  );
  p.outro(
    `${pc.green('Done.')} Edit ${pc.cyan('content/docs')} and open ${pc.cyan(
      'http://localhost:3000',
    )}. Deploy guide is in the project ${pc.cyan('README.md')}.`,
  );
}
