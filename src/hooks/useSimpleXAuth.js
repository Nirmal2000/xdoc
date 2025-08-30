"use client";

import { useState, useEffect } from 'react';

// Simple X auth hook for handle-based authentication using localStorage
export function useSimpleX() {
    const [user, setUser] = useState(null);
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load user from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('simple_auth_user');
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                    localStorage.removeItem('simple_auth_user');
                }
            }
        }
        setChecked(true);
    }, []);

    const login = async (handle) => {
        if (!handle || typeof handle !== 'string' || !handle.trim()) {
            throw new Error('Invalid handle provided');
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/x/simple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ handle: handle.trim() }),
            });

            const data = await response.json();

            if (!response.ok || !data.loggedIn) {
                throw new Error(data.error || 'Login failed');
            }

            // Store user data in localStorage
            localStorage.setItem('simple_auth_user', JSON.stringify(data.user));

            // Update state
            setUser(data.user);

            return data.user;
        } catch (error) {
            console.error('[Simple Auth] Login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);

        // Remove from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('simple_auth_user');
        }
    };

    return {
        user,
        checked,
        loading,
        login,
        logout
    };
}