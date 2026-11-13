import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Dependência não isolada: ${name}`);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const { salesDashboard, monthlyDate, recurringActive } = load('src/lib/sales.ts');
const { saleSchema } = load('src/lib/validation/schemas.ts', { zod: { z } });
const sale = { amountCents: 150000, monthlyCents: 20000, closedOn: '2024-01-31', recurringEndOn: null };
const lead = { business: { placeId: '1' }, savedAt: '2024-01-01T12:00:00', lastContactAt: '2024-02-01T12:00:00', status: 'fechado', sale };

test('mensalidade preserva aniversário depois de fevereiro e em ano bissexto', () => {
  assert.equal(monthlyDate('2024-01-31', 1), '2024-02-29');
  assert.equal(monthlyDate('2024-01-31', 2), '2024-03-31');
  assert.equal(monthlyDate('2025-01-31', 1), '2025-02-28');
});
test('soma centavos, inclui primeira mensalidade e respeita limites do filtro', () => {
  const stats = salesDashboard([lead], '2024-01-01', '2024-03-31');
  assert.equal(stats.upfront, 150000);
  assert.equal(stats.recurring, 60000);
  assert.equal(stats.revenue, 210000);
  assert.equal(stats.points.reduce((sum, p) => sum + p.upfront + p.recurring, 0), stats.revenue);
  const february = salesDashboard([lead], '2024-02-01', '2024-02-29');
  assert.equal(february.revenue, 20000);
  assert.equal(february.mrr, 20000);
  assert.equal(february.sales.length, 0);
  assert.equal(february.saved, 0);
  assert.equal(february.contacted, 1);
  assert.equal(salesDashboard([lead], '2024-02-01', '2024-02-28').revenue, 0);
});
test('fim inclusivo encerra MRR futuro sem apagar receita anterior', () => {
  const ended = { ...sale, recurringEndOn: '2024-02-29' };
  const stats = salesDashboard([{ ...lead, sale: ended }], '2024-01-01', '2024-03-31');
  assert.equal(stats.recurring, 40000);
  assert.equal(stats.mrr, 0);
  assert.equal(recurringActive(ended, '2024-02-29'), true);
  assert.equal(recurringActive(ended, '2024-03-01'), false);
});
test('leads legados sem venda não inventam receita e filtros não geram NaN', () => {
  const stats = salesDashboard([{ ...lead, sale: null }], '2024-01-01', '2024-03-31');
  assert.equal(stats.revenue, 0);
  assert.equal(stats.missingSales.length, 1);
  assert.equal(stats.conversion, 100);
  assert.equal(salesDashboard([], '2024-01-01', '2024-03-31').conversion, 0);
});
test('schema transforma reais em centavos e rejeita valores e datas inválidos', () => {
  const input = { amountCents: '1.500,25', monthlyCents: '299,90', closedOn: '2024-01-31', recurringEndOn: '' };
  assert.deepEqual(saleSchema.parse(input), { amountCents: 150025, monthlyCents: 29990, closedOn: '2024-01-31', recurringEndOn: null });
  for (const patch of [{ amountCents: '-1' }, { monthlyCents: '1,999' }, { amountCents: 'Infinity' }, { amountCents: '0', monthlyCents: '0' }, { closedOn: '2024-02-30' }, { closedOn: '2999-01-01' }, { recurringEndOn: '2024-01-30' }]) {
    assert.equal(saleSchema.safeParse({ ...input, ...patch }).success, false, JSON.stringify(patch));
  }
});
