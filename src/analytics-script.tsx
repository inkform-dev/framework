import * as React from 'react';

type Props = {
  projectId: string;
  workspaceId: string;
  /** Platform origin hosting /api/analytics/* (e.g. https://freewritecms.com). */
  apiBaseUrl?: string;
};

/**
 * Injects the first-party analytics tracking script. Add to the root layout.
 * Opt out by simply not rendering it. Server component — just a <script> tag.
 */
export function AnalyticsScript({ projectId, workspaceId, apiBaseUrl = '' }: Props) {
  const base = apiBaseUrl.replace(/\/$/, '');
  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script
      defer
      src={`${base}/api/analytics/script`}
      data-project={projectId}
      data-workspace={workspaceId}
      data-api={base}
    />
  );
}
