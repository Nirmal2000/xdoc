"use client";

import { useEffect, useState } from 'react';

// Database-based auth state for X OAuth (no cookies dependency)
export function useXAuth() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [userSessionId, setUserSessionId] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Get userSessionId from localStorage (client-generated approach)
        const sessionId = localStorage.getItem('x_user_session_id');
        console.log('[X Auth Debug] Got sessionId from localStorage:', sessionId);

        setUserSessionId(sessionId);

        if (sessionId) {
          const res = await fetch(`/api/auth/x/me?userSessionId=${sessionId}`, { cache: 'no-store' });        
          if (!res.ok) throw new Error('auth check failed');
          const data = await res.json();
          console.log('[X Auth]', data);
          if (!alive) return;
          if (data?.loggedIn) {
            setUser(data.user || null);
          } else {
            // Session invalid, clear it
            localStorage.removeItem('x_user_session_id');
            setUserSessionId(null);
          }
        }
      } catch (_) {
        // Clear invalid session
        localStorage.removeItem('x_user_session_id');
        setUserSessionId(null);
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
      // Call logout API to delete session from database
      if (userSessionId) {
        await fetch('/api/auth/x/logout', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userSessionId })
        });
      }
      
      // Clear localStorage
      localStorage.removeItem('x_user_session_id');
      setUser(null);
      setUserSessionId(null);
    } catch (_) {
      // Always clear local state even if API fails
      localStorage.removeItem('x_user_session_id');
      setUser(null);
      setUserSessionId(null);
    }
  };

  return { user, checked, logout, userSessionId };
}

