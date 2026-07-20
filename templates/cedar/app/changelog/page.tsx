import { DocsShell } from '@inkform/framework/docs-shell';
import { Mdx } from '@inkform/framework/mdx';
import { loadChangelogEntries } from '@inkform/framework/content';
import { loadDocsConfig, withContentNavLinks } from '@/lib/route';
import { buildTopBar } from '@/components/top-bar';
import { siteMdxComponents } from '@/mdx-components';

export const metadata = { title: 'Changelog' };

export default function ChangelogPage() {
  const config = loadDocsConfig();
  const entries = loadChangelogEntries();
  const topBar = config ? buildTopBar(withContentNavLinks(config), '') : null;

  return (
    <DocsShell logo={topBar?.logo} topNav={topBar?.topNav} topActions={topBar?.topActions} hideSidebar hideToc>
      <div className="fw-prose">
        <h1>Changelog</h1>
        {entries.length === 0 ? <p>No entries yet.</p> : null}
      </div>
      {entries.map((e) => (
        <div key={e.slug} className="fw-prose" style={{ marginTop: '2rem' }}>
          <p style={{ opacity: 0.7, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            {e.date}
            {e.version ? ` · v${e.version}` : ''}
          </p>
          <h2>{e.title}</h2>
          <Mdx source={e.content} components={siteMdxComponents} />
        </div>
      ))}
    </DocsShell>
  );
}
