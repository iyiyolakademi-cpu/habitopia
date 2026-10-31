"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname,"..","next");
const html = fs.readFileSync(path.join(root,"index.html"),"utf8");
const css = fs.readFileSync(path.join(root,"styles.css"),"utf8");
const js = fs.readFileSync(path.join(root,"app.js"),"utf8");

test("Nova JavaScript is syntactically valid", () => {
  assert.doesNotThrow(() => new vm.Script(js,{filename:"next/app.js"}));
});

test("Nova has unique IDs and separate accessible screens", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size,"Duplicate HTML ID");
  for(const screen of ["home","habits","tasks","focus","progress","profile"]) {
    assert.match(html,new RegExp('data-screen="'+screen+'"'));
  }
  assert.match(html,/aria-label="Günlük ruh hâli"/);
  assert.match(html,/aria-label="Odak süresi"/);
});

test("All navigation targets exist", () => {
  const screens = new Set([...html.matchAll(/data-screen="([^"]+)"/g)].map(x=>x[1]));
  const targets = [...html.matchAll(/data-go="([^"]+)"/g)].map(x=>x[1]);
  assert.ok(targets.length >= 6);
  for(const target of targets)assert.ok(screens.has(target),"Missing screen: "+target);
});

test("Nova uses isolated data storage and offers backup", () => {
  assert.match(js,/habitopia:nova:v1/);
  assert.match(html,/id="export-data"/);
  assert.match(html,/id="import-data"/);
  assert.match(js,/window\.confirm/);
  assert.match(js,/escapeHtml/);
});

test("Nova has responsive styles and no persistent bottom navigation", () => {
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(html,/<nav[^>]*class="bottom-nav"/);
  assert.match(html,/\.\/styles\.css/);
  assert.match(html,/\.\/app\.js/);
});
