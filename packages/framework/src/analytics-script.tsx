import * as React from 'react';

type Props = {
  projectId: string;
  workspaceId: string;
  /** Origin that serves your analytics script + collector (defaults to same origin). */
  apiBaseUrl?: string;
  /** Path to the analytics script (defaults to `/api/analytics/script`). */
  scriptPath?: string;
};

/**
 * Injects a first-party analytics tracking script tag. Add to the root layout.
 * Opt out by simply not rendering it. Server component — just a <script> tag.
 * Point it at any compatible collector via `apiBaseUrl` / `scriptPath`.
 */
export function AnalyticsScript({
  projectId,
  workspaceId,
  apiBaseUrl = '',
  scriptPath = '/api/analytics/script',
}: Props) {
  const base = apiBaseUrl.replace(/\/$/, '');
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script
      defer
      src={`${base}${scriptPath}`}
      data-project={projectId}
      data-workspace={workspaceId}
      data-api={base}
    />
  );
}
