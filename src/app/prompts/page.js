"use client";

import { useEffect, useMemo, useState } from 'react';

export default function PromptsAdminPage() {
  const [prompts, setPrompts] = useState({});
  const [edited, setEdited] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const dateEnabledKeys = new Set(['chatSystem', 'tweetSystemTemplate', 'liveSearchSystemTemplate']);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/prompts', { cache: 'no-store' });
        const data = await res.json();
        if (mounted && data?.prompts) {
          setPrompts(data.prompts);
          setEdited(data.prompts);
        }
      } catch (e) {
        setMessage('Failed to load prompts');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const keys = useMemo(() => Object.keys(prompts), [prompts]);

  async function saveAll() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: edited }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setPrompts(data.prompts || edited);
      setMessage('Saved all prompts');
    } catch (e) {
      setMessage(e.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function saveOne(key) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: edited[key] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setPrompts(data.prompts || { ...prompts, [key]: edited[key] });
      setMessage(`Saved ${key}`);
    } catch (e) {
      setMessage(e.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function resetOne(key) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Reset failed');
      if (data?.prompts) {
        setPrompts(data.prompts);
        setEdited(data.prompts);
      }
      setMessage(`Reset ${key} to default`);
    } catch (e) {
      setMessage(e.message || 'Reset failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  function onChange(key, value) {
    setEdited((cur) => ({ ...cur, [key]: value }));
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Prompts Admin</h1>
      <p>After temp save, must save manually to &quot;./src/lib/prompts.js&quot;</p>
      <p className="text-sm text-gray-500 mb-6">Edit prompts/templates live. Stored in Redis under hash &quot;prompts&quot;.</p>
      {message && (
        <div className="mb-4 text-sm px-3 py-2 rounded bg-blue-50 text-blue-800">{message}</div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <button
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
              disabled={saving}
              onClick={saveAll}
            >
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
          <div className="space-y-8">
            {keys.map((key) => (
              <section key={key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-medium">{key}</h2>
                  <div className="flex gap-2">
                    <button
                      className="text-sm px-3 py-1.5 rounded bg-gray-200 text-gray-900 disabled:opacity-50"
                      disabled={saving}
                      onClick={() => resetOne(key)}
                    >
                      Reset/Load from file
                    </button>
                    <button
                      className="text-sm px-3 py-1.5 rounded bg-gray-900 text-white disabled:opacity-50"
                      disabled={saving}
                      onClick={() => saveOne(key)}
                    >
                      Temp Save
                    </button>
                  </div>
                </div>
                <textarea
                  className="w-full min-h-[220px] font-mono text-sm p-3 border rounded"
                  value={edited[key] || ''}
                  onChange={(e) => onChange(key, e.target.value)}
                />
                {dateEnabledKeys.has(key) && (
                  <p className="text-xs text-gray-500 mt-2">Placeholders available: {'{{date}}'}</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
