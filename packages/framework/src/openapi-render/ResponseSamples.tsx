import type { ApiResponse } from '../openapi';
import { highlightCode } from './highlight';
import { ResponseSamplesPanel } from './ResponseSamplesPanel';
import { sampleFromSchema } from './sample';

/** Right-rail counterpart to CodeSamples: one highlighted JSON sample per response status, tab-switched. Lives alongside the request's CodeSamples, not inside the left column's schema docs (see Responses.tsx). */
export async function ResponseSamples({ responses }: { responses: ApiResponse[] }) {
  const samples = await Promise.all(
    responses.map(async (r) => {
      const sample = sampleFromSchema(r.schema);
      if (sample == null) return null;
      const html = await highlightCode(JSON.stringify(sample, null, 2), 'json');
      return { status: r.status, ok: r.status.startsWith('2'), html };
    }),
  );

  const real = samples.filter((s): s is NonNullable<typeof s> => s !== null);
  if (real.length === 0) return null;

  return <ResponseSamplesPanel samples={real} />;
}
