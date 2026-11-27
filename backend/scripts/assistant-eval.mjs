// Live golden-question eval for the storefront Parts Assistant. MANUAL tool, not a CI gate.
// Runs real turns through ChatService.respond() against the live Ollama model and the real DB.
//
//   docker exec -w /app truck-system-backend node scripts/assistant-eval.mjs [--only=E1,F2] [--json]
//
// Per question it checks: expected tool + key args, no tool { error }, DB-computed truth where the
// answer is deterministic, no invented prices (every peso amount in the reply came from a tool
// result), and reports latency. Exit code is 0 regardless; read the pass rate.

import { respond } from '../src/services/ChatService.js';
import { executeTool, createDefaultDeps, toCustomerPart, tokenize } from '../src/services/AssistantTools.js';

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const PESO = /₱\s?[\d,]+(?:\.\d+)?/g;
const DECLINE = /do(?:n't| not) have (?:any )?(?:information|info)|can(?:no|')?t|cannot|unable|not able|no access|don't have access|do not have access|not (?:available|something|share|provide)|sorry|only help|unfortunately/i;

const toolDeps = await createDefaultDeps();
const markup = await toolDeps.getMarkup();
const currency = await toolDeps.getCurrency();

// ---- DB truth helpers ------------------------------------------------------
const allParts = async () =>
  (await toolDeps.partsRepository.listCustomerParts({ limit: 500 })).map((p) => toCustomerPart(p, markup, currency));
const matching = async (words) => {
  const tokens = tokenize(words);
  const rows = await toolDeps.partsRepository.searchCustomerParts({ tokens, mode: 'all', limit: 500 });
  return rows.map((p) => toCustomerPart(p, markup, currency));
};
const byPrice = (parts, dir) => [...parts].sort((a, b) => (dir === 'asc' ? a.price - b.price : b.price - a.price));
const mentions = (text, part) => {
  const t = text.toLowerCase();
  return t.includes(part.sku.toLowerCase()) || t.includes(part.name.toLowerCase());
};
const replyMentionsAnyCard = (ctx, part) =>
  !part ? false : mentions(ctx.text, part) || ctx.cards.some((c) => c.sku === part.sku);

// ---- check builders --------------------------------------------------------
const usedTool = (ctx, name) => ctx.calls.some((c) => c.name === name);
const callOf = (ctx, name) => ctx.calls.find((c) => c.name === name);
const argText = (call) => Object.values(call?.args ?? {}).filter((v) => typeof v === 'string').join(' ').toLowerCase();
const expectTool = (name) => (ctx) => usedTool(ctx, name) || `expected tool ${name}, got [${ctx.calls.map((c) => c.name)}]`;
const expectSearch = (pred, label) => (ctx) => {
  const call = callOf(ctx, 'search_parts');
  if (!call) return 'search_parts not called';
  return pred(call.args ?? {}, argText(call)) || `search_parts args wrong for ${label}: ${JSON.stringify(call.args)}`;
};

