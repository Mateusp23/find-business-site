import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Carrega o código real com dependências externas isoladas, sem rede nem credenciais.
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (name === 'server-only') return {};
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Dependência não isolada: ${name}`);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const errors = load('src/lib/api/errors.ts');
const apiError = (status, code) => (error) => error instanceof errors.ApiError && error.status === status && error.code === code;

test('rate limit bloqueia função ausente, resposta inválida e cota excedida', async () => {
  const { enforceRateLimit } = load('src/lib/api/rateLimit.server.ts', { './errors': errors });
  const rules = [{ bucket: 'test', limit: 1, windowSeconds: 60 }];
  const request = new Request('https://app.example/api/test');
  const check = (result) => enforceRateLimit({ userId: 'user', supabase: { rpc: async () => result } }, rules, request);
  for (const code of ['PGRST202', '42883']) {
    await assert.rejects(check({ error: { code } }), apiError(503, 'RATE_LIMIT_UNAVAILABLE'));
  }
  for (const data of [null, {}, { allowed: true, reset_at: 'invalid' }]) {
    await assert.rejects(check({ data }), apiError(503, 'RATE_LIMIT_UNAVAILABLE'));
  }
  const reset_at = new Date(Date.now() + 60000).toISOString();
  await assert.rejects(check({ data: { allowed: false, reset_at } }), apiError(429, 'RATE_LIMIT'));
  await check({ data: { allowed: true, reset_at } });
});

test('sessão exige consulta MFA válida e código quando há fator ativo', async () => {
  let result;
  const { requireSession } = load('src/lib/api/session.server.ts', {
    './errors': errors,
    '@/lib/supabase/server': { getSupabaseServer: async () => ({ auth: {
      getClaims: async () => ({ data: { claims: { sub: 'user', aal: 'aal1' } } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => result },
    } }) },
  });
  for (result of [{ error: new Error('offline'), data: null }, { data: null }, { data: { currentLevel: null, nextLevel: null } }]) {
    await assert.rejects(requireSession(), apiError(503, 'AUTH_UNAVAILABLE'));
  }
  result = { data: { currentLevel: 'aal1', nextLevel: 'aal2' } };
  await assert.rejects(requireSession(), apiError(401, 'MFA_REQUIRED'));
  result = { data: { currentLevel: 'aal1', nextLevel: 'aal1' } };
  assert.equal((await requireSession()).userId, 'user');
});

test('cron exige segredo configurado e credencial correta antes de consultar banco', async () => {
  let calls = 0;
  const { GET } = load('src/app/api/cron/keepalive/route.ts', {
    'next/server': { NextResponse: { json: Response.json } },
    '@supabase/supabase-js': { createClient: () => { calls++; return { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) }; } },
    '@/lib/api/handler.server': { withApiErrors: (handler) => handler, jsonError: (status) => new Response(null, { status }) },
    '@/lib/supabase/env': { SUPABASE_URL: 'https://example.com', SUPABASE_KEY: 'test', isSupabaseConfigured: true },
  });
  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new Request('https://app.example/api/cron/keepalive'))).status, 503);
    process.env.CRON_SECRET = 'test-secret';
    assert.equal((await GET(new Request('https://app.example/api/cron/keepalive'))).status, 401);
    assert.equal(calls, 0);
    assert.equal((await GET(new Request('https://app.example/api/cron/keepalive', { headers: { authorization: 'Bearer test-secret' } }))).status, 200);
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
