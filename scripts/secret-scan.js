'use strict';
const fs=require('node:fs');const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const excluded=new Set(['.git','node_modules','storage','release','data/runtime']);
const patterns=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['postgres-credential',/postgres(?:ql)?:\/\/[^:\s/]+:(?!CHANGE_ME|\$\{|<)[^@\s]{8,}@/i],
  ['github-token',/gh[pousr]_[A-Za-z0-9_]{30,}/],
  ['aws-access-key',/AKIA[0-9A-Z]{16}/],
  ['jwt',/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/]
];
function ignored(relative){const normalized=relative.replace(/\\/g,'/');return normalized==='.env'||normalized.startsWith('.env.')&&normalized!=='.env.example'||[...excluded].some(x=>normalized===x||normalized.startsWith(`${x}/`))||/\.(?:dump|enc|png|jpe?g|webp|pdf|xlsx?|docx|zip)$/i.test(normalized);}
function files(dir=ROOT,out=[]){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name),relative=path.relative(ROOT,full);if(ignored(relative))continue;if(entry.isDirectory())files(full,out);else if(entry.isFile())out.push({full,relative});}return out;}
function scan(){const findings=[];for(const item of files()){const text=fs.readFileSync(item.full,'utf8');for(const [kind,pattern] of patterns)if(pattern.test(text))findings.push({file:item.relative.replace(/\\/g,'/'),kind});}return findings;}
if(require.main===module){const findings=scan();if(findings.length){console.error(JSON.stringify({ok:false,findings},null,2));process.exit(1);}console.log(JSON.stringify({ok:true,filesScanned:files().length,findings:0}));}
module.exports={scan,files,ignored,patterns};
