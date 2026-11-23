import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
import { start, sent } from './server.mjs';
const srv = await start(8099);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', headless:false, pipe:true, enableExtensions:['/tmp/wa/testbuild'],
  args:['--no-sandbox','--window-position=0,0','--window-size=1280,800','--force-device-scale-factor=1'], defaultViewport:null});
const page = (await browser.pages())[0];
page.on('dialog', async d=>{ await sleep(1500); await d.accept()});
await page.evaluateOnNewDocument(()=>{
  const draw=()=>{const t=sessionStorage.getItem('cap'); let e=document.getElementById('capbar');
    if(!t){e&&e.remove();return} if(!e){e=document.createElement('div');e.id='capbar';
    e.style.cssText='position:fixed;left:0;right:0;bottom:0;background:rgba(0,0,0,.82);color:#fff;font:600 22px system-ui;padding:16px 24px;z-index:2147483647;text-align:center';
    (document.body||document.documentElement).appendChild(e)} e.textContent=t};
  setInterval(draw,300);
});
const cap=async(t)=>{await page.evaluate(t=>{sessionStorage.setItem('cap',t);},t).catch(()=>{}); await page.evaluate(t=>{let e=document.getElementById('capbar');if(!e){e=document.createElement('div');e.id='capbar';e.style.cssText='position:fixed;left:0;right:0;bottom:0;background:rgba(0,0,0,.82);color:#fff;font:600 22px system-ui;padding:16px 24px;z-index:2147483647;text-align:center';document.documentElement.appendChild(e)}e.textContent=t},t).catch(()=>{})};
const S=(fn,...a)=>page.evaluate(`(function(){const r=document.getElementById('wabs-host').shadowRoot;const $=id=>r.getElementById(id);return (${fn.toString()})(...${JSON.stringify(a)})})()`);
const h=id=>page.evaluateHandle(`document.getElementById('wabs-host').shadowRoot.getElementById('${id}')`);
const typeIn=async(id,t)=>{const e=await h(id);await e.evaluate(x=>{x.focus();x.value=''});await e.type(t,{delay:35})};
const click=id=>S(id=>$(id).click(),id);

// Part 1: install
await page.goto('chrome://extensions'); await sleep(1500);
await cap('Step 1: open chrome://extensions in Chrome'); await sleep(3500);
await cap('Step 2: switch on "Developer mode" (top right)');
await page.evaluate(()=>{const m=document.querySelector('extensions-manager');const t=m.shadowRoot.querySelector('extensions-toolbar').shadowRoot.querySelector('#devMode');t.shadowRoot?.querySelector('#knob')?.click(); if(!t.checked) t.click()}).catch(e=>console.log('dev',e.message)); await sleep(4500);
await cap('Step 3: click "Load unpacked" and choose the "extension" folder from this project'); await sleep(5500);
await cap('WA Bulk Sender now shows up here. Pin it from the puzzle icon if you like'); await sleep(4500);
// Part 2: demo
await page.goto('http://localhost:8099/'); await page.waitForSelector('#wabs-host');
await cap('Step 4: open web.whatsapp.com and log in (this demo uses a practice page that looks like it)'); await sleep(4500);
await cap('Step 5: click the green button (or the toolbar icon) to open the panel'); await sleep(2500);
await click('fab'); await sleep(2500);
await cap('Step 6: type mobile numbers, comma separated'); await typeIn('nums','9876500001, 9000000001');
await sleep(1200);
await cap('Step 7: type group names, comma separated, exactly as they appear in WhatsApp'); await typeIn('grps','Family, Clients Batch A'); await sleep(1200);
await cap('Step 8: write the message. {name|there} fills in each client name'); 
await (await h('msg')).evaluate(x=>{x.value=''}); await (await h('msg')).type('Hello {name|there}, this is a test message from the demo.',{delay:30}); await sleep(2500);
await S(()=>{$('minD').value=3;$('maxD').value=3;$('batch').value=0;$('preset').value='custom'});
await cap('Step 9: the Safety box adds random pauses (shortened to 3s for this demo; use 8-20s or more for real)'); await S(()=>$('minD').scrollIntoView({block:'center'})); await sleep(5000);
await cap('Step 10: press Start sending and confirm'); await S(()=>$('start').scrollIntoView({block:'center'})); await sleep(2500);
await click('start');
await cap('Messages go out one by one. Progress shows below; Pause, Resume and Stop are always available');
for(let i=0;i<60;i++){await sleep(1000); const t=await S(()=>$('runTitle').textContent).catch(()=>''); if(/done/.test(t))break; if(i==6) await S(()=>$('runbox').scrollIntoView({block:'start'})).catch(()=>{})}
await S(()=>$('runbox').scrollIntoView({block:'start'})).catch(()=>{}); await sleep(4500);
await cap('Done. "Download results" saves a CSV of what was sent or failed'); await sleep(4000);
await cap('Step 11: Groups tab lists every group and channel. Press "Load groups & channels"');
await S(()=>{$('panel').querySelector('main').scrollTop=0;r.querySelector('nav [data-t="groups"]').click()}); await sleep(2500);
await click('loadG'); await sleep(3500);
await cap('Download as CSV or JSON, or tick groups to add them to your send list'); await click('dlCSV'); await sleep(4500);
await cap('That is it. Full guide and safety tips: README.md'); await sleep(4000);
console.log('SENT',JSON.stringify(sent.map(s=>[s.to,s.text])));
await browser.close(); srv.close();