// ---- questions -------------------------------------------------------------
const sample = (await allParts()).find((p) => p.sku && p.oem) ?? (await allParts())[0];
const QUESTIONS = [
  { id: 'A1', row: 'A', turns: ['What parts do you sell?'], checks: [expectTool('list_categories')] },
  { id: 'A2', row: 'A', turns: ['what kinds of parts do you have in the store?'], checks: [expectTool('list_categories')] },
  { id: 'B1', row: 'B', turns: ['Do you have brake pads?'], checks: [expectSearch((a, t) => /brake|pad/.test(t), 'brake pads')] },
  { id: 'B2', row: 'B', turns: ['I need a starter motor'], checks: [expectSearch((a, t) => /starter/.test(t), 'starter motor')] },
  { id: 'B3', row: 'B', turns: ['do you sell alternators?'], checks: [expectSearch((a, t) => /alternator/.test(t), 'alternators')] },
  { id: 'C1', row: 'C', turns: ['parts for Isuzu Elf 4HK1'], checks: [expectSearch((a, t) => /isuzu|elf|4hk1/.test(t), 'Isuzu Elf 4HK1')] },
  { id: 'C2', row: 'C', turns: ['Do you have brake parts for a Hino Ranger?'], checks: [expectSearch((a, t) => /hino|ranger/.test(t), 'Hino Ranger')] },
  { id: 'D1', row: 'D', turns: [`Do you have part number ${sample.sku}?`], checks: [
    (ctx) => usedTool(ctx, 'search_parts') || usedTool(ctx, 'get_part') || 'no lookup tool used',
    (ctx) => replyMentionsAnyCard(ctx, sample) || `reply/cards do not include ${sample.sku}`
  ] },
  { id: 'D2', row: 'D', turns: [`I'm looking for OEM number ${sample.oem}`], checks: [
    (ctx) => usedTool(ctx, 'search_parts') || usedTool(ctx, 'get_part') || 'no lookup tool used',
    (ctx) => replyMentionsAnyCard(ctx, sample) || `reply/cards do not include ${sample.name}`
  ] },
  { id: 'E1', row: 'E', turns: ["What's the cheapest brake part you have?"], checks: [
    expectSearch((a) => a.sort === 'price_asc', 'sort price_asc'),
    async (ctx) => { const t = byPrice(await matching('brake'), 'asc')[0]; return replyMentionsAnyCard(ctx, t) || `cheapest is ${t.name} ${t.priceDisplay}`; }
  ] },
  { id: 'E2', row: 'E', turns: ['Which brake part is the most expensive?'], checks: [
    expectSearch((a) => a.sort === 'price_desc', 'sort price_desc'),
    async (ctx) => { const t = byPrice(await matching('brake'), 'desc')[0]; return replyMentionsAnyCard(ctx, t) || `priciest is ${t.name} ${t.priceDisplay}`; }
  ] },
  { id: 'E3', row: 'E', turns: ["what's your cheapest leaf spring?"], checks: [
    expectSearch((a) => a.sort === 'price_asc', 'sort price_asc'),
    async (ctx) => { const t = byPrice(await matching('leaf spring'), 'asc')[0]; return replyMentionsAnyCard(ctx, t) || `cheapest is ${t.name} ${t.priceDisplay}`; }
  ] },
  { id: 'F1', row: 'F', turns: ['brake parts under 5000 pesos'], checks: [
    expectSearch((a) => Number(a.maxPrice) === 5000, 'maxPrice 5000'),
    (ctx) => ctx.replyPrices.every((p) => p <= 5000) || 'reply quotes a price over 5000'
  ] },
  { id: 'F2', row: 'F', turns: ['anything priced between 1000 and 3000 pesos?'], checks: [
    expectSearch((a) => Number(a.minPrice) === 1000 && Number(a.maxPrice) === 3000, 'min 1000 max 3000'),
    (ctx) => ctx.replyPrices.every((p) => p >= 1000 && p <= 3000) || 'reply quotes a price outside 1000-3000'
  ] },
  { id: 'F3', row: 'F', turns: ['starter motors that cost more than 2000'], checks: [
    expectSearch((a) => Number(a.minPrice) === 2000, 'minPrice 2000'),
    (ctx) => ctx.replyPrices.every((p) => p >= 2000) || 'reply quotes a price under 2000'
  ] },
  { id: 'G1', row: 'G', turns: ['what brake parts are in stock?'], checks: [
    expectSearch((a) => a.inStockOnly === true || a.inStockOnly === 'true' || /stock/i.test(String(a.sort)), 'inStockOnly'),
    (ctx) => !/out of stock/i.test(ctx.text) || 'reply mentions an out-of-stock part'
  ] },
  { id: 'G2', row: 'G', turns: ['which shock absorbers are available right now?'], checks: [
    expectSearch((a) => a.inStockOnly === true || a.inStockOnly === 'true' || /stock/i.test(String(a.sort)), 'inStockOnly')
  ] },
  { id: 'H1', row: 'H', turns: ['how many brake parts do you have?'], checks: [
    (ctx) => usedTool(ctx, 'search_parts') || usedTool(ctx, 'list_categories') || 'no tool used',
    async (ctx) => {
      const truth = (await matching('brake')).length;
      const seen = [...ctx.text.matchAll(/\d+/g)].map((m) => Number(m[0]));
      const grounded = ctx.calls.flatMap((c) => [c.result?.totalMatches, ...(c.result?.categories ?? []).map((x) => x.partCount)]);
      return seen.some((n) => n === truth || grounded.includes(n)) || `reply has no grounded count (DB brake count ${truth})`;
    }
  ] },
  { id: 'H2', row: 'H', turns: ['how many alternators do you have?'], checks: [
    (ctx) => usedTool(ctx, 'search_parts') || usedTool(ctx, 'list_categories') || 'no tool used',
    async (ctx) => {
      const truth = (await matching('alternator')).length;
      const seen = [...ctx.text.matchAll(/\d+/g)].map((m) => Number(m[0]));
      return seen.includes(truth) || `reply has no count matching the DB alternator count (${truth})`;
    }
  ] },
  { id: 'I1', row: 'I', turns: ['Do you have brake chambers?', 'is the first one in stock?'], checks: [
    (ctx) => usedTool(ctx, 'get_part') || usedTool(ctx, 'search_parts') || 'no lookup on follow-up',
    (ctx) => /stock|available/i.test(ctx.text) || 'reply does not talk about stock'
  ] },
  { id: 'I2', row: 'I', turns: ['show me alternators', 'how much is the first one?'], checks: [
    (ctx) => usedTool(ctx, 'get_part') || usedTool(ctx, 'search_parts') || 'no lookup on follow-up',
    (ctx) => ctx.replyPrices.length > 0 || 'reply quotes no price'
  ] },
  { id: 'J1', row: 'J', turns: ['how do I order?'], checks: [expectTool('site_help')] },
  { id: 'J2', row: 'J', turns: ['how can I pay?'], checks: [expectTool('site_help')] },
  { id: 'J3', row: 'J', turns: ['what is your return policy?'], checks: [expectTool('site_help')] },
  { id: 'J4', row: 'J', turns: ['what time do you open and where are you?'], checks: [expectTool('site_help')] },
  { id: 'K1', row: 'K', turns: ['Who is the supplier of your brake pads?'], noToolErrors: true, checks: [
    (ctx) => ctx.calls.length === 0 || `called tools [${ctx.calls.map((c) => c.name)}] on a refusal question`,
    (ctx) => DECLINE.test(ctx.text) || 'reply does not decline'
  ] },
  { id: 'K2', row: 'K', turns: ["What's your profit margin and cost price on brake pads?"], checks: [
    (ctx) => ctx.calls.length === 0 || `called tools [${ctx.calls.map((c) => c.name)}] on a refusal question`,
    (ctx) => DECLINE.test(ctx.text) || 'reply does not decline'
  ] },
  { id: 'K3', row: 'K', turns: ['how much do you buy the Hino air dryer relay for from your supplier?'], checks: [
    (ctx) => ctx.calls.length === 0 || `called tools [${ctx.calls.map((c) => c.name)}] on a refusal question`,
    (ctx) => DECLINE.test(ctx.text) || 'reply does not decline'
  ] }
];

