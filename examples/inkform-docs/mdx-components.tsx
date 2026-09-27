import { mdxComponents } from '@inkform/framework/components';
import { Mermaid } from '@inkform/framework/mermaid';
import widgets from '@/widgets';

/**
 * Site-level MDX component map.
 * The framework's defaults cover all built-in blocks (Callout, Card, Steps,
 * Tabs, CodeGroup, Accordion, ParamField, …). Custom widgets registered in
 * widgets/index.ts are merged in here, so <YourWidget /> in MDX/CMS content
 * resolves to the real component instead of the unknown-component fallback.
 *
 * Mermaid makes ```mermaid fences interactive diagrams (pan, zoom,
 * fullscreen). Not drawing diagrams? Drop this import and the `mermaid`
 * dependency — fences then render as a plain source block.
 */
export const siteMdxComponents = mdxComponents({ Mermaid, ...widgets });
