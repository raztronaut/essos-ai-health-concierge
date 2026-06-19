import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { acquireSingleInstanceLock } from "./singleInstance.js";

const pidfileFor = (name: string): string =>
  join(tmpdir(), `essos-${name}.pid`);

test("acquireSingleInstanceLock: writes our pid and is idempotent for self", () => {
  const name = `test-self-${process.pid}`;
  acquireSingleInstanceLock(name);
  assert.equal(
    readFileSync(pidfileFor(name), "utf8").trim(),
    String(process.pid)
  );
  // Re-acquiring from the same process must not throw.
  acquireSingleInstanceLock(name);
});

test("acquireSingleInstanceLock: refuses when another live process holds it", () => {
  const name = `test-live-${process.pid}`;
  const child = spawn("sleep", ["30"]);
  try {
    writeFileSync(pidfileFor(name), String(child.pid), "utf8");
    assert.throws(() => acquireSingleInstanceLock(name), /already running/);
  } finally {
    child.kill();
  }
});

test("acquireSingleInstanceLock: reclaims a stale pidfile", async () => {
  const name = `test-stale-${process.pid}`;
  // A reliably-dead pid: spawn then kill and wait for exit.
  const child = spawn("sleep", ["30"]);
  const deadPid = child.pid;
  child.kill("SIGKILL");
  await once(child, "exit");
  writeFileSync(pidfileFor(name), String(deadPid), "utf8");
  acquireSingleInstanceLock(name); // reclaims rather than throwing
  assert.equal(
    readFileSync(pidfileFor(name), "utf8").trim(),
    String(process.pid)
  );
});