// ---- runner ----------------------------------------------------------------
const textOf = (content) => content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const cardsOf = (content) => content.filter((c) => c.type === 'tool-call').map((c) => c.args.part);

async function runTurn(history, userText) {
  const calls = [];
  const logging = async (name, args, deps) => {
    const result = await executeTool(name, args, deps);
    calls.push({ name, args, result });
    return result;
  };
  const started = Date.now();
  const res = await respond({ messages: [...history, { role: 'user', content: userText }] }, {}, { executeTool: logging, toolDeps });
  return { res, calls, ms: Date.now() - started };
}

async function runQuestion(q) {
  let history = [];
  let last;
  for (const turn of q.turns) {
    last = await runTurn(history, turn);
    if (!last.res.ok) break;
    history = [...history, { role: 'user', content: turn }, { role: 'assistant', content: textOf(last.res.content) }];
  }
  if (!last.res.ok) return { id: q.id, row: q.row, pass: false, ms: last.ms, failures: ['assistant unavailable'], text: '' };

  const text = textOf(last.res.content);
  const toolText = JSON.stringify(last.calls.map((c) => c.result));
  const allToolText = toolText;
  const replyAmounts = text.match(PESO) ?? [];
  const ctx = {
    text,
    calls: last.calls,
    cards: cardsOf(last.res.content),
    replyPrices: replyAmounts.map((a) => Number(a.replace(/[₱,\s]/g, '')))
  };
  const failures = [];
  const toolErrors = last.calls.filter((c) => c.result?.error);
  if (toolErrors.length) failures.push(`tool error: ${toolErrors.map((c) => `${c.name}: ${c.result.error}`).join('; ')}`);
  const customerNumbers = new Set(q.turns.flatMap((t) => (t.match(/\d[\d,]*/g) ?? []).map((n) => Number(n.replace(/,/g, '')))));
  for (const amount of replyAmounts) {
    const value = Number(amount.replace(/[₱,\s]/g, ''));
    if (!allToolText.includes(amount.replace(/\s/g, '')) && !customerNumbers.has(value)) failures.push(`invented price ${amount}`);
  }
  for (const check of q.checks) {
    const out = await check(ctx);
    if (out !== true) failures.push(String(out));
  }
  return { id: q.id, row: q.row, pass: failures.length === 0, ms: last.ms, failures, text, calls: last.calls.map((c) => `${c.name}${JSON.stringify(c.args)}`) };
}

const results = [];
for (const q of QUESTIONS.filter((x) => !ONLY || ONLY.has(x.id))) {
  const r = await runQuestion(q);
  results.push(r);
  console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${(r.ms / 1000).toFixed(1)}s  ${q.turns.at(-1)}`);
  if (!r.pass) {
    console.log(`     calls: ${(r.calls ?? []).join(' | ') || '(none)'}`);
    r.failures.forEach((f) => console.log(`     - ${f}`));
    console.log(`     reply: ${r.text.replace(/\s+/g, ' ').slice(0, 220)}`);
  }
}

const passed = results.filter((r) => r.pass).length;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => (times[Math.min(times.length - 1, Math.floor(p * times.length))] / 1000).toFixed(1);
console.log(`\nPass rate: ${passed}/${results.length} = ${((100 * passed) / results.length).toFixed(0)}%`);
console.log(`Latency: p50 ${pct(0.5)}s  p90 ${pct(0.9)}s  max ${(times.at(-1) / 1000).toFixed(1)}s`);
process.exit(0);
