import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import db from '@/api/client';

// 404-side: vises for stier som verken er registrert i pages.config
// eller matcher /Side/:slug. Rendres utenfor Layout (ingen header),
// så lenken til forsiden er eneste vei videre.
export default function PageNotFound() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await db.auth.me();
        if (mounted) setIsAdmin(user?.role === 'admin');
      } catch {
        // Ikke innlogget — ingen admin-hint.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F0E9] dark:bg-[#1F1F1E]">
      <div
        className="max-w-md w-full text-center space-y-6 text-[#2C2C2A] dark:text-[#F4F0E9]"
        style={{ fontFamily: "'Spectral', Georgia, serif" }}
      >
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-[#B6B9B3]">404</h1>
          <div className="h-0.5 w-16 bg-[#E8E0D8] dark:bg-gray-700 mx-auto"></div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-light">Siden finnes ikke</h2>
          <p className="leading-relaxed">
            Vi fant ingen side på adressen{' '}
            <span className="font-medium break-all">{pathname}</span>.
          </p>
        </div>

        {isAdmin && (
          <p className="text-sm text-[#7A7A76] dark:text-[#B6B9B3] text-left p-4 rounded-lg border border-[#E8E0D8] dark:border-gray-700">
            Admin-merknad: innholdssider ligger under <code>/Side/&lt;slug&gt;</code> og
            opprettes under Admin → Innhold. Faste sider må registreres i{' '}
            <code>src/pages.config.js</code>.
          </p>
        )}

        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-[#E8E0D8] dark:border-gray-700 rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-gray-700 transition-colors"
          >
            Til forsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
