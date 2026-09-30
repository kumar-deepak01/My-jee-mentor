import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_FALLBACK, getChatDebugInfo, handleChatRequest, resetChatRateLimitsForTests} from '../api/_chat-handler.js';

const originalFetch = globalThis.fetch;
const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  AI_FALLBACK_MODEL: process.env.AI_FALLBACK_MODEL
};

const answers = new Map([
  ['Program details?', 'Current program details ke liye counsellor ko call ya WhatsApp karein.'],
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

test('routes program cost questions to a counsellor instead of publishing figures', async () => {
  configureGemini();
  const getBody = installMockProvider();
  const result = await handleChatRequest({method: 'POST', body: {message: 'Program details?', history: []}, ip: 'fees-test'});
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

test('uses gemini-3.8-flash when AI_MODEL is not set', async () => {
  configureGemini();
  delete process.env.AI_MODEL;
  let requestedUrl;
  globalThis.fetch = async url => {
    requestedUrl = url;
    return new Response(JSON.stringify({candidates: [{content: {parts: [{text: 'Test reply'}]}}]}), {status: 200});
  };
  await handleChatRequest({method: 'POST', body: {message: 'Program details?'}, ip: 'default-model-test'});
  assert.match(requestedUrl, /models\/gemini-3\.8-flash:generateContent/);
});

test('retries Gemini 429/503 responses twice, then uses the configured fallback model', async () => {
  configureGemini();
  process.env.AI_FALLBACK_MODEL = 'gemini-test-backup';
  const requestedModels = [];
  globalThis.fetch = async url => {
    requestedModels.push(decodeURIComponent(url.match(/models\/([^:]+)/)[1]));
    if (requestedModels.length <= 3) {
      return new Response(JSON.stringify({error: {message: 'high demand'}}), {status: requestedModels.length === 1 ? 429 : 503});
    }
    return new Response(JSON.stringify({candidates: [{content: {parts: [{text: 'Backup response'}]}}]}), {status: 200});
  };
  const result = await handleChatRequest({method: 'POST', body: {message: 'Program details?'}, ip: 'fallback-model-test'});
  assert.equal(result.body.reply, 'Backup response');
  assert.deepEqual(requestedModels, ['gemini-test-model', 'gemini-test-model', 'gemini-test-model', 'gemini-test-backup']);
});

test('retries truncated Gemini replies and sends the updated generation settings and prompt', async () => {
  configureGemini();
  let callCount = 0;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    callCount += 1;
    requestBody = JSON.parse(options.body);
    const candidate = callCount === 1
      ? {finishReason: 'MAX_TOKENS', content: {parts: [{text: 'partial'}]}}
      : {finishReason: 'STOP', content: {parts: [{text: 'Complete answer'}]}};
    return new Response(JSON.stringify({candidates: [candidate]}), {status: 200});
  };
  const result = await handleChatRequest({method: 'POST', body: {message: 'Program details?'}, ip: 'max-tokens-test'});
  assert.equal(result.body.reply, 'Complete answer');
  assert.equal(callCount, 2);
  assert.equal(requestBody.generationConfig.maxOutputTokens, 1024);
  assert.equal(requestBody.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.match(requestBody.system_instruction.parts[0].text, /3-5 short lines/);
  assert.match(requestBody.system_instruction.parts[0].text, /Do not include a WhatsApp URL/);
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
  const result = await handleChatRequest({method: 'POST', body: {message: 'Program details?'}, ip: 'failure-test'});
  assert.equal(result.status, 200);
  assert.equal(result.body.reply, CHAT_FALLBACK);
});

test('returns the fallback for an empty provider reply and overlong input', async () => {
  configureGemini();
  globalThis.fetch = async () => new Response(JSON.stringify({candidates: [{content: {parts: []}}]}), {status: 200});
  const empty = await handleChatRequest({method: 'POST', body: {message: 'Program details?'}, ip: 'empty-test'});
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
    last = await handleChatRequest({method: 'POST', body: {message: 'Program details?'}, ip: 'rate-limit-test'});
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.reply, CHAT_FALLBACK);
});
