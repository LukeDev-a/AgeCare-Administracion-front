const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const scope = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/loginLockout.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, scope);
const { LoginError, lockoutRemaining, lockoutTime } = scope.exports;

test('usa la duración del backend y rechaza datos de bloqueo inválidos', () => {
  assert.equal(new LoginError('Bloqueada', [{ retry_after_seconds: 827 }]).retryAfterSeconds, 827);
  for (const value of [null, [], [{ retry_after_seconds: -1 }], [{ retry_after_seconds: '900' }]]) {
    assert.equal(new LoginError('Error', value).retryAfterSeconds, null);
  }
});
test('cuenta tiempo transcurrido incluso tras pausa de pestaña y termina en cero', () => {
  assert.equal(lockoutRemaining(901000, 1000), 900);
  assert.equal(lockoutRemaining(901000, 74000), 827);
  assert.equal(lockoutRemaining(901000, 999000), 0);
  assert.equal(lockoutTime(827), '13:47');
  assert.equal(lockoutTime(0), '0:00');
});
