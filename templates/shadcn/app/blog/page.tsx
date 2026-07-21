import Link from 'next/link';
import { DocsShell } from '@inkform/framework/docs-shell';
import { loadBlogPosts } from '@inkform/framework/content';
import { loadDocsConfig, withContentNavLinks } from '@/lib/route';
import { buildTopBar } from '@/components/top-bar';

export const metadata = { title: 'Blog' };

export default function BlogIndexPage() {
  const config = loadDocsConfig();
  const posts = loadBlogPosts();
  const topBar = config ? buildTopBar(withContentNavLinks(config), '') : null;

  return (
    <DocsShell contentType="blog" logo={topBar?.logo} topNav={topBar?.topNav} topActions={topBar?.topActions} cta={topBar?.cta} hideSidebar hideToc>
      <div className="fw-prose">
        <h1>Blog</h1>
        {posts.length === 0 ? (
          <p>No posts yet — check back soon.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {posts.map((p) => (
              <li key={p.slug} style={{ marginBottom: '2rem' }}>
                <Link href={`/blog/${p.slug}`}>
                  <h2 style={{ marginBottom: '0.25rem' }}>{p.title}</h2>
                </Link>
                <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
                  {p.date} · {p.readingTime} min read{p.author ? ` · ${p.author}` : ''}
                </p>
                {p.description ? <p>{p.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DocsShell>
  );
}
