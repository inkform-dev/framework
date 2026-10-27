/**
 * This site's own MDX components, registered with the integration's
 * `components` option. Every capitalized export can be used in any docs page
 * without an import. React renders them to HTML at build time, so they can't
 * use state or effects in the browser.
 */

/** A slot for a screenshot that hasn't been taken yet, framed like the kit's <Frame>. */
export function Screenshot({ file, caption }: { file: string; caption?: string }) {
  return (
    <figure className="fw-frame">
      <div className="fw-frame-inner">
        <div className="example-shot" data-shot={file}>
          Screenshot coming
        </div>
      </div>
      {caption ? <figcaption className="fw-frame-caption">{caption}</figcaption> : null}
    </figure>
  );
}
