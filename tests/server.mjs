import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const here=path.dirname(new URL(import.meta.url).pathname);
export const sent=[];
export function start(port=8099){return new Promise(r=>{const s=http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url==='/log'){let b='';req.on('data',d=>b+=d);req.on('end',()=>{sent.push(JSON.parse(b));res.end('ok')});return}
 res.setHeader('content-type','text/html');res.end(fs.readFileSync(path.join(here,'mock-wa.html')))});
 s.listen(port,()=>r(s))})}
