'use client';

import { useState } from 'react';
import type { BusinessApplicationView } from '@/lib/business-apps';

export default function BusinessApplicationsClient({
  businessId,
  initialApplications,
}: {
  businessId: string;
  initialApplications: BusinessApplicationView[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function requestLicenses() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/business-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, applicationIds: selectedIds }),
      });
      const result = await response.json() as { applications?: BusinessApplicationView[]; error?: string };
      if (!response.ok || !result.applications) {
        throw new Error(result.error || 'Could not submit application requests.');
      }
      setApplications(result.applications);
      setSelectedIds([]);
      setMessage('License request submitted. The Autofyon platform administrator must approve it.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit application requests.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Your minisite works independently of these optional applications. A license does not expose an app until that application is integrated and enabled for your business.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {applications.map((application) => (
          <article key={application.id} className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
            <div>
              <h2 className="font-bold">{application.nameAr}</h2>
              <p className="mt-1 text-xs text-neutral-500">{application.name}</p>
            </div>
            <p className="text-sm text-neutral-600">{application.description}</p>
            <p className="text-sm">
              License status: <strong>{application.status.replaceAll('_', ' ')}</strong>
            </p>
            {application.expiresAt ? (
              <p className="text-xs text-neutral-500">Expires: {application.expiresAt}</p>
            ) : null}
            {application.status === 'not_requested' || application.status === 'expired' || application.status === 'revoked' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(application.id)}
                  onChange={(event) => setSelectedIds((current) =>
                    event.target.checked
                      ? [...current, application.id]
                      : current.filter((id) => id !== application.id),
                  )}
                />
                Request a license
              </label>
            ) : null}
          </article>
        ))}
      </div>
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p> : null}
      <button
        type="button"
        disabled={!selectedIds.length || saving}
        onClick={() => void requestLicenses()}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? 'Submitting…' : 'Request selected applications'}
      </button>
    </div>
  );
}
