'use client';

import React, { useState } from 'react';
import UniversalRegistryModal from '@/components/UniversalRegistryModal';

export default function RegistryTriggerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-[#c4a265] to-[#8b7340] text-black font-bold text-xs rounded-lg hover:from-[#d1b072] transition shadow-md shadow-[#c4a265]/20 flex items-center gap-1.5"
      >
        <span>+ تسجيل سيارة أو تاجر جديد</span>
      </button>

      <UniversalRegistryModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          window.location.reload();
        }}
      />
    </>
  );
}
