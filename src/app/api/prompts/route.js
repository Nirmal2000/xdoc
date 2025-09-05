import { NextResponse } from 'next/server';
import { getAllPrompts, setPrompt, clearPrompt } from '@/lib/prompts';

export async function GET() {
  try {
    const prompts = await getAllPrompts();
    return NextResponse.json({ prompts });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load prompts' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const updates = body?.updates || (body?.key ? { [body.key]: body.value } : null);
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const results = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== 'string') continue;
      await setPrompt(key, value);
      results[key] = 'ok';
    }
    const prompts = await getAllPrompts();
    return NextResponse.json({ updated: results, prompts });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update prompts' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

export async function DELETE(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body?.key;
    const keys = body?.keys;
    if (!key && !Array.isArray(keys)) {
      return NextResponse.json({ error: 'key or keys required' }, { status: 400 });
    }
    const targetKeys = Array.isArray(keys) ? keys : [key];
    const results = {};
    for (const k of targetKeys) {
      if (typeof k !== 'string') continue;
      await clearPrompt(k);
      results[k] = 'cleared';
    }
    const prompts = await getAllPrompts();
    return NextResponse.json({ cleared: results, prompts });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to clear prompts' }, { status: 500 });
  }
}
