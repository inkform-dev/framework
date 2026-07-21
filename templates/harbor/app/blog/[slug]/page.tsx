import { notFound } from 'next/navigation';
import { DocsShell } from '@inkform/framework/docs-shell';
import { Mdx } from '@inkform/framework/mdx';
import { loadBlogPosts, loadBlogPost } from '@inkform/framework/content';
import { loadDocsConfig, withContentNavLinks } from '@/lib/route';
import { buildTopBar } from '@/components/top-bar';
import { siteMdxComponents } from '@/mdx-components';

export const dynamicParams = false;

export function generateStaticParams() {
  return loadBlogPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = loadBlogPost(slug);
  return { title: post?.title ?? 'Blog' };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = loadBlogPost(slug);
  if (!post) notFound();

  const config = loadDocsConfig();
  const topBar = config ? buildTopBar(withContentNavLinks(config), '') : null;

  return (
    <DocsShell contentType="blog" logo={topBar?.logo} topNav={topBar?.topNav} topActions={topBar?.topActions} hideSidebar hideToc>
      <div className="fw-prose">
        <h1>{post.title}</h1>
        <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
          {post.date} · {post.readingTime} min read{post.author ? ` · ${post.author}` : ''}
        </p>
      </div>
      <Mdx source={post.content} components={siteMdxComponents} />
    </DocsShell>
  );
}
