"use client";

import { useEffect, useState } from 'react';

// Simple client-side auth state for X OAuth stored in HttpOnly cookies
export function useXAuth() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    let attempts = 0;

    const check = async () => {
      try {
        const res = await fetch('/api/auth/x/me', { cache: 'no-store' });
        if (!res.ok) throw new Error('auth check failed');
        const data = await res.json();
        if (!alive) return false;
        if (data?.loggedIn) {
          setUser(data.user || null);
          setChecked(true);
          return true;
        }
      } catch (_) {}
      return false;
    };

    (async () => {
      const ok = await check();
      if (ok) return;
      const timer = setInterval(async () => {
        attempts += 1;
        const ok2 = await check();
        if (ok2 || attempts >= 10) {
          clearInterval(timer);
          if (!ok2) setChecked(true);
        }
      }, 1000);
    })();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/x/logout', { method: 'POST' });
      setUser(null);
    } catch (_) {}
  };

  return { user, checked, logout };
}
