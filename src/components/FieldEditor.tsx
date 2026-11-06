'use client';

import { useState, useCallback } from 'react';
import type { StudioField } from '@/lib/content-admin';

interface Props {
  fields: StudioField[];
  values: Record<string, unknown>;
  saving: boolean;
  canEdit: boolean;
  onSave: (values: Record<string, unknown>) => void;
}

export default function FieldEditor({ fields, values, saving, canEdit, onSave }: Props) {
  // Local draft state — starts from authored values, dirty until saved
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...values });
  const [dirty, setDirty] = useState(false);

  const setField = useCallback((name: string, val: unknown) => {
    setDraft((prev) => ({ ...prev, [name]: val }));
    setDirty(true);
  }, []);

  const handleSave = () => {
    if (!dirty || saving) return;
    onSave(draft);
    setDirty(false);
  };

  if (!fields.length) {
    return (
      <div className="text-sm opacity-50 text-center py-8">
        No fields defined for this section. Add them via Platform → Schema.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Field inputs */}
      <div className="grid gap-4">
        {fields.map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            value={draft[f.name] ?? ''}
            disabled={!canEdit || saving}
            onChange={(v) => setField(f.name, v)}
          />
        ))}
      </div>

      {/* AR overrides (for key text fields) */}
      <details className="text-xs">
        <summary className="cursor-pointer font-bold opacity-60 hover:opacity-100">
          Arabic overrides (optional)
        </summary>
        <div className="mt-3 grid gap-3 p-3 rounded-lg bg-black/[.02] dark:bg-white/5 border border-black/10 dark:border-white/10">
          {fields.filter((f) => ['text', 'textarea', 'select'].includes(f.field_type)).map((f) => (
            <div key={`${f.name}_ar`} className="flex items-center gap-2">
              <label className="w-40 text-[11px] font-medium truncate opacity-60">
                {f.label || f.name} (AR)
              </label>
              <input
                dir="rtl"
                value={(draft[`${f.name}_ar`] as string) ?? ''}
                onChange={(e) => setField(`${f.name}_ar`, e.target.value)}
                disabled={!canEdit || saving}
                className="flex-1 text-xs px-2 py-1.5 rounded border border-black/15 dark:border-white/20 bg-transparent"
                placeholder={`القيمة بالعربية...`}
              />
            </div>
          ))}
        </div>
      </details>

      {/* Save button */}
      <div className="flex justify-end gap-3 pt-2 border-t border-black/10 dark:border-white/10">
        {dirty && (
          <span className="text-[11px] text-amber-600 font-bold self-center">Unsaved changes</span>
        )}
        <button
          onClick={handleSave}
          disabled={!dirty || saving || !canEdit}
          className="px-4 py-2 text-sm font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
        >
          {saving ? 'Saving...' : 'Save Values'}
        </button>
      </div>
    </div>
  );
}

// ── Single field input by type ────────────────────────────────────────────────
function FieldInput({
  field, value, disabled, onChange,
}: {
  field: StudioField;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  const label = field.label || field.name;
  const id = `fld_${field.id}`;

  return (
    <div className="flex items-start gap-3">
      <label htmlFor={id} className="w-40 pt-2 text-xs font-bold opacity-70 flex-shrink-0">
        {label}
        {field.show_as_slide === 1 && (
          <span className="ms-1 text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded">
            SLIDE
          </span>
        )}
      </label>
      <div className="flex-1">
        {renderInput(field, value, disabled, onChange, id)}
      </div>
    </div>
  );
}

function renderInput(
  field: StudioField, value: unknown, disabled: boolean,
  onChange: (v: unknown) => void, id: string,
) {
  const str = String(value ?? '');

  switch (field.field_type) {
    case 'number':
      return (
        <input
          id={id}
          type="number"
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
        />
      );

    case 'boolean':
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={value === true || value === 1 || value === '1' || value === 'true'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-black/30"
          />
          <span className="text-sm">Yes</span>
        </label>
      );

    case 'select': {
      const enumOpts = (field.options as { enum?: string[] } | null)?.enum ?? [];
      return (
        <select
          id={id}
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent"
        >
          <option value="">— select —</option>
          {enumOpts.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    case 'textarea':
    case 'rich_text':
      return (
        <textarea
          id={id}
          rows={4}
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent focus:ring-2 focus:ring-blue-500/30 resize-y"
        />
      );

    case 'image':
      return (
        <div className="flex items-center gap-2">
          {str && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={str} alt="" className="w-12 h-12 rounded object-cover border" />
          )}
          <input
            id={id}
            type="url"
            value={str}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent"
          />
        </div>
      );

    case 'youtube':
      return (
        <input
          id={id}
          type="url"
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent"
        />
      );

    default: // text, video, url, etc.
      return (
        <input
          id={id}
          type="text"
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-lg border border-black/15 dark:border-white/20 bg-transparent focus:ring-2 focus:ring-blue-500/30"
        />
      );
  }
}
