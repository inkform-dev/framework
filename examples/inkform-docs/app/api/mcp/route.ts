import { createMcpHandler } from '@inkform/framework/mcp';

// Created once at module scope — reused across warm invocations, not
// re-registered on every request. Stateless transport, so this is safe
// even though a serverless platform may route requests to different
// instances.
const handler = createMcpHandler({ name: 'inkform-docs' });

export { handler as DELETE, handler as GET, handler as POST };
