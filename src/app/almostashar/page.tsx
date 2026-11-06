'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AlmostasharLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('super@mostasharak.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      router.push('/admin/platform');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090c] text-white flex flex-col justify-between p-6" dir="rtl">
      {/* Top Header */}
      <div className="flex justify-between items-center max-w-4xl w-full mx-auto py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c4a265] to-[#8b7340] flex items-center justify-center font-bold text-black text-sm">
            م
          </div>
          <span className="font-semibold tracking-wider text-sm uppercase text-[#c4a265]">
            بوابة المستشار للسيارات الفاخرة
          </span>
        </div>
        <a href="/" className="text-xs text-white/50 hover:text-white transition-colors">
          العودة للرئيسية ←
        </a>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-12 bg-white/[0.03] border border-[#c4a265]/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/80">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-[#c4a265]/10 border border-[#c4a265]/20 rounded-full text-[11px] font-medium text-[#c4a265] mb-3">
            لوحة الإدارة المركزية
          </div>
          <h1 className="text-2xl font-light tracking-tight text-white mb-2">
            تسجيل دخول <span className="font-normal text-[#c4a265]">المستشار</span>
          </h1>
          <p className="text-xs text-neutral-400">
            أدخل بيانات الإدارة الفائقة للوصول إلى كافة أدوات التحكم والتصنيف
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              البريد الإلكتروني للإدارة
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#c4a265] transition-colors"
              placeholder="super@mostasharak.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#c4a265] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#c4a265] to-[#a3834a] hover:from-[#d1b072] hover:to-[#b09054] text-black font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-[#c4a265]/20 disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول المنصة مباشرة'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[11px] text-neutral-500">
            حساب تجريبي مسجل مسبقاً: <code className="text-[#c4a265]">super@mostasharak.com</code> / كلمة السر: <code className="text-[#c4a265]">admin123</code>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl w-full mx-auto text-center py-4 text-xs text-neutral-500">
        بوابة المستشار لتجارة وتقييم السيارات في مصر &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
