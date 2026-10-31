"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const page=fs.readFileSync("index.html","utf8");
const script=fs.readFileSync("assets/family.js","utf8");
const auth=fs.readFileSync("assets/family-cloud.js","utf8");
const css=fs.readFileSync("assets/family-mobile-polish.css","utf8");
test("Habitopia emblem has transparent pixels and is integrated in headers and auth",()=>{
 const file=fs.readFileSync("assets/habitopia-logo-transparent.png");
 assert.equal(file.subarray(1,4).toString("ascii"),"PNG");
 assert.ok(file.includes(Buffer.from("tRNS","ascii")),"Palette includes transparency");
 assert.match(page,/class="brand-symbol habitopia-emblem"/);
 assert.match(page,/class="topbar-logo"/);
 assert.match(page,/class="notification-count"/);
 assert.match(page,/family-mobile-polish\.css/);
 assert.match(auth,/class="auth-art-logo"><img src="\.\/assets\/habitopia-logo-transparent\.png"/);
});
test("Full-screen task form and responsive mobile pages have working selectors",()=>{
 assert.match(script,/overlay\.classList\.toggle\("form-fullscreen",isTask\)/);
 assert.match(script,/const isTask=kind==="new-task"/);
 assert.match(css,/\.overlay\.form-fullscreen \.modal\{/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/\.overlay:not\(\.is-notification-screen\):not\(\.form-fullscreen\)/);
});
test("Drawer is independently scrollable and no decorative marker before date",()=>{
 assert.match(css,/\.sidebar\{overflow-y:auto/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(script,/function toggleMenu\(/);
 assert.doesNotMatch(script,/✳ &nbsp;/);
});
test("Notification bell uses unread count and a full-screen center",()=>{
 assert.match(script,/function unreadNotifications\(/);
 assert.match(script,/function markNotificationRead\(/);
 assert.match(script,/classList\.add\("is-notification-screen"\)/);
 assert.match(script,/class="notification-entry"/);
 assert.match(script,/getItem\(notificationReadKey\(\)\)/);
 assert.match(css,/\.notification-count\{/);
 assert.match(css,/\.overlay\.is-notification-screen/);
});
test("UI JS continues to parse",()=>assert.doesNotThrow(()=>new vm.Script(script)));
