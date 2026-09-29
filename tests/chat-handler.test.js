import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_FALLBACK, getChatDebugInfo, handleChatRequest, resetChatRateLimitsForTests} from '../api/_chat-handler.js';

const originalFetch = globalThis.fetch;
const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL
};

const answers = new Map([
  ['Fees kya hai?', 'Site par subject-wise fees ₹3,000/month se start dikhayi gayi hai; yeh placeholder hai, final fee counsellor se confirm karein.'],
  ['Teacher kaun hain?', 'Faculty ke naam aur verified details abhi site par listed nahi hain. Aap counsellor se confirm kar sakte hain.'],
  ['Demo class chahiye', 'Haan, free demo class available hai. Demo book karne ke liye counsellor se contact karein.'],
  ['Is cricket score?', CHAT_FALLBACK]
]);

function installMockProvider() {
  let capturedBody;
  globalThis.fetch = async (_url, options) => {
    capturedBody = JSON.parse(options.body);
    const contents = capturedBody.contents;
    const question = contents.at(-1).parts[0].text;
    const text = answers.get(question) || CHAT_FALLBACK;
    return new Response(JSON.stringify({candidates: [{content: {parts: [{text}]}}]}), {
      status: 200,
      headers: {'content-type': 'application/json'}
    });
  };
  return () => capturedBody;
}

function configureGemini() {
  process.env.AI_PROVIDER = 'gemini';
  process.env.AI_API_KEY = 'test-key-not-real';
  process.env.AI_MODEL = 'gemini-test-model';
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetChatRateLimitsForTests();
});

test('answers a fees question using the injected knowledge and warns that the displayed fee is a placeholder', async () => {
  configureGemini();
  const getBody = installMockProvider();
  const result = await handleChatRequest({method: 'POST', body: {message: 'Fees kya hai?', history: []}, ip: 'fees-test'});
  assert.equal(result.status, 200);
  assert.match(result.body.reply, /₹3,000\/month/);
  assert.match(result.body.reply, /placeholder/);
  assert.match(getBody().system_instruction.parts[0].text, /₹3,000 per month per subject/);
});

test('does not invent teacher names when the site has no verified faculty details', async () => {
  configureGemini();
  installMockProvider();
  const result = await handleChatRequest({method: 'POST', body: {message: 'Teacher kaun hain?'}, ip: 'teacher-test'});
  assert.match(result.body.reply, /names|naam/i);
  assert.match(result.body.reply, /site/i);
});

test('answers a free demo question from the site copy', async () => {
  configureGemini();
  installMockProvider();
  const result = await handleChatRequest({method: 'POST', body: {message: 'Demo class chahiye'}, ip: 'demo-test'});
  assert.match(result.body.reply, /free demo class/i);
});

test('returns the exact fallback for an unrelated question', async () => {
  configureGemini();
  const getBody = installMockProvider();
  const result = await handleChatRequest({method: 'POST', body: {message: 'Is cricket score?'}, ip: 'unrelated-test'});
  assert.equal(result.body.reply, CHAT_FALLBACK);
  assert.match(getBody().system_instruction.parts[0].text, /anything unrelated to My JEE Mentor/);
});

test('answers greetings without calling the AI provider', async () => {
  configureGemini();
  globalThis.fetch = async () => { throw new Error('fetch should not run for greetings'); };
  const result = await handleChatRequest({method: 'POST', body: {message: 'Good morning!'}, ip: 'greeting-test'});
  assert.equal(result.status, 200);
  assert.match(result.body.reply, /Namaste! Main Priya/);
});

test('debug diagnostics report config and test Gemini without exposing the API key', async () => {
  configureGemini();
  let requestHeaders;
  const diagnostics = await getChatDebugInfo({fetchImpl: async (_url, options) => {
    requestHeaders = options.headers;
    return new Response(JSON.stringify({error: {message: 'invalid key'}}), {status: 401});
  }});
  assert.equal(diagnostics.hasApiKey, true);
  assert.equal(diagnostics.hasProvider, true);
  assert.equal(diagnostics.hasModel, true);
  assert.equal(diagnostics.model, 'gemini-test-model');
  assert.equal(diagnostics.knowledgeLoaded, true);
  assert.ok(diagnostics.knowledgeSize > 0);
  assert.deepEqual(diagnostics.geminiTest, {statusCode: 401, errorMessage: 'invalid key'});
  assert.equal(requestHeaders['x-goog-api-key'], 'test-key-not-real');
  assert.equal(JSON.stringify(diagnostics).includes('test-key-not-real'), false);
});

test('returns the fallback when the AI provider fails', async () => {
  configureGemini();
  globalThis.fetch = async () => { throw new Error('simulated provider outage'); };
  const result = await handleChatRequest({method: 'POST', body: {message: 'Fees kya hai?'}, ip: 'failure-test'});
  assert.equal(result.status, 200);
  assert.equal(result.body.reply, CHAT_FALLBACK);
});

test('returns the fallback for an empty provider reply and overlong input', async () => {
  configureGemini();
  globalThis.fetch = async () => new Response(JSON.stringify({candidates: [{content: {parts: []}}]}), {status: 200});
  const empty = await handleChatRequest({method: 'POST', body: {message: 'Fees kya hai?'}, ip: 'empty-test'});
  const long = await handleChatRequest({method: 'POST', body: {message: 'x'.repeat(501)}, ip: 'long-test'});
  assert.equal(empty.body.reply, CHAT_FALLBACK);
  assert.equal(long.body.reply, CHAT_FALLBACK);
  assert.equal(long.status, 400);
});

test('applies a per-IP request limit', async () => {
  configureGemini();
  installMockProvider();
  let last;
  for (let index = 0; index < 13; index += 1) {
    last = await handleChatRequest({method: 'POST', body: {message: 'Fees kya hai?'}, ip: 'rate-limit-test'});
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.reply, CHAT_FALLBACK);
});
