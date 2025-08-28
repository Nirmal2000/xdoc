"use client";

import { useEffect, useState } from 'react';

// Simple client-side auth state for X OAuth stored in HttpOnly cookies
export function useXAuth() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/x/me', { cache: 'no-store' });        
        if (!res.ok) throw new Error('auth check failed');
        const data = await res.json();
        console.log('[X Auth]', data);
        if (!alive) return;
        if (data?.loggedIn) setUser(data.user || null);
      } catch (_) {
        // ignore
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => {
      alive = false;
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

