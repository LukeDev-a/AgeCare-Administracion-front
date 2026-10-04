const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(fs.readFileSync("src/lib/sessionClient.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {}, Headers, atob, Date, Promise, Error, JSON, fetch: (...args) => global.fetch(...args) };
vm.runInNewContext(compiled, context);
const { createSessionClient } = context.exports;
const access = (seconds) => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url")}.signature`;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
let storage, expired, client;

beforeEach(() => {
  storage = new Map();
  context.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  expired = 0;
  client = createSessionClient("http://api", () => {}, () => expired++);
});

test("recupera acceso expirado y comparte una rotación entre consultas", async () => {
  client.save(access(-5), "refresh-old");
  let rotations = 0;
  const fresh = access(900);
  global.fetch = async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json({ access_token: fresh, refresh_token: "refresh-new" });
    }
    assert.equal(options.headers.get("Authorization"), `Bearer ${fresh}`);
    return json({ ok: true });
  };
  await Promise.all([client.request("/auth/me"), client.request("/metrics"), client.request("/ops")]);
  assert.equal(rotations, 1);
  assert.equal(storage.get("agecare_refresh_token"), "refresh-new");
});

test("reintenta una consulta 401 una sola vez", async () => {
  client.save(access(900), "refresh-old");
  let queries = 0;
  global.fetch = async (url) => url.endsWith("/auth/refresh")
    ? json({ access_token: access(1800), refresh_token: "refresh-new" })
    : json({}, ++queries === 1 ? 401 : 200);
  assert.equal((await client.request("/metrics")).status, 200);
  assert.equal(queries, 2);
});

test("refresh revocado elimina la sesión", async () => {
  client.save(access(-5), "revoked");
  global.fetch = async () => json({}, 401);
  assert.equal(await client.ensureFresh(), null);
  assert.equal(storage.size, 0);
  assert.equal(expired, 1);
});

test("error de red conserva credenciales y permite otro intento", async () => {
  client.save(access(-5), "refresh-old");
  global.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(client.ensureFresh(), /offline/);
  assert.equal(storage.get("agecare_refresh_token"), "refresh-old");
  global.fetch = async () => json({ access_token: access(900), refresh_token: "refresh-new" });
  assert.ok(await client.ensureFresh());
});

test("logout revoca el refresh recién rotado", async () => {
  client.save(access(-5), "refresh-old");
  global.fetch = async (url, options) => {
    if (url.endsWith("/auth/refresh")) return json({ access_token: access(900), refresh_token: "refresh-new" });
    assert.equal(JSON.parse(options.body).refresh_token, "refresh-new");
    return new Response(null, { status: 204 });
  };
  await client.logout();
  assert.equal(storage.size, 0);
});

test("una renovación pendiente no restaura una sesión cerrada", async () => {
  client.save(access(-5), "refresh-old");
  let resolve;
  global.fetch = () => new Promise((done) => { resolve = done; });
  const pending = client.ensureFresh();
  client.clear();
  resolve(json({ access_token: access(900), refresh_token: "refresh-new" }));
  assert.equal(await pending, null);
  assert.equal(storage.size, 0);
});
