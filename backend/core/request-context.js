'use strict';
const net=require('node:net');
const cleanIp=value=>String(value||'').trim().replace(/^::ffff:/,'');
function ipv4Number(value){const parts=cleanIp(value).split('.').map(Number);if(parts.length!==4||parts.some(x=>!Number.isInteger(x)||x<0||x>255))return null;return parts.reduce((n,x)=>(n*256+x)>>>0,0);}
function matches(value,rule){value=cleanIp(value);rule=cleanIp(rule);if(value===rule)return true;if(!rule.includes('/'))return false;const [base,bitsText]=rule.split('/'),bits=Number(bitsText),a=ipv4Number(value),b=ipv4Number(base);if(a===null||b===null||bits<0||bits>32)return false;const mask=bits===0?0:(0xffffffff<<(32-bits))>>>0;return (a&mask)===(b&mask);}
function trusted(remote,env=process.env){const rules=String(env.MAT_TRUSTED_PROXIES||'127.0.0.1,::1').split(',').map(x=>x.trim()).filter(Boolean);return rules.some(rule=>matches(remote,rule));}
function firstHeader(value){return String(value||'').split(',')[0].trim();}
function requestContext(req,env=process.env){
  const remote=cleanIp(req.socket.remoteAddress)||'unknown',proxyTrusted=trusted(remote,env),forwarded=proxyTrusted;
  const forwardedFor=firstHeader(req.headers['x-forwarded-for']),forwardedProto=firstHeader(req.headers['x-forwarded-proto']).toLowerCase(),forwardedHost=firstHeader(req.headers['x-forwarded-host']);
  const protocol=forwarded&&['http','https'].includes(forwardedProto)?forwardedProto:(req.socket.encrypted?'https':'http');
  const host=forwarded&&forwardedHost?forwardedHost:String(req.headers.host||'localhost');
  const ip=forwarded&&net.isIP(cleanIp(forwardedFor))?cleanIp(forwardedFor):remote;
  return {ip,remoteIp:remote,protocol,host,proxyTrusted,forwardedUsed:!!(forwarded&&forwardedFor)};
}
module.exports={cleanIp,matches,trusted,requestContext};
