import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = "snake", output = path.resolve(process.env.QA_OUTPUT || path.join(root, 'reports/visual'));
const dist = await fs.realpath(path.join(root, 'dist'));
await fs.mkdir(output, { recursive: true });
const report = { game, date: new Date().toISOString(), tests: [], viewports: [], images: [], errors: [], consoleErrors: [], failedRequests: [], failedResponses: [] };
const mime = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204).end();return; }
  if (pathname === '/__host') {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><html lang="pt-BR"><head><title>Sandbox QA</title></head><body><iframe title="Game" id="demo" sandbox="allow-scripts" src="/index.html" style="width:100%;height:1300px;border:0"></iframe><script>window.qaMessages=[];addEventListener("message",e=>{if(e.source===document.getElementById("demo").contentWindow)qaMessages.push(e.data)})</script></body></html>');return;
  }
  try {
    const file = path.resolve(dist, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(dist, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('outside');
    const real = await fs.realpath(file), realRelative = path.relative(dist, real);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) throw Error('outside');
    const bytes = await fs.readFile(real);
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
let browser;
const test = async (name, fn) => {
  console.log('START '+game+' '+name);
  try { await fn();report.tests.push({name,passed:true});console.log('PASS '+game+' '+name); }
  catch (error) { report.tests.push({name,passed:false,error:error.message});console.log('FAIL '+game+' '+name+': '+error.message); }
};
try {
  browser = await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
  let context, page;
  const fresh = async (random=0, width=1440) => {
    if(context)await context.close();
    context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
    await context.addInitScript(value=>{Math.random=()=>value;},random);
    page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror', error=>report.errors.push(error.message));
    page.on('console', message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
    page.on('requestfailed', request=>report.failedRequests.push(request.failure()?.errorText));
    page.on('response', response=>{if(response.status()>=400)report.failedResponses.push({path:new URL(response.url()).pathname,status:response.status()});});
    await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  };
  await test('eight responsive viewports retain visible labelled controls without horizontal overflow',async()=>{
    for(const width of [320,360,390,430,768,1024,1440,1920]) {
      await fresh(0,width);
      if(game==='snake')await page.selectOption('#mode','arena');
      const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.querySelector('h1')).fontFamily}));
      assert.ok(dimensions.scroll<=width+1);assert.match(dimensions.font,/Space Grotesk/);
      for(const id of ['mode',game==='dino'?'level':'rate',game==='dino'?'jump':'toggle','reset']){
        const bounds=await page.locator('#'+id).boundingBox();assert.ok(bounds&&bounds.width>=44&&bounds.height>=44);
        assert.ok(await page.locator('#'+id).getAttribute('aria-label')||await page.locator('label').filter({has:page.locator('#'+id)}).count()||['jump','toggle','reset'].includes(id));
      }
      const image=game+'-'+width+'.png';await page.screenshot({path:path.join(output,image),fullPage:true});
      report.viewports.push({width,height:1100,overflow:dimensions.scroll-width});report.images.push({path:image,width,kind:'application',sanitized:true});
    }
  });

  await test('keyboard focus is visible and the game pauses when the page loses focus',async()=>{
    await fresh();await page.locator('#stage').focus();
    const outline=await page.locator('#stage').evaluate(n=>getComputedStyle(n).outlineWidth);assert.notEqual(outline,'0px');
    await page.keyboard.press(game==='dino'?'Space':'ArrowUp');
    await page.waitForFunction(()=>document.querySelector('#stage').dataset.status==='running');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await page.locator('#stage').getAttribute('data-status'),'paused');
  });
  if(game==='dino'){
    await test('real keyboard jump collects a coin and survives the first cactus',async()=>{
      await fresh(0);await page.clock.install({time:0});await page.clock.pauseAt(60000);await page.click('#state-action');await page.clock.runFor(4000);
      await page.keyboard.press('ArrowUp');await page.clock.runFor(500);
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'running');
      assert.ok(Number(await page.locator('#coins').textContent())>=1);
      assert.ok(Number(await page.locator('#score').textContent())>=25);
      
    });
    await test('keyboard and touch ducking pass a drone, release, pause and reset safely',async()=>{
      await fresh(0.99);await page.clock.install({time:0});await page.clock.pauseAt(60000);await page.click('#state-action');await page.clock.runFor(4000);
      await page.keyboard.down('ArrowDown');assert.equal(await page.locator('#duck').getAttribute('aria-pressed'),'true');
      await page.clock.runFor(800);assert.equal(await page.locator('#stage').getAttribute('data-status'),'running');
      await page.keyboard.up('ArrowDown');assert.equal(await page.locator('#duck').getAttribute('aria-pressed'),'false');
      await page.click('#duck');assert.equal(await page.locator('#duck').getAttribute('aria-pressed'),'true');
      await page.click('#pause');assert.equal(await page.locator('#duck').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'paused');
      await page.click('#reset');assert.equal(await page.locator('#stage').getAttribute('data-status'),'ready');
      
    });
    await test('a collision ends a run and mode changes preserve best while resetting score',async()=>{
      await fresh(0);await page.clock.install({time:0});await page.clock.pauseAt(60000);await page.click('#state-action');await page.clock.runFor(6000);
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'gameover');
      const best=Number(await page.locator('#best').textContent());assert.ok(best>0);
      await page.selectOption('#mode','classic');
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'ready');
      assert.equal(await page.locator('#score').textContent(),'00000');assert.ok(Number(await page.locator('#best').textContent())>=best);
      assert.match(await page.locator('#mode-help').textContent(),/Clássico/);
    });
  }else{
    await test('real directional input reaches food, grows and scores',async()=>{
      await fresh(0);await page.clock.install({time:0});await page.clock.pauseAt(60000);await page.locator('#stage').focus();await page.keyboard.press('ArrowUp');await page.clock.runFor(1280);
      await page.keyboard.press('ArrowLeft');await page.clock.runFor(1010);
      assert.equal(await page.locator('#score').textContent(),'00010');assert.equal(await page.locator('#stage').getAttribute('data-status'),'running');
    });
    await test('portal mode survives repeated edge crossings; classic collision can restart',async()=>{
      await fresh();await page.clock.install({time:0});await page.clock.pauseAt(60000);await page.selectOption('#mode','portal');await page.click('#state-action');await page.clock.runFor(6000);
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'running');
      await page.selectOption('#mode','classic');await page.click('#state-action');await page.clock.runFor(4000);
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'gameover');
      await page.click('#state-action');assert.equal(await page.locator('#stage').getAttribute('data-status'),'running');
    });
    await test('touch direction controls, arena mode, pause and reset remain usable',async()=>{
      await fresh();await page.selectOption('#mode','arena');await page.click('[data-direction="up"]');
      assert.equal(await page.locator('#stage').getAttribute('data-status'),'running');
      await page.click('#toggle');assert.equal(await page.locator('#stage').getAttribute('data-status'),'paused');
      await page.click('#reset');assert.equal(await page.locator('#stage').getAttribute('data-status'),'ready');
      assert.equal(await page.locator('#stage').getAttribute('data-mode'),'arena');assert.match(await page.locator('#mode-help').textContent(),/barreiras/);
    });
  }
  await test('opaque sandbox loads fonts and modules and receives trusted best and pause messages',async()=>{
    await fresh();await page.goto(base+'/__host');const frame=page.frameLocator('#demo');
    await frame.locator('#state-action').waitFor();
    await page.evaluate(id=>document.querySelector('#demo').contentWindow.postMessage({type:'nd:best',id,score:43210},'*'),game);
    await frame.locator('#best').filter({hasText:'43210'}).waitFor();
    await frame.locator('#state-action').click();
    await page.evaluate(id=>document.querySelector('#demo').contentWindow.postMessage({type:'nd:pause',id},'*'),game);
    await frame.locator('#stage[data-status="paused"]').waitFor();
    await page.waitForFunction(id=>window.qaMessages.some(m=>m.type==='nd:resize'&&m.id===id&&m.height>=320&&m.height<=1800),game);
  });
  await test('browser produced no JavaScript, console, network or HTTP errors',async()=>{
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.failedResponses,[]);
  });
} finally {
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({game,passed:report.tests.filter(t=>t.passed).length,failed:report.tests.filter(t=>!t.passed),viewports:report.viewports.length,images:report.images.length,errors:report.errors.length}));
if(report.tests.some(t=>!t.passed))process.exitCode=1;
