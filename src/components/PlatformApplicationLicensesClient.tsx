'use client';

import { useState } from 'react';
import type { BusinessApplicationLicenseRow } from '@/lib/business-apps';

export default function PlatformApplicationLicensesClient({
  initialLicenses,
}: {
  initialLicenses: BusinessApplicationLicenseRow[];
}) {
  const [licenses, setLicenses] = useState(initialLicenses);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function updateLicense(license: BusinessApplicationLicenseRow, status: 'active' | 'suspended' | 'revoked') {
    const key = `${license.business_id}:${license.application_id}`;
    setBusy(key);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/platform/business-applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: license.business_id,
          applicationId: license.application_id,
          status,
          licenseKey: license.license_key,
          expiresAt: license.expires_at,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not update the license.');
      const refreshed = await fetch('/api/admin/platform/business-applications', { cache: 'no-store' });
      const result = await refreshed.json() as { licenses?: BusinessApplicationLicenseRow[]; error?: string };
      if (!refreshed.ok || !result.licenses) {
        throw new Error(result.error || 'License saved, but the list could not be refreshed.');
      }
      setLicenses(result.licenses);
      setMessage('License status updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the license.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {!licenses.length ? <p className="rounded-xl border border-black/10 p-5 text-sm text-neutral-600">No application license requests yet.</p> : null}
      <div className="space-y-3">
        {licenses.map((license) => {
          const key = `${license.business_id}:${license.application_id}`;
          return (
            <article key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-4">
              <div>
                <h2 className="font-bold">{license.business_name_ar || license.business_name}</h2>
                <p className="text-xs text-neutral-500" dir="ltr">/{license.business_slug} · {license.application_id}</p>
                <p className="mt-1 text-sm">Status: <strong>{license.status}</strong></p>
              </div>
              <div className="flex flex-wrap gap-2">
                {license.status !== 'active' ? (
                  <button
                    type="button"
                    disabled={busy === key}
                    onClick={() => void updateLicense(license, 'active')}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === key}
                    onClick={() => void updateLicense(license, 'suspended')}
                    className="rounded-lg border border-amber-600 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50"
                  >
                    Suspend
                  </button>
                )}
                {license.status !== 'revoked' ? (
                  <button
                    type="button"
                    disabled={busy === key}
                    onClick={() => void updateLicense(license, 'revoked')}
                    className="rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
