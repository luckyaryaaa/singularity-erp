var Vd=Object.defineProperty;var Td=(i,t,e)=>t in i?Vd(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var H=(i,t,e)=>Td(i,typeof t!="symbol"?t+"":t,e);function me(i){if(i===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return i}function P0(i,t){i.prototype=Object.create(t.prototype),i.prototype.constructor=i,i.__proto__=t}/*!
 * GSAP 3.15.0
 * https://gsap.com
 *
 * @license Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var Wt={autoSleep:120,force3D:"auto",nullTargetWarn:1,units:{lineHeight:""}},d1={duration:.5,overwrite:!1,delay:0},zs,mt,Q,Gt=1e8,j=1/Gt,rs=Math.PI*2,Ed=rs/4,Dd=0,H0=Math.sqrt,Od=Math.cos,Rd=Math.sin,Mt=function(t){return typeof t=="string"},ot=function(t){return typeof t=="function"},Ae=function(t){return typeof t=="number"},Ns=function(t){return typeof t>"u"},ue=function(t){return typeof t=="object"},Tt=function(t){return t!==!1},Zs=function(){return typeof window<"u"},T1=function(t){return ot(t)||Mt(t)},V0=typeof ArrayBuffer=="function"&&ArrayBuffer.isView||function(){},kt=Array.isArray,Id=/random\([^)]+\)/g,Bd=/,\s*/g,Cn=/(?:-?\.?\d|\.)+/gi,T0=/[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,_a=/[-+=.]*\d+[.e-]*\d*[a-z%]*/g,Ri=/[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,E0=/[+-]=-?[.\d]+/,Fd=/[^,'"\[\]\s]+/gi,zd=/^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,it,oe,hs,Ws,Ut={},di={},D0,O0=function(t){return(di=La(t,Ut))&&Rt},Us=function(t,e){return console.warn("Invalid property",t,"set to",e,"Missing plugin? gsap.registerPlugin()")},l1=function(t,e){return!e&&console.warn(t)},R0=function(t,e){return t&&(Ut[t]=e)&&di&&(di[t]=e)||Ut},p1=function(){return 0},Nd={suppressEvents:!0,isStart:!0,kill:!1},Y1={suppressEvents:!0,kill:!1},Zd={suppressEvents:!0},qs={},Be=[],cs={},I0,Ft={},Ii={},Ln=30,X1=[],$s="",js=function(t){var e=t[0],a,s;if(ue(e)||ot(e)||(t=[t]),!(a=(e._gsap||{}).harness)){for(s=X1.length;s--&&!X1[s].targetTest(e););a=X1[s]}for(s=t.length;s--;)t[s]&&(t[s]._gsap||(t[s]._gsap=new nc(t[s],a)))||t.splice(s,1);return t},ra=function(t){return t._gsap||js(Kt(t))[0]._gsap},B0=function(t,e,a){return(a=t[e])&&ot(a)?t[e]():Ns(a)&&t.getAttribute&&t.getAttribute(e)||a},Et=function(t,e){return(t=t.split(",")).forEach(e)||t},ht=function(t){return Math.round(t*1e5)/1e5||0},at=function(t){return Math.round(t*1e7)/1e7||0},wa=function(t,e){var a=e.charAt(0),s=parseFloat(e.substr(2));return t=parseFloat(t),a==="+"?t+s:a==="-"?t-s:a==="*"?t*s:t/s},Wd=function(t,e){for(var a=e.length,s=0;t.indexOf(e[s])<0&&++s<a;);return s<a},li=function(){var t=Be.length,e=Be.slice(0),a,s;for(cs={},Be.length=0,a=0;a<t;a++)s=e[a],s&&s._lazy&&(s.render(s._lazy[0],s._lazy[1],!0)._lazy=0)},Ys=function(t){return!!(t._initted||t._startAt||t.add)},F0=function(t,e,a,s){Be.length&&!mt&&li(),t.render(e,a,!!(mt&&e<0&&Ys(t))),Be.length&&!mt&&li()},z0=function(t){var e=parseFloat(t);return(e||e===0)&&(t+"").match(Fd).length<2?e:Mt(t)?t.trim():t},N0=function(t){return t},qt=function(t,e){for(var a in e)a in t||(t[a]=e[a]);return t},Ud=function(t){return function(e,a){for(var s in a)s in e||s==="duration"&&t||s==="ease"||(e[s]=a[s])}},La=function(t,e){for(var a in e)t[a]=e[a];return t},Pn=function i(t,e){for(var a in e)a!=="__proto__"&&a!=="constructor"&&a!=="prototype"&&(t[a]=ue(e[a])?i(t[a]||(t[a]={}),e[a]):e[a]);return t},pi=function(t,e){var a={},s;for(s in t)s in e||(a[s]=t[s]);return a},Ka=function(t){var e=t.parent||it,a=t.keyframes?Ud(kt(t.keyframes)):qt;if(Tt(t.inherit))for(;e;)a(t,e.vars.defaults),e=e.parent||e._dp;return t},qd=function(t,e){for(var a=t.length,s=a===e.length;s&&a--&&t[a]===e[a];);return a<0},Z0=function(t,e,a,s,n){var o=t[s],r;if(n)for(r=e[n];o&&o[n]>r;)o=o._prev;return o?(e._next=o._next,o._next=e):(e._next=t[a],t[a]=e),e._next?e._next._prev=e:t[s]=e,e._prev=o,e.parent=e._dp=t,e},ki=function(t,e,a,s){a===void 0&&(a="_first"),s===void 0&&(s="_last");var n=e._prev,o=e._next;n?n._next=o:t[a]===e&&(t[a]=o),o?o._prev=n:t[s]===e&&(t[s]=n),e._next=e._prev=e.parent=null},Ne=function(t,e){t.parent&&(!e||t.parent.autoRemoveChildren)&&t.parent.remove&&t.parent.remove(t),t._act=0},ha=function(t,e){if(t&&(!e||e._end>t._dur||e._start<0))for(var a=t;a;)a._dirty=1,a=a.parent;return t},$d=function(t){for(var e=t.parent;e&&e.parent;)e._dirty=1,e.totalDuration(),e=e.parent;return t},ds=function(t,e,a,s){return t._startAt&&(mt?t._startAt.revert(Y1):t.vars.immediateRender&&!t.vars.autoRevert||t._startAt.render(e,!0,s))},jd=function i(t){return!t||t._ts&&i(t.parent)},Hn=function(t){return t._repeat?Pa(t._tTime,t=t.duration()+t._rDelay)*t:0},Pa=function(t,e){var a=Math.floor(t=at(t/e));return t&&a===t?a-1:a},ui=function(t,e){return(t-e._start)*e._ts+(e._ts>=0?0:e._dirty?e.totalDuration():e._tDur)},Ai=function(t){return t._end=at(t._start+(t._tDur/Math.abs(t._ts||t._rts||j)||0))},Ci=function(t,e){var a=t._dp;return a&&a.smoothChildTiming&&t._ts&&(t._start=at(a._time-(t._ts>0?e/t._ts:((t._dirty?t.totalDuration():t._tDur)-e)/-t._ts)),Ai(t),a._dirty||ha(a,t)),t},W0=function(t,e){var a;if((e._time||!e._dur&&e._initted||e._start<t._time&&(e._dur||!e.add))&&(a=ui(t.rawTime(),e),(!e._dur||L1(0,e.totalDuration(),a)-e._tTime>j)&&e.render(a,!0)),ha(t,e)._dp&&t._initted&&t._time>=t._dur&&t._ts){if(t._dur<t.duration())for(a=t;a._dp;)a.rawTime()>=0&&a.totalTime(a._tTime),a=a._dp;t._zTime=-j}},he=function(t,e,a,s){return e.parent&&Ne(e),e._start=at((Ae(a)?a:a||t!==it?Xt(t,a,e):t._time)+e._delay),e._end=at(e._start+(e.totalDuration()/Math.abs(e.timeScale())||0)),Z0(t,e,"_first","_last",t._sort?"_start":0),ls(e)||(t._recent=e),s||W0(t,e),t._ts<0&&Ci(t,t._tTime),t},U0=function(t,e){return(Ut.ScrollTrigger||Us("scrollTrigger",e))&&Ut.ScrollTrigger.create(e,t)},q0=function(t,e,a,s,n){if(Gs(t,e,n),!t._initted)return 1;if(!a&&t._pt&&!mt&&(t._dur&&t.vars.lazy!==!1||!t._dur&&t.vars.lazy)&&I0!==zt.frame)return Be.push(t),t._lazy=[n,s],1},Yd=function i(t){var e=t.parent;return e&&e._ts&&e._initted&&!e._lock&&(e.rawTime()<0||i(e))},ls=function(t){var e=t.data;return e==="isFromStart"||e==="isStart"},Xd=function(t,e,a,s){var n=t.ratio,o=e<0||!e&&(!t._start&&Yd(t)&&!(!t._initted&&ls(t))||(t._ts<0||t._dp._ts<0)&&!ls(t))?0:1,r=t._rDelay,c=0,d,l,p;if(r&&t._repeat&&(c=L1(0,t._tDur,e),l=Pa(c,r),t._yoyo&&l&1&&(o=1-o),l!==Pa(t._tTime,r)&&(n=1-o,t.vars.repeatRefresh&&t._initted&&t.invalidate())),o!==n||mt||s||t._zTime===j||!e&&t._zTime){if(!t._initted&&q0(t,e,s,a,c))return;for(p=t._zTime,t._zTime=e||(a?j:0),a||(a=e&&!p),t.ratio=o,t._from&&(o=1-o),t._time=0,t._tTime=c,d=t._pt;d;)d.r(o,d.d),d=d._next;e<0&&ds(t,e,a,!0),t._onUpdate&&!a&&Nt(t,"onUpdate"),c&&t._repeat&&!a&&t.parent&&Nt(t,"onRepeat"),(e>=t._tDur||e<0)&&t.ratio===o&&(o&&Ne(t,1),!a&&!mt&&(Nt(t,o?"onComplete":"onReverseComplete",!0),t._prom&&t._prom()))}else t._zTime||(t._zTime=e)},Gd=function(t,e,a){var s;if(a>e)for(s=t._first;s&&s._start<=a;){if(s.data==="isPause"&&s._start>e)return s;s=s._next}else for(s=t._last;s&&s._start>=a;){if(s.data==="isPause"&&s._start<e)return s;s=s._prev}},Ha=function(t,e,a,s){var n=t._repeat,o=at(e)||0,r=t._tTime/t._tDur;return r&&!s&&(t._time*=o/t._dur),t._dur=o,t._tDur=n?n<0?1e10:at(o*(n+1)+t._rDelay*n):o,r>0&&!s&&Ci(t,t._tTime=t._tDur*r),t.parent&&Ai(t),a||ha(t.parent,t),t},Vn=function(t){return t instanceof Ht?ha(t):Ha(t,t._dur)},Kd={_start:0,endTime:p1,totalDuration:p1},Xt=function i(t,e,a){var s=t.labels,n=t._recent||Kd,o=t.duration()>=Gt?n.endTime(!1):t._dur,r,c,d;return Mt(e)&&(isNaN(e)||e in s)?(c=e.charAt(0),d=e.substr(-1)==="%",r=e.indexOf("="),c==="<"||c===">"?(r>=0&&(e=e.replace(/=/,"")),(c==="<"?n._start:n.endTime(n._repeat>=0))+(parseFloat(e.substr(1))||0)*(d?(r<0?n:a).totalDuration()/100:1)):r<0?(e in s||(s[e]=o),s[e]):(c=parseFloat(e.charAt(r-1)+e.substr(r+1)),d&&a&&(c=c/100*(kt(a)?a[0]:a).totalDuration()),r>1?i(t,e.substr(0,r-1),a)+c:o+c)):e==null?o:+e},Ja=function(t,e,a){var s=Ae(e[1]),n=(s?2:1)+(t<2?0:1),o=e[n],r,c;if(s&&(o.duration=e[1]),o.parent=a,t){for(r=o,c=a;c&&!("immediateRender"in r);)r=c.vars.defaults||{},c=Tt(c.vars.inherit)&&c.parent;o.immediateRender=Tt(r.immediateRender),t<2?o.runBackwards=1:o.startAt=e[n-1]}return new pt(e[0],o,e[n+1])},je=function(t,e){return t||t===0?e(t):e},L1=function(t,e,a){return a<t?t:a>e?e:a},wt=function(t,e){return!Mt(t)||!(e=zd.exec(t))?"":e[1]},Jd=function(t,e,a){return je(a,function(s){return L1(t,e,s)})},ps=[].slice,$0=function(t,e){return t&&ue(t)&&"length"in t&&(!e&&!t.length||t.length-1 in t&&ue(t[0]))&&!t.nodeType&&t!==oe},Qd=function(t,e,a){return a===void 0&&(a=[]),t.forEach(function(s){var n;return Mt(s)&&!e||$0(s,1)?(n=a).push.apply(n,Kt(s)):a.push(s)})||a},Kt=function(t,e,a){return Q&&!e&&Q.selector?Q.selector(t):Mt(t)&&!a&&(hs||!Va())?ps.call((e||Ws).querySelectorAll(t),0):kt(t)?Qd(t,a):$0(t)?ps.call(t,0):t?[t]:[]},us=function(t){return t=Kt(t)[0]||l1("Invalid scope")||{},function(e){var a=t.current||t.nativeElement||t;return Kt(e,a.querySelectorAll?a:a===t?l1("Invalid scope")||Ws.createElement("div"):t)}},j0=function(t){return t.sort(function(){return .5-Math.random()})},Y0=function(t){if(ot(t))return t;var e=ue(t)?t:{each:t},a=ca(e.ease),s=e.from||0,n=parseFloat(e.base)||0,o={},r=s>0&&s<1,c=isNaN(s)||r,d=e.axis,l=s,p=s;return Mt(s)?l=p={center:.5,edges:.5,end:1}[s]||0:!r&&c&&(l=s[0],p=s[1]),function(u,g,M){var f=(M||e).length,v=o[f],m,y,_,b,x,k,w,S,A;if(!v){if(A=e.grid==="auto"?0:(e.grid||[1,Gt])[1],!A){for(w=-Gt;w<(w=M[A++].getBoundingClientRect().left)&&A<f;);A<f&&A--}for(v=o[f]=[],m=c?Math.min(A,f)*l-.5:s%A,y=A===Gt?0:c?f*p/A-.5:s/A|0,w=0,S=Gt,k=0;k<f;k++)_=k%A-m,b=y-(k/A|0),v[k]=x=d?Math.abs(d==="y"?b:_):H0(_*_+b*b),x>w&&(w=x),x<S&&(S=x);s==="random"&&j0(v),v.max=w-S,v.min=S,v.v=f=(parseFloat(e.amount)||parseFloat(e.each)*(A>f?f-1:d?d==="y"?f/A:A:Math.max(A,f/A))||0)*(s==="edges"?-1:1),v.b=f<0?n-f:n,v.u=wt(e.amount||e.each)||0,a=a&&f<0?pl(a):a}return f=(v[u]-v.min)/v.max||0,at(v.b+(a?a(f):f)*v.v)+v.u}},gs=function(t){var e=Math.pow(10,((t+"").split(".")[1]||"").length);return function(a){var s=at(Math.round(parseFloat(a)/t)*t*e);return(s-s%1)/e+(Ae(a)?0:wt(a))}},X0=function(t,e){var a=kt(t),s,n;return!a&&ue(t)&&(s=a=t.radius||Gt,t.values?(t=Kt(t.values),(n=!Ae(t[0]))&&(s*=s)):t=gs(t.increment)),je(e,a?ot(t)?function(o){return n=t(o),Math.abs(n-o)<=s?n:o}:function(o){for(var r=parseFloat(n?o.x:o),c=parseFloat(n?o.y:0),d=Gt,l=0,p=t.length,u,g;p--;)n?(u=t[p].x-r,g=t[p].y-c,u=u*u+g*g):u=Math.abs(t[p]-r),u<d&&(d=u,l=p);return l=!s||d<=s?t[l]:o,n||l===o||Ae(o)?l:l+wt(o)}:gs(t))},G0=function(t,e,a,s){return je(kt(t)?!e:a===!0?!!(a=0):!s,function(){return kt(t)?t[~~(Math.random()*t.length)]:(a=a||1e-5)&&(s=a<1?Math.pow(10,(a+"").length-2):1)&&Math.floor(Math.round((t-a/2+Math.random()*(e-t+a*.99))/a)*a*s)/s})},tl=function(){for(var t=arguments.length,e=new Array(t),a=0;a<t;a++)e[a]=arguments[a];return function(s){return e.reduce(function(n,o){return o(n)},s)}},el=function(t,e){return function(a){return t(parseFloat(a))+(e||wt(a))}},al=function(t,e,a){return J0(t,e,0,1,a)},K0=function(t,e,a){return je(a,function(s){return t[~~e(s)]})},il=function i(t,e,a){var s=e-t;return kt(t)?K0(t,i(0,t.length),e):je(a,function(n){return(s+(n-t)%s)%s+t})},sl=function i(t,e,a){var s=e-t,n=s*2;return kt(t)?K0(t,i(0,t.length-1),e):je(a,function(o){return o=(n+(o-t)%n)%n||0,t+(o>s?n-o:o)})},u1=function(t){return t.replace(Id,function(e){var a=e.indexOf("[")+1,s=e.substring(a||7,a?e.indexOf("]"):e.length-1).split(Bd);return G0(a?s:+s[0],a?0:+s[1],+s[2]||1e-5)})},J0=function(t,e,a,s,n){var o=e-t,r=s-a;return je(n,function(c){return a+((c-t)/o*r||0)})},nl=function i(t,e,a,s){var n=isNaN(t+e)?0:function(g){return(1-g)*t+g*e};if(!n){var o=Mt(t),r={},c,d,l,p,u;if(a===!0&&(s=1)&&(a=null),o)t={p:t},e={p:e};else if(kt(t)&&!kt(e)){for(l=[],p=t.length,u=p-2,d=1;d<p;d++)l.push(i(t[d-1],t[d]));p--,n=function(M){M*=p;var f=Math.min(u,~~M);return l[f](M-f)},a=e}else s||(t=La(kt(t)?[]:{},t));if(!l){for(c in e)Xs.call(r,t,c,"get",e[c]);n=function(M){return Qs(M,r)||(o?t.p:t)}}}return je(a,n)},Tn=function(t,e,a){var s=t.labels,n=Gt,o,r,c;for(o in s)r=s[o]-e,r<0==!!a&&r&&n>(r=Math.abs(r))&&(c=o,n=r);return c},Nt=function(t,e,a){var s=t.vars,n=s[e],o=Q,r=t._ctx,c,d,l;if(n)return c=s[e+"Params"],d=s.callbackScope||t,a&&Be.length&&li(),r&&(Q=r),l=c?n.apply(d,c):n.call(d),Q=o,l},Za=function(t){return Ne(t),t.scrollTrigger&&t.scrollTrigger.kill(!!mt),t.progress()<1&&Nt(t,"onInterrupt"),t},ba,Q0=[],tc=function(t){if(t)if(t=!t.name&&t.default||t,Zs()||t.headless){var e=t.name,a=ot(t),s=e&&!a&&t.init?function(){this._props=[]}:t,n={init:p1,render:Qs,add:Xs,kill:bl,modifier:_l,rawVars:0},o={targetTest:0,get:0,getSetter:Js,aliases:{},register:0};if(Va(),t!==s){if(Ft[e])return;qt(s,qt(pi(t,n),o)),La(s.prototype,La(n,pi(t,o))),Ft[s.prop=e]=s,t.targetTest&&(X1.push(s),qs[e]=1),e=(e==="css"?"CSS":e.charAt(0).toUpperCase()+e.substr(1))+"Plugin"}R0(e,s),t.register&&t.register(Rt,s,Dt)}else Q0.push(t)},$=255,Wa={aqua:[0,$,$],lime:[0,$,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,$],navy:[0,0,128],white:[$,$,$],olive:[128,128,0],yellow:[$,$,0],orange:[$,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[$,0,0],pink:[$,192,203],cyan:[0,$,$],transparent:[$,$,$,0]},Bi=function(t,e,a){return t+=t<0?1:t>1?-1:0,(t*6<1?e+(a-e)*t*6:t<.5?a:t*3<2?e+(a-e)*(2/3-t)*6:e)*$+.5|0},ec=function(t,e,a){var s=t?Ae(t)?[t>>16,t>>8&$,t&$]:0:Wa.black,n,o,r,c,d,l,p,u,g,M;if(!s){if(t.substr(-1)===","&&(t=t.substr(0,t.length-1)),Wa[t])s=Wa[t];else if(t.charAt(0)==="#"){if(t.length<6&&(n=t.charAt(1),o=t.charAt(2),r=t.charAt(3),t="#"+n+n+o+o+r+r+(t.length===5?t.charAt(4)+t.charAt(4):"")),t.length===9)return s=parseInt(t.substr(1,6),16),[s>>16,s>>8&$,s&$,parseInt(t.substr(7),16)/255];t=parseInt(t.substr(1),16),s=[t>>16,t>>8&$,t&$]}else if(t.substr(0,3)==="hsl"){if(s=M=t.match(Cn),!e)c=+s[0]%360/360,d=+s[1]/100,l=+s[2]/100,o=l<=.5?l*(d+1):l+d-l*d,n=l*2-o,s.length>3&&(s[3]*=1),s[0]=Bi(c+1/3,n,o),s[1]=Bi(c,n,o),s[2]=Bi(c-1/3,n,o);else if(~t.indexOf("="))return s=t.match(T0),a&&s.length<4&&(s[3]=1),s}else s=t.match(Cn)||Wa.transparent;s=s.map(Number)}return e&&!M&&(n=s[0]/$,o=s[1]/$,r=s[2]/$,p=Math.max(n,o,r),u=Math.min(n,o,r),l=(p+u)/2,p===u?c=d=0:(g=p-u,d=l>.5?g/(2-p-u):g/(p+u),c=p===n?(o-r)/g+(o<r?6:0):p===o?(r-n)/g+2:(n-o)/g+4,c*=60),s[0]=~~(c+.5),s[1]=~~(d*100+.5),s[2]=~~(l*100+.5)),a&&s.length<4&&(s[3]=1),s},ac=function(t){var e=[],a=[],s=-1;return t.split(Fe).forEach(function(n){var o=n.match(_a)||[];e.push.apply(e,o),a.push(s+=o.length+1)}),e.c=a,e},En=function(t,e,a){var s="",n=(t+s).match(Fe),o=e?"hsla(":"rgba(",r=0,c,d,l,p;if(!n)return t;if(n=n.map(function(u){return(u=ec(u,e,1))&&o+(e?u[0]+","+u[1]+"%,"+u[2]+"%,"+u[3]:u.join(","))+")"}),a&&(l=ac(t),c=a.c,c.join(s)!==l.c.join(s)))for(d=t.replace(Fe,"1").split(_a),p=d.length-1;r<p;r++)s+=d[r]+(~c.indexOf(r)?n.shift()||o+"0,0,0,0)":(l.length?l:n.length?n:a).shift());if(!d)for(d=t.split(Fe),p=d.length-1;r<p;r++)s+=d[r]+n[r];return s+d[p]},Fe=function(){var i="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b",t;for(t in Wa)i+="|"+t+"\\b";return new RegExp(i+")","gi")}(),ol=/hsl[a]?\(/,ic=function(t){var e=t.join(" "),a;if(Fe.lastIndex=0,Fe.test(e))return a=ol.test(e),t[1]=En(t[1],a),t[0]=En(t[0],a,ac(t[1])),!0},g1,zt=function(){var i=Date.now,t=500,e=33,a=i(),s=a,n=1e3/240,o=n,r=[],c,d,l,p,u,g,M=function f(v){var m=i()-s,y=v===!0,_,b,x,k;if((m>t||m<0)&&(a+=m-e),s+=m,x=s-a,_=x-o,(_>0||y)&&(k=++p.frame,u=x-p.time*1e3,p.time=x=x/1e3,o+=_+(_>=n?4:n-_),b=1),y||(c=d(f)),b)for(g=0;g<r.length;g++)r[g](x,u,k,v)};return p={time:0,frame:0,tick:function(){M(!0)},deltaRatio:function(v){return u/(1e3/(v||60))},wake:function(){D0&&(!hs&&Zs()&&(oe=hs=window,Ws=oe.document||{},Ut.gsap=Rt,(oe.gsapVersions||(oe.gsapVersions=[])).push(Rt.version),O0(di||oe.GreenSockGlobals||!oe.gsap&&oe||{}),Q0.forEach(tc)),l=typeof requestAnimationFrame<"u"&&requestAnimationFrame,c&&p.sleep(),d=l||function(v){return setTimeout(v,o-p.time*1e3+1|0)},g1=1,M(2))},sleep:function(){(l?cancelAnimationFrame:clearTimeout)(c),g1=0,d=p1},lagSmoothing:function(v,m){t=v||1/0,e=Math.min(m||33,t)},fps:function(v){n=1e3/(v||240),o=p.time*1e3+n},add:function(v,m,y){var _=m?function(b,x,k,w){v(b,x,k,w),p.remove(_)}:v;return p.remove(v),r[y?"unshift":"push"](_),Va(),_},remove:function(v,m){~(m=r.indexOf(v))&&r.splice(m,1)&&g>=m&&g--},_listeners:r},p}(),Va=function(){return!g1&&zt.wake()},N={},rl=/^[\d.\-M][\d.\-,\s]/,hl=/["']/g,cl=function(t){for(var e={},a=t.substr(1,t.length-3).split(":"),s=a[0],n=1,o=a.length,r,c,d;n<o;n++)c=a[n],r=n!==o-1?c.lastIndexOf(","):c.length,d=c.substr(0,r),e[s]=isNaN(d)?d.replace(hl,"").trim():+d,s=c.substr(r+1).trim();return e},dl=function(t){var e=t.indexOf("(")+1,a=t.indexOf(")"),s=t.indexOf("(",e);return t.substring(e,~s&&s<a?t.indexOf(")",a+1):a)},ll=function(t){var e=(t+"").split("("),a=N[e[0]];return a&&e.length>1&&a.config?a.config.apply(null,~t.indexOf("{")?[cl(e[1])]:dl(t).split(",").map(z0)):N._CE&&rl.test(t)?N._CE("",t):a},pl=function(t){return function(e){return 1-t(1-e)}},ca=function(t,e){return t&&(ot(t)?t:N[t]||ll(t))||e},Ma=function(t,e,a,s){a===void 0&&(a=function(c){return 1-e(1-c)}),s===void 0&&(s=function(c){return c<.5?e(c*2)/2:1-e((1-c)*2)/2});var n={easeIn:e,easeOut:a,easeInOut:s},o;return Et(t,function(r){N[r]=Ut[r]=n,N[o=r.toLowerCase()]=a;for(var c in n)N[o+(c==="easeIn"?".in":c==="easeOut"?".out":".inOut")]=N[r+"."+c]=n[c]}),n},sc=function(t){return function(e){return e<.5?(1-t(1-e*2))/2:.5+t((e-.5)*2)/2}},Fi=function i(t,e,a){var s=e>=1?e:1,n=(a||(t?.3:.45))/(e<1?e:1),o=n/rs*(Math.asin(1/s)||0),r=function(l){return l===1?1:s*Math.pow(2,-10*l)*Rd((l-o)*n)+1},c=t==="out"?r:t==="in"?function(d){return 1-r(1-d)}:sc(r);return n=rs/n,c.config=function(d,l){return i(t,d,l)},c},zi=function i(t,e){e===void 0&&(e=1.70158);var a=function(o){return o?--o*o*((e+1)*o+e)+1:0},s=t==="out"?a:t==="in"?function(n){return 1-a(1-n)}:sc(a);return s.config=function(n){return i(t,n)},s};Et("Linear,Quad,Cubic,Quart,Quint,Strong",function(i,t){var e=t<5?t+1:t;Ma(i+",Power"+(e-1),t?function(a){return Math.pow(a,e)}:function(a){return a},function(a){return 1-Math.pow(1-a,e)},function(a){return a<.5?Math.pow(a*2,e)/2:1-Math.pow((1-a)*2,e)/2})});N.Linear.easeNone=N.none=N.Linear.easeIn;Ma("Elastic",Fi("in"),Fi("out"),Fi());(function(i,t){var e=1/t,a=2*e,s=2.5*e,n=function(r){return r<e?i*r*r:r<a?i*Math.pow(r-1.5/t,2)+.75:r<s?i*(r-=2.25/t)*r+.9375:i*Math.pow(r-2.625/t,2)+.984375};Ma("Bounce",function(o){return 1-n(1-o)},n)})(7.5625,2.75);Ma("Expo",function(i){return Math.pow(2,10*(i-1))*i+i*i*i*i*i*i*(1-i)});Ma("Circ",function(i){return-(H0(1-i*i)-1)});Ma("Sine",function(i){return i===1?1:-Od(i*Ed)+1});Ma("Back",zi("in"),zi("out"),zi());N.SteppedEase=N.steps=Ut.SteppedEase={config:function(t,e){t===void 0&&(t=1);var a=1/t,s=t+(e?0:1),n=e?1:0,o=1-j;return function(r){return((s*L1(0,o,r)|0)+n)*a}}};d1.ease=N["quad.out"];Et("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",function(i){return $s+=i+","+i+"Params,"});var nc=function(t,e){this.id=Dd++,t._gsap=this,this.target=t,this.harness=e,this.get=e?e.get:B0,this.set=e?e.getSetter:Js},f1=function(){function i(e){this.vars=e,this._delay=+e.delay||0,(this._repeat=e.repeat===1/0?-2:e.repeat||0)&&(this._rDelay=e.repeatDelay||0,this._yoyo=!!e.yoyo||!!e.yoyoEase),this._ts=1,Ha(this,+e.duration,1,1),this.data=e.data,Q&&(this._ctx=Q,Q.data.push(this)),g1||zt.wake()}var t=i.prototype;return t.delay=function(a){return a||a===0?(this.parent&&this.parent.smoothChildTiming&&this.startTime(this._start+a-this._delay),this._delay=a,this):this._delay},t.duration=function(a){return arguments.length?this.totalDuration(this._repeat>0?a+(a+this._rDelay)*this._repeat:a):this.totalDuration()&&this._dur},t.totalDuration=function(a){return arguments.length?(this._dirty=0,Ha(this,this._repeat<0?a:(a-this._repeat*this._rDelay)/(this._repeat+1))):this._tDur},t.totalTime=function(a,s){if(Va(),!arguments.length)return this._tTime;var n=this._dp;if(n&&n.smoothChildTiming&&this._ts){for(Ci(this,a),!n._dp||n.parent||W0(n,this);n&&n.parent;)n.parent._time!==n._start+(n._ts>=0?n._tTime/n._ts:(n.totalDuration()-n._tTime)/-n._ts)&&n.totalTime(n._tTime,!0),n=n.parent;!this.parent&&this._dp.autoRemoveChildren&&(this._ts>0&&a<this._tDur||this._ts<0&&a>0||!this._tDur&&!a)&&he(this._dp,this,this._start-this._delay)}return(this._tTime!==a||!this._dur&&!s||this._initted&&Math.abs(this._zTime)===j||!this._initted&&this._dur&&a||!a&&!this._initted&&(this.add||this._ptLookup))&&(this._ts||(this._pTime=a),F0(this,a,s)),this},t.time=function(a,s){return arguments.length?this.totalTime(Math.min(this.totalDuration(),a+Hn(this))%(this._dur+this._rDelay)||(a?this._dur:0),s):this._time},t.totalProgress=function(a,s){return arguments.length?this.totalTime(this.totalDuration()*a,s):this.totalDuration()?Math.min(1,this._tTime/this._tDur):this.rawTime()>=0&&this._initted?1:0},t.progress=function(a,s){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&!(this.iteration()&1)?1-a:a)+Hn(this),s):this.duration()?Math.min(1,this._time/this._dur):this.rawTime()>0?1:0},t.iteration=function(a,s){var n=this.duration()+this._rDelay;return arguments.length?this.totalTime(this._time+(a-1)*n,s):this._repeat?Pa(this._tTime,n)+1:1},t.timeScale=function(a,s){if(!arguments.length)return this._rts===-j?0:this._rts;if(this._rts===a)return this;var n=this.parent&&this._ts?ui(this.parent._time,this):this._tTime;return this._rts=+a||0,this._ts=this._ps||a===-j?0:this._rts,this.totalTime(L1(-Math.abs(this._delay),this.totalDuration(),n),s!==!1),Ai(this),$d(this)},t.paused=function(a){return arguments.length?(this._ps!==a&&(this._ps=a,a?(this._pTime=this._tTime||Math.max(-this._delay,this.rawTime()),this._ts=this._act=0):(Va(),this._ts=this._rts,this.totalTime(this.parent&&!this.parent.smoothChildTiming?this.rawTime():this._tTime||this._pTime,this.progress()===1&&Math.abs(this._zTime)!==j&&(this._tTime-=j)))),this):this._ps},t.startTime=function(a){if(arguments.length){this._start=at(a);var s=this.parent||this._dp;return s&&(s._sort||!this.parent)&&he(s,this,this._start-this._delay),this}return this._start},t.endTime=function(a){return this._start+(Tt(a)?this.totalDuration():this.duration())/Math.abs(this._ts||1)},t.rawTime=function(a){var s=this.parent||this._dp;return s?a&&(!this._ts||this._repeat&&this._time&&this.totalProgress()<1)?this._tTime%(this._dur+this._rDelay):this._ts?ui(s.rawTime(a),this):this._tTime:this._tTime},t.revert=function(a){a===void 0&&(a=Zd);var s=mt;return mt=a,Ys(this)&&(this.timeline&&this.timeline.revert(a),this.totalTime(-.01,a.suppressEvents)),this.data!=="nested"&&a.kill!==!1&&this.kill(),mt=s,this},t.globalTime=function(a){for(var s=this,n=arguments.length?a:s.rawTime();s;)n=s._start+n/(Math.abs(s._ts)||1),s=s._dp;return!this.parent&&this._sat?this._sat.globalTime(a):n},t.repeat=function(a){return arguments.length?(this._repeat=a===1/0?-2:a,Vn(this)):this._repeat===-2?1/0:this._repeat},t.repeatDelay=function(a){if(arguments.length){var s=this._time;return this._rDelay=a,Vn(this),s?this.time(s):this}return this._rDelay},t.yoyo=function(a){return arguments.length?(this._yoyo=a,this):this._yoyo},t.seek=function(a,s){return this.totalTime(Xt(this,a),Tt(s))},t.restart=function(a,s){return this.play().totalTime(a?-this._delay:0,Tt(s)),this._dur||(this._zTime=-j),this},t.play=function(a,s){return a!=null&&this.seek(a,s),this.reversed(!1).paused(!1)},t.reverse=function(a,s){return a!=null&&this.seek(a||this.totalDuration(),s),this.reversed(!0).paused(!1)},t.pause=function(a,s){return a!=null&&this.seek(a,s),this.paused(!0)},t.resume=function(){return this.paused(!1)},t.reversed=function(a){return arguments.length?(!!a!==this.reversed()&&this.timeScale(-this._rts||(a?-j:0)),this):this._rts<0},t.invalidate=function(){return this._initted=this._act=0,this._zTime=-j,this},t.isActive=function(){var a=this.parent||this._dp,s=this._start,n;return!!(!a||this._ts&&this._initted&&a.isActive()&&(n=a.rawTime(!0))>=s&&n<this.endTime(!0)-j)},t.eventCallback=function(a,s,n){var o=this.vars;return arguments.length>1?(s?(o[a]=s,n&&(o[a+"Params"]=n),a==="onUpdate"&&(this._onUpdate=s)):delete o[a],this):o[a]},t.then=function(a){var s=this,n=s._prom;return new Promise(function(o){var r=ot(a)?a:N0,c=function(){var l=s.then;s.then=null,n&&n(),ot(r)&&(r=r(s))&&(r.then||r===s)&&(s.then=l),o(r),s.then=l};s._initted&&s.totalProgress()===1&&s._ts>=0||!s._tTime&&s._ts<0?c():s._prom=c})},t.kill=function(){Za(this)},i}();qt(f1.prototype,{_time:0,_start:0,_end:0,_tTime:0,_tDur:0,_dirty:0,_repeat:0,_yoyo:!1,parent:null,_initted:!1,_rDelay:0,_ts:1,_dp:0,ratio:0,_zTime:-j,_prom:0,_ps:!1,_rts:1});var Ht=function(i){P0(t,i);function t(a,s){var n;return a===void 0&&(a={}),n=i.call(this,a)||this,n.labels={},n.smoothChildTiming=!!a.smoothChildTiming,n.autoRemoveChildren=!!a.autoRemoveChildren,n._sort=Tt(a.sortChildren),it&&he(a.parent||it,me(n),s),a.reversed&&n.reverse(),a.paused&&n.paused(!0),a.scrollTrigger&&U0(me(n),a.scrollTrigger),n}var e=t.prototype;return e.to=function(s,n,o){return Ja(0,arguments,this),this},e.from=function(s,n,o){return Ja(1,arguments,this),this},e.fromTo=function(s,n,o,r){return Ja(2,arguments,this),this},e.set=function(s,n,o){return n.duration=0,n.parent=this,Ka(n).repeatDelay||(n.repeat=0),n.immediateRender=!!n.immediateRender,new pt(s,n,Xt(this,o),1),this},e.call=function(s,n,o){return he(this,pt.delayedCall(0,s,n),o)},e.staggerTo=function(s,n,o,r,c,d,l){return o.duration=n,o.stagger=o.stagger||r,o.onComplete=d,o.onCompleteParams=l,o.parent=this,new pt(s,o,Xt(this,c)),this},e.staggerFrom=function(s,n,o,r,c,d,l){return o.runBackwards=1,Ka(o).immediateRender=Tt(o.immediateRender),this.staggerTo(s,n,o,r,c,d,l)},e.staggerFromTo=function(s,n,o,r,c,d,l,p){return r.startAt=o,Ka(r).immediateRender=Tt(r.immediateRender),this.staggerTo(s,n,r,c,d,l,p)},e.render=function(s,n,o){var r=this._time,c=this._dirty?this.totalDuration():this._tDur,d=this._dur,l=s<=0?0:at(s),p=this._zTime<0!=s<0&&(this._initted||!d),u,g,M,f,v,m,y,_,b,x,k,w;if(this!==it&&l>c&&s>=0&&(l=c),l!==this._tTime||o||p){if(r!==this._time&&d&&(l+=this._time-r,s+=this._time-r),u=l,b=this._start,_=this._ts,m=!_,p&&(d||(r=this._zTime),(s||!n)&&(this._zTime=s)),this._repeat){if(k=this._yoyo,v=d+this._rDelay,this._repeat<-1&&s<0)return this.totalTime(v*100+s,n,o);if(u=at(l%v),l===c?(f=this._repeat,u=d):(x=at(l/v),f=~~x,f&&f===x&&(u=d,f--),u>d&&(u=d)),x=Pa(this._tTime,v),!r&&this._tTime&&x!==f&&this._tTime-x*v-this._dur<=0&&(x=f),k&&f&1&&(u=d-u,w=1),f!==x&&!this._lock){var S=k&&x&1,A=S===(k&&f&1);if(f<x&&(S=!S),r=S?0:l%d?d:l,this._lock=1,this.render(r||(w?0:at(f*v)),n,!d)._lock=0,this._tTime=l,!n&&this.parent&&Nt(this,"onRepeat"),this.vars.repeatRefresh&&!w&&(this.invalidate()._lock=1,x=f),r&&r!==this._time||m!==!this._ts||this.vars.onRepeat&&!this.parent&&!this._act)return this;if(d=this._dur,c=this._tDur,A&&(this._lock=2,r=S?d:-1e-4,this.render(r,!0),this.vars.repeatRefresh&&!w&&this.invalidate()),this._lock=0,!this._ts&&!m)return this}}if(this._hasPause&&!this._forcing&&this._lock<2&&(y=Gd(this,at(r),at(u)),y&&(l-=u-(u=y._start))),this._tTime=l,this._time=u,this._act=!!_,this._initted||(this._onUpdate=this.vars.onUpdate,this._initted=1,this._zTime=s,r=0),!r&&l&&d&&!n&&!x&&(Nt(this,"onStart"),this._tTime!==l))return this;if(u>=r&&s>=0)for(g=this._first;g;){if(M=g._next,(g._act||u>=g._start)&&g._ts&&y!==g){if(g.parent!==this)return this.render(s,n,o);if(g.render(g._ts>0?(u-g._start)*g._ts:(g._dirty?g.totalDuration():g._tDur)+(u-g._start)*g._ts,n,o),u!==this._time||!this._ts&&!m){y=0,M&&(l+=this._zTime=-j);break}}g=M}else{g=this._last;for(var C=s<0?s:u;g;){if(M=g._prev,(g._act||C<=g._end)&&g._ts&&y!==g){if(g.parent!==this)return this.render(s,n,o);if(g.render(g._ts>0?(C-g._start)*g._ts:(g._dirty?g.totalDuration():g._tDur)+(C-g._start)*g._ts,n,o||mt&&Ys(g)),u!==this._time||!this._ts&&!m){y=0,M&&(l+=this._zTime=C?-j:j);break}}g=M}}if(y&&!n&&(this.pause(),y.render(u>=r?0:-j)._zTime=u>=r?1:-1,this._ts))return this._start=b,Ai(this),this.render(s,n,o);this._onUpdate&&!n&&Nt(this,"onUpdate",!0),(l===c&&this._tTime>=this.totalDuration()||!l&&r)&&(b===this._start||Math.abs(_)!==Math.abs(this._ts))&&(this._lock||((s||!d)&&(l===c&&this._ts>0||!l&&this._ts<0)&&Ne(this,1),!n&&!(s<0&&!r)&&(l||r||!c)&&(Nt(this,l===c&&s>=0?"onComplete":"onReverseComplete",!0),this._prom&&!(l<c&&this.timeScale()>0)&&this._prom())))}return this},e.add=function(s,n){var o=this;if(Ae(n)||(n=Xt(this,n,s)),!(s instanceof f1)){if(kt(s))return s.forEach(function(r){return o.add(r,n)}),this;if(Mt(s))return this.addLabel(s,n);if(ot(s))s=pt.delayedCall(0,s);else return this}return this!==s?he(this,s,n):this},e.getChildren=function(s,n,o,r){s===void 0&&(s=!0),n===void 0&&(n=!0),o===void 0&&(o=!0),r===void 0&&(r=-Gt);for(var c=[],d=this._first;d;)d._start>=r&&(d instanceof pt?n&&c.push(d):(o&&c.push(d),s&&c.push.apply(c,d.getChildren(!0,n,o)))),d=d._next;return c},e.getById=function(s){for(var n=this.getChildren(1,1,1),o=n.length;o--;)if(n[o].vars.id===s)return n[o]},e.remove=function(s){return Mt(s)?this.removeLabel(s):ot(s)?this.killTweensOf(s):(s.parent===this&&ki(this,s),s===this._recent&&(this._recent=this._last),ha(this))},e.totalTime=function(s,n){return arguments.length?(this._forcing=1,!this._dp&&this._ts&&(this._start=at(zt.time-(this._ts>0?s/this._ts:(this.totalDuration()-s)/-this._ts))),i.prototype.totalTime.call(this,s,n),this._forcing=0,this):this._tTime},e.addLabel=function(s,n){return this.labels[s]=Xt(this,n),this},e.removeLabel=function(s){return delete this.labels[s],this},e.addPause=function(s,n,o){var r=pt.delayedCall(0,n||p1,o);return r.data="isPause",this._hasPause=1,he(this,r,Xt(this,s))},e.removePause=function(s){var n=this._first;for(s=Xt(this,s);n;)n._start===s&&n.data==="isPause"&&Ne(n),n=n._next},e.killTweensOf=function(s,n,o){for(var r=this.getTweensOf(s,o),c=r.length;c--;)Pe!==r[c]&&r[c].kill(s,n);return this},e.getTweensOf=function(s,n){for(var o=[],r=Kt(s),c=this._first,d=Ae(n),l;c;)c instanceof pt?Wd(c._targets,r)&&(d?(!Pe||c._initted&&c._ts)&&c.globalTime(0)<=n&&c.globalTime(c.totalDuration())>n:!n||c.isActive())&&o.push(c):(l=c.getTweensOf(r,n)).length&&o.push.apply(o,l),c=c._next;return o},e.tweenTo=function(s,n){n=n||{};var o=this,r=Xt(o,s),c=n,d=c.startAt,l=c.onStart,p=c.onStartParams,u=c.immediateRender,g,M=pt.to(o,qt({ease:n.ease||"none",lazy:!1,immediateRender:!1,time:r,overwrite:"auto",duration:n.duration||Math.abs((r-(d&&"time"in d?d.time:o._time))/o.timeScale())||j,onStart:function(){if(o.pause(),!g){var v=n.duration||Math.abs((r-(d&&"time"in d?d.time:o._time))/o.timeScale());M._dur!==v&&Ha(M,v,0,1).render(M._time,!0,!0),g=1}l&&l.apply(M,p||[])}},n));return u?M.render(0):M},e.tweenFromTo=function(s,n,o){return this.tweenTo(n,qt({startAt:{time:Xt(this,s)}},o))},e.recent=function(){return this._recent},e.nextLabel=function(s){return s===void 0&&(s=this._time),Tn(this,Xt(this,s))},e.previousLabel=function(s){return s===void 0&&(s=this._time),Tn(this,Xt(this,s),1)},e.currentLabel=function(s){return arguments.length?this.seek(s,!0):this.previousLabel(this._time+j)},e.shiftChildren=function(s,n,o){o===void 0&&(o=0);var r=this._first,c=this.labels,d;for(s=at(s);r;)r._start>=o&&(r._start+=s,r._end+=s),r=r._next;if(n)for(d in c)c[d]>=o&&(c[d]+=s);return ha(this)},e.invalidate=function(s){var n=this._first;for(this._lock=0;n;)n.invalidate(s),n=n._next;return i.prototype.invalidate.call(this,s)},e.clear=function(s){s===void 0&&(s=!0);for(var n=this._first,o;n;)o=n._next,this.remove(n),n=o;return this._dp&&(this._time=this._tTime=this._pTime=0),s&&(this.labels={}),ha(this)},e.totalDuration=function(s){var n=0,o=this,r=o._last,c=Gt,d,l,p;if(arguments.length)return o.timeScale((o._repeat<0?o.duration():o.totalDuration())/(o.reversed()?-s:s));if(o._dirty){for(p=o.parent;r;)d=r._prev,r._dirty&&r.totalDuration(),l=r._start,l>c&&o._sort&&r._ts&&!o._lock?(o._lock=1,he(o,r,l-r._delay,1)._lock=0):c=l,l<0&&r._ts&&(n-=l,(!p&&!o._dp||p&&p.smoothChildTiming)&&(o._start+=at(l/o._ts),o._time-=l,o._tTime-=l),o.shiftChildren(-l,!1,-1/0),c=0),r._end>n&&r._ts&&(n=r._end),r=d;Ha(o,o===it&&o._time>n?o._time:n,1,1),o._dirty=0}return o._tDur},t.updateRoot=function(s){if(it._ts&&(F0(it,ui(s,it)),I0=zt.frame),zt.frame>=Ln){Ln+=Wt.autoSleep||120;var n=it._first;if((!n||!n._ts)&&Wt.autoSleep&&zt._listeners.length<2){for(;n&&!n._ts;)n=n._next;n||zt.sleep()}}},t}(f1);qt(Ht.prototype,{_lock:0,_hasPause:0,_forcing:0});var ul=function(t,e,a,s,n,o,r){var c=new Dt(this._pt,t,e,0,1,lc,null,n),d=0,l=0,p,u,g,M,f,v,m,y;for(c.b=a,c.e=s,a+="",s+="",(m=~s.indexOf("random("))&&(s=u1(s)),o&&(y=[a,s],o(y,t,e),a=y[0],s=y[1]),u=a.match(Ri)||[];p=Ri.exec(s);)M=p[0],f=s.substring(d,p.index),g?g=(g+1)%5:f.substr(-5)==="rgba("&&(g=1),M!==u[l++]&&(v=parseFloat(u[l-1])||0,c._pt={_next:c._pt,p:f||l===1?f:",",s:v,c:M.charAt(1)==="="?wa(v,M)-v:parseFloat(M)-v,m:g&&g<4?Math.round:0},d=Ri.lastIndex);return c.c=d<s.length?s.substring(d,s.length):"",c.fp=r,(E0.test(s)||m)&&(c.e=0),this._pt=c,c},Xs=function(t,e,a,s,n,o,r,c,d,l){ot(s)&&(s=s(n||0,t,o));var p=t[e],u=a!=="get"?a:ot(p)?d?t[e.indexOf("set")||!ot(t["get"+e.substr(3)])?e:"get"+e.substr(3)](d):t[e]():p,g=ot(p)?d?ml:cc:Ks,M;if(Mt(s)&&(~s.indexOf("random(")&&(s=u1(s)),s.charAt(1)==="="&&(M=wa(u,s)+(wt(u)||0),(M||M===0)&&(s=M))),!l||u!==s||fs)return!isNaN(u*s)&&s!==""?(M=new Dt(this._pt,t,e,+u||0,s-(u||0),typeof p=="boolean"?xl:dc,0,g),d&&(M.fp=d),r&&M.modifier(r,this,t),this._pt=M):(!p&&!(e in t)&&Us(e,s),ul.call(this,t,e,u,s,g,c||Wt.stringFilter,d))},gl=function(t,e,a,s,n){if(ot(t)&&(t=Qa(t,n,e,a,s)),!ue(t)||t.style&&t.nodeType||kt(t)||V0(t))return Mt(t)?Qa(t,n,e,a,s):t;var o={},r;for(r in t)o[r]=Qa(t[r],n,e,a,s);return o},oc=function(t,e,a,s,n,o){var r,c,d,l;if(Ft[t]&&(r=new Ft[t]).init(n,r.rawVars?e[t]:gl(e[t],s,n,o,a),a,s,o)!==!1&&(a._pt=c=new Dt(a._pt,n,t,0,1,r.render,r,0,r.priority),a!==ba))for(d=a._ptLookup[a._targets.indexOf(n)],l=r._props.length;l--;)d[r._props[l]]=c;return r},Pe,fs,Gs=function i(t,e,a){var s=t.vars,n=s.ease,o=s.startAt,r=s.immediateRender,c=s.lazy,d=s.onUpdate,l=s.runBackwards,p=s.yoyoEase,u=s.keyframes,g=s.autoRevert,M=t._dur,f=t._startAt,v=t._targets,m=t.parent,y=m&&m.data==="nested"?m.vars.targets:v,_=t._overwrite==="auto"&&!zs,b=t.timeline,x=s.easeReverse||p,k,w,S,A,C,L,P,E,O,T,D,I,q;if(b&&(!u||!n)&&(n="none"),t._ease=ca(n,d1.ease),t._rEase=x&&(ca(x)||t._ease),t._from=!b&&!!s.runBackwards,t._from&&(t.ratio=1),!b||u&&!s.stagger){if(E=v[0]?ra(v[0]).harness:0,I=E&&s[E.prop],k=pi(s,qs),f&&(f._zTime<0&&f.progress(1),e<0&&l&&r&&!g?f.render(-1,!0):f.revert(l&&M?Y1:Nd),f._lazy=0),o){if(Ne(t._startAt=pt.set(v,qt({data:"isStart",overwrite:!1,parent:m,immediateRender:!0,lazy:!f&&Tt(c),startAt:null,delay:0,onUpdate:d&&function(){return Nt(t,"onUpdate")},stagger:0},o))),t._startAt._dp=0,t._startAt._sat=t,e<0&&(mt||!r&&!g)&&t._startAt.revert(Y1),r&&M&&e<=0&&a<=0){e&&(t._zTime=e);return}}else if(l&&M&&!f){if(e&&(r=!1),S=qt({overwrite:!1,data:"isFromStart",lazy:r&&!f&&Tt(c),immediateRender:r,stagger:0,parent:m},k),I&&(S[E.prop]=I),Ne(t._startAt=pt.set(v,S)),t._startAt._dp=0,t._startAt._sat=t,e<0&&(mt?t._startAt.revert(Y1):t._startAt.render(-1,!0)),t._zTime=e,!r)i(t._startAt,j,j);else if(!e)return}for(t._pt=t._ptCache=0,c=M&&Tt(c)||c&&!M,w=0;w<v.length;w++){if(C=v[w],P=C._gsap||js(v)[w]._gsap,t._ptLookup[w]=T={},cs[P.id]&&Be.length&&li(),D=y===v?w:y.indexOf(C),E&&(O=new E).init(C,I||k,t,D,y)!==!1&&(t._pt=A=new Dt(t._pt,C,O.name,0,1,O.render,O,0,O.priority),O._props.forEach(function(Y){T[Y]=A}),O.priority&&(L=1)),!E||I)for(S in k)Ft[S]&&(O=oc(S,k,t,D,C,y))?O.priority&&(L=1):T[S]=A=Xs.call(t,C,S,"get",k[S],D,y,0,s.stringFilter);t._op&&t._op[w]&&t.kill(C,t._op[w]),_&&t._pt&&(Pe=t,it.killTweensOf(C,T,t.globalTime(e)),q=!t.parent,Pe=0),t._pt&&c&&(cs[P.id]=1)}L&&pc(t),t._onInit&&t._onInit(t)}t._onUpdate=d,t._initted=(!t._op||t._pt)&&!q,u&&e<=0&&b.render(Gt,!0,!0)},fl=function(t,e,a,s,n,o,r,c){var d=(t._pt&&t._ptCache||(t._ptCache={}))[e],l,p,u,g;if(!d)for(d=t._ptCache[e]=[],u=t._ptLookup,g=t._targets.length;g--;){if(l=u[g][e],l&&l.d&&l.d._pt)for(l=l.d._pt;l&&l.p!==e&&l.fp!==e;)l=l._next;if(!l)return fs=1,t.vars[e]="+=0",Gs(t,r),fs=0,c?l1(e+" not eligible for reset. Try splitting into individual properties"):1;d.push(l)}for(g=d.length;g--;)p=d[g],l=p._pt||p,l.s=(s||s===0)&&!n?s:l.s+(s||0)+o*l.c,l.c=a-l.s,p.e&&(p.e=ht(a)+wt(p.e)),p.b&&(p.b=l.s+wt(p.b))},Ml=function(t,e){var a=t[0]?ra(t[0]).harness:0,s=a&&a.aliases,n,o,r,c;if(!s)return e;n=La({},e);for(o in s)if(o in n)for(c=s[o].split(","),r=c.length;r--;)n[c[r]]=n[o];return n},vl=function(t,e,a,s){var n=e.ease||s||"power1.inOut",o,r;if(kt(e))r=a[t]||(a[t]=[]),e.forEach(function(c,d){return r.push({t:d/(e.length-1)*100,v:c,e:n})});else for(o in e)r=a[o]||(a[o]=[]),o==="ease"||r.push({t:parseFloat(t),v:e[o],e:n})},Qa=function(t,e,a,s,n){return ot(t)?t.call(e,a,s,n):Mt(t)&&~t.indexOf("random(")?u1(t):t},rc=$s+"repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert",hc={};Et(rc+",id,stagger,delay,duration,paused,scrollTrigger",function(i){return hc[i]=1});var pt=function(i){P0(t,i);function t(a,s,n,o){var r;typeof s=="number"&&(n.duration=s,s=n,n=null),r=i.call(this,o?s:Ka(s))||this;var c=r.vars,d=c.duration,l=c.delay,p=c.immediateRender,u=c.stagger,g=c.overwrite,M=c.keyframes,f=c.defaults,v=c.scrollTrigger,m=s.parent||it,y=(kt(a)||V0(a)?Ae(a[0]):"length"in s)?[a]:Kt(a),_,b,x,k,w,S,A,C;if(r._targets=y.length?js(y):l1("GSAP target "+a+" not found. https://gsap.com",!Wt.nullTargetWarn)||[],r._ptLookup=[],r._overwrite=g,M||u||T1(d)||T1(l)){s=r.vars;var L=s.easeReverse||s.yoyoEase;if(_=r.timeline=new Ht({data:"nested",defaults:f||{},targets:m&&m.data==="nested"?m.vars.targets:y}),_.kill(),_.parent=_._dp=me(r),_._start=0,u||T1(d)||T1(l)){if(k=y.length,A=u&&Y0(u),ue(u))for(w in u)~rc.indexOf(w)&&(C||(C={}),C[w]=u[w]);for(b=0;b<k;b++)x=pi(s,hc),x.stagger=0,L&&(x.easeReverse=L),C&&La(x,C),S=y[b],x.duration=+Qa(d,me(r),b,S,y),x.delay=(+Qa(l,me(r),b,S,y)||0)-r._delay,!u&&k===1&&x.delay&&(r._delay=l=x.delay,r._start+=l,x.delay=0),_.to(S,x,A?A(b,S,y):0),_._ease=N.none;_.duration()?d=l=0:r.timeline=0}else if(M){Ka(qt(_.vars.defaults,{ease:"none"})),_._ease=ca(M.ease||s.ease||"none");var P=0,E,O,T;if(kt(M))M.forEach(function(D){return _.to(y,D,">")}),_.duration();else{x={};for(w in M)w==="ease"||w==="easeEach"||vl(w,M[w],x,M.easeEach);for(w in x)for(E=x[w].sort(function(D,I){return D.t-I.t}),P=0,b=0;b<E.length;b++)O=E[b],T={ease:O.e,duration:(O.t-(b?E[b-1].t:0))/100*d},T[w]=O.v,_.to(y,T,P),P+=T.duration;_.duration()<d&&_.to({},{duration:d-_.duration()})}}d||r.duration(d=_.duration())}else r.timeline=0;return g===!0&&!zs&&(Pe=me(r),it.killTweensOf(y),Pe=0),he(m,me(r),n),s.reversed&&r.reverse(),s.paused&&r.paused(!0),(p||!d&&!M&&r._start===at(m._time)&&Tt(p)&&jd(me(r))&&m.data!=="nested")&&(r._tTime=-j,r.render(Math.max(0,-l)||0)),v&&U0(me(r),v),r}var e=t.prototype;return e.render=function(s,n,o){var r=this._time,c=this._tDur,d=this._dur,l=s<0,p=s>c-j&&!l?c:s<j?0:s,u,g,M,f,v,m,y,_;if(!d)Xd(this,s,n,o);else if(p!==this._tTime||!s||o||!this._initted&&this._tTime||this._startAt&&this._zTime<0!==l||this._lazy){if(u=p,_=this.timeline,this._repeat){if(f=d+this._rDelay,this._repeat<-1&&l)return this.totalTime(f*100+s,n,o);if(u=at(p%f),p===c?(M=this._repeat,u=d):(v=at(p/f),M=~~v,M&&M===v?(u=d,M--):u>d&&(u=d)),m=this._yoyo&&M&1,m&&(u=d-u),v=Pa(this._tTime,f),u===r&&!o&&this._initted&&M===v)return this._tTime=p,this;M!==v&&this.vars.repeatRefresh&&!m&&!this._lock&&u!==f&&this._initted&&(this._lock=o=1,this.render(at(f*M),!0).invalidate()._lock=0)}if(!this._initted){if(q0(this,l?s:u,o,n,p))return this._tTime=0,this;if(r!==this._time&&!(o&&this.vars.repeatRefresh&&M!==v))return this;if(d!==this._dur)return this.render(s,n,o)}if(this._rEase){var b=u<r;if(b!==this._inv){var x=b?r:d-r;this._inv=b,this._from&&(this.ratio=1-this.ratio),this._invRatio=this.ratio,this._invTime=r,this._invRecip=x?(b?-1:1)/x:0,this._invScale=b?-this.ratio:1-this.ratio,this._invEase=b?this._rEase:this._ease}this.ratio=y=this._invRatio+this._invScale*this._invEase((u-this._invTime)*this._invRecip)}else this.ratio=y=this._ease(u/d);if(this._from&&(this.ratio=y=1-y),this._tTime=p,this._time=u,!this._act&&this._ts&&(this._act=1,this._lazy=0),!r&&p&&!n&&!v&&(Nt(this,"onStart"),this._tTime!==p))return this;for(g=this._pt;g;)g.r(y,g.d),g=g._next;_&&_.render(s<0?s:_._dur*_._ease(u/this._dur),n,o)||this._startAt&&(this._zTime=s),this._onUpdate&&!n&&(l&&ds(this,s,n,o),Nt(this,"onUpdate")),this._repeat&&M!==v&&this.vars.onRepeat&&!n&&this.parent&&Nt(this,"onRepeat"),(p===this._tDur||!p)&&this._tTime===p&&(l&&!this._onUpdate&&ds(this,s,!0,!0),(s||!d)&&(p===this._tDur&&this._ts>0||!p&&this._ts<0)&&Ne(this,1),!n&&!(l&&!r)&&(p||r||m)&&(Nt(this,p===c?"onComplete":"onReverseComplete",!0),this._prom&&!(p<c&&this.timeScale()>0)&&this._prom()))}return this},e.targets=function(){return this._targets},e.invalidate=function(s){return(!s||!this.vars.runBackwards)&&(this._startAt=0),this._pt=this._op=this._onUpdate=this._lazy=this.ratio=0,this._ptLookup=[],this.timeline&&this.timeline.invalidate(s),i.prototype.invalidate.call(this,s)},e.resetTo=function(s,n,o,r,c){g1||zt.wake(),this._ts||this.play();var d=Math.min(this._dur,(this._dp._time-this._start)*this._ts),l;return this._initted||Gs(this,d),l=this._ease(d/this._dur),fl(this,s,n,o,r,l,d,c)?this.resetTo(s,n,o,r,1):(Ci(this,0),this.parent||Z0(this._dp,this,"_first","_last",this._dp._sort?"_start":0),this.render(0))},e.kill=function(s,n){if(n===void 0&&(n="all"),!s&&(!n||n==="all"))return this._lazy=this._pt=0,this.parent?Za(this):this.scrollTrigger&&this.scrollTrigger.kill(!!mt),this;if(this.timeline){var o=this.timeline.totalDuration();return this.timeline.killTweensOf(s,n,Pe&&Pe.vars.overwrite!==!0)._first||Za(this),this.parent&&o!==this.timeline.totalDuration()&&Ha(this,this._dur*this.timeline._tDur/o,0,1),this}var r=this._targets,c=s?Kt(s):r,d=this._ptLookup,l=this._pt,p,u,g,M,f,v,m;if((!n||n==="all")&&qd(r,c))return n==="all"&&(this._pt=0),Za(this);for(p=this._op=this._op||[],n!=="all"&&(Mt(n)&&(f={},Et(n,function(y){return f[y]=1}),n=f),n=Ml(r,n)),m=r.length;m--;)if(~c.indexOf(r[m])){u=d[m],n==="all"?(p[m]=n,M=u,g={}):(g=p[m]=p[m]||{},M=n);for(f in M)v=u&&u[f],v&&((!("kill"in v.d)||v.d.kill(f)===!0)&&ki(this,v,"_pt"),delete u[f]),g!=="all"&&(g[f]=1)}return this._initted&&!this._pt&&l&&Za(this),this},t.to=function(s,n){return new t(s,n,arguments[2])},t.from=function(s,n){return Ja(1,arguments)},t.delayedCall=function(s,n,o,r){return new t(n,0,{immediateRender:!1,lazy:!1,overwrite:!1,delay:s,onComplete:n,onReverseComplete:n,onCompleteParams:o,onReverseCompleteParams:o,callbackScope:r})},t.fromTo=function(s,n,o){return Ja(2,arguments)},t.set=function(s,n){return n.duration=0,n.repeatDelay||(n.repeat=0),new t(s,n)},t.killTweensOf=function(s,n,o){return it.killTweensOf(s,n,o)},t}(f1);qt(pt.prototype,{_targets:[],_lazy:0,_startAt:0,_op:0,_onInit:0});Et("staggerTo,staggerFrom,staggerFromTo",function(i){pt[i]=function(){var t=new Ht,e=ps.call(arguments,0);return e.splice(i==="staggerFromTo"?5:4,0,0),t[i].apply(t,e)}});var Ks=function(t,e,a){return t[e]=a},cc=function(t,e,a){return t[e](a)},ml=function(t,e,a,s){return t[e](s.fp,a)},yl=function(t,e,a){return t.setAttribute(e,a)},Js=function(t,e){return ot(t[e])?cc:Ns(t[e])&&t.setAttribute?yl:Ks},dc=function(t,e){return e.set(e.t,e.p,Math.round((e.s+e.c*t)*1e6)/1e6,e)},xl=function(t,e){return e.set(e.t,e.p,!!(e.s+e.c*t),e)},lc=function(t,e){var a=e._pt,s="";if(!t&&e.b)s=e.b;else if(t===1&&e.e)s=e.e;else{for(;a;)s=a.p+(a.m?a.m(a.s+a.c*t):Math.round((a.s+a.c*t)*1e4)/1e4)+s,a=a._next;s+=e.c}e.set(e.t,e.p,s,e)},Qs=function(t,e){for(var a=e._pt;a;)a.r(t,a.d),a=a._next},_l=function(t,e,a,s){for(var n=this._pt,o;n;)o=n._next,n.p===s&&n.modifier(t,e,a),n=o},bl=function(t){for(var e=this._pt,a,s;e;)s=e._next,e.p===t&&!e.op||e.op===t?ki(this,e,"_pt"):e.dep||(a=1),e=s;return!a},wl=function(t,e,a,s){s.mSet(t,e,s.m.call(s.tween,a,s.mt),s)},pc=function(t){for(var e=t._pt,a,s,n,o;e;){for(a=e._next,s=n;s&&s.pr>e.pr;)s=s._next;(e._prev=s?s._prev:o)?e._prev._next=e:n=e,(e._next=s)?s._prev=e:o=e,e=a}t._pt=n},Dt=function(){function i(e,a,s,n,o,r,c,d,l){this.t=a,this.s=n,this.c=o,this.p=s,this.r=r||dc,this.d=c||this,this.set=d||Ks,this.pr=l||0,this._next=e,e&&(e._prev=this)}var t=i.prototype;return t.modifier=function(a,s,n){this.mSet=this.mSet||this.set,this.set=wl,this.m=a,this.mt=n,this.tween=s},i}();Et($s+"parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse",function(i){return qs[i]=1});Ut.TweenMax=Ut.TweenLite=pt;Ut.TimelineLite=Ut.TimelineMax=Ht;it=new Ht({sortChildren:!1,defaults:d1,autoRemoveChildren:!0,id:"root",smoothChildTiming:!0});Wt.stringFilter=ic;var da=[],G1={},Sl=[],Dn=0,kl=0,Ni=function(t){return(G1[t]||Sl).map(function(e){return e()})},Ms=function(){var t=Date.now(),e=[];t-Dn>2&&(Ni("matchMediaInit"),da.forEach(function(a){var s=a.queries,n=a.conditions,o,r,c,d;for(r in s)o=oe.matchMedia(s[r]).matches,o&&(c=1),o!==n[r]&&(n[r]=o,d=1);d&&(a.revert(),c&&e.push(a))}),Ni("matchMediaRevert"),e.forEach(function(a){return a.onMatch(a,function(s){return a.add(null,s)})}),Dn=t,Ni("matchMedia"))},uc=function(){function i(e,a){this.selector=a&&us(a),this.data=[],this._r=[],this.isReverted=!1,this.id=kl++,e&&this.add(e)}var t=i.prototype;return t.add=function(a,s,n){ot(a)&&(n=s,s=a,a=ot);var o=this,r=function(){var d=Q,l=o.selector,p;return d&&d!==o&&d.data.push(o),n&&(o.selector=us(n)),Q=o,p=s.apply(o,arguments),ot(p)&&o._r.push(p),Q=d,o.selector=l,o.isReverted=!1,p};return o.last=r,a===ot?r(o,function(c){return o.add(null,c)}):a?o[a]=r:r},t.ignore=function(a){var s=Q;Q=null,a(this),Q=s},t.getTweens=function(){var a=[];return this.data.forEach(function(s){return s instanceof i?a.push.apply(a,s.getTweens()):s instanceof pt&&!(s.parent&&s.parent.data==="nested")&&a.push(s)}),a},t.clear=function(){this._r.length=this.data.length=0},t.kill=function(a,s){var n=this;if(a?function(){for(var r=n.getTweens(),c=n.data.length,d;c--;)d=n.data[c],d.data==="isFlip"&&(d.revert(),d.getChildren(!0,!0,!1).forEach(function(l){return r.splice(r.indexOf(l),1)}));for(r.map(function(l){return{g:l._dur||l._delay||l._sat&&!l._sat.vars.immediateRender?l.globalTime(0):-1/0,t:l}}).sort(function(l,p){return p.g-l.g||-1/0}).forEach(function(l){return l.t.revert(a)}),c=n.data.length;c--;)d=n.data[c],d instanceof Ht?d.data!=="nested"&&(d.scrollTrigger&&d.scrollTrigger.revert(),d.kill()):!(d instanceof pt)&&d.revert&&d.revert(a);n._r.forEach(function(l){return l(a,n)}),n.isReverted=!0}():this.data.forEach(function(r){return r.kill&&r.kill()}),this.clear(),s)for(var o=da.length;o--;)da[o].id===this.id&&da.splice(o,1)},t.revert=function(a){this.kill(a||{})},i}(),Al=function(){function i(e){this.contexts=[],this.scope=e,Q&&Q.data.push(this)}var t=i.prototype;return t.add=function(a,s,n){ue(a)||(a={matches:a});var o=new uc(0,n||this.scope),r=o.conditions={},c,d,l;Q&&!o.selector&&(o.selector=Q.selector),this.contexts.push(o),s=o.add("onMatch",s),o.queries=a;for(d in a)d==="all"?l=1:(c=oe.matchMedia(a[d]),c&&(da.indexOf(o)<0&&da.push(o),(r[d]=c.matches)&&(l=1),c.addListener?c.addListener(Ms):c.addEventListener("change",Ms)));return l&&s(o,function(p){return o.add(null,p)}),this},t.revert=function(a){this.kill(a||{})},t.kill=function(a){this.contexts.forEach(function(s){return s.kill(a,!0)})},i}(),gi={registerPlugin:function(){for(var t=arguments.length,e=new Array(t),a=0;a<t;a++)e[a]=arguments[a];e.forEach(function(s){return tc(s)})},timeline:function(t){return new Ht(t)},getTweensOf:function(t,e){return it.getTweensOf(t,e)},getProperty:function(t,e,a,s){Mt(t)&&(t=Kt(t)[0]);var n=ra(t||{}).get,o=a?N0:z0;return a==="native"&&(a=""),t&&(e?o((Ft[e]&&Ft[e].get||n)(t,e,a,s)):function(r,c,d){return o((Ft[r]&&Ft[r].get||n)(t,r,c,d))})},quickSetter:function(t,e,a){if(t=Kt(t),t.length>1){var s=t.map(function(l){return Rt.quickSetter(l,e,a)}),n=s.length;return function(l){for(var p=n;p--;)s[p](l)}}t=t[0]||{};var o=Ft[e],r=ra(t),c=r.harness&&(r.harness.aliases||{})[e]||e,d=o?function(l){var p=new o;ba._pt=0,p.init(t,a?l+a:l,ba,0,[t]),p.render(1,p),ba._pt&&Qs(1,ba)}:r.set(t,c);return o?d:function(l){return d(t,c,a?l+a:l,r,1)}},quickTo:function(t,e,a){var s,n=Rt.to(t,qt((s={},s[e]="+=0.1",s.paused=!0,s.stagger=0,s),a||{})),o=function(c,d,l){return n.resetTo(e,c,d,l)};return o.tween=n,o},isTweening:function(t){return it.getTweensOf(t,!0).length>0},defaults:function(t){return t&&t.ease&&(t.ease=ca(t.ease,d1.ease)),Pn(d1,t||{})},config:function(t){return Pn(Wt,t||{})},registerEffect:function(t){var e=t.name,a=t.effect,s=t.plugins,n=t.defaults,o=t.extendTimeline;(s||"").split(",").forEach(function(r){return r&&!Ft[r]&&!Ut[r]&&l1(e+" effect requires "+r+" plugin.")}),Ii[e]=function(r,c,d){return a(Kt(r),qt(c||{},n),d)},o&&(Ht.prototype[e]=function(r,c,d){return this.add(Ii[e](r,ue(c)?c:(d=c)&&{},this),d)})},registerEase:function(t,e){N[t]=ca(e)},parseEase:function(t,e){return arguments.length?ca(t,e):N},getById:function(t){return it.getById(t)},exportRoot:function(t,e){t===void 0&&(t={});var a=new Ht(t),s,n;for(a.smoothChildTiming=Tt(t.smoothChildTiming),it.remove(a),a._dp=0,a._time=a._tTime=it._time,s=it._first;s;)n=s._next,(e||!(!s._dur&&s instanceof pt&&s.vars.onComplete===s._targets[0]))&&he(a,s,s._start-s._delay),s=n;return he(it,a,0),a},context:function(t,e){return t?new uc(t,e):Q},matchMedia:function(t){return new Al(t)},matchMediaRefresh:function(){return da.forEach(function(t){var e=t.conditions,a,s;for(s in e)e[s]&&(e[s]=!1,a=1);a&&t.revert()})||Ms()},addEventListener:function(t,e){var a=G1[t]||(G1[t]=[]);~a.indexOf(e)||a.push(e)},removeEventListener:function(t,e){var a=G1[t],s=a&&a.indexOf(e);s>=0&&a.splice(s,1)},utils:{wrap:il,wrapYoyo:sl,distribute:Y0,random:G0,snap:X0,normalize:al,getUnit:wt,clamp:Jd,splitColor:ec,toArray:Kt,selector:us,mapRange:J0,pipe:tl,unitize:el,interpolate:nl,shuffle:j0},install:O0,effects:Ii,ticker:zt,updateRoot:Ht.updateRoot,plugins:Ft,globalTimeline:it,core:{PropTween:Dt,globals:R0,Tween:pt,Timeline:Ht,Animation:f1,getCache:ra,_removeLinkedListItem:ki,reverting:function(){return mt},context:function(t){return t&&Q&&(Q.data.push(t),t._ctx=Q),Q},suppressOverwrites:function(t){return zs=t}}};Et("to,from,fromTo,delayedCall,set,killTweensOf",function(i){return gi[i]=pt[i]});zt.add(Ht.updateRoot);ba=gi.to({},{duration:0});var Cl=function(t,e){for(var a=t._pt;a&&a.p!==e&&a.op!==e&&a.fp!==e;)a=a._next;return a},Ll=function(t,e){var a=t._targets,s,n,o;for(s in e)for(n=a.length;n--;)o=t._ptLookup[n][s],o&&(o=o.d)&&(o._pt&&(o=Cl(o,s)),o&&o.modifier&&o.modifier(e[s],t,a[n],s))},Zi=function(t,e){return{name:t,headless:1,rawVars:1,init:function(s,n,o){o._onInit=function(r){var c,d;if(Mt(n)&&(c={},Et(n,function(l){return c[l]=1}),n=c),e){c={};for(d in n)c[d]=e(n[d]);n=c}Ll(r,n)}}}},Rt=gi.registerPlugin({name:"attr",init:function(t,e,a,s,n){var o,r,c;this.tween=a;for(o in e)c=t.getAttribute(o)||"",r=this.add(t,"setAttribute",(c||0)+"",e[o],s,n,0,0,o),r.op=o,r.b=c,this._props.push(o)},render:function(t,e){for(var a=e._pt;a;)mt?a.set(a.t,a.p,a.b,a):a.r(t,a.d),a=a._next}},{name:"endArray",headless:1,init:function(t,e){for(var a=e.length;a--;)this.add(t,a,t[a]||0,e[a],0,0,0,0,0,1)}},Zi("roundProps",gs),Zi("modifiers"),Zi("snap",X0))||gi;pt.version=Ht.version=Rt.version="3.15.0";D0=1;Zs()&&Va();N.Power0;N.Power1;N.Power2;N.Power3;N.Power4;N.Linear;N.Quad;N.Cubic;N.Quart;N.Quint;N.Strong;N.Elastic;N.Back;N.SteppedEase;N.Bounce;N.Sine;N.Expo;N.Circ;/*!
 * CSSPlugin 3.15.0
 * https://gsap.com
 *
 * Copyright 2008-2026, GreenSock. All rights reserved.
 * Subject to the terms at https://gsap.com/standard-license
 * @author: Jack Doyle, jack@greensock.com
*/var On,He,Sa,tn,sa,Rn,en,Pl=function(){return typeof window<"u"},Ce={},ea=180/Math.PI,ka=Math.PI/180,ma=Math.atan2,In=1e8,an=/([A-Z])/g,Hl=/(left|right|width|margin|padding|x)/i,Vl=/[\s,\(]\S/,de={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},vs=function(t,e){return e.set(e.t,e.p,Math.round((e.s+e.c*t)*1e4)/1e4+e.u,e)},Tl=function(t,e){return e.set(e.t,e.p,t===1?e.e:Math.round((e.s+e.c*t)*1e4)/1e4+e.u,e)},El=function(t,e){return e.set(e.t,e.p,t?Math.round((e.s+e.c*t)*1e4)/1e4+e.u:e.b,e)},Dl=function(t,e){return e.set(e.t,e.p,t===1?e.e:t?Math.round((e.s+e.c*t)*1e4)/1e4+e.u:e.b,e)},Ol=function(t,e){var a=e.s+e.c*t;e.set(e.t,e.p,~~(a+(a<0?-.5:.5))+e.u,e)},gc=function(t,e){return e.set(e.t,e.p,t?e.e:e.b,e)},fc=function(t,e){return e.set(e.t,e.p,t!==1?e.b:e.e,e)},Rl=function(t,e,a){return t.style[e]=a},Il=function(t,e,a){return t.style.setProperty(e,a)},Bl=function(t,e,a){return t._gsap[e]=a},Fl=function(t,e,a){return t._gsap.scaleX=t._gsap.scaleY=a},zl=function(t,e,a,s,n){var o=t._gsap;o.scaleX=o.scaleY=a,o.renderTransform(n,o)},Nl=function(t,e,a,s,n){var o=t._gsap;o[e]=a,o.renderTransform(n,o)},st="transform",Ot=st+"Origin",Zl=function i(t,e){var a=this,s=this.target,n=s.style,o=s._gsap;if(t in Ce&&n){if(this.tfm=this.tfm||{},t!=="transform")t=de[t]||t,~t.indexOf(",")?t.split(",").forEach(function(r){return a.tfm[r]=xe(s,r)}):this.tfm[t]=o.x?o[t]:xe(s,t),t===Ot&&(this.tfm.zOrigin=o.zOrigin);else return de.transform.split(",").forEach(function(r){return i.call(a,r,e)});if(this.props.indexOf(st)>=0)return;o.svg&&(this.svgo=s.getAttribute("data-svg-origin"),this.props.push(Ot,e,"")),t=st}(n||e)&&this.props.push(t,e,n[t])},Mc=function(t){t.translate&&(t.removeProperty("translate"),t.removeProperty("scale"),t.removeProperty("rotate"))},Wl=function(){var t=this.props,e=this.target,a=e.style,s=e._gsap,n,o;for(n=0;n<t.length;n+=3)t[n+1]?t[n+1]===2?e[t[n]](t[n+2]):e[t[n]]=t[n+2]:t[n+2]?a[t[n]]=t[n+2]:a.removeProperty(t[n].substr(0,2)==="--"?t[n]:t[n].replace(an,"-$1").toLowerCase());if(this.tfm){for(o in this.tfm)s[o]=this.tfm[o];s.svg&&(s.renderTransform(),e.setAttribute("data-svg-origin",this.svgo||"")),n=en(),(!n||!n.isStart)&&!a[st]&&(Mc(a),s.zOrigin&&a[Ot]&&(a[Ot]+=" "+s.zOrigin+"px",s.zOrigin=0,s.renderTransform()),s.uncache=1)}},vc=function(t,e){var a={target:t,props:[],revert:Wl,save:Zl};return t._gsap||Rt.core.getCache(t),e&&t.style&&t.nodeType&&e.split(",").forEach(function(s){return a.save(s)}),a},mc,ms=function(t,e){var a=He.createElementNS?He.createElementNS((e||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),t):He.createElement(t);return a&&a.style?a:He.createElement(t)},Zt=function i(t,e,a){var s=getComputedStyle(t);return s[e]||s.getPropertyValue(e.replace(an,"-$1").toLowerCase())||s.getPropertyValue(e)||!a&&i(t,Ta(e)||e,1)||""},Bn="O,Moz,ms,Ms,Webkit".split(","),Ta=function(t,e,a){var s=e||sa,n=s.style,o=5;if(t in n&&!a)return t;for(t=t.charAt(0).toUpperCase()+t.substr(1);o--&&!(Bn[o]+t in n););return o<0?null:(o===3?"ms":o>=0?Bn[o]:"")+t},ys=function(){Pl()&&window.document&&(On=window,He=On.document,Sa=He.documentElement,sa=ms("div")||{style:{}},ms("div"),st=Ta(st),Ot=st+"Origin",sa.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",mc=!!Ta("perspective"),en=Rt.core.reverting,tn=1)},Fn=function(t){var e=t.ownerSVGElement,a=ms("svg",e&&e.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),s=t.cloneNode(!0),n;s.style.display="block",a.appendChild(s),Sa.appendChild(a);try{n=s.getBBox()}catch{}return a.removeChild(s),Sa.removeChild(a),n},zn=function(t,e){for(var a=e.length;a--;)if(t.hasAttribute(e[a]))return t.getAttribute(e[a])},yc=function(t){var e,a;try{e=t.getBBox()}catch{e=Fn(t),a=1}return e&&(e.width||e.height)||a||(e=Fn(t)),e&&!e.width&&!e.x&&!e.y?{x:+zn(t,["x","cx","x1"])||0,y:+zn(t,["y","cy","y1"])||0,width:0,height:0}:e},xc=function(t){return!!(t.getCTM&&(!t.parentNode||t.ownerSVGElement)&&yc(t))},Ze=function(t,e){if(e){var a=t.style,s;e in Ce&&e!==Ot&&(e=st),a.removeProperty?(s=e.substr(0,2),(s==="ms"||e.substr(0,6)==="webkit")&&(e="-"+e),a.removeProperty(s==="--"?e:e.replace(an,"-$1").toLowerCase())):a.removeAttribute(e)}},Ve=function(t,e,a,s,n,o){var r=new Dt(t._pt,e,a,0,1,o?fc:gc);return t._pt=r,r.b=s,r.e=n,t._props.push(a),r},Nn={deg:1,rad:1,turn:1},Ul={grid:1,flex:1},We=function i(t,e,a,s){var n=parseFloat(a)||0,o=(a+"").trim().substr((n+"").length)||"px",r=sa.style,c=Hl.test(e),d=t.tagName.toLowerCase()==="svg",l=(d?"client":"offset")+(c?"Width":"Height"),p=100,u=s==="px",g=s==="%",M,f,v,m;if(s===o||!n||Nn[s]||Nn[o])return n;if(o!=="px"&&!u&&(n=i(t,e,a,"px")),m=t.getCTM&&xc(t),(g||o==="%")&&(Ce[e]||~e.indexOf("adius")))return M=m?t.getBBox()[c?"width":"height"]:t[l],ht(g?n/M*p:n/100*M);if(r[c?"width":"height"]=p+(u?o:s),f=s!=="rem"&&~e.indexOf("adius")||s==="em"&&t.appendChild&&!d?t:t.parentNode,m&&(f=(t.ownerSVGElement||{}).parentNode),(!f||f===He||!f.appendChild)&&(f=He.body),v=f._gsap,v&&g&&v.width&&c&&v.time===zt.time&&!v.uncache)return ht(n/v.width*p);if(g&&(e==="height"||e==="width")){var y=t.style[e];t.style[e]=p+s,M=t[l],y?t.style[e]=y:Ze(t,e)}else(g||o==="%")&&!Ul[Zt(f,"display")]&&(r.position=Zt(t,"position")),f===t&&(r.position="static"),f.appendChild(sa),M=sa[l],f.removeChild(sa),r.position="absolute";return c&&g&&(v=ra(f),v.time=zt.time,v.width=f[l]),ht(u?M*n/p:M&&n?p/M*n:0)},xe=function(t,e,a,s){var n;return tn||ys(),e in de&&e!=="transform"&&(e=de[e],~e.indexOf(",")&&(e=e.split(",")[0])),Ce[e]&&e!=="transform"?(n=v1(t,s),n=e!=="transformOrigin"?n[e]:n.svg?n.origin:Mi(Zt(t,Ot))+" "+n.zOrigin+"px"):(n=t.style[e],(!n||n==="auto"||s||~(n+"").indexOf("calc("))&&(n=fi[e]&&fi[e](t,e,a)||Zt(t,e)||B0(t,e)||(e==="opacity"?1:0))),a&&!~(n+"").trim().indexOf(" ")?We(t,e,n,a)+a:n},ql=function(t,e,a,s){if(!a||a==="none"){var n=Ta(e,t,1),o=n&&Zt(t,n,1);o&&o!==a?(e=n,a=o):e==="borderColor"&&(a=Zt(t,"borderTopColor"))}var r=new Dt(this._pt,t.style,e,0,1,lc),c=0,d=0,l,p,u,g,M,f,v,m,y,_,b,x;if(r.b=a,r.e=s,a+="",s+="",s.substring(0,6)==="var(--"&&(s=Zt(t,s.substring(4,s.indexOf(")")))),s==="auto"&&(f=t.style[e],t.style[e]=s,s=Zt(t,e)||s,f?t.style[e]=f:Ze(t,e)),l=[a,s],ic(l),a=l[0],s=l[1],u=a.match(_a)||[],x=s.match(_a)||[],x.length){for(;p=_a.exec(s);)v=p[0],y=s.substring(c,p.index),M?M=(M+1)%5:(y.substr(-5)==="rgba("||y.substr(-5)==="hsla(")&&(M=1),v!==(f=u[d++]||"")&&(g=parseFloat(f)||0,b=f.substr((g+"").length),v.charAt(1)==="="&&(v=wa(g,v)+b),m=parseFloat(v),_=v.substr((m+"").length),c=_a.lastIndex-_.length,_||(_=_||Wt.units[e]||b,c===s.length&&(s+=_,r.e+=_)),b!==_&&(g=We(t,e,f,_)||0),r._pt={_next:r._pt,p:y||d===1?y:",",s:g,c:m-g,m:M&&M<4||e==="zIndex"?Math.round:0});r.c=c<s.length?s.substring(c,s.length):""}else r.r=e==="display"&&s==="none"?fc:gc;return E0.test(s)&&(r.e=0),this._pt=r,r},Zn={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},$l=function(t){var e=t.split(" "),a=e[0],s=e[1]||"50%";return(a==="top"||a==="bottom"||s==="left"||s==="right")&&(t=a,a=s,s=t),e[0]=Zn[a]||a,e[1]=Zn[s]||s,e.join(" ")},jl=function(t,e){if(e.tween&&e.tween._time===e.tween._dur){var a=e.t,s=a.style,n=e.u,o=a._gsap,r,c,d;if(n==="all"||n===!0)s.cssText="",c=1;else for(n=n.split(","),d=n.length;--d>-1;)r=n[d],Ce[r]&&(c=1,r=r==="transformOrigin"?Ot:st),Ze(a,r);c&&(Ze(a,st),o&&(o.svg&&a.removeAttribute("transform"),s.scale=s.rotate=s.translate="none",v1(a,1),o.uncache=1,Mc(s)))}},fi={clearProps:function(t,e,a,s,n){if(n.data!=="isFromStart"){var o=t._pt=new Dt(t._pt,e,a,0,0,jl);return o.u=s,o.pr=-10,o.tween=n,t._props.push(a),1}}},M1=[1,0,0,1,0,0],_c={},bc=function(t){return t==="matrix(1, 0, 0, 1, 0, 0)"||t==="none"||!t},Wn=function(t){var e=Zt(t,st);return bc(e)?M1:e.substr(7).match(T0).map(ht)},sn=function(t,e){var a=t._gsap||ra(t),s=t.style,n=Wn(t),o,r,c,d;return a.svg&&t.getAttribute("transform")?(c=t.transform.baseVal.consolidate().matrix,n=[c.a,c.b,c.c,c.d,c.e,c.f],n.join(",")==="1,0,0,1,0,0"?M1:n):(n===M1&&!t.offsetParent&&t!==Sa&&!a.svg&&(c=s.display,s.display="block",o=t.parentNode,(!o||!t.offsetParent&&!t.getBoundingClientRect().width)&&(d=1,r=t.nextElementSibling,Sa.appendChild(t)),n=Wn(t),c?s.display=c:Ze(t,"display"),d&&(r?o.insertBefore(t,r):o?o.appendChild(t):Sa.removeChild(t))),e&&n.length>6?[n[0],n[1],n[4],n[5],n[12],n[13]]:n)},xs=function(t,e,a,s,n,o){var r=t._gsap,c=n||sn(t,!0),d=r.xOrigin||0,l=r.yOrigin||0,p=r.xOffset||0,u=r.yOffset||0,g=c[0],M=c[1],f=c[2],v=c[3],m=c[4],y=c[5],_=e.split(" "),b=parseFloat(_[0])||0,x=parseFloat(_[1])||0,k,w,S,A;a?c!==M1&&(w=g*v-M*f)&&(S=b*(v/w)+x*(-f/w)+(f*y-v*m)/w,A=b*(-M/w)+x*(g/w)-(g*y-M*m)/w,b=S,x=A):(k=yc(t),b=k.x+(~_[0].indexOf("%")?b/100*k.width:b),x=k.y+(~(_[1]||_[0]).indexOf("%")?x/100*k.height:x)),s||s!==!1&&r.smooth?(m=b-d,y=x-l,r.xOffset=p+(m*g+y*f)-m,r.yOffset=u+(m*M+y*v)-y):r.xOffset=r.yOffset=0,r.xOrigin=b,r.yOrigin=x,r.smooth=!!s,r.origin=e,r.originIsAbsolute=!!a,t.style[Ot]="0px 0px",o&&(Ve(o,r,"xOrigin",d,b),Ve(o,r,"yOrigin",l,x),Ve(o,r,"xOffset",p,r.xOffset),Ve(o,r,"yOffset",u,r.yOffset)),t.setAttribute("data-svg-origin",b+" "+x)},v1=function(t,e){var a=t._gsap||new nc(t);if("x"in a&&!e&&!a.uncache)return a;var s=t.style,n=a.scaleX<0,o="px",r="deg",c=getComputedStyle(t),d=Zt(t,Ot)||"0",l,p,u,g,M,f,v,m,y,_,b,x,k,w,S,A,C,L,P,E,O,T,D,I,q,Y,Ct,It,vt,Jt,dt,yt;return l=p=u=f=v=m=y=_=b=0,g=M=1,a.svg=!!(t.getCTM&&xc(t)),c.translate&&((c.translate!=="none"||c.scale!=="none"||c.rotate!=="none")&&(s[st]=(c.translate!=="none"?"translate3d("+(c.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+(c.rotate!=="none"?"rotate("+c.rotate+") ":"")+(c.scale!=="none"?"scale("+c.scale.split(" ").join(",")+") ":"")+(c[st]!=="none"?c[st]:"")),s.scale=s.rotate=s.translate="none"),w=sn(t,a.svg),a.svg&&(a.uncache?(q=t.getBBox(),d=a.xOrigin-q.x+"px "+(a.yOrigin-q.y)+"px",I=""):I=!e&&t.getAttribute("data-svg-origin"),xs(t,I||d,!!I||a.originIsAbsolute,a.smooth!==!1,w)),x=a.xOrigin||0,k=a.yOrigin||0,w!==M1&&(L=w[0],P=w[1],E=w[2],O=w[3],l=T=w[4],p=D=w[5],w.length===6?(g=Math.sqrt(L*L+P*P),M=Math.sqrt(O*O+E*E),f=L||P?ma(P,L)*ea:0,y=E||O?ma(E,O)*ea+f:0,y&&(M*=Math.abs(Math.cos(y*ka))),a.svg&&(l-=x-(x*L+k*E),p-=k-(x*P+k*O))):(yt=w[6],Jt=w[7],Ct=w[8],It=w[9],vt=w[10],dt=w[11],l=w[12],p=w[13],u=w[14],S=ma(yt,vt),v=S*ea,S&&(A=Math.cos(-S),C=Math.sin(-S),I=T*A+Ct*C,q=D*A+It*C,Y=yt*A+vt*C,Ct=T*-C+Ct*A,It=D*-C+It*A,vt=yt*-C+vt*A,dt=Jt*-C+dt*A,T=I,D=q,yt=Y),S=ma(-E,vt),m=S*ea,S&&(A=Math.cos(-S),C=Math.sin(-S),I=L*A-Ct*C,q=P*A-It*C,Y=E*A-vt*C,dt=O*C+dt*A,L=I,P=q,E=Y),S=ma(P,L),f=S*ea,S&&(A=Math.cos(S),C=Math.sin(S),I=L*A+P*C,q=T*A+D*C,P=P*A-L*C,D=D*A-T*C,L=I,T=q),v&&Math.abs(v)+Math.abs(f)>359.9&&(v=f=0,m=180-m),g=ht(Math.sqrt(L*L+P*P+E*E)),M=ht(Math.sqrt(D*D+yt*yt)),S=ma(T,D),y=Math.abs(S)>2e-4?S*ea:0,b=dt?1/(dt<0?-dt:dt):0),a.svg&&(I=t.getAttribute("transform"),a.forceCSS=t.setAttribute("transform","")||!bc(Zt(t,st)),I&&t.setAttribute("transform",I))),Math.abs(y)>90&&Math.abs(y)<270&&(n?(g*=-1,y+=f<=0?180:-180,f+=f<=0?180:-180):(M*=-1,y+=y<=0?180:-180)),e=e||a.uncache,a.x=l-((a.xPercent=l&&(!e&&a.xPercent||(Math.round(t.offsetWidth/2)===Math.round(-l)?-50:0)))?t.offsetWidth*a.xPercent/100:0)+o,a.y=p-((a.yPercent=p&&(!e&&a.yPercent||(Math.round(t.offsetHeight/2)===Math.round(-p)?-50:0)))?t.offsetHeight*a.yPercent/100:0)+o,a.z=u+o,a.scaleX=ht(g),a.scaleY=ht(M),a.rotation=ht(f)+r,a.rotationX=ht(v)+r,a.rotationY=ht(m)+r,a.skewX=y+r,a.skewY=_+r,a.transformPerspective=b+o,(a.zOrigin=parseFloat(d.split(" ")[2])||!e&&a.zOrigin||0)&&(s[Ot]=Mi(d)),a.xOffset=a.yOffset=0,a.force3D=Wt.force3D,a.renderTransform=a.svg?Xl:mc?wc:Yl,a.uncache=0,a},Mi=function(t){return(t=t.split(" "))[0]+" "+t[1]},Wi=function(t,e,a){var s=wt(e);return ht(parseFloat(e)+parseFloat(We(t,"x",a+"px",s)))+s},Yl=function(t,e){e.z="0px",e.rotationY=e.rotationX="0deg",e.force3D=0,wc(t,e)},Xe="0deg",Ra="0px",Ge=") ",wc=function(t,e){var a=e||this,s=a.xPercent,n=a.yPercent,o=a.x,r=a.y,c=a.z,d=a.rotation,l=a.rotationY,p=a.rotationX,u=a.skewX,g=a.skewY,M=a.scaleX,f=a.scaleY,v=a.transformPerspective,m=a.force3D,y=a.target,_=a.zOrigin,b="",x=m==="auto"&&t&&t!==1||m===!0;if(_&&(p!==Xe||l!==Xe)){var k=parseFloat(l)*ka,w=Math.sin(k),S=Math.cos(k),A;k=parseFloat(p)*ka,A=Math.cos(k),o=Wi(y,o,w*A*-_),r=Wi(y,r,-Math.sin(k)*-_),c=Wi(y,c,S*A*-_+_)}v!==Ra&&(b+="perspective("+v+Ge),(s||n)&&(b+="translate("+s+"%, "+n+"%) "),(x||o!==Ra||r!==Ra||c!==Ra)&&(b+=c!==Ra||x?"translate3d("+o+", "+r+", "+c+") ":"translate("+o+", "+r+Ge),d!==Xe&&(b+="rotate("+d+Ge),l!==Xe&&(b+="rotateY("+l+Ge),p!==Xe&&(b+="rotateX("+p+Ge),(u!==Xe||g!==Xe)&&(b+="skew("+u+", "+g+Ge),(M!==1||f!==1)&&(b+="scale("+M+", "+f+Ge),y.style[st]=b||"translate(0, 0)"},Xl=function(t,e){var a=e||this,s=a.xPercent,n=a.yPercent,o=a.x,r=a.y,c=a.rotation,d=a.skewX,l=a.skewY,p=a.scaleX,u=a.scaleY,g=a.target,M=a.xOrigin,f=a.yOrigin,v=a.xOffset,m=a.yOffset,y=a.forceCSS,_=parseFloat(o),b=parseFloat(r),x,k,w,S,A;c=parseFloat(c),d=parseFloat(d),l=parseFloat(l),l&&(l=parseFloat(l),d+=l,c+=l),c||d?(c*=ka,d*=ka,x=Math.cos(c)*p,k=Math.sin(c)*p,w=Math.sin(c-d)*-u,S=Math.cos(c-d)*u,d&&(l*=ka,A=Math.tan(d-l),A=Math.sqrt(1+A*A),w*=A,S*=A,l&&(A=Math.tan(l),A=Math.sqrt(1+A*A),x*=A,k*=A)),x=ht(x),k=ht(k),w=ht(w),S=ht(S)):(x=p,S=u,k=w=0),(_&&!~(o+"").indexOf("px")||b&&!~(r+"").indexOf("px"))&&(_=We(g,"x",o,"px"),b=We(g,"y",r,"px")),(M||f||v||m)&&(_=ht(_+M-(M*x+f*w)+v),b=ht(b+f-(M*k+f*S)+m)),(s||n)&&(A=g.getBBox(),_=ht(_+s/100*A.width),b=ht(b+n/100*A.height)),A="matrix("+x+","+k+","+w+","+S+","+_+","+b+")",g.setAttribute("transform",A),y&&(g.style[st]=A)},Gl=function(t,e,a,s,n){var o=360,r=Mt(n),c=parseFloat(n)*(r&&~n.indexOf("rad")?ea:1),d=c-s,l=s+d+"deg",p,u;return r&&(p=n.split("_")[1],p==="short"&&(d%=o,d!==d%(o/2)&&(d+=d<0?o:-o)),p==="cw"&&d<0?d=(d+o*In)%o-~~(d/o)*o:p==="ccw"&&d>0&&(d=(d-o*In)%o-~~(d/o)*o)),t._pt=u=new Dt(t._pt,e,a,s,d,Tl),u.e=l,u.u="deg",t._props.push(a),u},Un=function(t,e){for(var a in e)t[a]=e[a];return t},Kl=function(t,e,a){var s=Un({},a._gsap),n="perspective,force3D,transformOrigin,svgOrigin",o=a.style,r,c,d,l,p,u,g,M;s.svg?(d=a.getAttribute("transform"),a.setAttribute("transform",""),o[st]=e,r=v1(a,1),Ze(a,st),a.setAttribute("transform",d)):(d=getComputedStyle(a)[st],o[st]=e,r=v1(a,1),o[st]=d);for(c in Ce)d=s[c],l=r[c],d!==l&&n.indexOf(c)<0&&(g=wt(d),M=wt(l),p=g!==M?We(a,c,d,M):parseFloat(d),u=parseFloat(l),t._pt=new Dt(t._pt,r,c,p,u-p,vs),t._pt.u=M||0,t._props.push(c));Un(r,s)};Et("padding,margin,Width,Radius",function(i,t){var e="Top",a="Right",s="Bottom",n="Left",o=(t<3?[e,a,s,n]:[e+n,e+a,s+a,s+n]).map(function(r){return t<2?i+r:"border"+r+i});fi[t>1?"border"+i:i]=function(r,c,d,l,p){var u,g;if(arguments.length<4)return u=o.map(function(M){return xe(r,M,d)}),g=u.join(" "),g.split(u[0]).length===5?u[0]:g;u=(l+"").split(" "),g={},o.forEach(function(M,f){return g[M]=u[f]=u[f]||u[(f-1)/2|0]}),r.init(c,g,p)}});var Sc={name:"css",register:ys,targetTest:function(t){return t.style&&t.nodeType},init:function(t,e,a,s,n){var o=this._props,r=t.style,c=a.vars.startAt,d,l,p,u,g,M,f,v,m,y,_,b,x,k,w,S,A;tn||ys(),this.styles=this.styles||vc(t),S=this.styles.props,this.tween=a;for(f in e)if(f!=="autoRound"&&(l=e[f],!(Ft[f]&&oc(f,e,a,s,t,n)))){if(g=typeof l,M=fi[f],g==="function"&&(l=l.call(a,s,t,n),g=typeof l),g==="string"&&~l.indexOf("random(")&&(l=u1(l)),M)M(this,t,f,l,a)&&(w=1);else if(f.substr(0,2)==="--")d=(getComputedStyle(t).getPropertyValue(f)+"").trim(),l+="",Fe.lastIndex=0,Fe.test(d)||(v=wt(d),m=wt(l),m?v!==m&&(d=We(t,f,d,m)+m):v&&(l+=v)),this.add(r,"setProperty",d,l,s,n,0,0,f),o.push(f),S.push(f,0,r[f]);else if(g!=="undefined"){if(c&&f in c?(d=typeof c[f]=="function"?c[f].call(a,s,t,n):c[f],Mt(d)&&~d.indexOf("random(")&&(d=u1(d)),wt(d+"")||d==="auto"||(d+=Wt.units[f]||wt(xe(t,f))||""),(d+"").charAt(1)==="="&&(d=xe(t,f))):d=xe(t,f),u=parseFloat(d),y=g==="string"&&l.charAt(1)==="="&&l.substr(0,2),y&&(l=l.substr(2)),p=parseFloat(l),f in de&&(f==="autoAlpha"&&(u===1&&xe(t,"visibility")==="hidden"&&p&&(u=0),S.push("visibility",0,r.visibility),Ve(this,r,"visibility",u?"inherit":"hidden",p?"inherit":"hidden",!p)),f!=="scale"&&f!=="transform"&&(f=de[f],~f.indexOf(",")&&(f=f.split(",")[0]))),_=f in Ce,_){if(this.styles.save(f),A=l,g==="string"&&l.substring(0,6)==="var(--"){if(l=Zt(t,l.substring(4,l.indexOf(")"))),l.substring(0,5)==="calc("){var C=t.style.perspective;t.style.perspective=l,l=Zt(t,"perspective"),C?t.style.perspective=C:Ze(t,"perspective")}p=parseFloat(l)}if(b||(x=t._gsap,x.renderTransform&&!e.parseTransform||v1(t,e.parseTransform),k=e.smoothOrigin!==!1&&x.smooth,b=this._pt=new Dt(this._pt,r,st,0,1,x.renderTransform,x,0,-1),b.dep=1),f==="scale")this._pt=new Dt(this._pt,x,"scaleY",x.scaleY,(y?wa(x.scaleY,y+p):p)-x.scaleY||0,vs),this._pt.u=0,o.push("scaleY",f),f+="X";else if(f==="transformOrigin"){S.push(Ot,0,r[Ot]),l=$l(l),x.svg?xs(t,l,0,k,0,this):(m=parseFloat(l.split(" ")[2])||0,m!==x.zOrigin&&Ve(this,x,"zOrigin",x.zOrigin,m),Ve(this,r,f,Mi(d),Mi(l)));continue}else if(f==="svgOrigin"){xs(t,l,1,k,0,this);continue}else if(f in _c){Gl(this,x,f,u,y?wa(u,y+l):l);continue}else if(f==="smoothOrigin"){Ve(this,x,"smooth",x.smooth,l);continue}else if(f==="force3D"){x[f]=l;continue}else if(f==="transform"){Kl(this,l,t);continue}}else f in r||(f=Ta(f)||f);if(_||(p||p===0)&&(u||u===0)&&!Vl.test(l)&&f in r)v=(d+"").substr((u+"").length),p||(p=0),m=wt(l)||(f in Wt.units?Wt.units[f]:v),v!==m&&(u=We(t,f,d,m)),this._pt=new Dt(this._pt,_?x:r,f,u,(y?wa(u,y+p):p)-u,!_&&(m==="px"||f==="zIndex")&&e.autoRound!==!1?Ol:vs),this._pt.u=m||0,_&&A!==l?(this._pt.b=d,this._pt.e=A,this._pt.r=Dl):v!==m&&m!=="%"&&(this._pt.b=d,this._pt.r=El);else if(f in r)ql.call(this,t,f,d,y?y+l:l);else if(f in t)this.add(t,f,d||t[f],y?y+l:l,s,n);else if(f!=="parseTransform"){Us(f,l);continue}_||(f in r?S.push(f,0,r[f]):typeof t[f]=="function"?S.push(f,2,t[f]()):S.push(f,1,d||t[f])),o.push(f)}}w&&pc(this)},render:function(t,e){if(e.tween._time||!en())for(var a=e._pt;a;)a.r(t,a.d),a=a._next;else e.styles.revert()},get:xe,aliases:de,getSetter:function(t,e,a){var s=de[e];return s&&s.indexOf(",")<0&&(e=s),e in Ce&&e!==Ot&&(t._gsap.x||xe(t,"x"))?a&&Rn===a?e==="scale"?Fl:Bl:(Rn=a||{})&&(e==="scale"?zl:Nl):t.style&&!Ns(t.style[e])?Rl:~e.indexOf("-")?Il:Js(t,e)},core:{_removeProperty:Ze,_getMatrix:sn}};Rt.utils.checkPrefix=Ta;Rt.core.getStyleSaver=vc;(function(i,t,e,a){var s=Et(i+","+t+","+e,function(n){Ce[n]=1});Et(t,function(n){Wt.units[n]="deg",_c[n]=1}),de[s[13]]=i+","+t,Et(a,function(n){var o=n.split(":");de[o[1]]=s[o[0]]})})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");Et("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(i){Wt.units[i]="px"});Rt.registerPlugin(Sc);var le=Rt.registerPlugin(Sc)||Rt;le.core.Tween;/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kc=(i,t,e=[])=>{const a=document.createElementNS("http://www.w3.org/2000/svg",i);return Object.keys(t).forEach(s=>{a.setAttribute(s,String(t[s]))}),e.length&&e.forEach(s=>{const n=kc(...s);a.appendChild(n)}),a};var Jl=([i,t,e])=>kc(i,t,e);/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ql=i=>Array.from(i.attributes).reduce((t,e)=>(t[e.name]=e.value,t),{}),tp=i=>typeof i=="string"?i:!i||!i.class?"":i.class&&typeof i.class=="string"?i.class.split(" "):i.class&&Array.isArray(i.class)?i.class:"",ep=i=>i.flatMap(tp).map(e=>e.trim()).filter(Boolean).filter((e,a,s)=>s.indexOf(e)===a).join(" "),ap=i=>i.replace(/(\w)(\w*)(_|-|\s*)/g,(t,e,a)=>e.toUpperCase()+a.toLowerCase()),qn=(i,{nameAttr:t,icons:e,attrs:a})=>{var M;const s=i.getAttribute(t);if(s==null)return;const n=ap(s),o=e[n];if(!o)return console.warn(`${i.outerHTML} icon name was not found in the provided icons object.`);const r=Ql(i),[c,d,l]=o,p={...d,"data-lucide":s,...a,...r},u=ep(["lucide",`lucide-${s}`,r,a]);u&&Object.assign(p,{class:u});const g=Jl([c,p,l]);return(M=i.parentNode)==null?void 0:M.replaceChild(g,i)};/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ip=["svg",h,[["path",{d:"M3.5 13h6"}],["path",{d:"m2 16 4.5-9 4.5 9"}],["path",{d:"M18 7v9"}],["path",{d:"m14 12 4 4 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sp=["svg",h,[["path",{d:"M3.5 13h6"}],["path",{d:"m2 16 4.5-9 4.5 9"}],["path",{d:"M18 16V7"}],["path",{d:"m14 11 4-4 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const np=["svg",h,[["path",{d:"M21 14h-5"}],["path",{d:"M16 16v-3.5a2.5 2.5 0 0 1 5 0V16"}],["path",{d:"M4.5 13h6"}],["path",{d:"m3 16 4.5-9 4.5 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const op=["svg",h,[["circle",{cx:"16",cy:"4",r:"1"}],["path",{d:"m18 19 1-7-6 1"}],["path",{d:"m5 8 3-3 5.5 3-2.36 3.5"}],["path",{d:"M4.24 14.5a5 5 0 0 0 6.88 6"}],["path",{d:"M13.76 17.5a5 5 0 0 0-6.88-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rp=["svg",h,[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hp=["svg",h,[["path",{d:"M6 12H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 8h12"}],["path",{d:"M18.3 17.7a2.5 2.5 0 0 1-3.16 3.83 2.53 2.53 0 0 1-1.14-2V12"}],["path",{d:"M6.6 15.6A2 2 0 1 0 10 17v-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cp=["svg",h,[["path",{d:"M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"}],["path",{d:"m12 15 5 6H7Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $n=["svg",h,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}],["path",{d:"m9 13 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jn=["svg",h,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}],["path",{d:"M9 13h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dp=["svg",h,[["path",{d:"M6.87 6.87a8 8 0 1 0 11.26 11.26"}],["path",{d:"M19.9 14.25a8 8 0 0 0-9.15-9.15"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.26 18.67 4 21"}],["path",{d:"m2 2 20 20"}],["path",{d:"M4 4 2 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yn=["svg",h,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}],["path",{d:"M12 10v6"}],["path",{d:"M9 13h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lp=["svg",h,[["circle",{cx:"12",cy:"13",r:"8"}],["path",{d:"M12 9v4l2 2"}],["path",{d:"M5 3 2 6"}],["path",{d:"m22 6-3-3"}],["path",{d:"M6.38 18.7 4 21"}],["path",{d:"M17.64 18.67 20 21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pp=["svg",h,[["path",{d:"M11 21c0-2.5 2-2.5 2-5"}],["path",{d:"M16 21c0-2.5 2-2.5 2-5"}],["path",{d:"m19 8-.8 3a1.25 1.25 0 0 1-1.2 1H7a1.25 1.25 0 0 1-1.2-1L5 8"}],["path",{d:"M21 3a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1z"}],["path",{d:"M6 21c0-2.5 2-2.5 2-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const up=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["polyline",{points:"11 3 11 11 14 8 17 11 17 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gp=["svg",h,[["path",{d:"M2 12h20"}],["path",{d:"M10 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"}],["path",{d:"M10 8V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4"}],["path",{d:"M20 16v1a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-1"}],["path",{d:"M14 8V7c0-1.1.9-2 2-2h2a2 2 0 0 1 2 2v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fp=["svg",h,[["path",{d:"M12 2v20"}],["path",{d:"M8 10H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2h4"}],["path",{d:"M16 10h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4"}],["path",{d:"M8 20H7a2 2 0 0 1-2-2v-2c0-1.1.9-2 2-2h1"}],["path",{d:"M16 14h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mp=["svg",h,[["line",{x1:"21",x2:"3",y1:"6",y2:"6"}],["line",{x1:"17",x2:"7",y1:"12",y2:"12"}],["line",{x1:"19",x2:"5",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=["svg",h,[["rect",{width:"6",height:"16",x:"4",y:"2",rx:"2"}],["rect",{width:"6",height:"9",x:"14",y:"9",rx:"2"}],["path",{d:"M22 22H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mp=["svg",h,[["rect",{width:"16",height:"6",x:"2",y:"4",rx:"2"}],["rect",{width:"9",height:"6",x:"9",y:"14",rx:"2"}],["path",{d:"M22 22V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yp=["svg",h,[["rect",{width:"6",height:"14",x:"4",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"14",y:"7",rx:"2"}],["path",{d:"M17 22v-5"}],["path",{d:"M17 7V2"}],["path",{d:"M7 22v-3"}],["path",{d:"M7 5V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xp=["svg",h,[["rect",{width:"6",height:"14",x:"4",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"14",y:"7",rx:"2"}],["path",{d:"M10 2v20"}],["path",{d:"M20 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _p=["svg",h,[["rect",{width:"6",height:"14",x:"4",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"14",y:"7",rx:"2"}],["path",{d:"M4 2v20"}],["path",{d:"M14 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bp=["svg",h,[["rect",{width:"6",height:"14",x:"2",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"16",y:"7",rx:"2"}],["path",{d:"M12 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wp=["svg",h,[["rect",{width:"6",height:"14",x:"2",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"12",y:"7",rx:"2"}],["path",{d:"M22 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sp=["svg",h,[["rect",{width:"6",height:"14",x:"6",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"16",y:"7",rx:"2"}],["path",{d:"M2 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kp=["svg",h,[["rect",{width:"6",height:"10",x:"9",y:"7",rx:"2"}],["path",{d:"M4 22V2"}],["path",{d:"M20 22V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ap=["svg",h,[["rect",{width:"6",height:"14",x:"3",y:"5",rx:"2"}],["rect",{width:"6",height:"10",x:"15",y:"7",rx:"2"}],["path",{d:"M3 2v20"}],["path",{d:"M21 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cp=["svg",h,[["line",{x1:"3",x2:"21",y1:"6",y2:"6"}],["line",{x1:"3",x2:"21",y1:"12",y2:"12"}],["line",{x1:"3",x2:"21",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lp=["svg",h,[["line",{x1:"21",x2:"3",y1:"6",y2:"6"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12"}],["line",{x1:"17",x2:"3",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pp=["svg",h,[["line",{x1:"21",x2:"3",y1:"6",y2:"6"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12"}],["line",{x1:"21",x2:"7",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hp=["svg",h,[["rect",{width:"6",height:"16",x:"4",y:"6",rx:"2"}],["rect",{width:"6",height:"9",x:"14",y:"6",rx:"2"}],["path",{d:"M22 2H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vp=["svg",h,[["rect",{width:"9",height:"6",x:"6",y:"14",rx:"2"}],["rect",{width:"16",height:"6",x:"6",y:"4",rx:"2"}],["path",{d:"M2 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tp=["svg",h,[["path",{d:"M22 17h-3"}],["path",{d:"M22 7h-5"}],["path",{d:"M5 17H2"}],["path",{d:"M7 7H2"}],["rect",{x:"5",y:"14",width:"14",height:"6",rx:"2"}],["rect",{x:"7",y:"4",width:"10",height:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ep=["svg",h,[["rect",{width:"14",height:"6",x:"5",y:"14",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"4",rx:"2"}],["path",{d:"M2 20h20"}],["path",{d:"M2 10h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dp=["svg",h,[["rect",{width:"14",height:"6",x:"5",y:"14",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"4",rx:"2"}],["path",{d:"M2 14h20"}],["path",{d:"M2 4h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Op=["svg",h,[["rect",{width:"14",height:"6",x:"5",y:"16",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"2",rx:"2"}],["path",{d:"M2 12h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rp=["svg",h,[["rect",{width:"14",height:"6",x:"5",y:"12",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"2",rx:"2"}],["path",{d:"M2 22h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ip=["svg",h,[["rect",{width:"14",height:"6",x:"5",y:"16",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"6",rx:"2"}],["path",{d:"M2 2h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bp=["svg",h,[["rect",{width:"10",height:"6",x:"7",y:"9",rx:"2"}],["path",{d:"M22 20H2"}],["path",{d:"M22 4H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fp=["svg",h,[["rect",{width:"14",height:"6",x:"5",y:"15",rx:"2"}],["rect",{width:"10",height:"6",x:"7",y:"3",rx:"2"}],["path",{d:"M2 21h20"}],["path",{d:"M2 3h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zp=["svg",h,[["path",{d:"M10 10H6"}],["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"}],["path",{d:"M8 8v4"}],["path",{d:"M9 18h6"}],["circle",{cx:"17",cy:"18",r:"2"}],["circle",{cx:"7",cy:"18",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Np=["svg",h,[["path",{d:"M17.5 12c0 4.4-3.6 8-8 8A4.5 4.5 0 0 1 5 15.5c0-6 8-4 8-8.5a3 3 0 1 0-6 0c0 3 2.5 8.5 12 13"}],["path",{d:"M16 12h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zp=["svg",h,[["path",{d:"M10 17c-5-3-7-7-7-9a2 2 0 0 1 4 0c0 2.5-5 2.5-5 6 0 1.7 1.3 3 3 3 2.8 0 5-2.2 5-5"}],["path",{d:"M22 17c-5-3-7-7-7-9a2 2 0 0 1 4 0c0 2.5-5 2.5-5 6 0 1.7 1.3 3 3 3 2.8 0 5-2.2 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wp=["svg",h,[["path",{d:"M12 22V8"}],["path",{d:"M5 12H2a10 10 0 0 0 20 0h-3"}],["circle",{cx:"12",cy:"5",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Up=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 16s-1.5-2-4-2-4 2-4 2"}],["path",{d:"M7.5 8 10 9"}],["path",{d:"m14 9 2.5-1"}],["path",{d:"M9 10h0"}],["path",{d:"M15 10h0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qp=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 15h8"}],["path",{d:"M8 9h2"}],["path",{d:"M14 9h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $p=["svg",h,[["path",{d:"M2 12 7 2"}],["path",{d:"m7 12 5-10"}],["path",{d:"m12 12 5-10"}],["path",{d:"m17 12 5-10"}],["path",{d:"M4.5 7h15"}],["path",{d:"M12 16v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jp=["svg",h,[["path",{d:"M7 10H6a4 4 0 0 1-4-4 1 1 0 0 1 1-1h4"}],["path",{d:"M7 5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1 7 7 0 0 1-7 7H8a1 1 0 0 1-1-1z"}],["path",{d:"M9 12v5"}],["path",{d:"M15 12v5"}],["path",{d:"M5 20a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yp=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m14.31 8 5.74 9.94"}],["path",{d:"M9.69 8h11.48"}],["path",{d:"m7.38 12 5.74-9.94"}],["path",{d:"M9.69 16 3.95 6.06"}],["path",{d:"M14.31 16H2.83"}],["path",{d:"m16.62 12-5.74 9.94"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xp=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M6 8h.01"}],["path",{d:"M10 8h.01"}],["path",{d:"M14 8h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gp=["svg",h,[["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2"}],["path",{d:"M10 4v4"}],["path",{d:"M2 8h20"}],["path",{d:"M6 4v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kp=["svg",h,[["path",{d:"M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"}],["path",{d:"M10 2c1 .5 2 2 2 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jp=["svg",h,[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2"}],["path",{d:"m9 15 3-3 3 3"}],["path",{d:"M12 12v9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qp=["svg",h,[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"}],["path",{d:"m9.5 17 5-5"}],["path",{d:"m9.5 12 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tu=["svg",h,[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"}],["path",{d:"M10 12h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eu=["svg",h,[["path",{d:"M3 3v18h18"}],["path",{d:"M7 12v5h12V8l-5 5-4-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const au=["svg",h,[["path",{d:"M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"}],["path",{d:"M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"}],["path",{d:"M5 18v2"}],["path",{d:"M19 18v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iu=["svg",h,[["path",{d:"M15 5H9"}],["path",{d:"M15 9v3h4l-7 7-7-7h4V9z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const su=["svg",h,[["path",{d:"M15 6v6h4l-7 7-7-7h4V6h6z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nu=["svg",h,[["path",{d:"M19 15V9"}],["path",{d:"M15 15h-3v4l-7-7 7-7v4h3v6z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ou=["svg",h,[["path",{d:"M18 15h-6v4l-7-7 7-7v4h6v6z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ru=["svg",h,[["path",{d:"M5 9v6"}],["path",{d:"M9 9h3V5l7 7-7 7v-4H9V9z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hu=["svg",h,[["path",{d:"M6 9h6V5l7 7-7 7v-4H6V9z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cu=["svg",h,[["path",{d:"M9 19h6"}],["path",{d:"M9 15v-3H5l7-7 7 7h-4v3H9z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const du=["svg",h,[["path",{d:"M9 18v-6H5l7-7 7 7h-4v6H9z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lu=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["rect",{x:"15",y:"4",width:"4",height:"6",ry:"2"}],["path",{d:"M17 20v-6h-2"}],["path",{d:"M15 20h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pu=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M17 10V4h-2"}],["path",{d:"M15 10h4"}],["rect",{x:"15",y:"14",width:"4",height:"6",ry:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xn=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M20 8h-5"}],["path",{d:"M15 10V6.5a2.5 2.5 0 0 1 5 0V10"}],["path",{d:"M15 14h5l-5 6h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uu=["svg",h,[["path",{d:"M19 3H5"}],["path",{d:"M12 21V7"}],["path",{d:"m6 15 6 6 6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gu=["svg",h,[["path",{d:"M17 7 7 17"}],["path",{d:"M17 17H7V7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fu=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M11 4h4"}],["path",{d:"M11 8h7"}],["path",{d:"M11 12h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mu=["svg",h,[["path",{d:"m7 7 10 10"}],["path",{d:"M17 7v10H7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vu=["svg",h,[["path",{d:"M12 2v14"}],["path",{d:"m19 9-7 7-7-7"}],["circle",{cx:"12",cy:"21",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mu=["svg",h,[["path",{d:"M12 17V3"}],["path",{d:"m6 11 6 6 6-6"}],["path",{d:"M19 21H5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yu=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"m21 8-4-4-4 4"}],["path",{d:"M17 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gn=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 20V4"}],["path",{d:"M11 4h10"}],["path",{d:"M11 8h7"}],["path",{d:"M11 12h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kn=["svg",h,[["path",{d:"m3 16 4 4 4-4"}],["path",{d:"M7 4v16"}],["path",{d:"M15 4h5l-5 6h5"}],["path",{d:"M15 20v-3.5a2.5 2.5 0 0 1 5 0V20"}],["path",{d:"M20 18h-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xu=["svg",h,[["path",{d:"M12 5v14"}],["path",{d:"m19 12-7 7-7-7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _u=["svg",h,[["path",{d:"m9 6-6 6 6 6"}],["path",{d:"M3 12h14"}],["path",{d:"M21 19V5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bu=["svg",h,[["path",{d:"M8 3 4 7l4 4"}],["path",{d:"M4 7h16"}],["path",{d:"m16 21 4-4-4-4"}],["path",{d:"M20 17H4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wu=["svg",h,[["path",{d:"M3 19V5"}],["path",{d:"m13 6-6 6 6 6"}],["path",{d:"M7 12h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Su=["svg",h,[["path",{d:"m12 19-7-7 7-7"}],["path",{d:"M19 12H5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ku=["svg",h,[["path",{d:"M3 5v14"}],["path",{d:"M21 12H7"}],["path",{d:"m15 18 6-6-6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Au=["svg",h,[["path",{d:"m16 3 4 4-4 4"}],["path",{d:"M20 7H4"}],["path",{d:"m8 21-4-4 4-4"}],["path",{d:"M4 17h16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cu=["svg",h,[["path",{d:"M17 12H3"}],["path",{d:"m11 18 6-6-6-6"}],["path",{d:"M21 5v14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lu=["svg",h,[["path",{d:"M5 12h14"}],["path",{d:"m12 5 7 7-7 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pu=["svg",h,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["rect",{x:"15",y:"4",width:"4",height:"6",ry:"2"}],["path",{d:"M17 20v-6h-2"}],["path",{d:"M15 20h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hu=["svg",h,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M17 10V4h-2"}],["path",{d:"M15 10h4"}],["rect",{x:"15",y:"14",width:"4",height:"6",ry:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jn=["svg",h,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M20 8h-5"}],["path",{d:"M15 10V6.5a2.5 2.5 0 0 1 5 0V10"}],["path",{d:"M15 14h5l-5 6h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vu=["svg",h,[["path",{d:"m21 16-4 4-4-4"}],["path",{d:"M17 20V4"}],["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tu=["svg",h,[["path",{d:"m5 9 7-7 7 7"}],["path",{d:"M12 16V2"}],["circle",{cx:"12",cy:"21",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eu=["svg",h,[["path",{d:"m18 9-6-6-6 6"}],["path",{d:"M12 3v14"}],["path",{d:"M5 21h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Du=["svg",h,[["path",{d:"M7 17V7h10"}],["path",{d:"M17 17 7 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qn=["svg",h,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M11 12h4"}],["path",{d:"M11 16h7"}],["path",{d:"M11 20h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ou=["svg",h,[["path",{d:"M7 7h10v10"}],["path",{d:"M7 17 17 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ru=["svg",h,[["path",{d:"M5 3h14"}],["path",{d:"m18 13-6-6-6 6"}],["path",{d:"M12 7v14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iu=["svg",h,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M11 12h10"}],["path",{d:"M11 16h7"}],["path",{d:"M11 20h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t2=["svg",h,[["path",{d:"m3 8 4-4 4 4"}],["path",{d:"M7 4v16"}],["path",{d:"M15 4h5l-5 6h5"}],["path",{d:"M15 20v-3.5a2.5 2.5 0 0 1 5 0V20"}],["path",{d:"M20 18h-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bu=["svg",h,[["path",{d:"m5 12 7-7 7 7"}],["path",{d:"M12 19V5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fu=["svg",h,[["path",{d:"m4 6 3-3 3 3"}],["path",{d:"M7 17V3"}],["path",{d:"m14 6 3-3 3 3"}],["path",{d:"M17 17V3"}],["path",{d:"M4 21h16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zu=["svg",h,[["path",{d:"M12 6v12"}],["path",{d:"M17.196 9 6.804 15"}],["path",{d:"m6.804 9 10.392 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nu=["svg",h,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zu=["svg",h,[["circle",{cx:"12",cy:"12",r:"1"}],["path",{d:"M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"}],["path",{d:"M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wu=["svg",h,[["path",{d:"M2 10v3"}],["path",{d:"M6 6v11"}],["path",{d:"M10 3v18"}],["path",{d:"M14 8v7"}],["path",{d:"M18 5v13"}],["path",{d:"M22 10v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uu=["svg",h,[["path",{d:"M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qu=["svg",h,[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"}],["circle",{cx:"12",cy:"8",r:"6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $u=["svg",h,[["path",{d:"m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"}],["path",{d:"M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e2=["svg",h,[["path",{d:"M4 4v16h16"}],["path",{d:"m4 20 7-7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ju=["svg",h,[["path",{d:"M9 12h.01"}],["path",{d:"M15 12h.01"}],["path",{d:"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"}],["path",{d:"M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yu=["svg",h,[["path",{d:"M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"}],["path",{d:"M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"}],["path",{d:"M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"}],["path",{d:"M8 10h8"}],["path",{d:"M8 18h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xu=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gu=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M12 7v10"}],["path",{d:"M15.4 10a4 4 0 1 0 0 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a2=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"m9 12 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ku=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{d:"M12 18V6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ju=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M7 12h5"}],["path",{d:"M15 9.4a4 4 0 1 0 0 5.2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qu=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["line",{x1:"12",x2:"12.01",y1:"17",y2:"17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M8 8h8"}],["path",{d:"M8 12h8"}],["path",{d:"m13 17-5-1h1a4 4 0 0 0 0-8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"12",x2:"12",y1:"16",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"8",y2:"8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"m9 8 3 3v7"}],["path",{d:"m12 11 3-3"}],["path",{d:"M9 12h6"}],["path",{d:"M9 16h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"m15 9-6 6"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 15h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"12",x2:"12",y1:"8",y2:"16"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M8 12h4"}],["path",{d:"M10 16V9.5a2.5 2.5 0 0 1 5 0"}],["path",{d:"M8 16h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M9 16h5"}],["path",{d:"M9 12h5a2 2 0 1 0 0-4h-3v9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["path",{d:"M11 17V8h4"}],["path",{d:"M11 12h3"}],["path",{d:"M9 16h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}],["line",{x1:"15",x2:"9",y1:"9",y2:"15"}],["line",{x1:"9",x2:"15",y1:"9",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d4=["svg",h,[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l4=["svg",h,[["path",{d:"M22 18H6a2 2 0 0 1-2-2V7a2 2 0 0 0-2-2"}],["path",{d:"M17 14V4a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v10"}],["rect",{width:"13",height:"8",x:"8",y:"6",rx:"1"}],["circle",{cx:"18",cy:"20",r:"2"}],["circle",{cx:"9",cy:"20",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p4=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m4.9 4.9 14.2 14.2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u4=["svg",h,[["path",{d:"M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5"}],["path",{d:"M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g4=["svg",h,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M6 12h.01M18 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f4=["svg",h,[["line",{x1:"18",x2:"18",y1:"20",y2:"10"}],["line",{x1:"12",x2:"12",y1:"20",y2:"4"}],["line",{x1:"6",x2:"6",y1:"20",y2:"14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M4=["svg",h,[["path",{d:"M3 3v18h18"}],["path",{d:"M18 17V9"}],["path",{d:"M13 17V5"}],["path",{d:"M8 17v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v4=["svg",h,[["path",{d:"M3 3v18h18"}],["path",{d:"M13 17V9"}],["path",{d:"M18 17V5"}],["path",{d:"M8 17v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m4=["svg",h,[["path",{d:"M3 3v18h18"}],["rect",{width:"4",height:"7",x:"7",y:"10",rx:"1"}],["rect",{width:"4",height:"12",x:"15",y:"5",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y4=["svg",h,[["path",{d:"M3 3v18h18"}],["rect",{width:"12",height:"4",x:"7",y:"5",rx:"1"}],["rect",{width:"7",height:"4",x:"7",y:"13",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x4=["svg",h,[["path",{d:"M3 3v18h18"}],["path",{d:"M7 16h8"}],["path",{d:"M7 11h12"}],["path",{d:"M7 6h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _4=["svg",h,[["line",{x1:"12",x2:"12",y1:"20",y2:"10"}],["line",{x1:"18",x2:"18",y1:"20",y2:"4"}],["line",{x1:"6",x2:"6",y1:"20",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b4=["svg",h,[["path",{d:"M3 5v14"}],["path",{d:"M8 5v14"}],["path",{d:"M12 5v14"}],["path",{d:"M17 5v14"}],["path",{d:"M21 5v14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w4=["svg",h,[["path",{d:"M4 20h16"}],["path",{d:"m6 16 6-12 6 12"}],["path",{d:"M8 12h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S4=["svg",h,[["path",{d:"M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"}],["line",{x1:"10",x2:"8",y1:"5",y2:"7"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12"}],["line",{x1:"7",x2:"7",y1:"19",y2:"21"}],["line",{x1:"17",x2:"17",y1:"19",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k4=["svg",h,[["path",{d:"M15 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"}],["path",{d:"m11 7-3 5h4l-3 5"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A4=["svg",h,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"6",x2:"6",y1:"11",y2:"13"}],["line",{x1:"10",x2:"10",y1:"11",y2:"13"}],["line",{x1:"14",x2:"14",y1:"11",y2:"13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C4=["svg",h,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"6",x2:"6",y1:"11",y2:"13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L4=["svg",h,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"6",x2:"6",y1:"11",y2:"13"}],["line",{x1:"10",x2:"10",y1:"11",y2:"13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P4=["svg",h,[["path",{d:"M14 7h2a2 2 0 0 1 2 2v6c0 1-1 2-2 2h-2"}],["path",{d:"M6 7H4a2 2 0 0 0-2 2v6c0 1 1 2 2 2h2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}],["line",{x1:"10",x2:"10",y1:"7",y2:"13"}],["line",{x1:"10",x2:"10",y1:"17",y2:"17.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H4=["svg",h,[["rect",{width:"16",height:"10",x:"2",y:"7",rx:"2",ry:"2"}],["line",{x1:"22",x2:"22",y1:"11",y2:"13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V4=["svg",h,[["path",{d:"M4.5 3h15"}],["path",{d:"M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"}],["path",{d:"M6 14h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T4=["svg",h,[["path",{d:"M9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22a13.96 13.96 0 0 0 9.9-4.1"}],["path",{d:"M10.75 5.093A6 6 0 0 1 22 8c0 2.411-.61 4.68-1.683 6.66"}],["path",{d:"M5.341 10.62a4 4 0 0 0 6.487 1.208M10.62 5.341a4.015 4.015 0 0 1 2.039 2.04"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E4=["svg",h,[["path",{d:"M10.165 6.598C9.954 7.478 9.64 8.36 9 9c-.64.64-1.521.954-2.402 1.165A6 6 0 0 0 8 22c7.732 0 14-6.268 14-14a6 6 0 0 0-11.835-1.402Z"}],["path",{d:"M5.341 10.62a4 4 0 1 0 5.279-5.28"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D4=["svg",h,[["path",{d:"M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"}],["path",{d:"M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"}],["path",{d:"M12 4v6"}],["path",{d:"M2 18h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O4=["svg",h,[["path",{d:"M3 20v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"}],["path",{d:"M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"}],["path",{d:"M3 18h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R4=["svg",h,[["path",{d:"M2 4v16"}],["path",{d:"M2 8h18a2 2 0 0 1 2 2v10"}],["path",{d:"M2 17h20"}],["path",{d:"M6 8v9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I4=["svg",h,[["circle",{cx:"12.5",cy:"8.5",r:"2.5"}],["path",{d:"M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"}],["path",{d:"m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B4=["svg",h,[["path",{d:"M13 13v5"}],["path",{d:"M17 11.47V8"}],["path",{d:"M17 11h1a3 3 0 0 1 2.745 4.211"}],["path",{d:"m2 2 20 20"}],["path",{d:"M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3"}],["path",{d:"M7.536 7.535C6.766 7.649 6.154 8 5.5 8a2.5 2.5 0 0 1-1.768-4.268"}],["path",{d:"M8.727 3.204C9.306 2.767 9.885 2 11 2c1.56 0 2 1.5 3 1.5s1.72-.5 2.5-.5a1 1 0 1 1 0 5c-.78 0-1.5-.5-2.5-.5a3.149 3.149 0 0 0-.842.12"}],["path",{d:"M9 14.6V18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F4=["svg",h,[["path",{d:"M17 11h1a3 3 0 0 1 0 6h-1"}],["path",{d:"M9 12v6"}],["path",{d:"M13 12v6"}],["path",{d:"M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"}],["path",{d:"M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z4=["svg",h,[["path",{d:"M19.4 14.9C20.2 16.4 21 17 21 17H3s3-2 3-9c0-3.3 2.7-6 6-6 .7 0 1.3.1 1.9.3"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["circle",{cx:"18",cy:"8",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N4=["svg",h,[["path",{d:"M18.8 4A6.3 8.7 0 0 1 20 9"}],["path",{d:"M9 9h.01"}],["circle",{cx:"9",cy:"9",r:"7"}],["rect",{width:"10",height:"6",x:"4",y:"16",rx:"2"}],["path",{d:"M14 19c3 0 4.6-1.6 4.6-1.6"}],["circle",{cx:"20",cy:"16",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z4=["svg",h,[["path",{d:"M18.4 12c.8 3.8 2.6 5 2.6 5H3s3-2 3-9c0-3.3 2.7-6 6-6 1.8 0 3.4.8 4.5 2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"M15 8h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W4=["svg",h,[["path",{d:"M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"}],["path",{d:"M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U4=["svg",h,[["path",{d:"M19.3 14.8C20.1 16.4 21 17 21 17H3s3-2 3-9c0-3.3 2.7-6 6-6 1 0 1.9.2 2.8.7"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"M15 8h6"}],["path",{d:"M18 5v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q4=["svg",h,[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}],["path",{d:"M4 2C2.8 3.7 2 5.7 2 8"}],["path",{d:"M22 8c0-2.3-.8-4.3-2-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $4=["svg",h,[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i2=["svg",h,[["rect",{width:"13",height:"7",x:"3",y:"3",rx:"1"}],["path",{d:"m22 15-3-3 3-3"}],["rect",{width:"13",height:"7",x:"3",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s2=["svg",h,[["rect",{width:"13",height:"7",x:"8",y:"3",rx:"1"}],["path",{d:"m2 9 3 3-3 3"}],["rect",{width:"13",height:"7",x:"8",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j4=["svg",h,[["rect",{width:"7",height:"13",x:"3",y:"3",rx:"1"}],["path",{d:"m9 22 3-3 3 3"}],["rect",{width:"7",height:"13",x:"14",y:"3",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y4=["svg",h,[["rect",{width:"7",height:"13",x:"3",y:"8",rx:"1"}],["path",{d:"m15 2-3 3-3-3"}],["rect",{width:"7",height:"13",x:"14",y:"8",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X4=["svg",h,[["circle",{cx:"18.5",cy:"17.5",r:"3.5"}],["circle",{cx:"5.5",cy:"17.5",r:"3.5"}],["circle",{cx:"15",cy:"5",r:"1"}],["path",{d:"M12 17.5V14l-3-3 4-3 2 3h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G4=["svg",h,[["rect",{x:"14",y:"14",width:"4",height:"6",rx:"2"}],["rect",{x:"6",y:"4",width:"4",height:"6",rx:"2"}],["path",{d:"M6 20h4"}],["path",{d:"M14 10h4"}],["path",{d:"M6 14h2v6"}],["path",{d:"M14 4h2v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K4=["svg",h,[["circle",{cx:"12",cy:"11.9",r:"2"}],["path",{d:"M6.7 3.4c-.9 2.5 0 5.2 2.2 6.7C6.5 9 3.7 9.6 2 11.6"}],["path",{d:"m8.9 10.1 1.4.8"}],["path",{d:"M17.3 3.4c.9 2.5 0 5.2-2.2 6.7 2.4-1.2 5.2-.6 6.9 1.5"}],["path",{d:"m15.1 10.1-1.4.8"}],["path",{d:"M16.7 20.8c-2.6-.4-4.6-2.6-4.7-5.3-.2 2.6-2.1 4.8-4.7 5.2"}],["path",{d:"M12 13.9v1.6"}],["path",{d:"M13.5 5.4c-1-.2-2-.2-3 0"}],["path",{d:"M17 16.4c.7-.7 1.2-1.6 1.5-2.5"}],["path",{d:"M5.5 13.9c.3.9.8 1.8 1.5 2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J4=["svg",h,[["path",{d:"M16 7h.01"}],["path",{d:"M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"}],["path",{d:"m20 7 2 .5-2 .5"}],["path",{d:"M10 18v3"}],["path",{d:"M14 17.75V21"}],["path",{d:"M7 18a6 6 0 0 0 3.84-10.61"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q4=["svg",h,[["path",{d:"M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t5=["svg",h,[["circle",{cx:"9",cy:"9",r:"7"}],["circle",{cx:"15",cy:"15",r:"7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e5=["svg",h,[["path",{d:"M3 3h18"}],["path",{d:"M20 7H8"}],["path",{d:"M20 11H8"}],["path",{d:"M10 19h10"}],["path",{d:"M8 15h12"}],["path",{d:"M4 3v14"}],["circle",{cx:"4",cy:"19",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a5=["svg",h,[["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1"}],["path",{d:"M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i5=["svg",h,[["path",{d:"m7 7 10 10-5 5V2l5 5L7 17"}],["line",{x1:"18",x2:"21",y1:"12",y2:"12"}],["line",{x1:"3",x2:"6",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s5=["svg",h,[["path",{d:"m17 17-5 5V12l-5 5"}],["path",{d:"m2 2 20 20"}],["path",{d:"M14.5 9.5 17 7l-5-5v4.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n5=["svg",h,[["path",{d:"m7 7 10 10-5 5V2l5 5L7 17"}],["path",{d:"M20.83 14.83a4 4 0 0 0 0-5.66"}],["path",{d:"M18 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o5=["svg",h,[["path",{d:"m7 7 10 10-5 5V2l5 5L7 17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r5=["svg",h,[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h5=["svg",h,[["path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}],["circle",{cx:"12",cy:"12",r:"4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c5=["svg",h,[["circle",{cx:"11",cy:"13",r:"9"}],["path",{d:"M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95"}],["path",{d:"m22 2-1.5 1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d5=["svg",h,[["path",{d:"M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"m8 13 4-7 4 7"}],["path",{d:"M9.1 11h5.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M8 8v3"}],["path",{d:"M12 6v7"}],["path",{d:"M16 8v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"m9 9.5 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g5=["svg",h,[["path",{d:"M2 16V4a2 2 0 0 1 2-2h11"}],["path",{d:"M5 14H4a2 2 0 1 0 0 4h1"}],["path",{d:"M22 18H11a2 2 0 1 0 0 4h11V6H11a2 2 0 0 0-2 2v12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n2=["svg",h,[["path",{d:"M20 22h-2"}],["path",{d:"M20 15v2h-2"}],["path",{d:"M4 19.5V15"}],["path",{d:"M20 8v3"}],["path",{d:"M18 2h2v2"}],["path",{d:"M4 11V9"}],["path",{d:"M12 2h2"}],["path",{d:"M12 22h2"}],["path",{d:"M12 17h2"}],["path",{d:"M8 22H6.5a2.5 2.5 0 0 1 0-5H8"}],["path",{d:"M4 5v-.5A2.5 2.5 0 0 1 6.5 2H8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M12 13V7"}],["path",{d:"m9 10 3 3 3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"9",cy:"12",r:"1"}],["path",{d:"M8 12v-2a4 4 0 0 1 8 0v2"}],["circle",{cx:"15",cy:"12",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M16 8.2C16 7 15 6 13.8 6c-.8 0-1.4.3-1.8.9-.4-.6-1-.9-1.8-.9C9 6 8 7 8 8.2c0 .6.3 1.2.7 1.6h0C10 11.1 12 13 12 13s2-1.9 3.3-3.1h0c.4-.4.7-1 .7-1.7z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"10",cy:"8",r:"2"}],["path",{d:"m20 13.7-2.1-2.1c-.8-.8-2-.8-2.8 0L9.7 17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H14"}],["path",{d:"M20 8v14H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"14",cy:"8",r:"2"}],["path",{d:"m20 2-4.5 4.5"}],["path",{d:"m19 3 1 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H10"}],["path",{d:"M20 15v7H6.5a2.5 2.5 0 0 1 0-5H20"}],["rect",{width:"8",height:"5",x:"12",y:"6",rx:"1"}],["path",{d:"M18 6V4a2 2 0 1 0-4 0v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["polyline",{points:"10 2 10 10 13 7 16 10 16 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M9 10h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w5=["svg",h,[["path",{d:"M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z"}],["path",{d:"m16 12 2 2 4-4"}],["path",{d:"M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S5=["svg",h,[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"}],["path",{d:"M6 8h2"}],["path",{d:"M6 12h2"}],["path",{d:"M16 8h2"}],["path",{d:"M16 12h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k5=["svg",h,[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M9 10h6"}],["path",{d:"M12 7v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M8 7h6"}],["path",{d:"M8 11h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M16 8V6H8v2"}],["path",{d:"M12 6v7"}],["path",{d:"M10 13h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2"}],["path",{d:"M18 2h2v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M12 13V7"}],["path",{d:"m9 10 3-3 3 3"}],["path",{d:"m9 5 3-3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"M12 13V7"}],["path",{d:"m9 10 3-3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["circle",{cx:"12",cy:"8",r:"2"}],["path",{d:"M15 13a3 3 0 1 0-6 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}],["path",{d:"m14.5 7-5 5"}],["path",{d:"m9.5 7 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E5=["svg",h,[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D5=["svg",h,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"}],["path",{d:"m9 10 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O5=["svg",h,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"}],["line",{x1:"15",x2:"9",y1:"10",y2:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R5=["svg",h,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"}],["line",{x1:"12",x2:"12",y1:"7",y2:"13"}],["line",{x1:"15",x2:"9",y1:"10",y2:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I5=["svg",h,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"}],["path",{d:"m14.5 7.5-5 5"}],["path",{d:"m9.5 7.5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B5=["svg",h,[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F5=["svg",h,[["path",{d:"M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"}],["path",{d:"M8 8v1"}],["path",{d:"M12 8v1"}],["path",{d:"M16 8v1"}],["rect",{width:"20",height:"12",x:"2",y:"9",rx:"2"}],["circle",{cx:"8",cy:"15",r:"2"}],["circle",{cx:"16",cy:"15",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z5=["svg",h,[["path",{d:"M12 6V2H8"}],["path",{d:"m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z"}],["path",{d:"M2 12h2"}],["path",{d:"M9 11v2"}],["path",{d:"M15 11v2"}],["path",{d:"M20 12h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N5=["svg",h,[["path",{d:"M13.67 8H18a2 2 0 0 1 2 2v4.33"}],["path",{d:"M2 14h2"}],["path",{d:"M20 14h2"}],["path",{d:"M22 22 2 2"}],["path",{d:"M8 8H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 1.414-.586"}],["path",{d:"M9 13v2"}],["path",{d:"M9.67 4H12v2.33"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z5=["svg",h,[["path",{d:"M12 8V4H8"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2"}],["path",{d:"M2 14h2"}],["path",{d:"M20 14h2"}],["path",{d:"M15 13v2"}],["path",{d:"M9 13v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W5=["svg",h,[["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"M21 19a2 2 0 0 1-2 2"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M9 3h1"}],["path",{d:"M9 21h1"}],["path",{d:"M14 3h1"}],["path",{d:"M14 21h1"}],["path",{d:"M3 9v1"}],["path",{d:"M21 9v1"}],["path",{d:"M3 14v1"}],["path",{d:"M21 14v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U5=["svg",h,[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"}],["path",{d:"m3.3 7 8.7 5 8.7-5"}],["path",{d:"M12 22V12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q5=["svg",h,[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"}],["path",{d:"m7 16.5-4.74-2.85"}],["path",{d:"m7 16.5 5-3"}],["path",{d:"M7 16.5v5.17"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"}],["path",{d:"m17 16.5-5-3"}],["path",{d:"m17 16.5 4.74-2.85"}],["path",{d:"M17 16.5v5.17"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"}],["path",{d:"M12 8 7.26 5.15"}],["path",{d:"m12 8 4.74-2.85"}],["path",{d:"M12 13.5V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o2=["svg",h,[["path",{d:"M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"}],["path",{d:"M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $5=["svg",h,[["path",{d:"M16 3h3v18h-3"}],["path",{d:"M8 21H5V3h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j5=["svg",h,[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516"}],["path",{d:"M12 13h4"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1"}],["path",{d:"M12 8h8"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2"}],["circle",{cx:"16",cy:"13",r:".5"}],["circle",{cx:"18",cy:"3",r:".5"}],["circle",{cx:"20",cy:"21",r:".5"}],["circle",{cx:"20",cy:"8",r:".5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y5=["svg",h,[["path",{d:"M12 5a3 3 0 1 0-5.997.142 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588 4 4 0 0 0 7.636 2.106 3.2 3.2 0 0 0 .164-.546c.028-.13.306-.13.335 0a3.2 3.2 0 0 0 .163.546 4 4 0 0 0 7.636-2.106 4 4 0 0 0 .556-6.588 4 4 0 0 0-2.526-5.77A3 3 0 1 0 12 5"}],["path",{d:"M17.599 6.5a3 3 0 0 0 .399-1.375"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396"}],["path",{d:"M19.938 10.5a4 4 0 0 1 .585.396"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516"}],["path",{d:"M19.967 17.484A4 4 0 0 1 18 18"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"m15.7 10.4-.9.4"}],["path",{d:"m9.2 13.2-.9.4"}],["path",{d:"m13.6 15.7-.4-.9"}],["path",{d:"m10.8 9.2-.4-.9"}],["path",{d:"m15.7 13.5-.9-.4"}],["path",{d:"m9.2 10.9-.9-.4"}],["path",{d:"m10.5 15.7.4-.9"}],["path",{d:"m13.1 9.2.4-.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X5=["svg",h,[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"}],["path",{d:"M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"}],["path",{d:"M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"}],["path",{d:"M17.599 6.5a3 3 0 0 0 .399-1.375"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396"}],["path",{d:"M19.938 10.5a4 4 0 0 1 .585.396"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516"}],["path",{d:"M19.967 17.484A4 4 0 0 1 18 18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G5=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 9v6"}],["path",{d:"M16 15v6"}],["path",{d:"M16 3v6"}],["path",{d:"M3 15h18"}],["path",{d:"M3 9h18"}],["path",{d:"M8 15v6"}],["path",{d:"M8 3v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K5=["svg",h,[["path",{d:"M12 12h.01"}],["path",{d:"M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"}],["path",{d:"M22 13a18.15 18.15 0 0 1-20 0"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J5=["svg",h,[["path",{d:"M12 11v4"}],["path",{d:"M14 13h-4"}],["path",{d:"M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"}],["path",{d:"M18 6v14"}],["path",{d:"M6 6v14"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q5=["svg",h,[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tg=["svg",h,[["rect",{x:"8",y:"8",width:"8",height:"8",rx:"2"}],["path",{d:"M4 10a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"}],["path",{d:"M14 20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eg=["svg",h,[["path",{d:"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"}],["path",{d:"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ag=["svg",h,[["path",{d:"M15 7.13V6a3 3 0 0 0-5.14-2.1L8 2"}],["path",{d:"M14.12 3.88 16 2"}],["path",{d:"M22 13h-4v-2a4 4 0 0 0-4-4h-1.3"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4"}],["path",{d:"m2 2 20 20"}],["path",{d:"M7.7 7.7A4 4 0 0 0 6 11v3a6 6 0 0 0 11.13 3.13"}],["path",{d:"M12 20v-8"}],["path",{d:"M6 13H2"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ig=["svg",h,[["path",{d:"M12.765 21.522a.5.5 0 0 1-.765-.424v-8.196a.5.5 0 0 1 .765-.424l5.878 3.674a1 1 0 0 1 0 1.696z"}],["path",{d:"M14.12 3.88 16 2"}],["path",{d:"M18 11a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v3a6.1 6.1 0 0 0 2 4.5"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4"}],["path",{d:"M6 13H2"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5"}],["path",{d:"m8 2 1.88 1.88"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sg=["svg",h,[["path",{d:"m8 2 1.88 1.88"}],["path",{d:"M14.12 3.88 16 2"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"}],["path",{d:"M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"}],["path",{d:"M12 20v-9"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5"}],["path",{d:"M6 13H2"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4"}],["path",{d:"M22 13h-4"}],["path",{d:"M17.2 17c2.1.1 3.8 1.9 3.8 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ng=["svg",h,[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"}],["path",{d:"M10 6h4"}],["path",{d:"M10 10h4"}],["path",{d:"M10 14h4"}],["path",{d:"M10 18h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const og=["svg",h,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2"}],["path",{d:"M9 22v-4h6v4"}],["path",{d:"M8 6h.01"}],["path",{d:"M16 6h.01"}],["path",{d:"M12 6h.01"}],["path",{d:"M12 10h.01"}],["path",{d:"M12 14h.01"}],["path",{d:"M16 10h.01"}],["path",{d:"M16 14h.01"}],["path",{d:"M8 10h.01"}],["path",{d:"M8 14h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rg=["svg",h,[["path",{d:"M4 6 2 7"}],["path",{d:"M10 6h4"}],["path",{d:"m22 7-2-1"}],["rect",{width:"16",height:"16",x:"4",y:"3",rx:"2"}],["path",{d:"M4 11h16"}],["path",{d:"M8 15h.01"}],["path",{d:"M16 15h.01"}],["path",{d:"M6 19v2"}],["path",{d:"M18 21v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hg=["svg",h,[["path",{d:"M8 6v6"}],["path",{d:"M15 6v6"}],["path",{d:"M2 12h19.6"}],["path",{d:"M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"}],["circle",{cx:"7",cy:"18",r:"2"}],["path",{d:"M9 18h5"}],["circle",{cx:"16",cy:"18",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cg=["svg",h,[["path",{d:"M10 3h.01"}],["path",{d:"M14 2h.01"}],["path",{d:"m2 9 20-5"}],["path",{d:"M12 12V6.5"}],["rect",{width:"16",height:"10",x:"4",y:"12",rx:"3"}],["path",{d:"M9 12v5"}],["path",{d:"M15 12v5"}],["path",{d:"M4 17h16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dg=["svg",h,[["path",{d:"M17 21v-2a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1"}],["path",{d:"M19 15V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V9"}],["path",{d:"M21 21v-2h-4"}],["path",{d:"M3 5h4V3"}],["path",{d:"M7 5a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1V3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lg=["svg",h,[["circle",{cx:"9",cy:"7",r:"2"}],["path",{d:"M7.2 7.9 3 11v9c0 .6.4 1 1 1h16c.6 0 1-.4 1-1v-9c0-2-3-6-7-8l-3.6 2.6"}],["path",{d:"M16 13H3"}],["path",{d:"M16 17H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pg=["svg",h,[["path",{d:"M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"}],["path",{d:"M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"}],["path",{d:"M2 21h20"}],["path",{d:"M7 8v3"}],["path",{d:"M12 8v3"}],["path",{d:"M17 8v3"}],["path",{d:"M7 4h0.01"}],["path",{d:"M12 4h0.01"}],["path",{d:"M17 4h0.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ug=["svg",h,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18"}],["path",{d:"M16 10h.01"}],["path",{d:"M12 10h.01"}],["path",{d:"M8 10h.01"}],["path",{d:"M12 14h.01"}],["path",{d:"M8 14h.01"}],["path",{d:"M12 18h.01"}],["path",{d:"M8 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"m16 20 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"m9 16 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mg=["svg",h,[["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"}],["path",{d:"M16 2v4"}],["path",{d:"M8 2v4"}],["path",{d:"M3 10h5"}],["path",{d:"M17.5 17.5 16 16.3V14"}],["circle",{cx:"16",cy:"16",r:"6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"M8 14h.01"}],["path",{d:"M12 14h.01"}],["path",{d:"M16 14h.01"}],["path",{d:"M8 18h.01"}],["path",{d:"M12 18h.01"}],["path",{d:"M16 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 17V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11Z"}],["path",{d:"M3 10h18"}],["path",{d:"M15 22v-4a2 2 0 0 1 2-2h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yg=["svg",h,[["path",{d:"M3 10h18V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"}],["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21.29 14.7a2.43 2.43 0 0 0-2.65-.52c-.3.12-.57.3-.8.53l-.34.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L17.5 22l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"M10 16h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _g=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"M16 19h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bg=["svg",h,[["path",{d:"M4.2 4.2A2 2 0 0 0 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.82-1.18"}],["path",{d:"M21 15.5V6a2 2 0 0 0-2-2H9.5"}],["path",{d:"M16 2v4"}],["path",{d:"M3 10h7"}],["path",{d:"M21 10h-5.5"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"M10 16h4"}],["path",{d:"M12 14v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"M16 19h6"}],["path",{d:"M19 16v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kg=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M16 2v4"}],["path",{d:"M3 10h18"}],["path",{d:"M8 2v4"}],["path",{d:"M17 14h-6"}],["path",{d:"M13 18H7"}],["path",{d:"M7 14h.01"}],["path",{d:"M17 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ag=["svg",h,[["path",{d:"M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"}],["path",{d:"M16 2v4"}],["path",{d:"M8 2v4"}],["path",{d:"M3 10h18"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m22 22-1.5-1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"}],["path",{d:"M3 10h18"}],["path",{d:"m17 22 5-5"}],["path",{d:"m17 17 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}],["path",{d:"m14 14-4 4"}],["path",{d:"m10 14 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pg=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["path",{d:"M3 10h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hg=["svg",h,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16"}],["path",{d:"M9.5 4h5L17 7h3a2 2 0 0 1 2 2v7.5"}],["path",{d:"M14.121 15.121A3 3 0 1 1 9.88 10.88"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vg=["svg",h,[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"}],["circle",{cx:"12",cy:"13",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tg=["svg",h,[["path",{d:"M9 5v4"}],["rect",{width:"4",height:"6",x:"7",y:"9",rx:"1"}],["path",{d:"M9 15v2"}],["path",{d:"M17 3v2"}],["rect",{width:"4",height:"8",x:"15",y:"5",rx:"1"}],["path",{d:"M17 13v3"}],["path",{d:"M3 3v18h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eg=["svg",h,[["path",{d:"M5.7 21a2 2 0 0 1-3.5-2l8.6-14a6 6 0 0 1 10.4 6 2 2 0 1 1-3.464-2 2 2 0 1 0-3.464-2Z"}],["path",{d:"M17.75 7 15 2.1"}],["path",{d:"M10.9 4.8 13 9"}],["path",{d:"m7.9 9.7 2 4.4"}],["path",{d:"M4.9 14.7 7 18.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dg=["svg",h,[["path",{d:"m8.5 8.5-1 1a4.95 4.95 0 0 0 7 7l1-1"}],["path",{d:"M11.843 6.187A4.947 4.947 0 0 1 16.5 7.5a4.947 4.947 0 0 1 1.313 4.657"}],["path",{d:"M14 16.5V14"}],["path",{d:"M14 6.5v1.843"}],["path",{d:"M10 10v7.5"}],["path",{d:"m16 7 1-5 1.367.683A3 3 0 0 0 19.708 3H21v1.292a3 3 0 0 0 .317 1.341L22 7l-5 1"}],["path",{d:"m8 17-1 5-1.367-.683A3 3 0 0 0 4.292 21H3v-1.292a3 3 0 0 0-.317-1.341L2 17l5-1"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Og=["svg",h,[["path",{d:"m9.5 7.5-2 2a4.95 4.95 0 1 0 7 7l2-2a4.95 4.95 0 1 0-7-7Z"}],["path",{d:"M14 6.5v10"}],["path",{d:"M10 7.5v10"}],["path",{d:"m16 7 1-5 1.37.68A3 3 0 0 0 19.7 3H21v1.3c0 .46.1.92.32 1.33L22 7l-5 1"}],["path",{d:"m8 17-1 5-1.37-.68A3 3 0 0 0 4.3 21H3v-1.3a3 3 0 0 0-.32-1.33L2 17l5-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rg=["svg",h,[["path",{d:"M12 22v-4"}],["path",{d:"M7 12c-1.5 0-4.5 1.5-5 3 3.5 1.5 6 1 6 1-1.5 1.5-2 3.5-2 5 2.5 0 4.5-1.5 6-3 1.5 1.5 3.5 3 6 3 0-1.5-.5-3.5-2-5 0 0 2.5.5 6-1-.5-1.5-3.5-3-5-3 1.5-1 4-4 4-6-2.5 0-5.5 1.5-7 3 0-2.5-.5-5-2-7-1.5 2-2 4.5-2 7-1.5-1.5-4.5-3-7-3 0 2 2.5 5 4 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ig=["svg",h,[["path",{d:"M10.5 5H19a2 2 0 0 1 2 2v8.5"}],["path",{d:"M17 11h-.5"}],["path",{d:"M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"}],["path",{d:"m2 2 20 20"}],["path",{d:"M7 11h4"}],["path",{d:"M7 15h2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r2=["svg",h,[["rect",{width:"18",height:"14",x:"3",y:"5",rx:"2",ry:"2"}],["path",{d:"M7 15h4M15 15h2M7 11h2M13 11h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bg=["svg",h,[["path",{d:"m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"}],["path",{d:"M7 14h.01"}],["path",{d:"M17 14h.01"}],["rect",{width:"18",height:"8",x:"3",y:"10",rx:"2"}],["path",{d:"M5 18v2"}],["path",{d:"M19 18v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fg=["svg",h,[["path",{d:"M10 2h4"}],["path",{d:"m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"}],["path",{d:"M7 14h.01"}],["path",{d:"M17 14h.01"}],["rect",{width:"18",height:"8",x:"3",y:"10",rx:"2"}],["path",{d:"M5 18v2"}],["path",{d:"M19 18v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zg=["svg",h,[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"}],["circle",{cx:"7",cy:"17",r:"2"}],["path",{d:"M9 17h6"}],["circle",{cx:"17",cy:"17",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ng=["svg",h,[["rect",{width:"4",height:"4",x:"2",y:"9"}],["rect",{width:"4",height:"10",x:"10",y:"9"}],["path",{d:"M18 19V9a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v8a2 2 0 0 0 2 2h2"}],["circle",{cx:"8",cy:"19",r:"2"}],["path",{d:"M10 19h12v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zg=["svg",h,[["path",{d:"M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"}],["path",{d:"M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"}],["path",{d:"M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wg=["svg",h,[["circle",{cx:"7",cy:"12",r:"3"}],["path",{d:"M10 9v6"}],["circle",{cx:"17",cy:"12",r:"3"}],["path",{d:"M14 7v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ug=["svg",h,[["path",{d:"m3 15 4-8 4 8"}],["path",{d:"M4 13h6"}],["circle",{cx:"18",cy:"12",r:"3"}],["path",{d:"M21 9v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qg=["svg",h,[["path",{d:"m3 15 4-8 4 8"}],["path",{d:"M4 13h6"}],["path",{d:"M15 11h4.5a2 2 0 0 1 0 4H15V7h4a2 2 0 0 1 0 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $g=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["circle",{cx:"8",cy:"10",r:"2"}],["path",{d:"M8 12h8"}],["circle",{cx:"16",cy:"10",r:"2"}],["path",{d:"m6 20 .7-2.9A1.4 1.4 0 0 1 8.1 16h7.8a1.4 1.4 0 0 1 1.4 1l.7 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jg=["svg",h,[["path",{d:"M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"}],["path",{d:"M2 12a9 9 0 0 1 8 8"}],["path",{d:"M2 16a5 5 0 0 1 4 4"}],["line",{x1:"2",x2:"2.01",y1:"20",y2:"20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yg=["svg",h,[["path",{d:"M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z"}],["path",{d:"M18 11V4H6v7"}],["path",{d:"M15 22v-4a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3v4"}],["path",{d:"M22 11V9"}],["path",{d:"M2 11V9"}],["path",{d:"M6 4V2"}],["path",{d:"M18 4V2"}],["path",{d:"M10 4V2"}],["path",{d:"M14 4V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xg=["svg",h,[["path",{d:"M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"}],["path",{d:"M8 14v.5"}],["path",{d:"M16 14v.5"}],["path",{d:"M11.25 16.25h1.5L12 17l-.75-.75Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gg=["svg",h,[["path",{d:"M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"}],["path",{d:"M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"}],["path",{d:"M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"}],["path",{d:"M2 21v-4"}],["path",{d:"M7 9h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kg=["svg",h,[["path",{d:"M18 6 7 17l-5-5"}],["path",{d:"m22 10-7.5 7.5L13 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jg=["svg",h,[["path",{d:"M20 6 9 17l-5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qg=["svg",h,[["path",{d:"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"}],["path",{d:"M6 17h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tf=["svg",h,[["path",{d:"M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z"}],["path",{d:"M12 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3-2.5-2-5 .24-5 3Z"}],["path",{d:"M7 14c3.22-2.91 4.29-8.75 5-12 1.66 2.38 4.94 9 5 12"}],["path",{d:"M22 9c-4.29 0-7.14-2.33-10-7 5.71 0 10 4.67 10 7Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ef=["svg",h,[["path",{d:"m6 9 6 6 6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const af=["svg",h,[["path",{d:"m17 18-6-6 6-6"}],["path",{d:"M7 6v12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sf=["svg",h,[["path",{d:"m7 18 6-6-6-6"}],["path",{d:"M17 6v12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nf=["svg",h,[["path",{d:"m15 18-6-6 6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const of=["svg",h,[["path",{d:"m9 18 6-6-6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rf=["svg",h,[["path",{d:"m18 15-6-6-6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hf=["svg",h,[["path",{d:"m7 20 5-5 5 5"}],["path",{d:"m7 4 5 5 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cf=["svg",h,[["path",{d:"m7 6 5 5 5-5"}],["path",{d:"m7 13 5 5 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const df=["svg",h,[["path",{d:"m9 7-5 5 5 5"}],["path",{d:"m15 7 5 5-5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lf=["svg",h,[["path",{d:"m11 17-5-5 5-5"}],["path",{d:"m18 17-5-5 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pf=["svg",h,[["path",{d:"m20 17-5-5 5-5"}],["path",{d:"m4 17 5-5-5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uf=["svg",h,[["path",{d:"m6 17 5-5-5-5"}],["path",{d:"m13 17 5-5-5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gf=["svg",h,[["path",{d:"m7 15 5 5 5-5"}],["path",{d:"m7 9 5-5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ff=["svg",h,[["path",{d:"m17 11-5-5-5 5"}],["path",{d:"m17 18-5-5-5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"4"}],["line",{x1:"21.17",x2:"12",y1:"8",y2:"8"}],["line",{x1:"3.95",x2:"8.54",y1:"6.06",y2:"14"}],["line",{x1:"10.88",x2:"15.46",y1:"21.94",y2:"14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vf=["svg",h,[["path",{d:"m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2"}],["path",{d:"M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"}],["path",{d:"M18 22V5l-6-3-6 3v17"}],["path",{d:"M12 7v5"}],["path",{d:"M10 9h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mf=["svg",h,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M12 12H2v4h14"}],["path",{d:"M22 12v4"}],["path",{d:"M18 12h-.5"}],["path",{d:"M7 12v4"}],["path",{d:"M18 8c0-2.5-2-2.5-2-5"}],["path",{d:"M22 8c0-2.5-2-2.5-2-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yf=["svg",h,[["path",{d:"M18 12H2v4h16"}],["path",{d:"M22 12v4"}],["path",{d:"M7 12v4"}],["path",{d:"M18 8c0-2.5-2-2.5-2-5"}],["path",{d:"M22 8c0-2.5-2-2.5-2-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 8v8"}],["path",{d:"m8 12 4 4 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 12H8"}],["path",{d:"m12 8-4 4 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l2=["svg",h,[["path",{d:"M2 12a10 10 0 1 1 10 10"}],["path",{d:"m2 22 10-10"}],["path",{d:"M8 22H2v-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p2=["svg",h,[["path",{d:"M12 22a10 10 0 1 1 10-10"}],["path",{d:"M22 22 12 12"}],["path",{d:"M22 16v6h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u2=["svg",h,[["path",{d:"M2 8V2h6"}],["path",{d:"m2 2 10 10"}],["path",{d:"M12 2A10 10 0 1 1 2 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g2=["svg",h,[["path",{d:"M22 12A10 10 0 1 1 12 2"}],["path",{d:"M22 2 12 12"}],["path",{d:"M16 2h6v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 12h8"}],["path",{d:"m12 16 4-4-4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m16 12-4-4-4 4"}],["path",{d:"M12 16V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v2=["svg",h,[["path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}],["path",{d:"m9 11 3 3L22 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m9 12 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m16 10-4 4-4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m14 16-4-4 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m10 8 4 4-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m8 14 4-4 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xf=["svg",h,[["path",{d:"M10.1 2.182a10 10 0 0 1 3.8 0"}],["path",{d:"M13.9 21.818a10 10 0 0 1-3.8 0"}],["path",{d:"M17.609 3.721a10 10 0 0 1 2.69 2.7"}],["path",{d:"M2.182 13.9a10 10 0 0 1 0-3.8"}],["path",{d:"M20.279 17.609a10 10 0 0 1-2.7 2.69"}],["path",{d:"M21.818 10.1a10 10 0 0 1 0 3.8"}],["path",{d:"M3.721 6.391a10 10 0 0 1 2.7-2.69"}],["path",{d:"M6.391 20.279a10 10 0 0 1-2.69-2.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w2=["svg",h,[["line",{x1:"8",x2:"16",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"16",y2:"16"}],["line",{x1:"12",x2:"12",y1:"8",y2:"8"}],["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _f=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{d:"M12 18V6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bf=["svg",h,[["path",{d:"M10.1 2.18a9.93 9.93 0 0 1 3.8 0"}],["path",{d:"M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7"}],["path",{d:"M21.82 10.1a9.93 9.93 0 0 1 0 3.8"}],["path",{d:"M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69"}],["path",{d:"M13.9 21.82a9.94 9.94 0 0 1-3.8 0"}],["path",{d:"M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7"}],["path",{d:"M2.18 13.9a9.93 9.93 0 0 1 0-3.8"}],["path",{d:"M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69"}],["circle",{cx:"12",cy:"12",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M17 12h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M7 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kf=["svg",h,[["path",{d:"M7 10h10"}],["path",{d:"M7 14h10"}],["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Af=["svg",h,[["path",{d:"M12 2a10 10 0 0 1 7.38 16.75"}],["path",{d:"M12 8v8"}],["path",{d:"M16 12H8"}],["path",{d:"M2.5 8.875a10 10 0 0 0-.5 3"}],["path",{d:"M2.83 16a10 10 0 0 0 2.43 3.4"}],["path",{d:"M4.636 5.235a10 10 0 0 1 .891-.857"}],["path",{d:"M8.644 21.42a10 10 0 0 0 7.631-.38"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S2=["svg",h,[["path",{d:"M15.6 2.7a10 10 0 1 0 5.7 5.7"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M13.4 10.6 19 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 12h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cf=["svg",h,[["path",{d:"m2 2 20 20"}],["path",{d:"M8.35 2.69A10 10 0 0 1 21.3 15.65"}],["path",{d:"M19.08 19.08A10 10 0 1 1 4.92 4.92"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m5 5 14 14"}],["path",{d:"M13 13a3 3 0 1 0 0-6H9v2"}],["path",{d:"M9 17v-2.34"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9 17V7h4a3 3 0 0 1 0 6H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"10",x2:"10",y1:"15",y2:"9"}],["line",{x1:"14",x2:"14",y1:"15",y2:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m15 9-6 6"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 15h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polygon",{points:"10 8 16 12 10 16 10 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 12V7"}],["path",{d:"M16 9a5 5 0 1 1-8 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M22 2 2 22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lf=["svg",h,[["line",{x1:"9",x2:"15",y1:"15",y2:"9"}],["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["rect",{width:"6",height:"6",x:"9",y:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R2=["svg",h,[["path",{d:"M18 20a6 6 0 0 0-12 0"}],["circle",{cx:"12",cy:"10",r:"4"}],["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B2=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hf=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M11 9h4a2 2 0 0 0 2-2V3"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"M7 21v-4a2 2 0 0 1 2-2h4"}],["circle",{cx:"15",cy:"15",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vf=["svg",h,[["path",{d:"M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z"}],["path",{d:"M19.65 15.66A8 8 0 0 1 8.35 4.34"}],["path",{d:"m14 10-5.5 5.5"}],["path",{d:"M14 17.85V10H6.15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tf=["svg",h,[["path",{d:"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"}],["path",{d:"m6.2 5.3 3.1 3.9"}],["path",{d:"m12.4 3.4 3.1 4"}],["path",{d:"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ef=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"m9 14 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Df=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v4"}],["path",{d:"M21 14H11"}],["path",{d:"m15 10-4 4 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Of=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M12 11h4"}],["path",{d:"M12 16h4"}],["path",{d:"M8 11h.01"}],["path",{d:"M8 16h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rf=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M9 14h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const If=["svg",h,[["path",{d:"M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10"}],["path",{d:"m17 10 4 4-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F2=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1"}],["path",{d:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5"}],["path",{d:"M16 4h2a2 2 0 0 1 1.73 1"}],["path",{d:"M8 18h1"}],["path",{d:"M18.4 9.6a2 2 0 0 1 3 3L17 17l-4 1 1-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z2=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1"}],["path",{d:"M10.4 12.6a2 2 0 0 1 3 3L8 21l-4 1 1-4Z"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5.5"}],["path",{d:"M4 13.5V6a2 2 0 0 1 2-2h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bf=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M9 14h6"}],["path",{d:"M12 17v-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ff=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"M9 12v-1h6v1"}],["path",{d:"M11 17h2"}],["path",{d:"M12 11v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zf=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}],["path",{d:"m15 11-6 6"}],["path",{d:"m9 11 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nf=["svg",h,[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 14.5 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 8 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 9.5 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $f=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16.5 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 14.5 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 12 16.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 9.5 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 8 14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qf=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 7.5 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t3=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e3=["svg",h,[["circle",{cx:"12",cy:"17",r:"3"}],["path",{d:"M4.2 15.1A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2"}],["path",{d:"m15.7 18.4-.9-.3"}],["path",{d:"m9.2 15.9-.9-.3"}],["path",{d:"m10.6 20.7.3-.9"}],["path",{d:"m13.1 14.2.3-.9"}],["path",{d:"m13.6 20.7-.4-1"}],["path",{d:"m10.8 14.3-.4-1"}],["path",{d:"m8.3 18.6 1-.4"}],["path",{d:"m14.7 15.8 1-.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N2=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M12 12v9"}],["path",{d:"m8 17 4 4 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a3=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M8 19v1"}],["path",{d:"M8 14v1"}],["path",{d:"M16 19v1"}],["path",{d:"M16 14v1"}],["path",{d:"M12 21v1"}],["path",{d:"M12 16v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i3=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M16 17H7"}],["path",{d:"M17 21H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s3=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M16 14v2"}],["path",{d:"M8 14v2"}],["path",{d:"M16 20h.01"}],["path",{d:"M8 20h.01"}],["path",{d:"M12 16v2"}],["path",{d:"M12 22h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n3=["svg",h,[["path",{d:"M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"}],["path",{d:"m13 12-3 5h4l-3 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o3=["svg",h,[["path",{d:"M10.083 9A6.002 6.002 0 0 1 16 4a4.243 4.243 0 0 0 6 6c0 2.22-1.206 4.16-3 5.197"}],["path",{d:"M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"}],["path",{d:"M11 20v2"}],["path",{d:"M7 19v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r3=["svg",h,[["path",{d:"M13 16a3 3 0 1 1 0 6H7a5 5 0 1 1 4.9-6Z"}],["path",{d:"M10.1 9A6 6 0 0 1 16 4a4.24 4.24 0 0 0 6 6 6 6 0 0 1-3 5.197"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h3=["svg",h,[["path",{d:"m2 2 20 20"}],["path",{d:"M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"}],["path",{d:"M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c3=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"m9.2 22 3-7"}],["path",{d:"m9 13-3 7"}],["path",{d:"m17 13-3 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d3=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M16 14v6"}],["path",{d:"M8 14v6"}],["path",{d:"M12 16v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l3=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M8 15h.01"}],["path",{d:"M8 19h.01"}],["path",{d:"M12 17h.01"}],["path",{d:"M12 21h.01"}],["path",{d:"M16 15h.01"}],["path",{d:"M16 19h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p3=["svg",h,[["path",{d:"M12 2v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"M20 12h2"}],["path",{d:"m19.07 4.93-1.41 1.41"}],["path",{d:"M15.947 12.65a4 4 0 0 0-5.925-4.128"}],["path",{d:"M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"}],["path",{d:"M11 20v2"}],["path",{d:"M7 19v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u3=["svg",h,[["path",{d:"M12 2v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"M20 12h2"}],["path",{d:"m19.07 4.93-1.41 1.41"}],["path",{d:"M15.947 12.65a4 4 0 0 0-5.925-4.128"}],["path",{d:"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z2=["svg",h,[["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"}],["path",{d:"M12 12v9"}],["path",{d:"m16 16-4-4-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g3=["svg",h,[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f3=["svg",h,[["path",{d:"M17.5 21H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"}],["path",{d:"M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M3=["svg",h,[["path",{d:"M16.17 7.83 2 22"}],["path",{d:"M4.02 12a2.827 2.827 0 1 1 3.81-4.17A2.827 2.827 0 1 1 12 4.02a2.827 2.827 0 1 1 4.17 3.81A2.827 2.827 0 1 1 19.98 12a2.827 2.827 0 1 1-3.81 4.17A2.827 2.827 0 1 1 12 19.98a2.827 2.827 0 1 1-4.17-3.81A1 1 0 1 1 4 12"}],["path",{d:"m7.83 7.83 8.34 8.34"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v3=["svg",h,[["path",{d:"M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z"}],["path",{d:"M12 17.66L12 22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W2=["svg",h,[["path",{d:"m18 16 4-4-4-4"}],["path",{d:"m6 8-4 4 4 4"}],["path",{d:"m14.5 4-5 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m3=["svg",h,[["polyline",{points:"16 18 22 12 16 6"}],["polyline",{points:"8 6 2 12 8 18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y3=["svg",h,[["polygon",{points:"12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"}],["line",{x1:"12",x2:"12",y1:"22",y2:"15.5"}],["polyline",{points:"22 8.5 12 15.5 2 8.5"}],["polyline",{points:"2 15.5 12 8.5 22 15.5"}],["line",{x1:"12",x2:"12",y1:"2",y2:"8.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x3=["svg",h,[["path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}],["polyline",{points:"7.5 4.21 12 6.81 16.5 4.21"}],["polyline",{points:"7.5 19.79 7.5 14.6 3 12"}],["polyline",{points:"21 12 16.5 14.6 16.5 19.79"}],["polyline",{points:"3.27 6.96 12 12.01 20.73 6.96"}],["line",{x1:"12",x2:"12",y1:"22.08",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _3=["svg",h,[["path",{d:"M10 2v2"}],["path",{d:"M14 2v2"}],["path",{d:"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"}],["path",{d:"M6 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b3=["svg",h,[["path",{d:"M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"}],["path",{d:"M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"}],["path",{d:"M12 2v2"}],["path",{d:"M12 22v-2"}],["path",{d:"m17 20.66-1-1.73"}],["path",{d:"M11 10.27 7 3.34"}],["path",{d:"m20.66 17-1.73-1"}],["path",{d:"m3.34 7 1.73 1"}],["path",{d:"M14 12h8"}],["path",{d:"M2 12h2"}],["path",{d:"m20.66 7-1.73 1"}],["path",{d:"m3.34 17 1.73-1"}],["path",{d:"m17 3.34-1 1.73"}],["path",{d:"m11 13.73-4 6.93"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w3=["svg",h,[["circle",{cx:"8",cy:"8",r:"6"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18"}],["path",{d:"M7 6h1v4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U2=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q2=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"M15 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S3=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7.5 3v18"}],["path",{d:"M12 3v18"}],["path",{d:"M16.5 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k3=["svg",h,[["rect",{width:"8",height:"8",x:"2",y:"2",rx:"2"}],["path",{d:"M14 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}],["path",{d:"M20 2c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}],["path",{d:"M10 18H5c-1.7 0-3-1.3-3-3v-1"}],["polyline",{points:"7 21 10 18 7 15"}],["rect",{width:"8",height:"8",x:"14",y:"14",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A3=["svg",h,[["path",{d:"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C3=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["polygon",{points:"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L3=["svg",h,[["path",{d:"M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"}],["path",{d:"m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"}],["path",{d:"M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"}],["path",{d:"m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P3=["svg",h,[["rect",{width:"14",height:"8",x:"5",y:"2",rx:"2"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6 18h2"}],["path",{d:"M12 18h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H3=["svg",h,[["path",{d:"M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z"}],["path",{d:"M20 16a8 8 0 1 0-16 0"}],["path",{d:"M12 4v4"}],["path",{d:"M10 4h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V3=["svg",h,[["path",{d:"m20.9 18.55-8-15.98a1 1 0 0 0-1.8 0l-8 15.98"}],["ellipse",{cx:"12",cy:"19",rx:"9",ry:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T3=["svg",h,[["rect",{x:"2",y:"6",width:"20",height:"8",rx:"1"}],["path",{d:"M17 14v7"}],["path",{d:"M7 14v7"}],["path",{d:"M17 3v3"}],["path",{d:"M7 3v3"}],["path",{d:"M10 14 2.3 6.3"}],["path",{d:"m14 6 7.7 7.7"}],["path",{d:"m8 6 8 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $2=["svg",h,[["path",{d:"M16 18a4 4 0 0 0-8 0"}],["circle",{cx:"12",cy:"11",r:"3"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["line",{x1:"8",x2:"8",y1:"2",y2:"4"}],["line",{x1:"16",x2:"16",y1:"2",y2:"4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E3=["svg",h,[["path",{d:"M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2"}],["circle",{cx:"12",cy:"10",r:"2"}],["line",{x1:"8",x2:"8",y1:"2",y2:"4"}],["line",{x1:"16",x2:"16",y1:"2",y2:"4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D3=["svg",h,[["path",{d:"M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z"}],["path",{d:"M10 21.9V14L2.1 9.1"}],["path",{d:"m10 14 11.9-6.9"}],["path",{d:"M14 19.8v-8.1"}],["path",{d:"M18 17.5V9.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O3=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 18a6 6 0 0 0 0-12v12z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R3=["svg",h,[["path",{d:"M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"}],["path",{d:"M8.5 8.5v.01"}],["path",{d:"M16 15.5v.01"}],["path",{d:"M12 12v.01"}],["path",{d:"M11 17v.01"}],["path",{d:"M7 14v.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I3=["svg",h,[["path",{d:"M2 12h20"}],["path",{d:"M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"}],["path",{d:"m4 8 16-4"}],["path",{d:"m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B3=["svg",h,[["path",{d:"m12 15 2 2 4-4"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F3=["svg",h,[["line",{x1:"12",x2:"18",y1:"15",y2:"15"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z3=["svg",h,[["line",{x1:"15",x2:"15",y1:"12",y2:"18"}],["line",{x1:"12",x2:"18",y1:"15",y2:"15"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N3=["svg",h,[["line",{x1:"12",x2:"18",y1:"18",y2:"12"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z3=["svg",h,[["line",{x1:"12",x2:"18",y1:"12",y2:"18"}],["line",{x1:"12",x2:"18",y1:"18",y2:"12"}],["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W3=["svg",h,[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U3=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M9.17 14.83a4 4 0 1 0 0-5.66"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q3=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M14.83 14.83a4 4 0 1 1 0-5.66"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $3=["svg",h,[["polyline",{points:"9 10 4 15 9 20"}],["path",{d:"M20 4v7a4 4 0 0 1-4 4H4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j3=["svg",h,[["polyline",{points:"15 10 20 15 15 20"}],["path",{d:"M4 4v7a4 4 0 0 0 4 4h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y3=["svg",h,[["polyline",{points:"14 15 9 20 4 15"}],["path",{d:"M20 4h-7a4 4 0 0 0-4 4v12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X3=["svg",h,[["polyline",{points:"14 9 9 4 4 9"}],["path",{d:"M20 20h-7a4 4 0 0 1-4-4V4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G3=["svg",h,[["polyline",{points:"10 15 15 20 20 15"}],["path",{d:"M4 4h7a4 4 0 0 1 4 4v12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K3=["svg",h,[["polyline",{points:"10 9 15 4 20 9"}],["path",{d:"M4 20h7a4 4 0 0 0 4-4V4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J3=["svg",h,[["polyline",{points:"9 14 4 9 9 4"}],["path",{d:"M20 20v-7a4 4 0 0 0-4-4H4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q3=["svg",h,[["polyline",{points:"15 14 20 9 15 4"}],["path",{d:"M4 20v-7a4 4 0 0 1 4-4h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t6=["svg",h,[["rect",{width:"16",height:"16",x:"4",y:"4",rx:"2"}],["rect",{width:"6",height:"6",x:"9",y:"9",rx:"1"}],["path",{d:"M15 2v2"}],["path",{d:"M15 20v2"}],["path",{d:"M2 15h2"}],["path",{d:"M2 9h2"}],["path",{d:"M20 15h2"}],["path",{d:"M20 9h2"}],["path",{d:"M9 2v2"}],["path",{d:"M9 20v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e6=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M10 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.7 2.7 0 0 0 3.5 1"}],["path",{d:"M17 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.7 2.7 0 0 0 3.5 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a6=["svg",h,[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i6=["svg",h,[["path",{d:"m4.6 13.11 5.79-3.21c1.89-1.05 4.79 1.78 3.71 3.71l-3.22 5.81C8.8 23.16.79 15.23 4.6 13.11Z"}],["path",{d:"m10.5 9.5-1-2.29C9.2 6.48 8.8 6 8 6H4.5C2.79 6 2 6.5 2 8.5a7.71 7.71 0 0 0 2 4.83"}],["path",{d:"M8 6c0-1.55.24-4-2-4-2 0-2.5 2.17-2.5 4"}],["path",{d:"m14.5 13.5 2.29 1c.73.3 1.21.7 1.21 1.5v3.5c0 1.71-.5 2.5-2.5 2.5a7.71 7.71 0 0 1-4.83-2"}],["path",{d:"M18 16c1.55 0 4-.24 4 2 0 2-2.17 2.5-4 2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s6=["svg",h,[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n6=["svg",h,[["path",{d:"M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o6=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r6=["svg",h,[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"}],["path",{d:"M5 21h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h6=["svg",h,[["path",{d:"m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.95 8.41a2 2 0 0 0-.95 1.7v5.82a2 2 0 0 0 .88 1.66l6.05 4.07a2 2 0 0 0 2.17.05l9.95-6.12a2 2 0 0 0 .95-1.7V8.06a2 2 0 0 0-.88-1.66Z"}],["path",{d:"M10 22v-8L2.25 9.15"}],["path",{d:"m10 14 11.77-6.87"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c6=["svg",h,[["path",{d:"m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"}],["path",{d:"M5 8h14"}],["path",{d:"M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"}],["path",{d:"m12 8 1-6h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d6=["svg",h,[["circle",{cx:"12",cy:"12",r:"8"}],["line",{x1:"3",x2:"6",y1:"3",y2:"6"}],["line",{x1:"21",x2:"18",y1:"3",y2:"6"}],["line",{x1:"3",x2:"6",y1:"21",y2:"18"}],["line",{x1:"21",x2:"18",y1:"21",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l6=["svg",h,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 5v14a9 3 0 0 0 18 0V5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p6=["svg",h,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 12a9 3 0 0 0 5 2.69"}],["path",{d:"M21 9.3V5"}],["path",{d:"M3 5v14a9 3 0 0 0 6.47 2.88"}],["path",{d:"M12 12v4h4"}],["path",{d:"M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u6=["svg",h,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 5V19A9 3 0 0 0 15 21.84"}],["path",{d:"M21 5V8"}],["path",{d:"M21 12L18 17H22L19 22"}],["path",{d:"M3 12A9 3 0 0 0 14.59 14.87"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g6=["svg",h,[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5"}],["path",{d:"M3 12A9 3 0 0 0 21 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f6=["svg",h,[["path",{d:"M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"}],["line",{x1:"18",x2:"12",y1:"9",y2:"15"}],["line",{x1:"12",x2:"18",y1:"9",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M6=["svg",h,[["circle",{cx:"12",cy:"4",r:"2"}],["path",{d:"M10.2 3.2C5.5 4 2 8.1 2 13a2 2 0 0 0 4 0v-1a2 2 0 0 1 4 0v4a2 2 0 0 0 4 0v-4a2 2 0 0 1 4 0v1a2 2 0 0 0 4 0c0-4.9-3.5-9-8.2-9.8"}],["path",{d:"M3.2 14.8a9 9 0 0 0 17.6 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v6=["svg",h,[["circle",{cx:"19",cy:"19",r:"2"}],["circle",{cx:"5",cy:"5",r:"2"}],["path",{d:"M6.48 3.66a10 10 0 0 1 13.86 13.86"}],["path",{d:"m6.41 6.41 11.18 11.18"}],["path",{d:"M3.66 6.48a10 10 0 0 0 13.86 13.86"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m6=["svg",h,[["path",{d:"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z"}],["path",{d:"M8 12h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j2=["svg",h,[["path",{d:"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0Z"}],["path",{d:"M9.2 9.2h.01"}],["path",{d:"m14.5 9.5-5 5"}],["path",{d:"M14.7 14.8h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y6=["svg",h,[["path",{d:"M12 8v8"}],["path",{d:"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z"}],["path",{d:"M8 12h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x6=["svg",h,[["path",{d:"M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M12 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M15 9h.01"}],["path",{d:"M9 15h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M8 16h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M8 8h.01"}],["path",{d:"M8 16h.01"}],["path",{d:"M16 16h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M8 8h.01"}],["path",{d:"M8 16h.01"}],["path",{d:"M16 16h.01"}],["path",{d:"M12 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M16 8h.01"}],["path",{d:"M16 12h.01"}],["path",{d:"M16 16h.01"}],["path",{d:"M8 8h.01"}],["path",{d:"M8 12h.01"}],["path",{d:"M8 16h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C6=["svg",h,[["rect",{width:"12",height:"12",x:"2",y:"10",rx:"2",ry:"2"}],["path",{d:"m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"}],["path",{d:"M6 18h.01"}],["path",{d:"M10 14h.01"}],["path",{d:"M15 6h.01"}],["path",{d:"M18 9h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L6=["svg",h,[["path",{d:"M12 3v14"}],["path",{d:"M5 10h14"}],["path",{d:"M5 21h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P6=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H6=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M6 12c0-1.7.7-3.2 1.8-4.2"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M18 12c0 1.7-.7 3.2-1.8 4.2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V6=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"12",cy:"12",r:"5"}],["path",{d:"M12 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T6=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E6=["svg",h,[["circle",{cx:"12",cy:"6",r:"1"}],["line",{x1:"5",x2:"19",y1:"12",y2:"12"}],["circle",{cx:"12",cy:"18",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D6=["svg",h,[["path",{d:"M15 2c-1.35 1.5-2.092 3-2.5 4.5M9 22c1.35-1.5 2.092-3 2.5-4.5"}],["path",{d:"M2 15c3.333-3 6.667-3 10-3m10-3c-1.5 1.35-3 2.092-4.5 2.5"}],["path",{d:"m17 6-2.5-2.5"}],["path",{d:"m14 8-1.5-1.5"}],["path",{d:"m7 18 2.5 2.5"}],["path",{d:"m3.5 14.5.5.5"}],["path",{d:"m20 9 .5.5"}],["path",{d:"m6.5 12.5 1 1"}],["path",{d:"m16.5 10.5 1 1"}],["path",{d:"m10 16 1.5 1.5"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O6=["svg",h,[["path",{d:"M2 15c6.667-6 13.333 0 20-6"}],["path",{d:"M9 22c1.798-1.998 2.518-3.995 2.807-5.993"}],["path",{d:"M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"}],["path",{d:"m17 6-2.5-2.5"}],["path",{d:"m14 8-1-1"}],["path",{d:"m7 18 2.5 2.5"}],["path",{d:"m3.5 14.5.5.5"}],["path",{d:"m20 9 .5.5"}],["path",{d:"m6.5 12.5 1 1"}],["path",{d:"m16.5 10.5 1 1"}],["path",{d:"m10 16 1.5 1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R6=["svg",h,[["path",{d:"M2 8h20"}],["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M6 16h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I6=["svg",h,[["path",{d:"M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"}],["path",{d:"M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"}],["path",{d:"M8 14v.5"}],["path",{d:"M16 14v.5"}],["path",{d:"M11.25 16.25h1.5L12 17l-.75-.75Z"}],["path",{d:"M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B6=["svg",h,[["line",{x1:"12",x2:"12",y1:"2",y2:"22"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F6=["svg",h,[["path",{d:"M20.5 10a2.5 2.5 0 0 1-2.4-3H18a2.95 2.95 0 0 1-2.6-4.4 10 10 0 1 0 6.3 7.1c-.3.2-.8.3-1.2.3"}],["circle",{cx:"12",cy:"12",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z6=["svg",h,[["path",{d:"M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"}],["path",{d:"M2 20h20"}],["path",{d:"M14 12v.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N6=["svg",h,[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14"}],["path",{d:"M2 20h3"}],["path",{d:"M13 20h9"}],["path",{d:"M10 12v.01"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z6=["svg",h,[["circle",{cx:"12.1",cy:"12.1",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W6=["svg",h,[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["polyline",{points:"7 10 12 15 17 10"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U6=["svg",h,[["circle",{cx:"12",cy:"5",r:"2"}],["path",{d:"m3 21 8.02-14.26"}],["path",{d:"m12.99 6.74 1.93 3.44"}],["path",{d:"M19 12c-3.87 4-10.13 4-14 0"}],["path",{d:"m21 21-2.16-3.84"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q6=["svg",h,[["path",{d:"M10 11h.01"}],["path",{d:"M14 6h.01"}],["path",{d:"M18 6h.01"}],["path",{d:"M6.5 13.1h.01"}],["path",{d:"M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3"}],["path",{d:"M17.4 9.9c-.8.8-2 .8-2.8 0"}],["path",{d:"M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7"}],["path",{d:"M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $6=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94"}],["path",{d:"M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32"}],["path",{d:"M8.56 2.75c4.37 6 6 9.42 8 17.72"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j6=["svg",h,[["path",{d:"M14 9c0 .6-.4 1-1 1H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9c.6 0 1 .4 1 1Z"}],["path",{d:"M18 6h4"}],["path",{d:"M14 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3"}],["path",{d:"m5 10-2 8"}],["path",{d:"M12 10v3c0 .6-.4 1-1 1H8"}],["path",{d:"m7 18 2-8"}],["path",{d:"M5 22c-1.7 0-3-1.3-3-3 0-.6.4-1 1-1h7c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y6=["svg",h,[["path",{d:"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X6=["svg",h,[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G6=["svg",h,[["path",{d:"m2 2 8 8"}],["path",{d:"m22 2-8 8"}],["ellipse",{cx:"12",cy:"9",rx:"10",ry:"5"}],["path",{d:"M7 13.4v7.9"}],["path",{d:"M12 14v8"}],["path",{d:"M17 13.4v7.9"}],["path",{d:"M2 9v8a10 5 0 0 0 20 0V9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K6=["svg",h,[["path",{d:"M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23"}],["path",{d:"m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J6=["svg",h,[["path",{d:"M14.4 14.4 9.6 9.6"}],["path",{d:"M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"}],["path",{d:"m21.5 21.5-1.4-1.4"}],["path",{d:"M3.9 3.9 2.5 2.5"}],["path",{d:"M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q6=["svg",h,[["path",{d:"M6 18.5a3.5 3.5 0 1 0 7 0c0-1.57.92-2.52 2.04-3.46"}],["path",{d:"M6 8.5c0-.75.13-1.47.36-2.14"}],["path",{d:"M8.8 3.15A6.5 6.5 0 0 1 19 8.5c0 1.63-.44 2.81-1.09 3.76"}],["path",{d:"M12.5 6A2.5 2.5 0 0 1 15 8.5M10 13a2 2 0 0 0 1.82-1.18"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tM=["svg",h,[["path",{d:"M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"}],["path",{d:"M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eM=["svg",h,[["path",{d:"M7 3.34V5a3 3 0 0 0 3 3"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2 2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"}],["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54"}],["path",{d:"M12 2a10 10 0 1 0 9.54 13"}],["path",{d:"M20 6V4a2 2 0 1 0-4 0v2"}],["rect",{width:"8",height:"5",x:"14",y:"6",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y2=["svg",h,[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3v0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2v0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h3.17"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"}],["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aM=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 2a7 7 0 1 0 10 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iM=["svg",h,[["circle",{cx:"11.5",cy:"12.5",r:"3.5"}],["path",{d:"M3 8c0-3.5 2.5-6 6.5-6 5 0 4.83 3 7.5 5s5 2 5 6c0 4.5-2.5 6.5-7 6.5-2.5 0-2.5 2.5-6 2.5s-7-2-7-5.5c0-3 1.5-3 1.5-5C3.5 10 3 9 3 8Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sM=["svg",h,[["path",{d:"M6.399 6.399C5.362 8.157 4.65 10.189 4.5 12c-.37 4.43 1.27 9.95 7.5 10 3.256-.026 5.259-1.547 6.375-3.625"}],["path",{d:"M19.532 13.875A14.07 14.07 0 0 0 19.5 12c-.36-4.34-3.95-9.96-7.5-10-1.04.012-2.082.502-3.046 1.297"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nM=["svg",h,[["path",{d:"M12 22c6.23-.05 7.87-5.57 7.5-10-.36-4.34-3.95-9.96-7.5-10-3.55.04-7.14 5.66-7.5 10-.37 4.43 1.27 9.95 7.5 10z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X2=["svg",h,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"12",cy:"5",r:"1"}],["circle",{cx:"12",cy:"19",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G2=["svg",h,[["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oM=["svg",h,[["line",{x1:"5",x2:"19",y1:"9",y2:"9"}],["line",{x1:"5",x2:"19",y1:"15",y2:"15"}],["line",{x1:"19",x2:"5",y1:"5",y2:"19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rM=["svg",h,[["line",{x1:"5",x2:"19",y1:"9",y2:"9"}],["line",{x1:"5",x2:"19",y1:"15",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hM=["svg",h,[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"}],["path",{d:"M22 21H7"}],["path",{d:"m5 11 9 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cM=["svg",h,[["path",{d:"M4 10h12"}],["path",{d:"M4 14h9"}],["path",{d:"M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dM=["svg",h,[["path",{d:"m21 21-6-6m6 6v-4.8m0 4.8h-4.8"}],["path",{d:"M3 16.2V21m0 0h4.8M3 21l6-6"}],["path",{d:"M21 7.8V3m0 0h-4.8M21 3l-6 6"}],["path",{d:"M3 7.8V3m0 0h4.8M3 3l6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lM=["svg",h,[["path",{d:"M15 3h6v6"}],["path",{d:"M10 14 21 3"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pM=["svg",h,[["path",{d:"M9.88 9.88a3 3 0 1 0 4.24 4.24"}],["path",{d:"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"}],["path",{d:"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uM=["svg",h,[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"}],["circle",{cx:"12",cy:"12",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gM=["svg",h,[["path",{d:"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fM=["svg",h,[["path",{d:"M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M17 18h1"}],["path",{d:"M12 18h1"}],["path",{d:"M7 18h1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MM=["svg",h,[["path",{d:"M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z"}],["path",{d:"M12 12v.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vM=["svg",h,[["polygon",{points:"13 19 22 12 13 5 13 19"}],["polygon",{points:"2 19 11 12 2 5 2 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mM=["svg",h,[["path",{d:"M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"}],["path",{d:"M16 8 2 22"}],["path",{d:"M17.5 15H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yM=["svg",h,[["path",{d:"M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"}],["path",{d:"M6 8h4"}],["path",{d:"M6 18h4"}],["path",{d:"m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"}],["path",{d:"M14 8h4"}],["path",{d:"M14 18h4"}],["path",{d:"m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xM=["svg",h,[["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M12 2v4"}],["path",{d:"m6.8 15-3.5 2"}],["path",{d:"m20.7 7-3.5 2"}],["path",{d:"M6.8 9 3.3 7"}],["path",{d:"m20.7 17-3.5-2"}],["path",{d:"m9 22 3-8 3 8"}],["path",{d:"M8 22h8"}],["path",{d:"M18 18.7a9 9 0 1 0-12 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _M=["svg",h,[["path",{d:"M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"}],["path",{d:"M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"}],["path",{d:"M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"}],["path",{d:"M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"}],["path",{d:"M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bM=["svg",h,[["path",{d:"M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v18"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"10",cy:"20",r:"2"}],["path",{d:"M10 7V6"}],["path",{d:"M10 12v-1"}],["path",{d:"M10 18v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"3",cy:"17",r:"1"}],["path",{d:"M2 17v-3a4 4 0 0 1 8 0v3"}],["circle",{cx:"9",cy:"17",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SM=["svg",h,[["path",{d:"M17.5 22h.5a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M2 19a2 2 0 1 1 4 0v1a2 2 0 1 1-4 0v-4a6 6 0 0 1 12 0v4a2 2 0 1 1-4 0v-1a2 2 0 1 1 4 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K2=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m8 18 4-4"}],["path",{d:"M8 10v8h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m14 12.5 1 5.5-3-1-3 1 1-5.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AM=["svg",h,[["path",{d:"M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"}],["path",{d:"M7 16.5 8 22l-3-1-3 1 1-5.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 18v-1"}],["path",{d:"M12 18v-6"}],["path",{d:"M16 18v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 18v-2"}],["path",{d:"M12 18v-4"}],["path",{d:"M16 18v-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PM=["svg",h,[["path",{d:"M14.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M3 13.1a2 2 0 0 0-1 1.76v3.24a2 2 0 0 0 .97 1.78L6 21.7a2 2 0 0 0 2.03.01L11 19.9a2 2 0 0 0 1-1.76V14.9a2 2 0 0 0-.97-1.78L8 11.3a2 2 0 0 0-2.03-.01Z"}],["path",{d:"M7 17v5"}],["path",{d:"M11.7 14.2 7 17l-4.7-2.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const HM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m3 15 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m9 15 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TM=["svg",h,[["path",{d:"M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"8",cy:"16",r:"6"}],["path",{d:"M9.5 17.5 8 16.25V14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m5 12-3 3 3 3"}],["path",{d:"m9 18 3-3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DM=["svg",h,[["path",{d:"M10 12.5 8 15l2 2.5"}],["path",{d:"m14 12.5 2 2.5-2 2.5"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J2=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"6",cy:"14",r:"3"}],["path",{d:"M6 10v1"}],["path",{d:"M6 17v1"}],["path",{d:"M10 14H9"}],["path",{d:"M3 14H2"}],["path",{d:"m9 11-.88.88"}],["path",{d:"M3.88 16.12 3 17"}],["path",{d:"m9 17-.88-.88"}],["path",{d:"M3.88 11.88 3 11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M9 10h6"}],["path",{d:"M12 13V7"}],["path",{d:"M9 17h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["rect",{width:"4",height:"6",x:"2",y:"12",rx:"2"}],["path",{d:"M10 12h2v6"}],["path",{d:"M10 18h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M12 18v-6"}],["path",{d:"m9 15 3 3 3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v2"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10.29 10.7a2.43 2.43 0 0 0-2.66-.52c-.29.12-.56.3-.78.53l-.35.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L6.5 18l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"10",cy:"12",r:"2"}],["path",{d:"m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M2 15h10"}],["path",{d:"m9 18 3-3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"}],["path",{d:"M8 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"}],["path",{d:"M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const WM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v6"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"4",cy:"16",r:"2"}],["path",{d:"m10 10-4.5 4.5"}],["path",{d:"m9 11 1 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["circle",{cx:"10",cy:"16",r:"2"}],["path",{d:"m16 10-4.5 4.5"}],["path",{d:"m15 11 1 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m16 13-3.5 3.5-2-2L8 17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $M=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v1"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["rect",{width:"8",height:"5",x:"2",y:"13",rx:"1"}],["path",{d:"M8 13v-2a2 2 0 1 0-4 0v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["rect",{width:"8",height:"6",x:"8",y:"12",rx:"1"}],["path",{d:"M10 12v-2a2 2 0 1 1 4 0v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M3 15h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XM=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M9 15h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GM=["svg",h,[["circle",{cx:"14",cy:"16",r:"2"}],["circle",{cx:"6",cy:"18",r:"2"}],["path",{d:"M4 12.4V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-7.5"}],["path",{d:"M8 18v-7.7L16 9v7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KM=["svg",h,[["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 7V4a2 2 0 0 1 2-2 2 2 0 0 0-2 2"}],["path",{d:"M4.063 20.999a2 2 0 0 0 2 1L18 22a2 2 0 0 0 2-2V7l-5-5H6"}],["path",{d:"m5 11-3 3"}],["path",{d:"m5 17-3-3h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q2=["svg",h,[["path",{d:"m18 5-3-3H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"}],["path",{d:"M8 18h1"}],["path",{d:"M18.4 9.6a2 2 0 1 1 3 3L17 17l-4 1 1-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=["svg",h,[["path",{d:"M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JM=["svg",h,[["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3.5"}],["path",{d:"M4.017 11.512a6 6 0 1 0 8.466 8.475"}],["path",{d:"M8 16v-6a6 6 0 0 1 6 6z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QM=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M3 15h6"}],["path",{d:"M6 12v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M9 15h6"}],["path",{d:"M12 18v-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ev=["svg",h,[["path",{d:"M12 17h.01"}],["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"}],["path",{d:"M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const av=["svg",h,[["path",{d:"M20 10V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M16 14a2 2 0 0 0-2 2"}],["path",{d:"M20 14a2 2 0 0 1 2 2"}],["path",{d:"M20 22a2 2 0 0 0 2-2"}],["path",{d:"M16 22a2 2 0 0 1-2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["circle",{cx:"11.5",cy:"14.5",r:"2.5"}],["path",{d:"M13.3 16.3 15 18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sv=["svg",h,[["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"m9 18-1.5-1.5"}],["circle",{cx:"5",cy:"14",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 12h8"}],["path",{d:"M10 11v2"}],["path",{d:"M8 17h8"}],["path",{d:"M14 16v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ov=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 13h2"}],["path",{d:"M14 13h2"}],["path",{d:"M8 17h2"}],["path",{d:"M14 17h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rv=["svg",h,[["path",{d:"M21 7h-3a2 2 0 0 1-2-2V2"}],["path",{d:"M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z"}],["path",{d:"M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15"}],["path",{d:"M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hv=["svg",h,[["path",{d:"m10 18 3-3-3-3"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4 11V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m8 16 2-2-2-2"}],["path",{d:"M12 18h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M10 9H8"}],["path",{d:"M16 13H8"}],["path",{d:"M16 17H8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lv=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M2 13v-1h6v1"}],["path",{d:"M5 12v6"}],["path",{d:"M4 18h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M9 13v-1h6v1"}],["path",{d:"M12 12v6"}],["path",{d:"M11 18h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M12 12v6"}],["path",{d:"m15 15-3-3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gv=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["rect",{width:"8",height:"6",x:"2",y:"12",rx:"1"}],["path",{d:"m10 15.5 4 2.5v-6l-4 2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m10 11 5 3-5 3v-6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 15h.01"}],["path",{d:"M11.5 13.5a2.5 2.5 0 0 1 0 3"}],["path",{d:"M15 12a5 5 0 0 1 0 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vv=["svg",h,[["path",{d:"M11 11a5 5 0 0 1 0 6"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"M4.268 21A2 2 0 0 0 6 22h12a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"}],["path",{d:"m7 10-3 2H2v4h2l3 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M12 9v4"}],["path",{d:"M12 17h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yv=["svg",h,[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m8 12.5-5 5"}],["path",{d:"m3 12.5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xv=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{d:"m14.5 12.5-5 5"}],["path",{d:"m9.5 12.5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _v=["svg",h,[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bv=["svg",h,[["path",{d:"M20 7h-3a2 2 0 0 1-2-2V2"}],["path",{d:"M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"}],["path",{d:"M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wv=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 3v18"}],["path",{d:"M3 7.5h4"}],["path",{d:"M3 12h18"}],["path",{d:"M3 16.5h4"}],["path",{d:"M17 3v18"}],["path",{d:"M17 7.5h4"}],["path",{d:"M17 16.5h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sv=["svg",h,[["path",{d:"M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.055"}],["path",{d:"m22 3-5 5"}],["path",{d:"m17 3 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kv=["svg",h,[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Av=["svg",h,[["path",{d:"M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"}],["path",{d:"M14 13.12c0 2.38 0 6.38-1 8.88"}],["path",{d:"M17.29 21.02c.12-.6.43-2.3.5-3.02"}],["path",{d:"M2 12a10 10 0 0 1 18-6"}],["path",{d:"M2 16h.01"}],["path",{d:"M21.8 16c.2-2 .131-5.354 0-6"}],["path",{d:"M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"}],["path",{d:"M8.65 22c.21-.66.45-1.32.57-2"}],["path",{d:"M9 6.8a6 6 0 0 1 9 5.2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cv=["svg",h,[["path",{d:"M15 6.5V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3.5"}],["path",{d:"M9 18h8"}],["path",{d:"M18 3h-3"}],["path",{d:"M11 3a6 6 0 0 0-6 6v11"}],["path",{d:"M5 13h4"}],["path",{d:"M17 10a4 4 0 0 0-8 0v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lv=["svg",h,[["path",{d:"M18 12.47v.03m0-.5v.47m-.475 5.056A6.744 6.744 0 0 1 15 18c-3.56 0-7.56-2.53-8.5-6 .348-1.28 1.114-2.433 2.121-3.38m3.444-2.088A8.802 8.802 0 0 1 15 6c3.56 0 6.06 2.54 7 6-.309 1.14-.786 2.177-1.413 3.058"}],["path",{d:"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33m7.48-4.372A9.77 9.77 0 0 1 16 6.07m0 11.86a9.77 9.77 0 0 1-1.728-3.618"}],["path",{d:"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98M8.53 3h5.27a2 2 0 0 1 1.98 1.67l.23 1.4M2 2l20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pv=["svg",h,[["path",{d:"M2 16s9-15 20-4C11 23 2 8 2 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hv=["svg",h,[["path",{d:"M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"}],["path",{d:"M18 12v.5"}],["path",{d:"M16 17.93a9.77 9.77 0 0 1 0-11.86"}],["path",{d:"M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"}],["path",{d:"M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"}],["path",{d:"m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vv=["svg",h,[["path",{d:"M8 2c3 0 5 2 8 2s4-1 4-1v11"}],["path",{d:"M4 22V4"}],["path",{d:"M4 15s1-1 4-1 5 2 8 2"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tv=["svg",h,[["path",{d:"M17 22V2L7 7l10 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ev=["svg",h,[["path",{d:"M7 22V2l10 5-10 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dv=["svg",h,[["path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"}],["line",{x1:"4",x2:"4",y1:"22",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ov=["svg",h,[["path",{d:"M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10a5 5 0 1 1-10 0c0-.3 0-.6.1-.9a2 2 0 1 0 3.3-2C8 4.5 11 2 12 2Z"}],["path",{d:"m5 22 14-4"}],["path",{d:"m5 18 14 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rv=["svg",h,[["path",{d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iv=["svg",h,[["path",{d:"M16 16v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4"}],["path",{d:"M7 2h11v4c0 2-2 2-2 4v1"}],["line",{x1:"11",x2:"18",y1:"6",y2:"6"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bv=["svg",h,[["path",{d:"M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z"}],["line",{x1:"6",x2:"18",y1:"6",y2:"6"}],["line",{x1:"12",x2:"12",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fv=["svg",h,[["path",{d:"M10 10 4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-1.272-2.542"}],["path",{d:"M10 2v2.343"}],["path",{d:"M14 2v6.343"}],["path",{d:"M8.5 2h7"}],["path",{d:"M7 16h9"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zv=["svg",h,[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"}],["path",{d:"M8.5 2h7"}],["path",{d:"M7 16h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nv=["svg",h,[["path",{d:"M10 2v7.31"}],["path",{d:"M14 9.3V1.99"}],["path",{d:"M8.5 2h7"}],["path",{d:"M14 9.3a6.5 6.5 0 1 1-4 0"}],["path",{d:"M5.52 16h12.96"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zv=["svg",h,[["path",{d:"m3 7 5 5-5 5V7"}],["path",{d:"m21 7-5 5 5 5V7"}],["path",{d:"M12 20v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wv=["svg",h,[["path",{d:"M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"}],["path",{d:"M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"}],["path",{d:"M12 20v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uv=["svg",h,[["path",{d:"m17 3-5 5-5-5h10"}],["path",{d:"m17 21-5-5-5 5h10"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qv=["svg",h,[["path",{d:"M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"}],["path",{d:"M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $v=["svg",h,[["path",{d:"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"}],["circle",{cx:"12",cy:"8",r:"2"}],["path",{d:"M12 10v12"}],["path",{d:"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"}],["path",{d:"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jv=["svg",h,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"}],["path",{d:"M12 7.5V9"}],["path",{d:"M7.5 12H9"}],["path",{d:"M16.5 12H15"}],["path",{d:"M12 16.5V15"}],["path",{d:"m8 8 1.88 1.88"}],["path",{d:"M14.12 9.88 16 8"}],["path",{d:"m8 16 1.88-1.88"}],["path",{d:"M14.12 14.12 16 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yv=["svg",h,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xv=["svg",h,[["path",{d:"M2 12h6"}],["path",{d:"M22 12h-6"}],["path",{d:"M12 2v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 20v2"}],["path",{d:"m19 9-3 3 3 3"}],["path",{d:"m5 15 3-3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gv=["svg",h,[["path",{d:"M12 22v-6"}],["path",{d:"M12 8V2"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}],["path",{d:"m15 19-3-3-3 3"}],["path",{d:"m15 5-3 3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kv=["svg",h,[["circle",{cx:"15",cy:"19",r:"2"}],["path",{d:"M20.9 19.8A2 2 0 0 0 22 18V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h5.1"}],["path",{d:"M15 11v-1"}],["path",{d:"M15 17v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jv=["svg",h,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"m9 13 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qv=["svg",h,[["circle",{cx:"16",cy:"16",r:"6"}],["path",{d:"M7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2"}],["path",{d:"M16 14v2l1 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t8=["svg",h,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M2 10h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=["svg",h,[["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"M10.3 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3.3"}],["path",{d:"m21.7 19.4-.9-.3"}],["path",{d:"m15.2 16.9-.9-.3"}],["path",{d:"m16.6 21.7.3-.9"}],["path",{d:"m19.1 15.2.3-.9"}],["path",{d:"m19.6 21.7-.4-1"}],["path",{d:"m16.8 15.3-.4-1"}],["path",{d:"m14.3 19.6 1-.4"}],["path",{d:"m20.7 16.8 1-.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e8=["svg",h,[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"}],["circle",{cx:"12",cy:"13",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a8=["svg",h,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M12 10v6"}],["path",{d:"m15 13-3 3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i8=["svg",h,[["path",{d:"M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"}],["circle",{cx:"13",cy:"12",r:"2"}],["path",{d:"M18 19c-2.8 0-5-2.2-5-5v8"}],["circle",{cx:"20",cy:"19",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s8=["svg",h,[["circle",{cx:"12",cy:"13",r:"2"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M14 13h3"}],["path",{d:"M7 13h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n8=["svg",h,[["path",{d:"M11 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v1.5"}],["path",{d:"M13.9 17.45c-1.2-1.2-1.14-2.8-.2-3.73a2.43 2.43 0 0 1 3.44 0l.36.34.34-.34a2.43 2.43 0 0 1 3.45-.01v0c.95.95 1 2.53-.2 3.74L17.5 21Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o8=["svg",h,[["path",{d:"M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1"}],["path",{d:"M2 13h10"}],["path",{d:"m9 16 3-3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r8=["svg",h,[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"}],["path",{d:"M8 10v4"}],["path",{d:"M12 10v2"}],["path",{d:"M16 10v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h8=["svg",h,[["circle",{cx:"16",cy:"20",r:"2"}],["path",{d:"M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"}],["path",{d:"m22 14-4.5 4.5"}],["path",{d:"m21 15 1 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c8=["svg",h,[["rect",{width:"8",height:"5",x:"14",y:"17",rx:"1"}],["path",{d:"M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2.5"}],["path",{d:"M20 17v-2a2 2 0 1 0-4 0v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d8=["svg",h,[["path",{d:"M9 13h6"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l8=["svg",h,[["path",{d:"m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"}],["circle",{cx:"14",cy:"15",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p8=["svg",h,[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u8=["svg",h,[["path",{d:"M2 7.5V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-1.5"}],["path",{d:"M2 13h10"}],["path",{d:"m5 10-3 3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=["svg",h,[["path",{d:"M8.4 10.6a2 2 0 0 1 3 3L6 19l-4 1 1-4Z"}],["path",{d:"M2 11.5V5a2 2 0 0 1 2-2h3.9c.7 0 1.3.3 1.7.9l.8 1.2c.4.6 1 .9 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g8=["svg",h,[["path",{d:"M12 10v6"}],["path",{d:"M9 13h6"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f8=["svg",h,[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"}],["circle",{cx:"12",cy:"13",r:"2"}],["path",{d:"M12 15v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M8=["svg",h,[["circle",{cx:"11.5",cy:"12.5",r:"2.5"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M13.3 14.3 15 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v8=["svg",h,[["circle",{cx:"17",cy:"17",r:"3"}],["path",{d:"M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1"}],["path",{d:"m21 21-1.5-1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m8=["svg",h,[["path",{d:"M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"}],["path",{d:"m8 16 3-3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y8=["svg",h,[["path",{d:"M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v.5"}],["path",{d:"M12 10v4h4"}],["path",{d:"m12 14 1.535-1.605a5 5 0 0 1 8 1.5"}],["path",{d:"M22 22v-4h-4"}],["path",{d:"m22 18-1.535 1.605a5 5 0 0 1-8-1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x8=["svg",h,[["path",{d:"M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"}],["path",{d:"M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"}],["path",{d:"M3 5a2 2 0 0 0 2 2h3"}],["path",{d:"M3 3v13a2 2 0 0 0 2 2h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _8=["svg",h,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"M12 10v6"}],["path",{d:"m9 13 3-3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b8=["svg",h,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}],["path",{d:"m9.5 10.5 5 5"}],["path",{d:"m14.5 10.5-5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w8=["svg",h,[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S8=["svg",h,[["path",{d:"M20 17a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.9a2 2 0 0 1-1.69-.9l-.81-1.2a2 2 0 0 0-1.67-.9H8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z"}],["path",{d:"M2 8v11a2 2 0 0 0 2 2h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k8=["svg",h,[["path",{d:"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"}],["path",{d:"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"}],["path",{d:"M16 17h4"}],["path",{d:"M4 13h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A8=["svg",h,[["path",{d:"M12 12H5a2 2 0 0 0-2 2v5"}],["circle",{cx:"13",cy:"19",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M8 19h3m5-17v17h6M6 12V7c0-1.1.9-2 2-2h3l5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C8=["svg",h,[["polyline",{points:"15 17 20 12 15 7"}],["path",{d:"M4 18v-2a4 4 0 0 1 4-4h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L8=["svg",h,[["line",{x1:"22",x2:"2",y1:"6",y2:"6"}],["line",{x1:"22",x2:"2",y1:"18",y2:"18"}],["line",{x1:"6",x2:"6",y1:"2",y2:"22"}],["line",{x1:"18",x2:"18",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P8=["svg",h,[["path",{d:"M5 16V9h14V2H5l14 14h-7m-7 0 7 7v-7m-7 0h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H8=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M16 16s-1.5-2-4-2-4 2-4 2"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V8=["svg",h,[["line",{x1:"3",x2:"15",y1:"22",y2:"22"}],["line",{x1:"4",x2:"14",y1:"9",y2:"9"}],["path",{d:"M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"}],["path",{d:"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T8=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["rect",{width:"10",height:"8",x:"7",y:"8",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E8=["svg",h,[["path",{d:"M2 7v10"}],["path",{d:"M6 5v14"}],["rect",{width:"12",height:"18",x:"10",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D8=["svg",h,[["path",{d:"M2 3v18"}],["rect",{width:"12",height:"18",x:"6",y:"3",rx:"2"}],["path",{d:"M22 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O8=["svg",h,[["rect",{width:"18",height:"14",x:"3",y:"3",rx:"2"}],["path",{d:"M4 21h1"}],["path",{d:"M9 21h1"}],["path",{d:"M14 21h1"}],["path",{d:"M19 21h1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R8=["svg",h,[["path",{d:"M7 2h10"}],["path",{d:"M5 6h14"}],["rect",{width:"18",height:"12",x:"3",y:"10",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I8=["svg",h,[["path",{d:"M3 2h18"}],["rect",{width:"18",height:"12",x:"3",y:"6",rx:"2"}],["path",{d:"M3 22h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B8=["svg",h,[["line",{x1:"6",x2:"10",y1:"11",y2:"11"}],["line",{x1:"8",x2:"8",y1:"9",y2:"13"}],["line",{x1:"15",x2:"15.01",y1:"12",y2:"12"}],["line",{x1:"18",x2:"18.01",y1:"10",y2:"10"}],["path",{d:"M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F8=["svg",h,[["line",{x1:"6",x2:"10",y1:"12",y2:"12"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14"}],["line",{x1:"15",x2:"15.01",y1:"13",y2:"13"}],["line",{x1:"18",x2:"18.01",y1:"11",y2:"11"}],["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z8=["svg",h,[["path",{d:"M8 6h10"}],["path",{d:"M6 12h9"}],["path",{d:"M11 18h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N8=["svg",h,[["path",{d:"m12 14 4-4"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z8=["svg",h,[["path",{d:"m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8"}],["path",{d:"m16 16 6-6"}],["path",{d:"m8 8 6-6"}],["path",{d:"m9 7 8 8"}],["path",{d:"m21 11-8-8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W8=["svg",h,[["path",{d:"M6 3h12l4 6-10 13L2 9Z"}],["path",{d:"M11 3 8 9l4 13 4-13-3-6"}],["path",{d:"M2 9h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U8=["svg",h,[["path",{d:"M9 10h.01"}],["path",{d:"M15 10h.01"}],["path",{d:"M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q8=["svg",h,[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1"}],["path",{d:"M12 8v13"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $8=["svg",h,[["path",{d:"M6 3v12"}],["path",{d:"M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"}],["path",{d:"M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"}],["path",{d:"M15 6a9 9 0 0 0-9 9"}],["path",{d:"M18 15v6"}],["path",{d:"M21 18h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j8=["svg",h,[["line",{x1:"6",x2:"6",y1:"3",y2:"15"}],["circle",{cx:"18",cy:"6",r:"3"}],["circle",{cx:"6",cy:"18",r:"3"}],["path",{d:"M18 9a9 9 0 0 1-9 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=["svg",h,[["circle",{cx:"12",cy:"12",r:"3"}],["line",{x1:"3",x2:"9",y1:"12",y2:"12"}],["line",{x1:"15",x2:"21",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y8=["svg",h,[["path",{d:"M12 3v6"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M12 15v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X8=["svg",h,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v7"}],["path",{d:"m15 9-3-3 3-3"}],["circle",{cx:"19",cy:"18",r:"3"}],["path",{d:"M12 18H7a2 2 0 0 1-2-2V9"}],["path",{d:"m9 15 3 3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G8=["svg",h,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v7"}],["path",{d:"M11 18H8a2 2 0 0 1-2-2V9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K8=["svg",h,[["circle",{cx:"12",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["circle",{cx:"18",cy:"6",r:"3"}],["path",{d:"M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"}],["path",{d:"M12 12v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J8=["svg",h,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M5 9v6"}],["circle",{cx:"5",cy:"18",r:"3"}],["path",{d:"M12 3v18"}],["circle",{cx:"19",cy:"6",r:"3"}],["path",{d:"M16 15.7A9 9 0 0 0 19 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q8=["svg",h,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M6 21V9a9 9 0 0 0 9 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tm=["svg",h,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M5 9v12"}],["circle",{cx:"19",cy:"18",r:"3"}],["path",{d:"m15 9-3-3 3-3"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const em=["svg",h,[["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M6 9v12"}],["path",{d:"m21 3-6 6"}],["path",{d:"m21 9-6-6"}],["path",{d:"M18 11.5V15"}],["circle",{cx:"18",cy:"18",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const am=["svg",h,[["circle",{cx:"5",cy:"6",r:"3"}],["path",{d:"M5 9v12"}],["path",{d:"m15 9-3-3 3-3"}],["path",{d:"M12 6h5a2 2 0 0 1 2 2v3"}],["path",{d:"M19 15v6"}],["path",{d:"M22 18h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const im=["svg",h,[["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M6 9v12"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v3"}],["path",{d:"M18 15v6"}],["path",{d:"M21 18h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sm=["svg",h,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M18 6V5"}],["path",{d:"M18 11v-1"}],["line",{x1:"6",x2:"6",y1:"9",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nm=["svg",h,[["circle",{cx:"18",cy:"18",r:"3"}],["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v7"}],["line",{x1:"6",x2:"6",y1:"9",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const om=["svg",h,[["path",{d:"M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"}],["path",{d:"M9 18c-4.51 2-5-2-7-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rm=["svg",h,[["path",{d:"m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.1 3.26a.42.42 0 0 0-.1-.18.38.38 0 0 0-.26-.08.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hm=["svg",h,[["path",{d:"M15.2 22H8.8a2 2 0 0 1-2-1.79L5 3h14l-1.81 17.21A2 2 0 0 1 15.2 22Z"}],["path",{d:"M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cm=["svg",h,[["circle",{cx:"6",cy:"15",r:"4"}],["circle",{cx:"18",cy:"15",r:"4"}],["path",{d:"M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"}],["path",{d:"M2.5 13 5 7c.7-1.3 1.4-2 3-2"}],["path",{d:"M21.5 13 19 7c-.7-1.3-1.5-2-3-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dm=["svg",h,[["path",{d:"M15.686 15A14.5 14.5 0 0 1 12 22a14.5 14.5 0 0 1 0-20 10 10 0 1 0 9.542 13"}],["path",{d:"M2 12h8.5"}],["path",{d:"M20 6V4a2 2 0 1 0-4 0v2"}],["rect",{width:"8",height:"5",x:"14",y:"6",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lm=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"}],["path",{d:"M2 12h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pm=["svg",h,[["path",{d:"M12 13V2l8 4-8 4"}],["path",{d:"M20.561 10.222a9 9 0 1 1-12.55-5.29"}],["path",{d:"M8.002 9.997a5 5 0 1 0 8.9 2.02"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const um=["svg",h,[["path",{d:"M18 11.5V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"}],["path",{d:"M14 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"}],["path",{d:"M10 9.9V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"}],["path",{d:"M6 14v0a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"}],["path",{d:"M18 11v0a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gm=["svg",h,[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"}],["path",{d:"M22 10v6"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fm=["svg",h,[["path",{d:"M22 5V2l-5.89 5.89"}],["circle",{cx:"16.6",cy:"15.89",r:"3"}],["circle",{cx:"8.11",cy:"7.4",r:"3"}],["circle",{cx:"12.35",cy:"11.65",r:"3"}],["circle",{cx:"13.91",cy:"5.85",r:"3"}],["circle",{cx:"18.15",cy:"10.09",r:"3"}],["circle",{cx:"6.56",cy:"13.2",r:"3"}],["circle",{cx:"10.8",cy:"17.44",r:"3"}],["circle",{cx:"5",cy:"19",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mm=["svg",h,[["path",{d:"M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"}],["path",{d:"m16 19 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vm=["svg",h,[["path",{d:"M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"}],["path",{d:"m16 16 5 5"}],["path",{d:"m16 21 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 12h18"}],["path",{d:"M12 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ui=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M3 15h18"}],["path",{d:"M9 3v18"}],["path",{d:"M15 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mm=["svg",h,[["circle",{cx:"12",cy:"9",r:"1"}],["circle",{cx:"19",cy:"9",r:"1"}],["circle",{cx:"5",cy:"9",r:"1"}],["circle",{cx:"12",cy:"15",r:"1"}],["circle",{cx:"19",cy:"15",r:"1"}],["circle",{cx:"5",cy:"15",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ym=["svg",h,[["circle",{cx:"9",cy:"12",r:"1"}],["circle",{cx:"9",cy:"5",r:"1"}],["circle",{cx:"9",cy:"19",r:"1"}],["circle",{cx:"15",cy:"12",r:"1"}],["circle",{cx:"15",cy:"5",r:"1"}],["circle",{cx:"15",cy:"19",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xm=["svg",h,[["circle",{cx:"12",cy:"5",r:"1"}],["circle",{cx:"19",cy:"5",r:"1"}],["circle",{cx:"5",cy:"5",r:"1"}],["circle",{cx:"12",cy:"12",r:"1"}],["circle",{cx:"19",cy:"12",r:"1"}],["circle",{cx:"5",cy:"12",r:"1"}],["circle",{cx:"12",cy:"19",r:"1"}],["circle",{cx:"19",cy:"19",r:"1"}],["circle",{cx:"5",cy:"19",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _m=["svg",h,[["path",{d:"M3 7V5c0-1.1.9-2 2-2h2"}],["path",{d:"M17 3h2c1.1 0 2 .9 2 2v2"}],["path",{d:"M21 17v2c0 1.1-.9 2-2 2h-2"}],["path",{d:"M7 21H5c-1.1 0-2-.9-2-2v-2"}],["rect",{width:"7",height:"5",x:"7",y:"7",rx:"1"}],["rect",{width:"7",height:"5",x:"10",y:"12",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bm=["svg",h,[["path",{d:"m20 7 1.7-1.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L17 4v3Z"}],["path",{d:"m17 7-5.1 5.1"}],["circle",{cx:"11.5",cy:"12.5",r:".5",fill:"currentColor"}],["path",{d:"M6 12a2 2 0 0 0 1.8-1.2l.4-.9C8.7 8.8 9.8 8 11 8c2.8 0 5 2.2 5 5 0 1.2-.8 2.3-1.9 2.8l-.9.4A2 2 0 0 0 12 18a4 4 0 0 1-4 4c-3.3 0-6-2.7-6-6a4 4 0 0 1 4-4"}],["path",{d:"m6 16 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wm=["svg",h,[["path",{d:"M13.144 21.144A7.274 10.445 45 1 0 2.856 10.856"}],["path",{d:"M13.144 21.144A7.274 4.365 45 0 0 2.856 10.856a7.274 4.365 45 0 0 10.288 10.288"}],["path",{d:"M16.565 10.435 18.6 8.4a2.501 2.501 0 1 0 1.65-4.65 2.5 2.5 0 1 0-4.66 1.66l-2.024 2.025"}],["path",{d:"m8.5 16.5-1-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sm=["svg",h,[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"}],["path",{d:"m18 15 4-4"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const km=["svg",h,[["path",{d:"M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"}],["path",{d:"m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{d:"m2 16 6 6"}],["circle",{cx:"16",cy:"9",r:"2.9"}],["circle",{cx:"6",cy:"5",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Am=["svg",h,[["path",{d:"M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"}],["path",{d:"m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{d:"m2 15 6 6"}],["path",{d:"M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=["svg",h,[["path",{d:"M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"}],["path",{d:"m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"}],["path",{d:"m2 13 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cm=["svg",h,[["path",{d:"M18 12.5V10a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1.4"}],["path",{d:"M14 11V9a2 2 0 1 0-4 0v2"}],["path",{d:"M10 10.5V5a2 2 0 1 0-4 0v9"}],["path",{d:"m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lm=["svg",h,[["path",{d:"M12 3V2"}],["path",{d:"M5 10a7.1 7.1 0 0 1 14 0"}],["path",{d:"M4 10h16"}],["path",{d:"M2 14h12a2 2 0 1 1 0 4h-2"}],["path",{d:"m15.4 17.4 3.2-2.8a2 2 0 0 1 2.8 2.9l-3.6 3.3c-.7.8-1.7 1.2-2.8 1.2h-4c-1.1 0-2.1-.4-2.8-1.2L5 18"}],["path",{d:"M5 14v7H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pm=["svg",h,[["path",{d:"M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hm=["svg",h,[["path",{d:"m11 17 2 2a1 1 0 1 0 3-3"}],["path",{d:"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"}],["path",{d:"m21 3 1 11h-2"}],["path",{d:"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"}],["path",{d:"M3 4h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vm=["svg",h,[["path",{d:"M12 2v8"}],["path",{d:"m16 6-4 4-4-4"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6 18h.01"}],["path",{d:"M10 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tm=["svg",h,[["path",{d:"m16 6-4-4-4 4"}],["path",{d:"M12 2v8"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6 18h.01"}],["path",{d:"M10 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Em=["svg",h,[["line",{x1:"22",x2:"2",y1:"12",y2:"12"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dm=["svg",h,[["path",{d:"M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"}],["path",{d:"M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"}],["path",{d:"M4 15v-3a6 6 0 0 1 6-6h0"}],["path",{d:"M14 6h0a6 6 0 0 1 6 6v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Om=["svg",h,[["line",{x1:"4",x2:"20",y1:"9",y2:"9"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rm=["svg",h,[["path",{d:"m5.2 6.2 1.4 1.4"}],["path",{d:"M2 13h2"}],["path",{d:"M20 13h2"}],["path",{d:"m17.4 7.6 1.4-1.4"}],["path",{d:"M22 17H2"}],["path",{d:"M22 21H2"}],["path",{d:"M16 13a4 4 0 0 0-8 0"}],["path",{d:"M12 5V2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Im=["svg",h,[["path",{d:"M22 9a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1l2 2h12l2-2h1a1 1 0 0 0 1-1Z"}],["path",{d:"M7.5 12h9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bm=["svg",h,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"m17 12 3-2v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fm=["svg",h,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zm=["svg",h,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"}],["path",{d:"M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nm=["svg",h,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M17 10v4h4"}],["path",{d:"M21 10v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zm=["svg",h,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["path",{d:"M17 13v-3h4"}],["path",{d:"M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wm=["svg",h,[["path",{d:"M4 12h8"}],["path",{d:"M4 18V6"}],["path",{d:"M12 18V6"}],["circle",{cx:"19",cy:"16",r:"2"}],["path",{d:"M20 10c-2 2-3 3.5-3 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Um=["svg",h,[["path",{d:"M6 12h12"}],["path",{d:"M6 20V4"}],["path",{d:"M18 20V4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qm=["svg",h,[["path",{d:"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $m=["svg",h,[["path",{d:"M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"}],["path",{d:"M21 16v2a4 4 0 0 1-4 4h-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jm=["svg",h,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}],["path",{d:"m12 13-1-1 2-2-3-3 2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ym=["svg",h,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}],["path",{d:"M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"}],["path",{d:"m18 15-2-2"}],["path",{d:"m15 18-2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xm=["svg",h,[["line",{x1:"2",y1:"2",x2:"22",y2:"22"}],["path",{d:"M16.5 16.5 12 21l-7-7c-1.5-1.45-3-3.2-3-5.5a5.5 5.5 0 0 1 2.14-4.35"}],["path",{d:"M8.76 3.1c1.15.22 2.13.78 3.24 1.9 1.5-1.5 2.74-2 4.5-2A5.5 5.5 0 0 1 22 8.5c0 2.12-1.3 3.78-2.67 5.17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gm=["svg",h,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}],["path",{d:"M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Km=["svg",h,[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jm=["svg",h,[["path",{d:"M11 8c2-3-2-3 0-6"}],["path",{d:"M15.5 8c2-3-2-3 0-6"}],["path",{d:"M6 10h.01"}],["path",{d:"M6 14h.01"}],["path",{d:"M10 16v-4"}],["path",{d:"M14 16v-4"}],["path",{d:"M18 16v-4"}],["path",{d:"M20 6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"}],["path",{d:"M5 20v2"}],["path",{d:"M19 20v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qm=["svg",h,[["path",{d:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t7=["svg",h,[["path",{d:"m9 11-6 6v3h9l3-3"}],["path",{d:"m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e7=["svg",h,[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}],["path",{d:"M12 7v5l4 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a7=["svg",h,[["path",{d:"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}],["polyline",{points:"9 22 9 12 15 12 15 22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i7=["svg",h,[["path",{d:"M10.82 16.12c1.69.6 3.91.79 5.18.85.28.01.53-.09.7-.27"}],["path",{d:"M11.14 20.57c.52.24 2.44 1.12 4.08 1.37.46.06.86-.25.9-.71.12-1.52-.3-3.43-.5-4.28"}],["path",{d:"M16.13 21.05c1.65.63 3.68.84 4.87.91a.9.9 0 0 0 .7-.26"}],["path",{d:"M17.99 5.52a20.83 20.83 0 0 1 3.15 4.5.8.8 0 0 1-.68 1.13c-1.17.1-2.5.02-3.9-.25"}],["path",{d:"M20.57 11.14c.24.52 1.12 2.44 1.37 4.08.04.3-.08.59-.31.75"}],["path",{d:"M4.93 4.93a10 10 0 0 0-.67 13.4c.35.43.96.4 1.17-.12.69-1.71 1.07-5.07 1.07-6.71 1.34.45 3.1.9 4.88.62a.85.85 0 0 0 .48-.24"}],["path",{d:"M5.52 17.99c1.05.95 2.91 2.42 4.5 3.15a.8.8 0 0 0 1.13-.68c.2-2.34-.33-5.3-1.57-8.28"}],["path",{d:"M8.35 2.68a10 10 0 0 1 9.98 1.58c.43.35.4.96-.12 1.17-1.5.6-4.3.98-6.07 1.05"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s7=["svg",h,[["path",{d:"M10.82 16.12c1.69.6 3.91.79 5.18.85.55.03 1-.42.97-.97-.06-1.27-.26-3.5-.85-5.18"}],["path",{d:"M11.5 6.5c1.64 0 5-.38 6.71-1.07.52-.2.55-.82.12-1.17A10 10 0 0 0 4.26 18.33c.35.43.96.4 1.17-.12.69-1.71 1.07-5.07 1.07-6.71 1.34.45 3.1.9 4.88.62a.88.88 0 0 0 .73-.74c.3-2.14-.15-3.5-.61-4.88"}],["path",{d:"M15.62 16.95c.2.85.62 2.76.5 4.28a.77.77 0 0 1-.9.7 16.64 16.64 0 0 1-4.08-1.36"}],["path",{d:"M16.13 21.05c1.65.63 3.68.84 4.87.91a.9.9 0 0 0 .96-.96 17.68 17.68 0 0 0-.9-4.87"}],["path",{d:"M16.94 15.62c.86.2 2.77.62 4.29.5a.77.77 0 0 0 .7-.9 16.64 16.64 0 0 0-1.36-4.08"}],["path",{d:"M17.99 5.52a20.82 20.82 0 0 1 3.15 4.5.8.8 0 0 1-.68 1.13c-2.33.2-5.3-.32-8.27-1.57"}],["path",{d:"M4.93 4.93 3 3a.7.7 0 0 1 0-1"}],["path",{d:"M9.58 12.18c1.24 2.98 1.77 5.95 1.57 8.28a.8.8 0 0 1-1.13.68 20.82 20.82 0 0 1-4.5-3.15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n7=["svg",h,[["path",{d:"M12 6v4"}],["path",{d:"M14 14h-4"}],["path",{d:"M14 18h-4"}],["path",{d:"M14 8h-4"}],["path",{d:"M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"}],["path",{d:"M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o7=["svg",h,[["path",{d:"M10 22v-6.57"}],["path",{d:"M12 11h.01"}],["path",{d:"M12 7h.01"}],["path",{d:"M14 15.43V22"}],["path",{d:"M15 16a5 5 0 0 0-6 0"}],["path",{d:"M16 11h.01"}],["path",{d:"M16 7h.01"}],["path",{d:"M8 11h.01"}],["path",{d:"M8 7h.01"}],["rect",{x:"4",y:"2",width:"16",height:"20",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r7=["svg",h,[["path",{d:"M5 22h14"}],["path",{d:"M5 2h14"}],["path",{d:"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"}],["path",{d:"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=["svg",h,[["path",{d:"M12 17c5 0 8-2.69 8-6H4c0 3.31 3 6 8 6m-4 4h8m-4-3v3M5.14 11a3.5 3.5 0 1 1 6.71 0"}],["path",{d:"M12.14 11a3.5 3.5 0 1 1 6.71 0"}],["path",{d:"M15.5 6.5a3.5 3.5 0 1 0-7 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=["svg",h,[["path",{d:"m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11"}],["path",{d:"M17 7A5 5 0 0 0 7 7"}],["path",{d:"M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h7=["svg",h,[["path",{d:"M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"}],["path",{d:"m14 19 3 3v-5.5"}],["path",{d:"m17 22 3-3"}],["circle",{cx:"9",cy:"9",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c7=["svg",h,[["path",{d:"M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"}],["line",{x1:"16",x2:"22",y1:"5",y2:"5"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d7=["svg",h,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M10.41 10.41a2 2 0 1 1-2.83-2.83"}],["line",{x1:"13.5",x2:"6",y1:"13.5",y2:"21"}],["line",{x1:"18",x2:"21",y1:"12",y2:"15"}],["path",{d:"M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"}],["path",{d:"M21 15V5a2 2 0 0 0-2-2H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l7=["svg",h,[["path",{d:"m11 16-5 5"}],["path",{d:"M11 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6.5"}],["path",{d:"M15.765 22a.5.5 0 0 1-.765-.424V13.38a.5.5 0 0 1 .765-.424l5.878 3.674a1 1 0 0 1 0 1.696z"}],["circle",{cx:"9",cy:"9",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p7=["svg",h,[["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"}],["line",{x1:"16",x2:"22",y1:"5",y2:"5"}],["line",{x1:"19",x2:"19",y1:"2",y2:"8"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u7=["svg",h,[["path",{d:"M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"}],["path",{d:"m14 19.5 3-3 3 3"}],["path",{d:"M17 22v-5.5"}],["circle",{cx:"9",cy:"9",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g7=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["circle",{cx:"9",cy:"9",r:"2"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f7=["svg",h,[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"}],["circle",{cx:"12",cy:"8",r:"2"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M7=["svg",h,[["path",{d:"M12 3v12"}],["path",{d:"m8 11 4 4 4-4"}],["path",{d:"M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v7=["svg",h,[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=["svg",h,[["polyline",{points:"7 8 3 12 7 16"}],["line",{x1:"21",x2:"11",y1:"12",y2:"12"}],["line",{x1:"21",x2:"11",y1:"6",y2:"6"}],["line",{x1:"21",x2:"11",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=["svg",h,[["polyline",{points:"3 8 7 12 3 16"}],["line",{x1:"21",x2:"11",y1:"12",y2:"12"}],["line",{x1:"21",x2:"11",y1:"6",y2:"6"}],["line",{x1:"21",x2:"11",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m7=["svg",h,[["path",{d:"M6 3h12"}],["path",{d:"M6 8h12"}],["path",{d:"m6 13 8.5 8"}],["path",{d:"M6 13h3"}],["path",{d:"M9 13c6.667 0 6.667-10 0-10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y7=["svg",h,[["path",{d:"M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x7=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M12 16v-4"}],["path",{d:"M12 8h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _7=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 7h.01"}],["path",{d:"M17 7h.01"}],["path",{d:"M7 17h.01"}],["path",{d:"M17 17h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b7=["svg",h,[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w7=["svg",h,[["line",{x1:"19",x2:"10",y1:"4",y2:"4"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S7=["svg",h,[["path",{d:"M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8h8"}],["polyline",{points:"16 14 20 18 16 22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k7=["svg",h,[["path",{d:"M4 10c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8H4"}],["polyline",{points:"8 22 4 18 8 14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A7=["svg",h,[["path",{d:"M12 9.5V21m0-11.5L6 3m6 6.5L18 3"}],["path",{d:"M6 15h12"}],["path",{d:"M6 11h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C7=["svg",h,[["path",{d:"M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z"}],["path",{d:"M6 15v-2"}],["path",{d:"M12 15V9"}],["circle",{cx:"12",cy:"6",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L7=["svg",h,[["path",{d:"M6 5v11"}],["path",{d:"M12 5v6"}],["path",{d:"M18 5v14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P7=["svg",h,[["path",{d:"M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H7=["svg",h,[["path",{d:"M12.4 2.7c.9-.9 2.5-.9 3.4 0l5.5 5.5c.9.9.9 2.5 0 3.4l-3.7 3.7c-.9.9-2.5.9-3.4 0L8.7 9.8c-.9-.9-.9-2.5 0-3.4Z"}],["path",{d:"m14 7 3 3"}],["path",{d:"M9.4 10.6 2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V7=["svg",h,[["circle",{cx:"7.5",cy:"15.5",r:"5.5"}],["path",{d:"m21 2-9.6 9.6"}],["path",{d:"m15.5 7.5 3 3L22 7l-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T7=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M6 8h4"}],["path",{d:"M14 8h.01"}],["path",{d:"M18 8h.01"}],["path",{d:"M2 12h20"}],["path",{d:"M6 12v4"}],["path",{d:"M10 12v4"}],["path",{d:"M14 12v4"}],["path",{d:"M18 12v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E7=["svg",h,[["path",{d:"M 20 4 A2 2 0 0 1 22 6"}],["path",{d:"M 22 6 L 22 16.41"}],["path",{d:"M 7 16 L 16 16"}],["path",{d:"M 9.69 4 L 20 4"}],["path",{d:"M14 8h.01"}],["path",{d:"M18 8h.01"}],["path",{d:"m2 2 20 20"}],["path",{d:"M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"}],["path",{d:"M6 8h.01"}],["path",{d:"M8 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D7=["svg",h,[["path",{d:"M10 8h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M14 8h.01"}],["path",{d:"M16 12h.01"}],["path",{d:"M18 8h.01"}],["path",{d:"M6 8h.01"}],["path",{d:"M7 16h10"}],["path",{d:"M8 12h.01"}],["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O7=["svg",h,[["path",{d:"M12 2v5"}],["path",{d:"M6 7h12l4 9H2l4-9Z"}],["path",{d:"M9.17 16a3 3 0 1 0 5.66 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R7=["svg",h,[["path",{d:"m14 5-3 3 2 7 8-8-7-2Z"}],["path",{d:"m14 5-3 3-3-3 3-3 3 3Z"}],["path",{d:"M9.5 6.5 4 12l3 6"}],["path",{d:"M3 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H3Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I7=["svg",h,[["path",{d:"M9 2h6l3 7H6l3-7Z"}],["path",{d:"M12 9v13"}],["path",{d:"M9 22h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B7=["svg",h,[["path",{d:"M11 13h6l3 7H8l3-7Z"}],["path",{d:"M14 13V8a2 2 0 0 0-2-2H8"}],["path",{d:"M4 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4v6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F7=["svg",h,[["path",{d:"M11 4h6l3 7H8l3-7Z"}],["path",{d:"M14 11v5a2 2 0 0 1-2 2H8"}],["path",{d:"M4 15h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4v-6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z7=["svg",h,[["path",{d:"M8 2h8l4 10H4L8 2Z"}],["path",{d:"M12 12v6"}],["path",{d:"M8 22v-2c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2H8Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N7=["svg",h,[["path",{d:"m12 8 6-3-6-3v10"}],["path",{d:"m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"}],["path",{d:"m6.49 12.85 11.02 6.3"}],["path",{d:"M17.51 12.85 6.5 19.15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z7=["svg",h,[["line",{x1:"3",x2:"21",y1:"22",y2:"22"}],["line",{x1:"6",x2:"6",y1:"18",y2:"11"}],["line",{x1:"10",x2:"10",y1:"18",y2:"11"}],["line",{x1:"14",x2:"14",y1:"18",y2:"11"}],["line",{x1:"18",x2:"18",y1:"18",y2:"11"}],["polygon",{points:"12 2 20 7 4 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W7=["svg",h,[["path",{d:"m5 8 6 6"}],["path",{d:"m4 14 6-6 2-3"}],["path",{d:"M2 5h12"}],["path",{d:"M7 2h1"}],["path",{d:"m22 22-5-10-5 10"}],["path",{d:"M14 18h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=["svg",h,[["rect",{width:"18",height:"12",x:"3",y:"4",rx:"2",ry:"2"}],["line",{x1:"2",x2:"22",y1:"20",y2:"20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U7=["svg",h,[["path",{d:"M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q7=["svg",h,[["path",{d:"M7 22a5 5 0 0 1-2-4"}],["path",{d:"M7 16.93c.96.43 1.96.74 2.99.91"}],["path",{d:"M3.34 14A6.8 6.8 0 0 1 2 10c0-4.42 4.48-8 10-8s10 3.58 10 8a7.19 7.19 0 0 1-.33 2"}],["path",{d:"M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"}],["path",{d:"M14.33 22h-.09a.35.35 0 0 1-.24-.32v-10a.34.34 0 0 1 .33-.34c.08 0 .15.03.21.08l7.34 6a.33.33 0 0 1-.21.59h-4.49l-2.57 3.85a.35.35 0 0 1-.28.14v0z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $7=["svg",h,[["path",{d:"M7 22a5 5 0 0 1-2-4"}],["path",{d:"M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"}],["path",{d:"M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j7=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y7=["svg",h,[["path",{d:"m16.02 12 5.48 3.13a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74L7.98 12"}],["path",{d:"M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X7=["svg",h,[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"}],["path",{d:"m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"}],["path",{d:"m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G7=["svg",h,[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K7=["svg",h,[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J7=["svg",h,[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q7=["svg",h,[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1"}],["path",{d:"M14 4h7"}],["path",{d:"M14 9h7"}],["path",{d:"M14 15h7"}],["path",{d:"M14 20h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ty=["svg",h,[["rect",{width:"7",height:"18",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ey=["svg",h,[["rect",{width:"18",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ay=["svg",h,[["rect",{width:"18",height:"7",x:"3",y:"3",rx:"1"}],["rect",{width:"9",height:"7",x:"3",y:"14",rx:"1"}],["rect",{width:"5",height:"7",x:"16",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iy=["svg",h,[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sy=["svg",h,[["path",{d:"M2 22c1.25-.987 2.27-1.975 3.9-2.2a5.56 5.56 0 0 1 3.8 1.5 4 4 0 0 0 6.187-2.353 3.5 3.5 0 0 0 3.69-5.116A3.5 3.5 0 0 0 20.95 8 3.5 3.5 0 1 0 16 3.05a3.5 3.5 0 0 0-5.831 1.373 3.5 3.5 0 0 0-5.116 3.69 4 4 0 0 0-2.348 6.155C3.499 15.42 4.409 16.712 4.2 18.1 3.926 19.743 3.014 20.732 2 22"}],["path",{d:"M2 22 17 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ny=["svg",h,[["rect",{width:"8",height:"18",x:"3",y:"3",rx:"1"}],["path",{d:"M7 3v18"}],["path",{d:"M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oy=["svg",h,[["path",{d:"m16 6 4 14"}],["path",{d:"M12 6v14"}],["path",{d:"M8 8v12"}],["path",{d:"M4 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ry=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"m4.93 4.93 4.24 4.24"}],["path",{d:"m14.83 9.17 4.24-4.24"}],["path",{d:"m14.83 14.83 4.24 4.24"}],["path",{d:"m9.17 14.83-4.24 4.24"}],["circle",{cx:"12",cy:"12",r:"4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hy=["svg",h,[["path",{d:"M8 20V8c0-2.2 1.8-4 4-4 1.5 0 2.8.8 3.5 2"}],["path",{d:"M6 12h4"}],["path",{d:"M14 12h2v8"}],["path",{d:"M6 20h4"}],["path",{d:"M14 20h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cy=["svg",h,[["path",{d:"M16.8 11.2c.8-.9 1.2-2 1.2-3.2a6 6 0 0 0-9.3-5"}],["path",{d:"m2 2 20 20"}],["path",{d:"M6.3 6.3a4.67 4.67 0 0 0 1.2 5.2c.7.7 1.3 1.5 1.5 2.5"}],["path",{d:"M9 18h6"}],["path",{d:"M10 22h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dy=["svg",h,[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"}],["path",{d:"M9 18h6"}],["path",{d:"M10 22h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ly=["svg",h,[["path",{d:"M3 3v18h18"}],["path",{d:"m19 9-5 5-4-4-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const py=["svg",h,[["path",{d:"M9 17H7A5 5 0 0 1 7 7"}],["path",{d:"M15 7h2a5 5 0 0 1 4 8"}],["line",{x1:"8",x2:"12",y1:"12",y2:"12"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uy=["svg",h,[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gy=["svg",h,[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fy=["svg",h,[["path",{d:"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"}],["rect",{width:"4",height:"12",x:"2",y:"9"}],["circle",{cx:"4",cy:"4",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const My=["svg",h,[["path",{d:"m3 17 2 2 4-4"}],["path",{d:"m3 7 2 2 4-4"}],["path",{d:"M13 6h8"}],["path",{d:"M13 12h8"}],["path",{d:"M13 18h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vy=["svg",h,[["path",{d:"m3 10 2.5-2.5L3 5"}],["path",{d:"m3 19 2.5-2.5L3 14"}],["path",{d:"M10 6h11"}],["path",{d:"M10 12h11"}],["path",{d:"M10 18h11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const my=["svg",h,[["path",{d:"M16 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M10 18H3"}],["path",{d:"M21 6v10a2 2 0 0 1-2 2h-5"}],["path",{d:"m16 16-2 2 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yy=["svg",h,[["path",{d:"M3 6h18"}],["path",{d:"M7 12h10"}],["path",{d:"M10 18h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xy=["svg",h,[["path",{d:"M11 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M16 18H3"}],["path",{d:"M21 12h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _y=["svg",h,[["path",{d:"M21 15V6"}],["path",{d:"M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"}],["path",{d:"M12 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M12 18H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const by=["svg",h,[["line",{x1:"10",x2:"21",y1:"6",y2:"6"}],["line",{x1:"10",x2:"21",y1:"12",y2:"12"}],["line",{x1:"10",x2:"21",y1:"18",y2:"18"}],["path",{d:"M4 6h1v4"}],["path",{d:"M4 10h2"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wy=["svg",h,[["path",{d:"M11 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M16 18H3"}],["path",{d:"M18 9v6"}],["path",{d:"M21 12h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sy=["svg",h,[["path",{d:"M21 6H3"}],["path",{d:"M7 12H3"}],["path",{d:"M7 18H3"}],["path",{d:"M12 18a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L11 14"}],["path",{d:"M11 10v4h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ky=["svg",h,[["path",{d:"M16 12H3"}],["path",{d:"M16 18H3"}],["path",{d:"M10 6H3"}],["path",{d:"M21 18V8a2 2 0 0 0-2-2h-5"}],["path",{d:"m16 8-2-2 2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ay=["svg",h,[["rect",{x:"3",y:"5",width:"6",height:"6",rx:"1"}],["path",{d:"m3 17 2 2 4-4"}],["path",{d:"M13 6h8"}],["path",{d:"M13 12h8"}],["path",{d:"M13 18h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cy=["svg",h,[["path",{d:"M21 12h-8"}],["path",{d:"M21 6H8"}],["path",{d:"M21 18h-8"}],["path",{d:"M3 6v4c0 1.1.9 2 2 2h3"}],["path",{d:"M3 10v6c0 1.1.9 2 2 2h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ly=["svg",h,[["path",{d:"M12 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M12 18H3"}],["path",{d:"m16 12 5 3-5 3v-6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Py=["svg",h,[["path",{d:"M11 12H3"}],["path",{d:"M16 6H3"}],["path",{d:"M16 18H3"}],["path",{d:"m19 10-4 4"}],["path",{d:"m15 10 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hy=["svg",h,[["line",{x1:"8",x2:"21",y1:"6",y2:"6"}],["line",{x1:"8",x2:"21",y1:"12",y2:"12"}],["line",{x1:"8",x2:"21",y1:"18",y2:"18"}],["line",{x1:"3",x2:"3.01",y1:"6",y2:"6"}],["line",{x1:"3",x2:"3.01",y1:"12",y2:"12"}],["line",{x1:"3",x2:"3.01",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=["svg",h,[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vy=["svg",h,[["path",{d:"M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5 2.2 5 5 5 5-2.2 5-5"}],["path",{d:"M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"}],["path",{d:"M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"}],["circle",{cx:"12",cy:"12",r:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ty=["svg",h,[["path",{d:"M12 2v4"}],["path",{d:"m16.2 7.8 2.9-2.9"}],["path",{d:"M18 12h4"}],["path",{d:"m16.2 16.2 2.9 2.9"}],["path",{d:"M12 18v4"}],["path",{d:"m4.9 19.1 2.9-2.9"}],["path",{d:"M2 12h4"}],["path",{d:"m4.9 4.9 2.9 2.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ey=["svg",h,[["line",{x1:"2",x2:"5",y1:"12",y2:"12"}],["line",{x1:"19",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"5"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}],["circle",{cx:"12",cy:"12",r:"7"}],["circle",{cx:"12",cy:"12",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dy=["svg",h,[["line",{x1:"2",x2:"5",y1:"12",y2:"12"}],["line",{x1:"19",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"5"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}],["path",{d:"M7.11 7.11C5.83 8.39 5 10.1 5 12c0 3.87 3.13 7 7 7 1.9 0 3.61-.83 4.89-2.11"}],["path",{d:"M18.71 13.96c.19-.63.29-1.29.29-1.96 0-3.87-3.13-7-7-7-.67 0-1.33.1-1.96.29"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oy=["svg",h,[["line",{x1:"2",x2:"5",y1:"12",y2:"12"}],["line",{x1:"19",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"5"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}],["circle",{cx:"12",cy:"12",r:"7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=["svg",h,[["circle",{cx:"12",cy:"16",r:"1"}],["rect",{width:"18",height:"12",x:"3",y:"10",rx:"2"}],["path",{d:"M7 10V7a5 5 0 0 1 9.33-2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ry=["svg",h,[["circle",{cx:"12",cy:"16",r:"1"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=["svg",h,[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iy=["svg",h,[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const By=["svg",h,[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"}],["polyline",{points:"10 17 15 12 10 7"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fy=["svg",h,[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}],["polyline",{points:"16 17 21 12 16 7"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zy=["svg",h,[["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}],["path",{d:"M11 11a2 2 0 0 0 4 0 4 4 0 0 0-8 0 6 6 0 0 0 12 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ny=["svg",h,[["path",{d:"M6 20h0a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h0"}],["path",{d:"M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14"}],["path",{d:"M10 20h4"}],["circle",{cx:"16",cy:"20",r:"2"}],["circle",{cx:"8",cy:"20",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zy=["svg",h,[["path",{d:"m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"}],["path",{d:"m5 8 4 4"}],["path",{d:"m12 15 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wy=["svg",h,[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"m16 19 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uy=["svg",h,[["path",{d:"M22 15V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M16 19h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qy=["svg",h,[["path",{d:"M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"}],["path",{d:"m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $y=["svg",h,[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M19 16v6"}],["path",{d:"M16 19h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jy=["svg",h,[["path",{d:"M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M18 15.28c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"}],["path",{d:"M20 22v.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yy=["svg",h,[["path",{d:"M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h7.5"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6v0Z"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m22 22-1.5-1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xy=["svg",h,[["path",{d:"M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"M20 14v4"}],["path",{d:"M20 22v.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gy=["svg",h,[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}],["path",{d:"m17 17 4 4"}],["path",{d:"m21 17-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ky=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jy=["svg",h,[["path",{d:"M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"}],["polyline",{points:"15,9 18,9 18,11"}],["path",{d:"M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2v0"}],["line",{x1:"6",x2:"7",y1:"10",y2:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qy=["svg",h,[["rect",{width:"16",height:"13",x:"6",y:"4",rx:"2"}],["path",{d:"m22 7-7.1 3.78c-.57.3-1.23.3-1.8 0L6 7"}],["path",{d:"M2 8v11c0 1.1.9 2 2 2h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t9=["svg",h,[["path",{d:"M5.43 5.43A8.06 8.06 0 0 0 4 10c0 6 8 12 8 12a29.94 29.94 0 0 0 5-5"}],["path",{d:"M19.18 13.52A8.66 8.66 0 0 0 20 10a8 8 0 0 0-8-8 7.88 7.88 0 0 0-3.52.82"}],["path",{d:"M9.13 9.13A2.78 2.78 0 0 0 9 10a3 3 0 0 0 3 3 2.78 2.78 0 0 0 .87-.13"}],["path",{d:"M14.9 9.25a3 3 0 0 0-2.15-2.16"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e9=["svg",h,[["path",{d:"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"}],["circle",{cx:"12",cy:"10",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a9=["svg",h,[["path",{d:"M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0"}],["circle",{cx:"12",cy:"8",r:"2"}],["path",{d:"M8.835 14H5a1 1 0 0 0-.9.7l-2 6c-.1.1-.1.2-.1.3 0 .6.4 1 1 1h18c.6 0 1-.4 1-1 0-.1 0-.2-.1-.3l-2-6a1 1 0 0 0-.9-.7h-3.835"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i9=["svg",h,[["path",{d:"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"}],["path",{d:"M15 5.764v15"}],["path",{d:"M9 3.236v15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s9=["svg",h,[["path",{d:"M8 22h8"}],["path",{d:"M12 11v11"}],["path",{d:"m19 3-7 8-7-8Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n9=["svg",h,[["polyline",{points:"15 3 21 3 21 9"}],["polyline",{points:"9 21 3 21 3 15"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o9=["svg",h,[["path",{d:"M8 3H5a2 2 0 0 0-2 2v3"}],["path",{d:"M21 8V5a2 2 0 0 0-2-2h-3"}],["path",{d:"M3 16v3a2 2 0 0 0 2 2h3"}],["path",{d:"M16 21h3a2 2 0 0 0 2-2v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r9=["svg",h,[["path",{d:"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"}],["path",{d:"M11 12 5.12 2.2"}],["path",{d:"m13 12 5.88-9.8"}],["path",{d:"M8 7h8"}],["circle",{cx:"12",cy:"17",r:"5"}],["path",{d:"M12 18v-2h-.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h9=["svg",h,[["path",{d:"M9.26 9.26 3 11v3l14.14 3.14"}],["path",{d:"M21 15.34V6l-7.31 2.03"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c9=["svg",h,[["path",{d:"m3 11 18-5v12L3 14v-3z"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d9=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["line",{x1:"8",x2:"16",y1:"15",y2:"15"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l9=["svg",h,[["path",{d:"M6 19v-3"}],["path",{d:"M10 19v-3"}],["path",{d:"M14 19v-3"}],["path",{d:"M18 19v-3"}],["path",{d:"M8 11V9"}],["path",{d:"M16 11V9"}],["path",{d:"M12 11V9"}],["path",{d:"M2 15h20"}],["path",{d:"M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p9=["svg",h,[["line",{x1:"4",x2:"20",y1:"12",y2:"12"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u9=["svg",h,[["path",{d:"m8 6 4-4 4 4"}],["path",{d:"M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"}],["path",{d:"m20 22-5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g9=["svg",h,[["path",{d:"M10 9.5 8 12l2 2.5"}],["path",{d:"m14 9.5 2 2.5-2 2.5"}],["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f9=["svg",h,[["path",{d:"M13.5 3.1c-.5 0-1-.1-1.5-.1s-1 .1-1.5.1"}],["path",{d:"M19.3 6.8a10.45 10.45 0 0 0-2.1-2.1"}],["path",{d:"M20.9 13.5c.1-.5.1-1 .1-1.5s-.1-1-.1-1.5"}],["path",{d:"M17.2 19.3a10.45 10.45 0 0 0 2.1-2.1"}],["path",{d:"M10.5 20.9c.5.1 1 .1 1.5.1s1-.1 1.5-.1"}],["path",{d:"M3.5 17.5 2 22l4.5-1.5"}],["path",{d:"M3.1 10.5c0 .5-.1 1-.1 1.5s.1 1 .1 1.5"}],["path",{d:"M6.8 4.7a10.45 10.45 0 0 0-2.1 2.1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M15.8 9.2a2.5 2.5 0 0 0-3.5 0l-.3.4-.35-.3a2.42 2.42 0 1 0-3.2 3.6l3.6 3.5 3.6-3.5c1.2-1.2 1.1-2.7.2-3.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M8 12h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M16 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m9=["svg",h,[["path",{d:"M20.5 14.9A9 9 0 0 0 9.1 3.5"}],["path",{d:"m2 2 20 20"}],["path",{d:"M5.6 5.6C3 8.3 2.2 12.5 4 16l-2 6 6-2c3.4 1.8 7.6 1.1 10.3-1.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"m10 15-3-3 3-3"}],["path",{d:"M7 12h7a2 2 0 0 1 2 2v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"M12 8v4"}],["path",{d:"M12 16h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S9=["svg",h,[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k9=["svg",h,[["path",{d:"M10 7.5 8 10l2 2.5"}],["path",{d:"m14 7.5 2 2.5-2 2.5"}],["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A9=["svg",h,[["path",{d:"M3 6V5c0-1.1.9-2 2-2h2"}],["path",{d:"M11 3h3"}],["path",{d:"M18 3h1c1.1 0 2 .9 2 2"}],["path",{d:"M21 9v2"}],["path",{d:"M21 15c0 1.1-.9 2-2 2h-1"}],["path",{d:"M14 17h-3"}],["path",{d:"m7 17-4 4v-5"}],["path",{d:"M3 12v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C9=["svg",h,[["path",{d:"m5 19-2 2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"}],["path",{d:"M9 10h6"}],["path",{d:"M12 7v6"}],["path",{d:"M9 17h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L9=["svg",h,[["path",{d:"M11.7 3H5a2 2 0 0 0-2 2v16l4-4h12a2 2 0 0 0 2-2v-2.7"}],["circle",{cx:"18",cy:"6",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M14.8 7.5a1.84 1.84 0 0 0-2.6 0l-.2.3-.3-.3a1.84 1.84 0 1 0-2.4 2.8L12 13l2.7-2.7c.9-.9.8-2.1.1-2.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M8 10h.01"}],["path",{d:"M12 10h.01"}],["path",{d:"M16 10h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V9=["svg",h,[["path",{d:"M21 15V5a2 2 0 0 0-2-2H9"}],["path",{d:"m2 2 20 20"}],["path",{d:"M3.6 3.6c-.4.3-.6.8-.6 1.4v16l4-4h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M12 7v6"}],["path",{d:"M9 10h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M8 12a2 2 0 0 0 2-2V8H8"}],["path",{d:"M14 12a2 2 0 0 0 2-2V8h-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"m10 7-3 3 3 3"}],["path",{d:"M17 13v-1a2 2 0 0 0-2-2H7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O9=["svg",h,[["path",{d:"M21 12v3a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h7"}],["path",{d:"M16 3h5v5"}],["path",{d:"m16 8 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M13 8H7"}],["path",{d:"M17 12H7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"M12 7v2"}],["path",{d:"M12 13h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}],["path",{d:"m14.5 7.5-5 5"}],["path",{d:"m9.5 7.5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F9=["svg",h,[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z9=["svg",h,[["path",{d:"M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N9=["svg",h,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=["svg",h,[["path",{d:"m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12"}],["circle",{cx:"17",cy:"7",r:"5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z9=["svg",h,[["path",{d:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W9=["svg",h,[["path",{d:"M6 18h8"}],["path",{d:"M3 22h18"}],["path",{d:"M14 22a7 7 0 1 0 0-14h-1"}],["path",{d:"M9 14h2"}],["path",{d:"M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"}],["path",{d:"M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U9=["svg",h,[["rect",{width:"20",height:"15",x:"2",y:"4",rx:"2"}],["rect",{width:"8",height:"7",x:"6",y:"8",rx:"1"}],["path",{d:"M18 8v7"}],["path",{d:"M6 19v2"}],["path",{d:"M18 19v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q9=["svg",h,[["path",{d:"M18 6H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13l4-3.5L18 6Z"}],["path",{d:"M12 13v8"}],["path",{d:"M12 3v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $9=["svg",h,[["path",{d:"M8 2h8"}],["path",{d:"M9 2v1.343M15 2v2.789a4 4 0 0 0 .672 2.219l.656.984a4 4 0 0 1 .672 2.22v1.131M7.8 7.8l-.128.192A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3"}],["path",{d:"M7 15a6.47 6.47 0 0 1 5 0 6.472 6.472 0 0 0 3.435.435"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j9=["svg",h,[["path",{d:"M8 2h8"}],["path",{d:"M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2"}],["path",{d:"M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y9=["svg",h,[["polyline",{points:"4 14 10 14 10 20"}],["polyline",{points:"20 10 14 10 14 4"}],["line",{x1:"14",x2:"21",y1:"10",y2:"3"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X9=["svg",h,[["path",{d:"M8 3v3a2 2 0 0 1-2 2H3"}],["path",{d:"M21 8h-3a2 2 0 0 1-2-2V3"}],["path",{d:"M3 16h3a2 2 0 0 1 2 2v3"}],["path",{d:"M16 21v-3a2 2 0 0 1 2-2h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G9=["svg",h,[["path",{d:"M5 12h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K9=["svg",h,[["path",{d:"m9 10 2 2 4-4"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J9=["svg",h,[["circle",{cx:"19",cy:"6",r:"3"}],["path",{d:"M22 12v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q9=["svg",h,[["path",{d:"M12 13V7"}],["path",{d:"m15 10-3 3-3-3"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tx=["svg",h,[["path",{d:"M17 17H4a2 2 0 0 1-2-2V5c0-1.5 1-2 1-2"}],["path",{d:"M22 15V5a2 2 0 0 0-2-2H9"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ex=["svg",h,[["path",{d:"M10 13V7"}],["path",{d:"M14 13V7"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ax=["svg",h,[["path",{d:"M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}],["rect",{x:"2",y:"3",width:"20",height:"14",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ix=["svg",h,[["path",{d:"M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"}],["path",{d:"M10 19v-3.96 3.15"}],["path",{d:"M7 19h5"}],["rect",{width:"6",height:"10",x:"16",y:"12",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sx=["svg",h,[["path",{d:"M5.5 20H8"}],["path",{d:"M17 9h.01"}],["rect",{width:"10",height:"16",x:"12",y:"4",rx:"2"}],["path",{d:"M8 6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4"}],["circle",{cx:"17",cy:"15",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nx=["svg",h,[["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}],["rect",{x:"2",y:"3",width:"20",height:"14",rx:"2"}],["rect",{x:"9",y:"7",width:"6",height:"6",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ox=["svg",h,[["path",{d:"m9 10 3-3 3 3"}],["path",{d:"M12 13V7"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rx=["svg",h,[["path",{d:"m14.5 12.5-5-5"}],["path",{d:"m9.5 12.5 5-5"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["path",{d:"M12 17v4"}],["path",{d:"M8 21h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hx=["svg",h,[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cx=["svg",h,[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"}],["path",{d:"M20 3v4"}],["path",{d:"M22 5h-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dx=["svg",h,[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lx=["svg",h,[["path",{d:"m8 3 4 8 5-5 5 15H2L8 3z"}],["path",{d:"M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const px=["svg",h,[["path",{d:"m8 3 4 8 5-5 5 15H2L8 3z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ux=["svg",h,[["path",{d:"M12 6v.343"}],["path",{d:"M18.218 18.218A7 7 0 0 1 5 15V9a7 7 0 0 1 .782-3.218"}],["path",{d:"M19 13.343V9A7 7 0 0 0 8.56 2.902"}],["path",{d:"M22 22 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gx=["svg",h,[["path",{d:"m4 4 7.07 17 2.51-7.39L21 11.07z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fx=["svg",h,[["path",{d:"m2 2 4 11 2-5 5-2Z"}],["circle",{cx:"16",cy:"16",r:"6"}],["path",{d:"m11.8 11.8 8.4 8.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mx=["svg",h,[["path",{d:"m9 9 5 12 1.8-5.2L21 14Z"}],["path",{d:"M7.2 2.2 8 5.1"}],["path",{d:"m5.1 8-2.9-.8"}],["path",{d:"M14 4.1 12 6"}],["path",{d:"m6 12-1.9 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vx=["svg",h,[["path",{d:"m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"}],["path",{d:"m13 13 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mx=["svg",h,[["rect",{x:"5",y:"2",width:"14",height:"20",rx:"7"}],["path",{d:"M12 6v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=["svg",h,[["path",{d:"M5 3v16h16"}],["path",{d:"m5 19 6-6"}],["path",{d:"m2 6 3-3 3 3"}],["path",{d:"m18 16 3 3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yx=["svg",h,[["polyline",{points:"5 11 5 5 11 5"}],["polyline",{points:"19 13 19 19 13 19"}],["line",{x1:"5",x2:"19",y1:"5",y2:"19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xx=["svg",h,[["polyline",{points:"13 5 19 5 19 11"}],["polyline",{points:"11 19 5 19 5 13"}],["line",{x1:"19",x2:"5",y1:"5",y2:"19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _x=["svg",h,[["path",{d:"M11 19H5V13"}],["path",{d:"M19 5L5 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bx=["svg",h,[["path",{d:"M19 13V19H13"}],["path",{d:"M5 5L19 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wx=["svg",h,[["path",{d:"M8 18L12 22L16 18"}],["path",{d:"M12 2V22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sx=["svg",h,[["polyline",{points:"18 8 22 12 18 16"}],["polyline",{points:"6 8 2 12 6 16"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kx=["svg",h,[["path",{d:"M6 8L2 12L6 16"}],["path",{d:"M2 12H22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ax=["svg",h,[["path",{d:"M18 8L22 12L18 16"}],["path",{d:"M2 12H22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cx=["svg",h,[["path",{d:"M5 11V5H11"}],["path",{d:"M5 5L19 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lx=["svg",h,[["path",{d:"M13 5H19V11"}],["path",{d:"M19 5L5 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Px=["svg",h,[["path",{d:"M8 6L12 2L16 6"}],["path",{d:"M12 2V22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hx=["svg",h,[["polyline",{points:"8 18 12 22 16 18"}],["polyline",{points:"8 6 12 2 16 6"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vx=["svg",h,[["polyline",{points:"5 9 2 12 5 15"}],["polyline",{points:"9 5 12 2 15 5"}],["polyline",{points:"15 19 12 22 9 19"}],["polyline",{points:"19 9 22 12 19 15"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tx=["svg",h,[["circle",{cx:"8",cy:"18",r:"4"}],["path",{d:"M12 18V2l7 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ex=["svg",h,[["circle",{cx:"12",cy:"18",r:"4"}],["path",{d:"M16 18V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dx=["svg",h,[["path",{d:"M9 18V5l12-2v13"}],["path",{d:"m9 9 12-2"}],["circle",{cx:"6",cy:"18",r:"3"}],["circle",{cx:"18",cy:"16",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ox=["svg",h,[["path",{d:"M9 18V5l12-2v13"}],["circle",{cx:"6",cy:"18",r:"3"}],["circle",{cx:"18",cy:"16",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rx=["svg",h,[["path",{d:"M9.31 9.31 5 21l7-4 7 4-1.17-3.17"}],["path",{d:"M14.53 8.88 12 2l-1.17 3.17"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ix=["svg",h,[["polygon",{points:"12 2 19 21 12 17 5 21 12 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=["svg",h,[["path",{d:"M8.43 8.43 3 11l8 2 2 8 2.57-5.43"}],["path",{d:"M17.39 11.73 22 2l-9.73 4.61"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fx=["svg",h,[["polygon",{points:"3 11 22 2 13 21 11 13 3 11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zx=["svg",h,[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"}],["path",{d:"M12 12V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nx=["svg",h,[["path",{d:"M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"}],["path",{d:"M18 14h-8"}],["path",{d:"M15 18h-5"}],["path",{d:"M10 6h8v4h-8V6Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zx=["svg",h,[["path",{d:"M6 8.32a7.43 7.43 0 0 1 0 7.36"}],["path",{d:"M9.46 6.21a11.76 11.76 0 0 1 0 11.58"}],["path",{d:"M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"}],["path",{d:"M16.37 2a20.16 20.16 0 0 1 0 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wx=["svg",h,[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"}],["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["path",{d:"M18.4 2.6a2.17 2.17 0 0 1 3 3L16 11l-4 1 1-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ux=["svg",h,[["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M15 2v20"}],["path",{d:"M15 7h5"}],["path",{d:"M15 12h5"}],["path",{d:"M15 17h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qx=["svg",h,[["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M9.5 8h5"}],["path",{d:"M9.5 12H16"}],["path",{d:"M9.5 16H14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $x=["svg",h,[["path",{d:"M2 6h4"}],["path",{d:"M2 10h4"}],["path",{d:"M2 14h4"}],["path",{d:"M2 18h4"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M16 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jx=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M12 2v4"}],["path",{d:"M16 2v4"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v2"}],["path",{d:"M20 12v2"}],["path",{d:"M20 18v2a2 2 0 0 1-2 2h-1"}],["path",{d:"M13 22h-2"}],["path",{d:"M7 22H6a2 2 0 0 1-2-2v-2"}],["path",{d:"M4 14v-2"}],["path",{d:"M4 8V6a2 2 0 0 1 2-2h2"}],["path",{d:"M8 10h6"}],["path",{d:"M8 14h8"}],["path",{d:"M8 18h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yx=["svg",h,[["path",{d:"M8 2v4"}],["path",{d:"M12 2v4"}],["path",{d:"M16 2v4"}],["rect",{width:"16",height:"18",x:"4",y:"4",rx:"2"}],["path",{d:"M8 10h6"}],["path",{d:"M8 14h8"}],["path",{d:"M8 18h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xx=["svg",h,[["path",{d:"M12 4V2"}],["path",{d:"M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592a7.01 7.01 0 0 0 4.125-2.939"}],["path",{d:"M19 10v3.343"}],["path",{d:"M12 12c-1.349-.573-1.905-1.005-2.5-2-.546.902-1.048 1.353-2.5 2-1.018-.644-1.46-1.08-2-2-1.028.71-1.69.918-3 1 1.081-1.048 1.757-2.03 2-3 .194-.776.84-1.551 1.79-2.21m11.654 5.997c.887-.457 1.28-.891 1.556-1.787 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4-.74 0-1.461.068-2.15.192"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gx=["svg",h,[["path",{d:"M12 4V2"}],["path",{d:"M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592A7.003 7.003 0 0 0 19 14v-4"}],["path",{d:"M12 4C8 4 4.5 6 4 8c-.243.97-.919 1.952-2 3 1.31-.082 1.972-.29 3-1 .54.92.982 1.356 2 2 1.452-.647 1.954-1.098 2.5-2 .595.995 1.151 1.427 2.5 2 1.31-.621 1.862-1.058 2.5-2 .629.977 1.162 1.423 2.5 2 1.209-.548 1.68-.967 2-2 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=["svg",h,[["polygon",{points:"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=["svg",h,[["path",{d:"M10 15V9"}],["path",{d:"M14 15V9"}],["path",{d:"M7.714 2h8.572L22 7.714v8.572L16.286 22H7.714L2 16.286V7.714z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=["svg",h,[["polygon",{points:"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kx=["svg",h,[["polygon",{points:"7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jx=["svg",h,[["path",{d:"M3 3h6l6 18h6"}],["path",{d:"M14 3h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qx=["svg",h,[["circle",{cx:"12",cy:"12",r:"3"}],["circle",{cx:"19",cy:"5",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M10.4 21.9a10 10 0 0 0 9.941-15.416"}],["path",{d:"M13.5 2.1a10 10 0 0 0-9.841 15.416"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t_=["svg",h,[["path",{d:"M12 12V4a1 1 0 0 1 1-1h6.297a1 1 0 0 1 .651 1.759l-4.696 4.025"}],["path",{d:"m12 21-7.414-7.414A2 2 0 0 1 4 12.172V6.415a1.002 1.002 0 0 1 1.707-.707L20 20.009"}],["path",{d:"m12.214 3.381 8.414 14.966a1 1 0 0 1-.167 1.199l-1.168 1.163a1 1 0 0 1-.706.291H6.351a1 1 0 0 1-.625-.219L3.25 18.8a1 1 0 0 1 .631-1.781l4.165.027"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e_=["svg",h,[["path",{d:"M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"}],["path",{d:"m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"}],["path",{d:"M12 3v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a_=["svg",h,[["path",{d:"m16 16 2 2 4-4"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i_=["svg",h,[["path",{d:"M16 16h6"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s_=["svg",h,[["path",{d:"M12 22v-9"}],["path",{d:"M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"}],["path",{d:"M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"}],["path",{d:"M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n_=["svg",h,[["path",{d:"M16 16h6"}],["path",{d:"M19 13v6"}],["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o_=["svg",h,[["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}],["circle",{cx:"18.5",cy:"15.5",r:"2.5"}],["path",{d:"M20.27 17.27 22 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r_=["svg",h,[["path",{d:"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"}],["path",{d:"m7.5 4.27 9 5.15"}],["polyline",{points:"3.29 7 12 12 20.71 7"}],["line",{x1:"12",x2:"12",y1:"22",y2:"12"}],["path",{d:"m17 13 5 5m-5 0 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h_=["svg",h,[["path",{d:"m7.5 4.27 9 5.15"}],["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"}],["path",{d:"m3.3 7 8.7 5 8.7-5"}],["path",{d:"M12 22V12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c_=["svg",h,[["path",{d:"m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"}],["path",{d:"m5 2 5 5"}],["path",{d:"M2 13h15"}],["path",{d:"M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d_=["svg",h,[["rect",{width:"16",height:"6",x:"2",y:"2",rx:"2"}],["path",{d:"M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"}],["rect",{width:"4",height:"6",x:"8",y:"16",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l_=["svg",h,[["path",{d:"M14 19.9V16h3a2 2 0 0 0 2-2v-2H5v2c0 1.1.9 2 2 2h3v3.9a2 2 0 1 0 4 0Z"}],["path",{d:"M6 12V2h12v10"}],["path",{d:"M14 2v4"}],["path",{d:"M10 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p_=["svg",h,[["path",{d:"M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"}],["path",{d:"M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"}],["path",{d:"M14.5 17.5 4.5 15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u_=["svg",h,[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h18"}],["path",{d:"m15 8-3 3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M14 15h1"}],["path",{d:"M19 15h2"}],["path",{d:"M3 15h2"}],["path",{d:"M9 15h1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h18"}],["path",{d:"m9 10 3-3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"m16 15-3-3 3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 14v1"}],["path",{d:"M9 19v2"}],["path",{d:"M9 3v2"}],["path",{d:"M9 9v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"m14 9 3 3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 3v18"}],["path",{d:"m8 9 3 3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 14v1"}],["path",{d:"M15 19v2"}],["path",{d:"M15 3v2"}],["path",{d:"M15 9v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 3v18"}],["path",{d:"m10 15-3-3 3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M15 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"m9 16 3-3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M14 9h1"}],["path",{d:"M19 9h2"}],["path",{d:"M3 9h2"}],["path",{d:"M9 9h1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const __=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"m15 14-3 3-3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 3v18"}],["path",{d:"M9 15h12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S_=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 15h12"}],["path",{d:"M15 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M9 21V9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k_=["svg",h,[["path",{d:"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A_=["svg",h,[["path",{d:"M8 21s-4-3-4-9 4-9 4-9"}],["path",{d:"M16 3s4 3 4 9-4 9-4 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C_=["svg",h,[["path",{d:"M9 9a3 3 0 1 1 6 0"}],["path",{d:"M12 12v3"}],["path",{d:"M11 15h2"}],["path",{d:"M19 9a7 7 0 1 0-13.6 2.3C6.4 14.4 8 19 8 19h8s1.6-4.6 2.6-7.7c.3-.8.4-1.5.4-2.3"}],["path",{d:"M12 19v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L_=["svg",h,[["path",{d:"M5.8 11.3 2 22l10.7-3.79"}],["path",{d:"M4 3h.01"}],["path",{d:"M22 8h.01"}],["path",{d:"M15 2h.01"}],["path",{d:"M22 20h.01"}],["path",{d:"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"}],["path",{d:"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"}],["path",{d:"m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"}],["path",{d:"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P_=["svg",h,[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H_=["svg",h,[["circle",{cx:"11",cy:"4",r:"2"}],["circle",{cx:"18",cy:"8",r:"2"}],["circle",{cx:"20",cy:"16",r:"2"}],["path",{d:"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V_=["svg",h,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2"}],["path",{d:"M15 14h.01"}],["path",{d:"M9 6h6"}],["path",{d:"M9 10h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=["svg",h,[["path",{d:"M12 20h9"}],["path",{d:"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T_=["svg",h,[["path",{d:"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"}],["path",{d:"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"}],["path",{d:"m2.3 2.3 7.286 7.286"}],["circle",{cx:"11",cy:"11",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=["svg",h,[["path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E_=["svg",h,[["path",{d:"M12 20h9"}],["path",{d:"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"}],["path",{d:"m15 5 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D_=["svg",h,[["path",{d:"m15 5 4 4"}],["path",{d:"M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"}],["path",{d:"m8 6 2-2"}],["path",{d:"m2 22 5.5-1.5L21.17 6.83a2.82 2.82 0 0 0-4-4L3.5 16.5Z"}],["path",{d:"m18 16 2-2"}],["path",{d:"m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O_=["svg",h,[["path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"}],["path",{d:"m15 5 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R_=["svg",h,[["path",{d:"M3.5 8.7c-.7.5-1 1.4-.7 2.2l2.8 8.7c.3.8 1 1.4 1.9 1.4h9.1c.9 0 1.6-.6 1.9-1.4l2.8-8.7c.3-.8 0-1.7-.7-2.2l-7.4-5.3a2.1 2.1 0 0 0-2.4 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I_=["svg",h,[["line",{x1:"19",x2:"5",y1:"5",y2:"19"}],["circle",{cx:"6.5",cy:"6.5",r:"2.5"}],["circle",{cx:"17.5",cy:"17.5",r:"2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B_=["svg",h,[["circle",{cx:"12",cy:"5",r:"1"}],["path",{d:"m9 20 3-6 3 6"}],["path",{d:"m6 8 6 2 6-2"}],["path",{d:"M12 10v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F_=["svg",h,[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z_=["svg",h,[["polyline",{points:"18 2 22 6 18 10"}],["line",{x1:"14",x2:"22",y1:"6",y2:"6"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N_=["svg",h,[["polyline",{points:"16 2 16 8 22 8"}],["line",{x1:"22",x2:"16",y1:"2",y2:"8"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z_=["svg",h,[["line",{x1:"22",x2:"16",y1:"2",y2:"8"}],["line",{x1:"16",x2:"22",y1:"2",y2:"8"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W_=["svg",h,[["path",{d:"M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"}],["line",{x1:"22",x2:"2",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U_=["svg",h,[["polyline",{points:"22 8 22 2 16 2"}],["line",{x1:"16",x2:"22",y1:"8",y2:"2"}],["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q_=["svg",h,[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $_=["svg",h,[["line",{x1:"9",x2:"9",y1:"4",y2:"20"}],["path",{d:"M4 7c0-1.7 1.3-3 3-3h13"}],["path",{d:"M18 20c-1.7 0-3-1.3-3-3V4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j_=["svg",h,[["path",{d:"M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8"}],["path",{d:"M2 14h20"}],["path",{d:"M6 14v4"}],["path",{d:"M10 14v4"}],["path",{d:"M14 14v4"}],["path",{d:"M18 14v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y_=["svg",h,[["path",{d:"M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912"}],["path",{d:"M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393"}],["path",{d:"M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"}],["path",{d:"M19.686 8.314a12.501 12.501 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X_=["svg",h,[["path",{d:"M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"}],["rect",{width:"10",height:"7",x:"12",y:"13",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G_=["svg",h,[["path",{d:"M8 4.5v5H3m-1-6 6 6m13 0v-3c0-1.16-.84-2-2-2h-7m-9 9v2c0 1.05.95 2 2 2h3"}],["rect",{width:"10",height:"7",x:"12",y:"13.5",ry:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K_=["svg",h,[["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83"}],["path",{d:"M22 12A10 10 0 0 0 12 2v10z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J_=["svg",h,[["path",{d:"M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"}],["path",{d:"M2 9v1c0 1.1.9 2 2 2h1"}],["path",{d:"M16 11h0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=["svg",h,[["path",{d:"M14 3v11"}],["path",{d:"M14 9h-3a3 3 0 0 1 0-6h9"}],["path",{d:"M18 3v11"}],["path",{d:"M22 18H2l4-4"}],["path",{d:"m6 22-4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tb=["svg",h,[["path",{d:"M10 3v11"}],["path",{d:"M10 9H7a1 1 0 0 1 0-6h8"}],["path",{d:"M14 3v11"}],["path",{d:"m18 14 4 4H2"}],["path",{d:"m22 18-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eb=["svg",h,[["path",{d:"M13 4v16"}],["path",{d:"M17 4v16"}],["path",{d:"M19 4H9.5a4.5 4.5 0 0 0 0 9H13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ab=["svg",h,[["path",{d:"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"}],["path",{d:"m8.5 8.5 7 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ib=["svg",h,[["line",{x1:"2",x2:"22",y1:"2",y2:"22"}],["line",{x1:"12",x2:"12",y1:"17",y2:"22"}],["path",{d:"M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"}],["path",{d:"M15 9.34V6h1a2 2 0 0 0 0-4H7.89"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sb=["svg",h,[["line",{x1:"12",x2:"12",y1:"17",y2:"22"}],["path",{d:"M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nb=["svg",h,[["path",{d:"m2 22 1-1h3l9-9"}],["path",{d:"M3 21v-3l9-9"}],["path",{d:"m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ob=["svg",h,[["path",{d:"M15 11h.01"}],["path",{d:"M11 15h.01"}],["path",{d:"M16 16h.01"}],["path",{d:"m2 16 20 6-6-20A20 20 0 0 0 2 16"}],["path",{d:"M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rb=["svg",h,[["path",{d:"M2 22h20"}],["path",{d:"M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hb=["svg",h,[["path",{d:"M2 22h20"}],["path",{d:"M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cb=["svg",h,[["path",{d:"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const db=["svg",h,[["polygon",{points:"6 3 20 12 6 21 6 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lb=["svg",h,[["path",{d:"M9 2v6"}],["path",{d:"M15 2v6"}],["path",{d:"M12 17v5"}],["path",{d:"M5 8h14"}],["path",{d:"M6 11V8h12v3a6 6 0 1 1-12 0v0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pb=["svg",h,[["path",{d:"m13 2-2 2.5h3L12 7"}],["path",{d:"M10 14v-3"}],["path",{d:"M14 14v-3"}],["path",{d:"M11 19c-1.7 0-3-1.3-3-3v-2h8v2c0 1.7-1.3 3-3 3Z"}],["path",{d:"M12 22v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ub=["svg",h,[["path",{d:"M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"}],["path",{d:"m2 22 3-3"}],["path",{d:"M7.5 13.5 10 11"}],["path",{d:"M10.5 16.5 13 14"}],["path",{d:"m18 3-4 4h6l-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gb=["svg",h,[["path",{d:"M12 22v-5"}],["path",{d:"M9 8V2"}],["path",{d:"M15 8V2"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fb=["svg",h,[["path",{d:"M5 12h14"}],["path",{d:"M12 5v14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mb=["svg",h,[["path",{d:"M3 2v1c0 1 2 1 2 2S3 6 3 7s2 1 2 2-2 1-2 2 2 1 2 2"}],["path",{d:"M18 6h.01"}],["path",{d:"M6 18h.01"}],["path",{d:"M20.83 8.83a4 4 0 0 0-5.66-5.66l-12 12a4 4 0 1 0 5.66 5.66Z"}],["path",{d:"M18 11.66V22a4 4 0 0 0 4-4V6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vb=["svg",h,[["path",{d:"M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z"}],["polyline",{points:"8 10 12 14 16 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mb=["svg",h,[["path",{d:"M16.85 18.58a9 9 0 1 0-9.7 0"}],["path",{d:"M8 14a5 5 0 1 1 8 0"}],["circle",{cx:"12",cy:"11",r:"1"}],["path",{d:"M13 17a1 1 0 1 0-2 0l.5 4.5a.5.5 0 1 0 1 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yb=["svg",h,[["path",{d:"M10 4.5V4a2 2 0 0 0-2.41-1.957"}],["path",{d:"M13.9 8.4a2 2 0 0 0-1.26-1.295"}],["path",{d:"M21.7 16.2A8 8 0 0 0 22 14v-3a2 2 0 1 0-4 0v-1a2 2 0 0 0-3.63-1.158"}],["path",{d:"m7 15-1.8-1.8a2 2 0 0 0-2.79 2.86L6 19.7a7.74 7.74 0 0 0 6 2.3h2a8 8 0 0 0 5.657-2.343"}],["path",{d:"M6 6v8"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xb=["svg",h,[["path",{d:"M22 14a8 8 0 0 1-8 8"}],["path",{d:"M18 11v-1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"}],["path",{d:"M14 10V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1"}],["path",{d:"M10 9.5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10"}],["path",{d:"M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _b=["svg",h,[["path",{d:"M18 8a2 2 0 0 0 0-4 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0-4 0 2 2 0 0 0 0 4"}],["path",{d:"M10 22 9 8"}],["path",{d:"m14 22 1-14"}],["path",{d:"M20 8c.5 0 .9.4.8 1l-2.6 12c-.1.5-.7 1-1.2 1H7c-.6 0-1.1-.4-1.2-1L3.2 9c-.1-.6.3-1 .8-1Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bb=["svg",h,[["path",{d:"M18.6 14.4c.8-.8.8-2 0-2.8l-8.1-8.1a4.95 4.95 0 1 0-7.1 7.1l8.1 8.1c.9.7 2.1.7 2.9-.1Z"}],["path",{d:"m22 22-5.5-5.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wb=["svg",h,[["path",{d:"M18 7c0-5.333-8-5.333-8 0"}],["path",{d:"M10 7v14"}],["path",{d:"M6 21h12"}],["path",{d:"M6 13h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sb=["svg",h,[["path",{d:"M18.36 6.64A9 9 0 0 1 20.77 15"}],["path",{d:"M6.16 6.16a9 9 0 1 0 12.68 12.68"}],["path",{d:"M12 2v4"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kb=["svg",h,[["path",{d:"M12 2v10"}],["path",{d:"M18.4 6.6a9 9 0 1 1-12.77.04"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ab=["svg",h,[["path",{d:"M2 3h20"}],["path",{d:"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"}],["path",{d:"m7 21 5-5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cb=["svg",h,[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lb=["svg",h,[["path",{d:"M5 7 3 5"}],["path",{d:"M9 6V3"}],["path",{d:"m13 7 2-2"}],["circle",{cx:"9",cy:"13",r:"3"}],["path",{d:"M11.83 12H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2.17"}],["path",{d:"M16 16h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pb=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M12 9v11"}],["path",{d:"M2 9h13a2 2 0 0 1 2 2v9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hb=["svg",h,[["path",{d:"M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vb=["svg",h,[["path",{d:"M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-1.98 0Z"}],["path",{d:"M12 2v20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tb=["svg",h,[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3"}],["path",{d:"M21 21v.01"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7"}],["path",{d:"M3 12h.01"}],["path",{d:"M12 3h.01"}],["path",{d:"M12 16v.01"}],["path",{d:"M16 12h1"}],["path",{d:"M21 12v.01"}],["path",{d:"M12 21v-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eb=["svg",h,[["path",{d:"M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"}],["path",{d:"M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Db=["svg",h,[["path",{d:"M13 16a3 3 0 0 1 2.24 5"}],["path",{d:"M18 12h.01"}],["path",{d:"M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"}],["path",{d:"M20 8.54V4a2 2 0 1 0-4 0v3"}],["path",{d:"M7.612 12.524a3 3 0 1 0-1.6 4.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ob=["svg",h,[["path",{d:"M19.07 4.93A10 10 0 0 0 6.99 3.34"}],["path",{d:"M4 6h.01"}],["path",{d:"M2.29 9.62A10 10 0 1 0 21.31 8.35"}],["path",{d:"M16.24 7.76A6 6 0 1 0 8.23 16.67"}],["path",{d:"M12 18h.01"}],["path",{d:"M17.99 11.66A6 6 0 0 1 15.77 16.67"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"m13.41 10.59 5.66-5.66"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rb=["svg",h,[["path",{d:"M12 12h0.01"}],["path",{d:"M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2.3 8.1 2 11c-.1.5.4 1 1 1h5c0-1.5.8-2.8 2-3.4-1.1-1.9-2-3.5-2.5-4.4z"}],["path",{d:"M21 12c.6 0 1-.4 1-1-.3-2.9-1.8-5.5-4.1-7.1-.4-.3-1.1-.2-1.3.3-.6.9-1.5 2.5-2.6 4.3 1.2.7 2 2 2 3.5h5z"}],["path",{d:"M7.5 19.8c-.3.5-.1 1.1.4 1.3 2.6 1.2 5.6 1.2 8.2 0 .5-.2.7-.8.4-1.3-.5-.9-1.4-2.5-2.5-4.3-1.2.7-2.8.7-4 0-1.1 1.8-2 3.4-2.5 4.3z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ib=["svg",h,[["path",{d:"M3 12h4l3 9 4-17h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bb=["svg",h,[["path",{d:"M5 16v2"}],["path",{d:"M19 16v2"}],["rect",{width:"20",height:"8",x:"2",y:"8",rx:"2"}],["path",{d:"M18 12h0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fb=["svg",h,[["path",{d:"M4.9 16.1C1 12.2 1 5.8 4.9 1.9"}],["path",{d:"M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"}],["circle",{cx:"12",cy:"9",r:"2"}],["path",{d:"M16.2 4.8c2 2 2.26 5.11.8 7.47"}],["path",{d:"M19.1 1.9a9.96 9.96 0 0 1 0 14.1"}],["path",{d:"M9.5 18h5"}],["path",{d:"m8 22 4-11 4 11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zb=["svg",h,[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"}],["circle",{cx:"12",cy:"12",r:"2"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nb=["svg",h,[["path",{d:"M20.34 17.52a10 10 0 1 0-2.82 2.82"}],["circle",{cx:"19",cy:"19",r:"2"}],["path",{d:"m13.41 13.41 4.18 4.18"}],["circle",{cx:"12",cy:"12",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zb=["svg",h,[["path",{d:"M5 15h14"}],["path",{d:"M5 9h14"}],["path",{d:"m14 20-5-5 6-6-5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wb=["svg",h,[["path",{d:"M22 17a10 10 0 0 0-20 0"}],["path",{d:"M6 17a6 6 0 0 1 12 0"}],["path",{d:"M10 17a2 2 0 0 1 4 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ub=["svg",h,[["path",{d:"M17 5c0-1.7-1.3-3-3-3s-3 1.3-3 3c0 .8.3 1.5.8 2H11c-3.9 0-7 3.1-7 7v0c0 2.2 1.8 4 4 4"}],["path",{d:"M16.8 3.9c.3-.3.6-.5 1-.7 1.5-.6 3.3.1 3.9 1.6.6 1.5-.1 3.3-1.6 3.9l1.6 2.8c.2.3.2.7.2 1-.2.8-.9 1.2-1.7 1.1 0 0-1.6-.3-2.7-.6H17c-1.7 0-3 1.3-3 3"}],["path",{d:"M13.2 18a3 3 0 0 0-2.2-5"}],["path",{d:"M13 22H4a2 2 0 0 1 0-4h12"}],["path",{d:"M16 9h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qb=["svg",h,[["rect",{width:"12",height:"20",x:"6",y:"2",rx:"2"}],["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $b=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M12 6.5v11"}],["path",{d:"M15 9.4a4 4 0 1 0 0 5.2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 12h5"}],["path",{d:"M16 9.5a4 4 0 1 0 0 5.2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 7h8"}],["path",{d:"M12 17.5 8 15h1a4 4 0 0 0 0-8"}],["path",{d:"M8 11h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"m12 10 3-3"}],["path",{d:"m9 7 3 3v7.5"}],["path",{d:"M9 11h6"}],["path",{d:"M9 15h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 13h5"}],["path",{d:"M10 17V9.5a2.5 2.5 0 0 1 5 0"}],["path",{d:"M8 17h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M8 15h5"}],["path",{d:"M8 11h5a2 2 0 1 0 0-4h-3v10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M10 17V7h5"}],["path",{d:"M10 11h4"}],["path",{d:"M8 15h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qb=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M14 8H8"}],["path",{d:"M16 12H8"}],["path",{d:"M13 16H8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=["svg",h,[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"}],["path",{d:"M12 17.5v-11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=["svg",h,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}],["path",{d:"M12 12h.01"}],["path",{d:"M17 12h.01"}],["path",{d:"M7 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=["svg",h,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=["svg",h,[["rect",{width:"12",height:"20",x:"6",y:"2",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=["svg",h,[["path",{d:"M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"}],["path",{d:"M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"}],["path",{d:"m14 16-3 3 3 3"}],["path",{d:"M8.293 13.596 7.196 9.5 3.1 10.598"}],["path",{d:"m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"}],["path",{d:"m13.378 9.633 4.096 1.098 1.097-4.096"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=["svg",h,[["path",{d:"m15 14 5-5-5-5"}],["path",{d:"M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=["svg",h,[["circle",{cx:"12",cy:"17",r:"1"}],["path",{d:"M21 7v6h-6"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=["svg",h,[["path",{d:"M21 7v6h-6"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=["svg",h,[["path",{d:"M3 2v6h6"}],["path",{d:"M21 12A9 9 0 0 0 6 5.3L3 8"}],["path",{d:"M21 22v-6h-6"}],["path",{d:"M3 12a9 9 0 0 0 15 6.7l3-2.7"}],["circle",{cx:"12",cy:"12",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=["svg",h,[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"}],["path",{d:"M16 16h5v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=["svg",h,[["path",{d:"M21 8L18.74 5.74A9.75 9.75 0 0 0 12 3C11 3 10.03 3.16 9.13 3.47"}],["path",{d:"M8 16H3v5"}],["path",{d:"M3 12C3 9.51 4 7.26 5.64 5.64"}],["path",{d:"m3 16 2.26 2.26A9.75 9.75 0 0 0 12 21c2.49 0 4.74-1 6.36-2.64"}],["path",{d:"M21 12c0 1-.16 1.97-.47 2.87"}],["path",{d:"M21 3v5h-5"}],["path",{d:"M22 22 2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=["svg",h,[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"}],["path",{d:"M21 3v5h-5"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"}],["path",{d:"M8 16H3v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=["svg",h,[["path",{d:"M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z"}],["path",{d:"M5 10h14"}],["path",{d:"M15 7v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pw=["svg",h,[["path",{d:"M17 3v10"}],["path",{d:"m12.67 5.5 8.66 5"}],["path",{d:"m12.67 10.5 8.66-5"}],["path",{d:"M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=["svg",h,[["path",{d:"M4 7V4h16v3"}],["path",{d:"M5 20h6"}],["path",{d:"M13 4 8 20"}],["path",{d:"m15 15 5 5"}],["path",{d:"m20 15-5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gw=["svg",h,[["path",{d:"m17 2 4 4-4 4"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14"}],["path",{d:"m7 22-4-4 4-4"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3"}],["path",{d:"M11 10h1v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fw=["svg",h,[["path",{d:"m2 9 3-3 3 3"}],["path",{d:"M13 18H7a2 2 0 0 1-2-2V6"}],["path",{d:"m22 15-3 3-3-3"}],["path",{d:"M11 6h6a2 2 0 0 1 2 2v10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mw=["svg",h,[["path",{d:"m17 2 4 4-4 4"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14"}],["path",{d:"m7 22-4-4 4-4"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vw=["svg",h,[["path",{d:"M14 4c0-1.1.9-2 2-2"}],["path",{d:"M20 2c1.1 0 2 .9 2 2"}],["path",{d:"M22 8c0 1.1-.9 2-2 2"}],["path",{d:"M16 10c-1.1 0-2-.9-2-2"}],["path",{d:"m3 7 3 3 3-3"}],["path",{d:"M6 10V5c0-1.7 1.3-3 3-3h1"}],["rect",{width:"8",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M14 14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}],["path",{d:"M20 14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mw=["svg",h,[["path",{d:"M14 4c0-1.1.9-2 2-2"}],["path",{d:"M20 2c1.1 0 2 .9 2 2"}],["path",{d:"M22 8c0 1.1-.9 2-2 2"}],["path",{d:"M16 10c-1.1 0-2-.9-2-2"}],["path",{d:"m3 7 3 3 3-3"}],["path",{d:"M6 10V5c0-1.7 1.3-3 3-3h1"}],["rect",{width:"8",height:"8",x:"2",y:"14",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yw=["svg",h,[["polyline",{points:"7 17 2 12 7 7"}],["polyline",{points:"12 17 7 12 12 7"}],["path",{d:"M22 18v-2a4 4 0 0 0-4-4H7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xw=["svg",h,[["polyline",{points:"9 17 4 12 9 7"}],["path",{d:"M20 18v-2a4 4 0 0 0-4-4H4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _w=["svg",h,[["polygon",{points:"11 19 2 12 11 5 11 19"}],["polygon",{points:"22 19 13 12 22 5 22 19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bw=["svg",h,[["path",{d:"M17.75 9.01c-.52 2.08-1.83 3.64-3.18 5.49l-2.6 3.54-2.97 4-3.5-2.54 3.85-4.97c-1.86-2.61-2.8-3.77-3.16-5.44"}],["path",{d:"M17.75 9.01A7 7 0 0 0 6.2 9.1C6.06 8.5 6 7.82 6 7c0-3.5 2.83-5 5.98-5C15.24 2 18 3.5 18 7c0 .73-.09 1.4-.25 2.01Z"}],["path",{d:"m9.35 14.53 2.64-3.31"}],["path",{d:"m11.97 18.04 2.99 4 3.54-2.54-3.93-5"}],["path",{d:"M14 8c0 1-1 2-2.01 3.22C11 10 10 9 10 8a2 2 0 1 1 4 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ww=["svg",h,[["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"}],["path",{d:"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"}],["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sw=["svg",h,[["polyline",{points:"3.5 2 6.5 12.5 18 12.5"}],["line",{x1:"9.5",x2:"5.5",y1:"12.5",y2:"20"}],["line",{x1:"15",x2:"18.5",y1:"12.5",y2:"20"}],["path",{d:"M2.75 18a13 13 0 0 0 18.5 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kw=["svg",h,[["path",{d:"M6 19V5"}],["path",{d:"M10 19V6.8"}],["path",{d:"M14 19v-7.8"}],["path",{d:"M18 5v4"}],["path",{d:"M18 19v-6"}],["path",{d:"M22 19V9"}],["path",{d:"M2 19V9a4 4 0 0 1 4-4c2 0 4 1.33 6 4s4 4 6 4a4 4 0 1 0-3-6.65"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=["svg",h,[["path",{d:"M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2"}],["path",{d:"m15.194 13.707 3.814 1.86-1.86 3.814"}],["path",{d:"M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aw=["svg",h,[["path",{d:"M20 9V7a2 2 0 0 0-2-2h-6"}],["path",{d:"m15 2-3 3 3 3"}],["path",{d:"M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cw=["svg",h,[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lw=["svg",h,[["path",{d:"M12 5H6a2 2 0 0 0-2 2v3"}],["path",{d:"m9 8 3-3-3-3"}],["path",{d:"M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pw=["svg",h,[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"}],["path",{d:"M21 3v5h-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hw=["svg",h,[["circle",{cx:"6",cy:"19",r:"3"}],["path",{d:"M9 19h8.5c.4 0 .9-.1 1.3-.2"}],["path",{d:"M5.2 5.2A3.5 3.53 0 0 0 6.5 12H12"}],["path",{d:"m2 2 20 20"}],["path",{d:"M21 15.3a3.5 3.5 0 0 0-3.3-3.3"}],["path",{d:"M15 5h-4.3"}],["circle",{cx:"18",cy:"5",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vw=["svg",h,[["circle",{cx:"6",cy:"19",r:"3"}],["path",{d:"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"}],["circle",{cx:"18",cy:"5",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tw=["svg",h,[["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2"}],["path",{d:"M6.01 18H6"}],["path",{d:"M10.01 18H10"}],["path",{d:"M15 10v4"}],["path",{d:"M17.84 7.17a4 4 0 0 0-5.66 0"}],["path",{d:"M20.66 4.34a8 8 0 0 0-11.31 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 12h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M21 9H3"}],["path",{d:"M21 15H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ew=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M21 7.5H3"}],["path",{d:"M21 12H3"}],["path",{d:"M21 16.5H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dw=["svg",h,[["path",{d:"M4 11a9 9 0 0 1 9 9"}],["path",{d:"M4 4a16 16 0 0 1 16 16"}],["circle",{cx:"5",cy:"19",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ow=["svg",h,[["path",{d:"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"}],["path",{d:"m14.5 12.5 2-2"}],["path",{d:"m11.5 9.5 2-2"}],["path",{d:"m8.5 6.5 2-2"}],["path",{d:"m17.5 15.5 2-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rw=["svg",h,[["path",{d:"M6 11h8a4 4 0 0 0 0-8H9v18"}],["path",{d:"M6 15h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Iw=["svg",h,[["path",{d:"M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z"}],["path",{d:"M21 14 10 2 3 14h18Z"}],["path",{d:"M10 2v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bw=["svg",h,[["path",{d:"M7 21h10"}],["path",{d:"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"}],["path",{d:"M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"}],["path",{d:"m13 12 4-4"}],["path",{d:"M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fw=["svg",h,[["path",{d:"M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3"}],["path",{d:"M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83"}],["path",{d:"m3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3Z"}],["path",{d:"M12.97 19.77 7 15h12.5l-3.75 4.5a2 2 0 0 1-2.78.27Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zw=["svg",h,[["path",{d:"M4 10a7.31 7.31 0 0 0 10 10Z"}],["path",{d:"m9 15 3-3"}],["path",{d:"M17 13a6 6 0 0 0-6-6"}],["path",{d:"M21 13A10 10 0 0 0 11 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nw=["svg",h,[["path",{d:"M13 7 9 3 5 7l4 4"}],["path",{d:"m17 11 4 4-4 4-4-4"}],["path",{d:"m8 12 4 4 6-6-4-4Z"}],["path",{d:"m16 8 3-3"}],["path",{d:"M9 21a6 6 0 0 0-6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zw=["svg",h,[["path",{d:"M10 2v3a1 1 0 0 0 1 1h5"}],["path",{d:"M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6"}],["path",{d:"M18 22H4a2 2 0 0 1-2-2V6"}],["path",{d:"M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ww=["svg",h,[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=["svg",h,[["circle",{cx:"19",cy:"19",r:"2"}],["circle",{cx:"5",cy:"5",r:"2"}],["path",{d:"M5 7v12h12"}],["path",{d:"m5 19 6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uw=["svg",h,[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"}],["path",{d:"M7 21h10"}],["path",{d:"M12 3v18"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qw=["svg",h,[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}],["path",{d:"M14 15H9v-5"}],["path",{d:"M16 3h5v5"}],["path",{d:"M21 3 9 15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $w=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M8 7v10"}],["path",{d:"M12 7v10"}],["path",{d:"M17 7v10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jw=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["circle",{cx:"12",cy:"12",r:"1"}],["path",{d:"M5 12s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yw=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 9h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xw=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M7 12h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gw=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"m16 16-1.9-1.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kw=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M7 8h8"}],["path",{d:"M7 12h10"}],["path",{d:"M7 16h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jw=["svg",h,[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qw=["svg",h,[["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor"}],["circle",{cx:"18.5",cy:"5.5",r:".5",fill:"currentColor"}],["circle",{cx:"11.5",cy:"11.5",r:".5",fill:"currentColor"}],["circle",{cx:"7.5",cy:"16.5",r:".5",fill:"currentColor"}],["circle",{cx:"17.5",cy:"14.5",r:".5",fill:"currentColor"}],["path",{d:"M3 3v18h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tS=["svg",h,[["path",{d:"M14 22v-4a2 2 0 1 0-4 0v4"}],["path",{d:"m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"}],["path",{d:"M18 5v17"}],["path",{d:"m4 6 8-4 8 4"}],["path",{d:"M6 5v17"}],["circle",{cx:"12",cy:"9",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eS=["svg",h,[["path",{d:"M5.42 9.42 8 12"}],["circle",{cx:"4",cy:"8",r:"2"}],["path",{d:"m14 6-8.58 8.58"}],["circle",{cx:"4",cy:"16",r:"2"}],["path",{d:"M10.8 14.8 14 18"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aS=["svg",h,[["circle",{cx:"6",cy:"6",r:"3"}],["path",{d:"M8.12 8.12 12 12"}],["path",{d:"M20 4 8.12 15.88"}],["circle",{cx:"6",cy:"18",r:"3"}],["path",{d:"M14.8 14.8 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iS=["svg",h,[["path",{d:"M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}],["path",{d:"m22 3-5 5"}],["path",{d:"m17 3 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sS=["svg",h,[["path",{d:"M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}],["path",{d:"m17 8 5-5"}],["path",{d:"M17 3h5v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nS=["svg",h,[["path",{d:"M15 12h-5"}],["path",{d:"M15 8h-5"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oS=["svg",h,[["path",{d:"M19 17V5a2 2 0 0 0-2-2H4"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rS=["svg",h,[["path",{d:"m8 11 2 2 4-4"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hS=["svg",h,[["path",{d:"m13 13.5 2-2.5-2-2.5"}],["path",{d:"m21 21-4.3-4.3"}],["path",{d:"M9 8.5 7 11l2 2.5"}],["circle",{cx:"11",cy:"11",r:"8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cS=["svg",h,[["path",{d:"m13.5 8.5-5 5"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dS=["svg",h,[["path",{d:"m13.5 8.5-5 5"}],["path",{d:"m8.5 8.5 5 5"}],["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lS=["svg",h,[["circle",{cx:"11",cy:"11",r:"8"}],["path",{d:"m21 21-4.3-4.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=["svg",h,[["path",{d:"m3 3 3 9-3 9 19-9Z"}],["path",{d:"M6 12h16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pS=["svg",h,[["rect",{x:"14",y:"14",width:"8",height:"8",rx:"2"}],["rect",{x:"2",y:"2",width:"8",height:"8",rx:"2"}],["path",{d:"M7 14v1a2 2 0 0 0 2 2h1"}],["path",{d:"M14 7h1a2 2 0 0 1 2 2v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uS=["svg",h,[["path",{d:"m22 2-7 20-4-9-9-4Z"}],["path",{d:"M22 2 11 13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gS=["svg",h,[["line",{x1:"3",x2:"21",y1:"12",y2:"12"}],["polyline",{points:"8 8 12 4 16 8"}],["polyline",{points:"16 16 12 20 8 16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fS=["svg",h,[["line",{x1:"12",x2:"12",y1:"3",y2:"21"}],["polyline",{points:"8 8 4 12 8 16"}],["polyline",{points:"16 16 20 12 16 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MS=["svg",h,[["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"M4.5 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5"}],["path",{d:"M4.5 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-.5"}],["path",{d:"M6 6h.01"}],["path",{d:"M6 18h.01"}],["path",{d:"m15.7 13.4-.9-.3"}],["path",{d:"m9.2 10.9-.9-.3"}],["path",{d:"m10.6 15.7.3-.9"}],["path",{d:"m13.6 15.7-.4-1"}],["path",{d:"m10.8 9.3-.4-1"}],["path",{d:"m8.3 13.6 1-.4"}],["path",{d:"m14.7 10.8 1-.4"}],["path",{d:"m13.4 8.3-.3.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vS=["svg",h,[["path",{d:"M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"}],["path",{d:"M6 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2"}],["path",{d:"M6 6h.01"}],["path",{d:"M6 18h.01"}],["path",{d:"m13 6-4 6h6l-4 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mS=["svg",h,[["path",{d:"M7 2h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5"}],["path",{d:"M10 10 2.5 2.5C2 2 2 2.5 2 5v3a2 2 0 0 0 2 2h6z"}],["path",{d:"M22 17v-1a2 2 0 0 0-2-2h-1"}],["path",{d:"M4 14a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16.5l1-.5.5.5-8-8H4z"}],["path",{d:"M6 18h.01"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yS=["svg",h,[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xS=["svg",h,[["path",{d:"M20 7h-9"}],["path",{d:"M14 17H5"}],["circle",{cx:"17",cy:"17",r:"3"}],["circle",{cx:"7",cy:"7",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _S=["svg",h,[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}],["circle",{cx:"12",cy:"12",r:"3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bS=["svg",h,[["path",{d:"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"}],["rect",{x:"3",y:"14",width:"7",height:"7",rx:"1"}],["circle",{cx:"17.5",cy:"17.5",r:"3.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wS=["svg",h,[["circle",{cx:"18",cy:"5",r:"3"}],["circle",{cx:"6",cy:"12",r:"3"}],["circle",{cx:"18",cy:"19",r:"3"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SS=["svg",h,[["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}],["polyline",{points:"16 6 12 2 8 6"}],["line",{x1:"12",x2:"12",y1:"2",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kS=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["line",{x1:"3",x2:"21",y1:"9",y2:"9"}],["line",{x1:"3",x2:"21",y1:"15",y2:"15"}],["line",{x1:"9",x2:"9",y1:"9",y2:"21"}],["line",{x1:"15",x2:"15",y1:"9",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AS=["svg",h,[["path",{d:"M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"M12 8v4"}],["path",{d:"M12 16h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"m4.243 5.21 14.39 12.472"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"m9 12 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const HS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"M8 12h.01"}],["path",{d:"M12 12h.01"}],["path",{d:"M16 12h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"M12 22V2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"M9 12h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ES=["svg",h,[["path",{d:"m2 2 20 20"}],["path",{d:"M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71"}],["path",{d:"M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"M9 12h6"}],["path",{d:"M12 9v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"}],["path",{d:"M12 17h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{d:"m14.5 9.5-5 5"}],["path",{d:"m9.5 9.5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RS=["svg",h,[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IS=["svg",h,[["circle",{cx:"12",cy:"12",r:"8"}],["path",{d:"M12 2v7.5"}],["path",{d:"m19 5-5.23 5.23"}],["path",{d:"M22 12h-7.5"}],["path",{d:"m19 19-5.23-5.23"}],["path",{d:"M12 14.5V22"}],["path",{d:"M10.23 13.77 5 19"}],["path",{d:"M9.5 12H2"}],["path",{d:"M10.23 10.23 5 5"}],["circle",{cx:"12",cy:"12",r:"2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BS=["svg",h,[["path",{d:"M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"}],["path",{d:"M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"}],["path",{d:"M12 10v4"}],["path",{d:"M12 2v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FS=["svg",h,[["path",{d:"M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zS=["svg",h,[["path",{d:"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"}],["path",{d:"M3 6h18"}],["path",{d:"M16 10a4 4 0 0 1-8 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NS=["svg",h,[["path",{d:"m15 11-1 9"}],["path",{d:"m19 11-4-7"}],["path",{d:"M2 11h20"}],["path",{d:"m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"}],["path",{d:"M4.5 15.5h15"}],["path",{d:"m5 11 4-7"}],["path",{d:"m9 11 1 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZS=["svg",h,[["circle",{cx:"8",cy:"21",r:"1"}],["circle",{cx:"19",cy:"21",r:"1"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const WS=["svg",h,[["path",{d:"M2 22v-5l5-5 5 5-5 5z"}],["path",{d:"M9.5 14.5 16 8"}],["path",{d:"m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0s0 0 0 0a3.53 3.53 0 0 1 0-5L17 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const US=["svg",h,[["path",{d:"m4 4 2.5 2.5"}],["path",{d:"M13.5 6.5a4.95 4.95 0 0 0-7 7"}],["path",{d:"M15 5 5 15"}],["path",{d:"M14 17v.01"}],["path",{d:"M10 16v.01"}],["path",{d:"M13 13v.01"}],["path",{d:"M16 10v.01"}],["path",{d:"M11 20v.01"}],["path",{d:"M17 14v.01"}],["path",{d:"M20 11v.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qS=["svg",h,[["path",{d:"m15 15 6 6m-6-6v4.8m0-4.8h4.8"}],["path",{d:"M9 19.8V15m0 0H4.2M9 15l-6 6"}],["path",{d:"M15 4.2V9m0 0h4.8M15 9l6-6"}],["path",{d:"M9 4.2V9m0 0H4.2M9 9 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $S=["svg",h,[["path",{d:"M12 22v-7l-2-2"}],["path",{d:"M17 8v.8A6 6 0 0 1 13.8 20v0H10v0A6.5 6.5 0 0 1 7 8h0a5 5 0 0 1 10 0Z"}],["path",{d:"m14 14-2 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jS=["svg",h,[["path",{d:"M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"}],["path",{d:"m18 2 4 4-4 4"}],["path",{d:"M2 6h1.9c1.5 0 2.9.9 3.6 2.2"}],["path",{d:"M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"}],["path",{d:"m18 14 4 4-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YS=["svg",h,[["path",{d:"M18 7V4H6l6 8-6 8h12v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XS=["svg",h,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}],["path",{d:"M12 20v-8"}],["path",{d:"M17 20V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GS=["svg",h,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KS=["svg",h,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}],["path",{d:"M12 20v-8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JS=["svg",h,[["path",{d:"M2 20h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QS=["svg",h,[["path",{d:"M2 20h.01"}],["path",{d:"M7 20v-4"}],["path",{d:"M12 20v-8"}],["path",{d:"M17 20V8"}],["path",{d:"M22 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tk=["svg",h,[["path",{d:"M10 9H4L2 7l2-2h6"}],["path",{d:"M14 5h6l2 2-2 2h-6"}],["path",{d:"M10 22V4a2 2 0 1 1 4 0v18"}],["path",{d:"M8 22h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ek=["svg",h,[["path",{d:"M12 3v3"}],["path",{d:"M18.5 13h-13L2 9.5 5.5 6h13L22 9.5Z"}],["path",{d:"M12 13v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ak=["svg",h,[["path",{d:"M7 18v-6a5 5 0 1 1 10 0v6"}],["path",{d:"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"}],["path",{d:"M21 12h1"}],["path",{d:"M18.5 4.5 18 5"}],["path",{d:"M2 12h1"}],["path",{d:"M12 2v1"}],["path",{d:"m4.929 4.929.707.707"}],["path",{d:"M12 12v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ik=["svg",h,[["polygon",{points:"19 20 9 12 19 4 19 20"}],["line",{x1:"5",x2:"5",y1:"19",y2:"5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sk=["svg",h,[["polygon",{points:"5 4 15 12 5 20 5 4"}],["line",{x1:"19",x2:"19",y1:"5",y2:"19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nk=["svg",h,[["circle",{cx:"9",cy:"12",r:"1"}],["circle",{cx:"15",cy:"12",r:"1"}],["path",{d:"M8 20v2h8v-2"}],["path",{d:"m12.5 17-.5-1-.5 1h1z"}],["path",{d:"M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ok=["svg",h,[["rect",{width:"3",height:"8",x:"13",y:"2",rx:"1.5"}],["path",{d:"M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5"}],["rect",{width:"3",height:"8",x:"8",y:"14",rx:"1.5"}],["path",{d:"M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5"}],["rect",{width:"8",height:"3",x:"14",y:"13",rx:"1.5"}],["path",{d:"M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5"}],["rect",{width:"8",height:"3",x:"2",y:"8",rx:"1.5"}],["path",{d:"M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rk=["svg",h,[["path",{d:"M22 2 2 22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hk=["svg",h,[["path",{d:"m8 14-6 6h9v-3"}],["path",{d:"M18.37 3.63 8 14l3 3L21.37 6.63a2.12 2.12 0 1 0-3-3Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ck=["svg",h,[["line",{x1:"21",x2:"14",y1:"4",y2:"4"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=["svg",h,[["line",{x1:"4",x2:"4",y1:"21",y2:"14"}],["line",{x1:"4",x2:"4",y1:"10",y2:"3"}],["line",{x1:"12",x2:"12",y1:"21",y2:"12"}],["line",{x1:"12",x2:"12",y1:"8",y2:"3"}],["line",{x1:"20",x2:"20",y1:"21",y2:"16"}],["line",{x1:"20",x2:"20",y1:"12",y2:"3"}],["line",{x1:"2",x2:"6",y1:"14",y2:"14"}],["line",{x1:"10",x2:"14",y1:"8",y2:"8"}],["line",{x1:"18",x2:"22",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dk=["svg",h,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2"}],["path",{d:"M12.667 8 10 12h4l-2.667 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lk=["svg",h,[["rect",{width:"7",height:"12",x:"2",y:"6",rx:"1"}],["path",{d:"M13 8.32a7.43 7.43 0 0 1 0 7.36"}],["path",{d:"M16.46 6.21a11.76 11.76 0 0 1 0 11.58"}],["path",{d:"M19.91 4.1a15.91 15.91 0 0 1 .01 15.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pk=["svg",h,[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2"}],["path",{d:"M12 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uk=["svg",h,[["path",{d:"M22 11v1a10 10 0 1 1-9-10"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}],["path",{d:"M16 5h6"}],["path",{d:"M19 2v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gk=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fk=["svg",h,[["path",{d:"M2 13a6 6 0 1 0 12 0 4 4 0 1 0-8 0 2 2 0 0 0 4 0"}],["circle",{cx:"10",cy:"13",r:"8"}],["path",{d:"M2 21h12c4.4 0 8-3.6 8-8V7a2 2 0 1 0-4 0v6"}],["path",{d:"M18 3 19.1 5.2"}],["path",{d:"M22 3 20.9 5.2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mk=["svg",h,[["line",{x1:"2",x2:"22",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"2",y2:"22"}],["path",{d:"m20 16-4-4 4-4"}],["path",{d:"m4 8 4 4-4 4"}],["path",{d:"m16 4-4 4-4-4"}],["path",{d:"m8 20 4-4 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vk=["svg",h,[["path",{d:"M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"}],["path",{d:"M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"}],["path",{d:"M4 18v2"}],["path",{d:"M20 18v2"}],["path",{d:"M12 4v9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mk=["svg",h,[["path",{d:"M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"}],["path",{d:"M7 21h10"}],["path",{d:"M19.5 12 22 6"}],["path",{d:"M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"}],["path",{d:"M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"}],["path",{d:"M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yk=["svg",h,[["path",{d:"M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xk=["svg",h,[["path",{d:"M5 9c-1.5 1.5-3 3.2-3 5.5A5.5 5.5 0 0 0 7.5 20c1.8 0 3-.5 4.5-2 1.5 1.5 2.7 2 4.5 2a5.5 5.5 0 0 0 5.5-5.5c0-2.3-1.5-4-3-5.5l-7-7-7 7Z"}],["path",{d:"M12 18v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _k=["svg",h,[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=["svg",h,[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"}],["path",{d:"M20 3v4"}],["path",{d:"M22 5h-4"}],["path",{d:"M4 17v2"}],["path",{d:"M5 18H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bk=["svg",h,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2"}],["path",{d:"M12 6h.01"}],["circle",{cx:"12",cy:"14",r:"4"}],["path",{d:"M12 14h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wk=["svg",h,[["path",{d:"M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"}],["path",{d:"M19.8 17.8a7.5 7.5 0 0 0 .003-10.603"}],["path",{d:"M17 15a3.5 3.5 0 0 0-.025-4.975"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sk=["svg",h,[["path",{d:"m6 16 6-12 6 12"}],["path",{d:"M8 12h8"}],["path",{d:"M4 21c1.1 0 1.1-1 2.3-1s1.1 1 2.3 1c1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1 1.1 0 1.1 1 2.3 1 1.1 0 1.1-1 2.3-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kk=["svg",h,[["path",{d:"m6 16 6-12 6 12"}],["path",{d:"M8 12h8"}],["path",{d:"m16 20 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ak=["svg",h,[["circle",{cx:"19",cy:"5",r:"2"}],["circle",{cx:"5",cy:"19",r:"2"}],["path",{d:"M5 17A12 12 0 0 1 17 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ck=["svg",h,[["path",{d:"M16 3h5v5"}],["path",{d:"M8 3H3v5"}],["path",{d:"M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"}],["path",{d:"m15 9 6-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lk=["svg",h,[["path",{d:"M3 3h.01"}],["path",{d:"M7 5h.01"}],["path",{d:"M11 7h.01"}],["path",{d:"M3 7h.01"}],["path",{d:"M7 9h.01"}],["path",{d:"M3 11h.01"}],["rect",{width:"4",height:"4",x:"15",y:"5"}],["path",{d:"m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2"}],["path",{d:"m13 14 8-2"}],["path",{d:"m13 19 8-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pk=["svg",h,[["path",{d:"M7 20h10"}],["path",{d:"M10 20c5.5-2.5.8-6.4 3-10"}],["path",{d:"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"}],["path",{d:"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M17 12h-2l-2 5-2-10-2 5H7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m16 8-8 8"}],["path",{d:"M16 16H8V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m8 8 8 8"}],["path",{d:"M16 8v8H8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 8v8"}],["path",{d:"m8 12 4 4 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m12 8-4 4 4 4"}],["path",{d:"M16 12H8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=["svg",h,[["path",{d:"M13 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6"}],["path",{d:"m3 21 9-9"}],["path",{d:"M9 21H3v-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=["svg",h,[["path",{d:"M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"}],["path",{d:"m21 21-9-9"}],["path",{d:"M21 15v6h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=["svg",h,[["path",{d:"M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"}],["path",{d:"m3 3 9 9"}],["path",{d:"M3 9V3h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=["svg",h,[["path",{d:"M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"}],["path",{d:"m21 3-9 9"}],["path",{d:"M15 3h6v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}],["path",{d:"m12 16 4-4-4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 16V8h8"}],["path",{d:"M16 16 8 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 8h8v8"}],["path",{d:"m8 16 8-8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m16 12-4-4-4 4"}],["path",{d:"M12 16V8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 8v8"}],["path",{d:"m8.5 14 7-4"}],["path",{d:"m8.5 10 7 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=["svg",h,[["path",{d:"M4 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2"}],["path",{d:"M10 22H8"}],["path",{d:"M16 22h-2"}],["circle",{cx:"8",cy:"8",r:"2"}],["path",{d:"M9.414 9.414 12 12"}],["path",{d:"M14.8 14.8 18 18"}],["circle",{cx:"8",cy:"16",r:"2"}],["path",{d:"m18 6-8.586 8.586"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tr=["svg",h,[["path",{d:"m9 11 3 3L22 4"}],["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m9 12 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m16 10-4 4-4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m14 16-4-4 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m10 8 4 4-4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m8 14 4-4 4 4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const or=["svg",h,[["path",{d:"M10 9.5 8 12l2 2.5"}],["path",{d:"m14 9.5 2 2.5-2 2.5"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hk=["svg",h,[["path",{d:"M10 9.5 8 12l2 2.5"}],["path",{d:"M14 21h1"}],["path",{d:"m14 9.5 2 2.5-2 2.5"}],["path",{d:"M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2"}],["path",{d:"M9 21h1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vk=["svg",h,[["path",{d:"M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2"}],["path",{d:"M9 21h1"}],["path",{d:"M14 21h1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=["svg",h,[["path",{d:"M8 7v7"}],["path",{d:"M12 7v4"}],["path",{d:"M16 7v9"}],["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M9 3h1"}],["path",{d:"M14 3h1"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"M21 9v1"}],["path",{d:"M21 14v1"}],["path",{d:"M21 19a2 2 0 0 1-2 2"}],["path",{d:"M14 21h1"}],["path",{d:"M9 21h1"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M3 14v1"}],["path",{d:"M3 9v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=["svg",h,[["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"m12 12 4 10 1.7-4.3L22 16Z"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M9 3h1"}],["path",{d:"M9 21h2"}],["path",{d:"M14 3h1"}],["path",{d:"M3 9v1"}],["path",{d:"M21 9v2"}],["path",{d:"M3 14v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12"}],["line",{x1:"12",x2:"12",y1:"16",y2:"16"}],["line",{x1:"12",x2:"12",y1:"8",y2:"8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"12",cy:"12",r:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 10h10"}],["path",{d:"M7 14h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"}],["path",{d:"M9 11.2h5.7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 8h7"}],["path",{d:"M8 12h6"}],["path",{d:"M11 16h5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 7v7"}],["path",{d:"M12 7v4"}],["path",{d:"M16 7v9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 7v10"}],["path",{d:"M11 7v10"}],["path",{d:"m15 7 2 10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 16V8l4 4 4-4v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 8h10"}],["path",{d:"M7 12h10"}],["path",{d:"M7 16h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=["svg",h,[["path",{d:"M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"}],["path",{d:"m12 12 4 10 1.7-4.3L22 16Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=["svg",h,[["path",{d:"M3.6 3.6A2 2 0 0 1 5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-.59 1.41"}],["path",{d:"M3 8.7V19a2 2 0 0 0 2 2h10.3"}],["path",{d:"m2 2 20 20"}],["path",{d:"M13 13a3 3 0 1 0 0-6H9v2"}],["path",{d:"M9 17v-2.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M9 17V7h4a3 3 0 0 1 0 6H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E1=["svg",h,[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}],["path",{d:"M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m15 9-6 6"}],["path",{d:"M9 9h.01"}],["path",{d:"M15 15h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M7 7h10"}],["path",{d:"M10 7v10"}],["path",{d:"M16 17a2 2 0 0 1-2-2V7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 12H9.5a2.5 2.5 0 0 1 0-5H17"}],["path",{d:"M12 7v10"}],["path",{d:"M16 7v10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"m9 8 6 4-6 4Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ar=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M8 12h8"}],["path",{d:"M12 8v8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M12 7v5"}],["path",{d:"M8 9a5.14 5.14 0 0 0 4 8 4.95 4.95 0 0 0 4-8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tk=["svg",h,[["path",{d:"M7 12h2l2 5 2-10h4"}],["rect",{x:"3",y:"3",width:"18",height:"18",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lr=["svg",h,[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"2"}],["circle",{cx:"8",cy:"8",r:"2"}],["path",{d:"M9.414 9.414 12 12"}],["path",{d:"M14.8 14.8 18 18"}],["circle",{cx:"8",cy:"16",r:"2"}],["path",{d:"m18 6-8.586 8.586"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M16 8.9V7H8l4 5-4 5h8v-1.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["line",{x1:"9",x2:"15",y1:"15",y2:"9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vr=["svg",h,[["path",{d:"M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3"}],["path",{d:"M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tr=["svg",h,[["path",{d:"M5 8V5c0-1 1-2 2-2h10c1 0 2 1 2 2v3"}],["path",{d:"M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ek=["svg",h,[["path",{d:"M4 10c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"}],["path",{d:"M10 16c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2"}],["rect",{width:"8",height:"8",x:"14",y:"14",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Er=["svg",h,[["path",{d:"m7 11 2-2-2-2"}],["path",{d:"M11 13h4"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dr=["svg",h,[["path",{d:"M18 21a6 6 0 0 0-12 0"}],["circle",{cx:"12",cy:"11",r:"4"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Or=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rr=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["path",{d:"m15 9-6 6"}],["path",{d:"m9 9 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dk=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ok=["svg",h,[["path",{d:"M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rk=["svg",h,[["path",{d:"M15.236 22a3 3 0 0 0-2.2-5"}],["path",{d:"M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-4-4V4"}],["path",{d:"M18 13h.01"}],["path",{d:"M18 6a4 4 0 0 0-4 4 7 7 0 0 0-7 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ik=["svg",h,[["path",{d:"M5 22h14"}],["path",{d:"M19.27 13.73A2.5 2.5 0 0 0 17.5 13h-11A2.5 2.5 0 0 0 4 15.5V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-.66-.26-1.3-.73-1.77Z"}],["path",{d:"M14 13V8.5C14 7 15 7 15 5a3 3 0 0 0-3-3c-1.66 0-3 1-3 3s1 2 1 3.5V13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bk=["svg",h,[["path",{d:"M12 17.8 5.8 21 7 14.1 2 9.3l7-1L12 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fk=["svg",h,[["path",{d:"M8.34 8.34 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-.59-3.43"}],["path",{d:"M18.42 12.76 22 9.27l-6.91-1L12 2l-1.44 2.91"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zk=["svg",h,[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nk=["svg",h,[["line",{x1:"18",x2:"18",y1:"20",y2:"4"}],["polygon",{points:"14,20 4,12 14,4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zk=["svg",h,[["line",{x1:"6",x2:"6",y1:"4",y2:"20"}],["polygon",{points:"10,4 20,12 10,20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wk=["svg",h,[["path",{d:"M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"}],["path",{d:"M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"}],["circle",{cx:"20",cy:"10",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uk=["svg",h,[["path",{d:"M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"}],["path",{d:"M14 3v4a2 2 0 0 0 2 2h4"}],["path",{d:"M8 13h0"}],["path",{d:"M16 13h0"}],["path",{d:"M10 16s.8 1 2 1c1.3 0 2-1 2-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qk=["svg",h,[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $k=["svg",h,[["path",{d:"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"}],["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"}],["path",{d:"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"}],["path",{d:"M2 7h20"}],["path",{d:"M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jk=["svg",h,[["rect",{width:"20",height:"6",x:"2",y:"4",rx:"2"}],["rect",{width:"20",height:"6",x:"2",y:"14",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yk=["svg",h,[["rect",{width:"6",height:"20",x:"4",y:"2",rx:"2"}],["rect",{width:"6",height:"20",x:"14",y:"2",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xk=["svg",h,[["path",{d:"M16 4H9a3 3 0 0 0-2.83 4"}],["path",{d:"M14 12a4 4 0 0 1 0 8H6"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gk=["svg",h,[["path",{d:"m4 5 8 8"}],["path",{d:"m12 5-8 8"}],["path",{d:"M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kk=["svg",h,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 4h.01"}],["path",{d:"M20 12h.01"}],["path",{d:"M12 20h.01"}],["path",{d:"M4 12h.01"}],["path",{d:"M17.657 6.343h.01"}],["path",{d:"M17.657 17.657h.01"}],["path",{d:"M6.343 17.657h.01"}],["path",{d:"M6.343 6.343h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jk=["svg",h,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 3v1"}],["path",{d:"M12 20v1"}],["path",{d:"M3 12h1"}],["path",{d:"M20 12h1"}],["path",{d:"m18.364 5.636-.707.707"}],["path",{d:"m6.343 17.657-.707.707"}],["path",{d:"m5.636 5.636.707.707"}],["path",{d:"m17.657 17.657.707.707"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qk=["svg",h,[["path",{d:"M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"}],["path",{d:"M12 2v2"}],["path",{d:"M12 20v2"}],["path",{d:"m4.9 4.9 1.4 1.4"}],["path",{d:"m17.7 17.7 1.4 1.4"}],["path",{d:"M2 12h2"}],["path",{d:"M20 12h2"}],["path",{d:"m6.3 17.7-1.4 1.4"}],["path",{d:"m19.1 4.9-1.4 1.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tA=["svg",h,[["path",{d:"M10 9a3 3 0 1 0 0 6"}],["path",{d:"M2 12h1"}],["path",{d:"M14 21V3"}],["path",{d:"M10 4V3"}],["path",{d:"M10 21v-1"}],["path",{d:"m3.64 18.36.7-.7"}],["path",{d:"m4.34 6.34-.7-.7"}],["path",{d:"M14 12h8"}],["path",{d:"m17 4-3 3"}],["path",{d:"m14 17 3 3"}],["path",{d:"m21 15-3-3 3-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eA=["svg",h,[["circle",{cx:"12",cy:"12",r:"4"}],["path",{d:"M12 2v2"}],["path",{d:"M12 20v2"}],["path",{d:"m4.93 4.93 1.41 1.41"}],["path",{d:"m17.66 17.66 1.41 1.41"}],["path",{d:"M2 12h2"}],["path",{d:"M20 12h2"}],["path",{d:"m6.34 17.66-1.41 1.41"}],["path",{d:"m19.07 4.93-1.41 1.41"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aA=["svg",h,[["path",{d:"M12 2v8"}],["path",{d:"m4.93 10.93 1.41 1.41"}],["path",{d:"M2 18h2"}],["path",{d:"M20 18h2"}],["path",{d:"m19.07 10.93-1.41 1.41"}],["path",{d:"M22 22H2"}],["path",{d:"m8 6 4-4 4 4"}],["path",{d:"M16 18a4 4 0 0 0-8 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iA=["svg",h,[["path",{d:"M12 10V2"}],["path",{d:"m4.93 10.93 1.41 1.41"}],["path",{d:"M2 18h2"}],["path",{d:"M20 18h2"}],["path",{d:"m19.07 10.93-1.41 1.41"}],["path",{d:"M22 22H2"}],["path",{d:"m16 6-4 4-4-4"}],["path",{d:"M16 18a4 4 0 0 0-8 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sA=["svg",h,[["path",{d:"m4 19 8-8"}],["path",{d:"m12 19-8-8"}],["path",{d:"M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nA=["svg",h,[["path",{d:"M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z"}],["path",{d:"M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7"}],["path",{d:"M 7 17h0.01"}],["path",{d:"m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oA=["svg",h,[["path",{d:"M10 21V3h8"}],["path",{d:"M6 16h9"}],["path",{d:"M10 9.5h7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rA=["svg",h,[["path",{d:"M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"}],["path",{d:"M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"}],["circle",{cx:"12",cy:"12",r:"3"}],["path",{d:"m18 22-3-3 3-3"}],["path",{d:"m6 2 3 3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hA=["svg",h,[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cA=["svg",h,[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19"}],["polyline",{points:"14.5 6.5 18 3 21 3 21 6 17.5 9.5"}],["line",{x1:"5",x2:"9",y1:"14",y2:"18"}],["line",{x1:"7",x2:"4",y1:"17",y2:"20"}],["line",{x1:"3",x2:"5",y1:"19",y2:"21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dA=["svg",h,[["path",{d:"m18 2 4 4"}],["path",{d:"m17 7 3-3"}],["path",{d:"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"}],["path",{d:"m9 11 4 4"}],["path",{d:"m5 19-3 3"}],["path",{d:"m14 4 6 6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lA=["svg",h,[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pA=["svg",h,[["path",{d:"M12 21v-6"}],["path",{d:"M12 9V3"}],["path",{d:"M3 15h18"}],["path",{d:"M3 9h18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uA=["svg",h,[["path",{d:"M12 15V9"}],["path",{d:"M3 15h18"}],["path",{d:"M3 9h18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gA=["svg",h,[["path",{d:"M14 14v2"}],["path",{d:"M14 20v2"}],["path",{d:"M14 2v2"}],["path",{d:"M14 8v2"}],["path",{d:"M2 15h8"}],["path",{d:"M2 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2"}],["path",{d:"M2 9h8"}],["path",{d:"M22 15h-4"}],["path",{d:"M22 3h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"}],["path",{d:"M22 9h-4"}],["path",{d:"M5 3v18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fA=["svg",h,[["path",{d:"M15 3v18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M21 9H3"}],["path",{d:"M21 15H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MA=["svg",h,[["path",{d:"M14 10h2"}],["path",{d:"M15 22v-8"}],["path",{d:"M15 2v4"}],["path",{d:"M2 10h2"}],["path",{d:"M20 10h2"}],["path",{d:"M3 19h18"}],["path",{d:"M3 22v-6a2 2 135 0 1 2-2h14a2 2 45 0 1 2 2v6"}],["path",{d:"M3 2v2a2 2 45 0 0 2 2h14a2 2 135 0 0 2-2V2"}],["path",{d:"M8 10h2"}],["path",{d:"M9 22v-8"}],["path",{d:"M9 2v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vA=["svg",h,[["path",{d:"M12 3v18"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M3 15h18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mA=["svg",h,[["rect",{width:"10",height:"14",x:"3",y:"8",rx:"2"}],["path",{d:"M5 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-2.4"}],["path",{d:"M8 18h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yA=["svg",h,[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xA=["svg",h,[["circle",{cx:"7",cy:"7",r:"5"}],["circle",{cx:"17",cy:"17",r:"5"}],["path",{d:"M12 17h10"}],["path",{d:"m3.46 10.54 7.08-7.08"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _A=["svg",h,[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bA=["svg",h,[["path",{d:"m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"}],["path",{d:"M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z"}],["circle",{cx:"6.5",cy:"9.5",r:".5",fill:"currentColor"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wA=["svg",h,[["path",{d:"M4 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SA=["svg",h,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kA=["svg",h,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}],["path",{d:"M14 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AA=["svg",h,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}],["path",{d:"M14 4v16"}],["path",{d:"M19 4v16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CA=["svg",h,[["path",{d:"M4 4v16"}],["path",{d:"M9 4v16"}],["path",{d:"M14 4v16"}],["path",{d:"M19 4v16"}],["path",{d:"M22 6 2 18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LA=["svg",h,[["circle",{cx:"17",cy:"4",r:"2"}],["path",{d:"M15.59 5.41 5.41 15.59"}],["circle",{cx:"4",cy:"17",r:"2"}],["path",{d:"M12 22s-4-9-1.5-11.5S22 12 22 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PA=["svg",h,[["circle",{cx:"12",cy:"12",r:"10"}],["circle",{cx:"12",cy:"12",r:"6"}],["circle",{cx:"12",cy:"12",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const HA=["svg",h,[["path",{d:"m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"}],["path",{d:"m13.56 11.747 4.332-.924"}],["path",{d:"m16 21-3.105-6.21"}],["path",{d:"M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"}],["path",{d:"m6.158 8.633 1.114 4.456"}],["path",{d:"m8 21 3.105-6.21"}],["circle",{cx:"12",cy:"13",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VA=["svg",h,[["circle",{cx:"4",cy:"4",r:"2"}],["path",{d:"m14 5 3-3 3 3"}],["path",{d:"m14 10 3-3 3 3"}],["path",{d:"M17 14V2"}],["path",{d:"M17 14H7l-5 8h20Z"}],["path",{d:"M8 14v8"}],["path",{d:"m9 14 5 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TA=["svg",h,[["path",{d:"M3.5 21 14 3"}],["path",{d:"M20.5 21 10 3"}],["path",{d:"M15.5 21 12 15l-3.5 6"}],["path",{d:"M2 21h20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EA=["svg",h,[["polyline",{points:"4 17 10 11 4 5"}],["line",{x1:"12",x2:"20",y1:"19",y2:"19"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ir=["svg",h,[["path",{d:"M21 7 6.82 21.18a2.83 2.83 0 0 1-3.99-.01v0a2.83 2.83 0 0 1 0-4L17 3"}],["path",{d:"m16 2 6 6"}],["path",{d:"M12 16H4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DA=["svg",h,[["path",{d:"M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"}],["path",{d:"M8.5 2h7"}],["path",{d:"M14.5 16h-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OA=["svg",h,[["path",{d:"M9 2v17.5A2.5 2.5 0 0 1 6.5 22v0A2.5 2.5 0 0 1 4 19.5V2"}],["path",{d:"M20 2v17.5a2.5 2.5 0 0 1-2.5 2.5v0a2.5 2.5 0 0 1-2.5-2.5V2"}],["path",{d:"M3 2h7"}],["path",{d:"M14 2h7"}],["path",{d:"M9 16H4"}],["path",{d:"M20 16h-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RA=["svg",h,[["path",{d:"M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"}],["path",{d:"M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"}],["path",{d:"M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"}],["path",{d:"M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"}],["path",{d:"M9 7v10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IA=["svg",h,[["path",{d:"M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1"}],["path",{d:"M7 22h1a4 4 0 0 0 4-4v-1"}],["path",{d:"M7 2h1a4 4 0 0 1 4 4v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BA=["svg",h,[["path",{d:"M17 6H3"}],["path",{d:"M21 12H8"}],["path",{d:"M21 18H8"}],["path",{d:"M3 12v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FA=["svg",h,[["path",{d:"M21 6H3"}],["path",{d:"M10 12H3"}],["path",{d:"M10 18H3"}],["circle",{cx:"17",cy:"15",r:"3"}],["path",{d:"m21 19-1.9-1.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Br=["svg",h,[["path",{d:"M5 3a2 2 0 0 0-2 2"}],["path",{d:"M19 3a2 2 0 0 1 2 2"}],["path",{d:"M21 19a2 2 0 0 1-2 2"}],["path",{d:"M5 21a2 2 0 0 1-2-2"}],["path",{d:"M9 3h1"}],["path",{d:"M9 21h1"}],["path",{d:"M14 3h1"}],["path",{d:"M14 21h1"}],["path",{d:"M3 9v1"}],["path",{d:"M21 9v1"}],["path",{d:"M3 14v1"}],["path",{d:"M21 14v1"}],["line",{x1:"7",x2:"15",y1:"8",y2:"8"}],["line",{x1:"7",x2:"17",y1:"12",y2:"12"}],["line",{x1:"7",x2:"13",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zA=["svg",h,[["path",{d:"M17 6.1H3"}],["path",{d:"M21 12.1H3"}],["path",{d:"M15.1 18H3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NA=["svg",h,[["path",{d:"M2 10s3-3 3-8"}],["path",{d:"M22 10s-3-3-3-8"}],["path",{d:"M10 2c0 4.4-3.6 8-8 8"}],["path",{d:"M14 2c0 4.4 3.6 8 8 8"}],["path",{d:"M2 10s2 2 2 5"}],["path",{d:"M22 10s-2 2-2 5"}],["path",{d:"M8 15h8"}],["path",{d:"M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"}],["path",{d:"M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZA=["svg",h,[["path",{d:"M2 12h10"}],["path",{d:"M9 4v16"}],["path",{d:"m3 9 3 3-3 3"}],["path",{d:"M12 6 9 9 6 6"}],["path",{d:"m6 18 3-3 1.5 1.5"}],["path",{d:"M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const WA=["svg",h,[["path",{d:"M12 9a4 4 0 0 0-2 7.5"}],["path",{d:"M12 3v2"}],["path",{d:"m6.6 18.4-1.4 1.4"}],["path",{d:"M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}],["path",{d:"M4 13H2"}],["path",{d:"M6.34 7.34 4.93 5.93"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UA=["svg",h,[["path",{d:"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qA=["svg",h,[["path",{d:"M17 14V2"}],["path",{d:"M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $A=["svg",h,[["path",{d:"M7 10v12"}],["path",{d:"M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jA=["svg",h,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"m9 12 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YA=["svg",h,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M9 12h6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XA=["svg",h,[["path",{d:"M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M9 9h.01"}],["path",{d:"m15 9-6 6"}],["path",{d:"M15 15h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GA=["svg",h,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M9 12h6"}],["path",{d:"M12 9v6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KA=["svg",h,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"m9.5 14.5 5-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JA=["svg",h,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"m9.5 14.5 5-5"}],["path",{d:"m9.5 9.5 5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QA=["svg",h,[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"}],["path",{d:"M13 5v2"}],["path",{d:"M13 17v2"}],["path",{d:"M13 11v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tC=["svg",h,[["path",{d:"M10 2h4"}],["path",{d:"M4.6 11a8 8 0 0 0 1.7 8.7 8 8 0 0 0 8.7 1.7"}],["path",{d:"M7.4 7.4a8 8 0 0 1 10.3 1 8 8 0 0 1 .9 10.2"}],["path",{d:"m2 2 20 20"}],["path",{d:"M12 12v-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eC=["svg",h,[["path",{d:"M10 2h4"}],["path",{d:"M12 14v-4"}],["path",{d:"M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"}],["path",{d:"M9 17H4v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aC=["svg",h,[["line",{x1:"10",x2:"14",y1:"2",y2:"2"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11"}],["circle",{cx:"12",cy:"14",r:"8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iC=["svg",h,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"6",ry:"6"}],["circle",{cx:"8",cy:"12",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sC=["svg",h,[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"6",ry:"6"}],["circle",{cx:"16",cy:"12",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nC=["svg",h,[["path",{d:"M21 4H3"}],["path",{d:"M18 8H6"}],["path",{d:"M19 12H9"}],["path",{d:"M16 16h-6"}],["path",{d:"M11 20H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oC=["svg",h,[["ellipse",{cx:"12",cy:"11",rx:"3",ry:"2"}],["ellipse",{cx:"12",cy:"12.5",rx:"10",ry:"8.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rC=["svg",h,[["path",{d:"M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16"}],["path",{d:"M2 14h12"}],["path",{d:"M22 14h-2"}],["path",{d:"M12 20v-6"}],["path",{d:"m2 2 20 20"}],["path",{d:"M22 16V6a2 2 0 0 0-2-2H10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hC=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M2 14h20"}],["path",{d:"M12 20v-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cC=["svg",h,[["path",{d:"M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z"}],["path",{d:"M8 13v9"}],["path",{d:"M16 22v-9"}],["path",{d:"m9 6 1 7"}],["path",{d:"m15 6-1 7"}],["path",{d:"M12 6V2"}],["path",{d:"M13 2h-2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dC=["svg",h,[["rect",{width:"18",height:"12",x:"3",y:"8",rx:"1"}],["path",{d:"M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3"}],["path",{d:"M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lC=["svg",h,[["path",{d:"m10 11 11 .9c.6 0 .9.5.8 1.1l-.8 5h-1"}],["path",{d:"M16 18h-5"}],["path",{d:"M18 5a1 1 0 0 0-1 1v5.573"}],["path",{d:"M3 4h9l1 7.246"}],["path",{d:"M4 11V4"}],["path",{d:"M7 15h.01"}],["path",{d:"M8 10.1V4"}],["circle",{cx:"18",cy:"18",r:"2"}],["circle",{cx:"7",cy:"15",r:"5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pC=["svg",h,[["path",{d:"M9.3 6.2a4.55 4.55 0 0 0 5.4 0"}],["path",{d:"M7.9 10.7c.9.8 2.4 1.3 4.1 1.3s3.2-.5 4.1-1.3"}],["path",{d:"M13.9 3.5a1.93 1.93 0 0 0-3.8-.1l-3 10c-.1.2-.1.4-.1.6 0 1.7 2.2 3 5 3s5-1.3 5-3c0-.2 0-.4-.1-.5Z"}],["path",{d:"m7.5 12.2-4.7 2.7c-.5.3-.8.7-.8 1.1s.3.8.8 1.1l7.6 4.5c.9.5 2.1.5 3 0l7.6-4.5c.7-.3 1-.7 1-1.1s-.3-.8-.8-1.1l-4.7-2.8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uC=["svg",h,[["path",{d:"M2 22V12a10 10 0 1 1 20 0v10"}],["path",{d:"M15 6.8v1.4a3 2.8 0 1 1-6 0V6.8"}],["path",{d:"M10 15h.01"}],["path",{d:"M14 15h.01"}],["path",{d:"M10 19a4 4 0 0 1-4-4v-3a6 6 0 1 1 12 0v3a4 4 0 0 1-4 4Z"}],["path",{d:"m9 19-2 3"}],["path",{d:"m15 19 2 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gC=["svg",h,[["path",{d:"M8 3.1V7a4 4 0 0 0 8 0V3.1"}],["path",{d:"m9 15-1-1"}],["path",{d:"m15 15 1-1"}],["path",{d:"M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"}],["path",{d:"m8 19-2 3"}],["path",{d:"m16 19 2 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fC=["svg",h,[["path",{d:"M2 17 17 2"}],["path",{d:"m2 14 8 8"}],["path",{d:"m5 11 8 8"}],["path",{d:"m8 8 8 8"}],["path",{d:"m11 5 8 8"}],["path",{d:"m14 2 8 8"}],["path",{d:"M7 22 22 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fr=["svg",h,[["rect",{width:"16",height:"16",x:"4",y:"3",rx:"2"}],["path",{d:"M4 11h16"}],["path",{d:"M12 3v8"}],["path",{d:"m8 19-2 3"}],["path",{d:"m18 22-2-3"}],["path",{d:"M8 15h.01"}],["path",{d:"M16 15h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const MC=["svg",h,[["path",{d:"M3 6h18"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vC=["svg",h,[["path",{d:"M3 6h18"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mC=["svg",h,[["path",{d:"M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"}],["path",{d:"M12 19v3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zr=["svg",h,[["path",{d:"M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"}],["path",{d:"M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"}],["path",{d:"M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"}],["path",{d:"M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yC=["svg",h,[["path",{d:"m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"}],["path",{d:"M12 22v-3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xC=["svg",h,[["path",{d:"M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"}],["path",{d:"M7 16v6"}],["path",{d:"M13 19v3"}],["path",{d:"M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _C=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2"}],["rect",{width:"3",height:"9",x:"7",y:"7"}],["rect",{width:"3",height:"5",x:"14",y:"7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bC=["svg",h,[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7"}],["polyline",{points:"16 17 22 17 22 11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wC=["svg",h,[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17"}],["polyline",{points:"16 7 22 7 22 13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nr=["svg",h,[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{d:"M12 9v4"}],["path",{d:"M12 17h.01"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SC=["svg",h,[["path",{d:"M22 18a2 2 0 0 1-2 2H3c-1.1 0-1.3-.6-.4-1.3L20.4 4.3c.9-.7 1.6-.4 1.6.7Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kC=["svg",h,[["path",{d:"M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AC=["svg",h,[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18"}],["path",{d:"M4 22h16"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CC=["svg",h,[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}],["path",{d:"M15 18H9"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"}],["circle",{cx:"17",cy:"18",r:"2"}],["circle",{cx:"7",cy:"18",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LC=["svg",h,[["path",{d:"m12 10 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a8 8 0 1 0-16 0v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3l2-4h4Z"}],["path",{d:"M4.82 7.9 8 10"}],["path",{d:"M15.18 7.9 12 10"}],["path",{d:"M16.93 10H20a2 2 0 0 1 0 4H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PC=["svg",h,[["path",{d:"M7 21h10"}],["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const HC=["svg",h,[["rect",{width:"20",height:"15",x:"2",y:"7",rx:"2",ry:"2"}],["polyline",{points:"17 2 12 7 7 2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VC=["svg",h,[["path",{d:"M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TC=["svg",h,[["path",{d:"M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EC=["svg",h,[["polyline",{points:"4 7 4 4 20 4 20 7"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DC=["svg",h,[["path",{d:"M12 2v1"}],["path",{d:"M15.5 21a1.85 1.85 0 0 1-3.5-1v-8H2a10 10 0 0 1 3.428-6.575"}],["path",{d:"M17.5 12H22A10 10 0 0 0 9.004 3.455"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OC=["svg",h,[["path",{d:"M22 12a10.06 10.06 1 0 0-20 0Z"}],["path",{d:"M12 12v8a2 2 0 0 0 4 0"}],["path",{d:"M12 2v1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RC=["svg",h,[["path",{d:"M6 4v6a6 6 0 0 0 12 0V4"}],["line",{x1:"4",x2:"20",y1:"20",y2:"20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IC=["svg",h,[["path",{d:"M9 14 4 9l5-5"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BC=["svg",h,[["circle",{cx:"12",cy:"17",r:"1"}],["path",{d:"M3 7v6h6"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FC=["svg",h,[["path",{d:"M3 7v6h6"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zC=["svg",h,[["path",{d:"M16 12h6"}],["path",{d:"M8 12H2"}],["path",{d:"M12 2v2"}],["path",{d:"M12 8v2"}],["path",{d:"M12 14v2"}],["path",{d:"M12 20v2"}],["path",{d:"m19 15 3-3-3-3"}],["path",{d:"m5 9-3 3 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NC=["svg",h,[["path",{d:"M12 22v-6"}],["path",{d:"M12 8V2"}],["path",{d:"M4 12H2"}],["path",{d:"M10 12H8"}],["path",{d:"M16 12h-2"}],["path",{d:"M22 12h-2"}],["path",{d:"m15 19-3 3-3-3"}],["path",{d:"m15 5-3-3-3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZC=["svg",h,[["rect",{width:"8",height:"6",x:"5",y:"4",rx:"1"}],["rect",{width:"8",height:"6",x:"11",y:"14",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zr=["svg",h,[["circle",{cx:"12",cy:"10",r:"1"}],["path",{d:"M22 20V8h-4l-6-4-6 4H2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2"}],["path",{d:"M6 17v.01"}],["path",{d:"M6 13v.01"}],["path",{d:"M18 17v.01"}],["path",{d:"M18 13v.01"}],["path",{d:"M14 22v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const WC=["svg",h,[["path",{d:"M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UC=["svg",h,[["path",{d:"m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"}],["path",{d:"m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"}],["line",{x1:"8",x2:"8",y1:"2",y2:"5"}],["line",{x1:"2",x2:"5",y1:"8",y2:"8"}],["line",{x1:"16",x2:"16",y1:"19",y2:"22"}],["line",{x1:"19",x2:"22",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qC=["svg",h,[["path",{d:"m19 5 3-3"}],["path",{d:"m2 22 3-3"}],["path",{d:"M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"}],["path",{d:"M7.5 13.5 10 11"}],["path",{d:"M10.5 16.5 13 14"}],["path",{d:"m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $C=["svg",h,[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}],["polyline",{points:"17 8 12 3 7 8"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jC=["svg",h,[["circle",{cx:"10",cy:"7",r:"1"}],["circle",{cx:"4",cy:"20",r:"1"}],["path",{d:"M4.7 19.3 19 5"}],["path",{d:"m21 3-3 1 2 2Z"}],["path",{d:"M9.26 7.68 5 12l2 5"}],["path",{d:"m10 14 5 2 3.5-3.5"}],["path",{d:"m18 12 1-1 1 1-1 1Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YC=["svg",h,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["polyline",{points:"16 11 18 13 22 9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XC=["svg",h,[["circle",{cx:"18",cy:"15",r:"3"}],["circle",{cx:"9",cy:"7",r:"4"}],["path",{d:"M10 15H6a4 4 0 0 0-4 4v2"}],["path",{d:"m21.7 16.4-.9-.3"}],["path",{d:"m15.2 13.9-.9-.3"}],["path",{d:"m16.6 18.7.3-.9"}],["path",{d:"m19.1 12.2.3-.9"}],["path",{d:"m19.6 18.7-.4-1"}],["path",{d:"m16.8 12.3-.4-1"}],["path",{d:"m14.3 16.6 1-.4"}],["path",{d:"m20.7 13.8 1-.4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GC=["svg",h,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KC=["svg",h,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wr=["svg",h,[["path",{d:"M2 21a8 8 0 0 1 13.292-6"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"m16 19 2 2 4-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ur=["svg",h,[["path",{d:"M2 21a8 8 0 0 1 10.434-7.62"}],["circle",{cx:"10",cy:"8",r:"5"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m19.5 14.3-.4.9"}],["path",{d:"m16.9 20.8-.4.9"}],["path",{d:"m21.7 19.5-.9-.4"}],["path",{d:"m15.2 16.9-.9-.4"}],["path",{d:"m21.7 16.5-.9.4"}],["path",{d:"m15.2 19.1-.9.4"}],["path",{d:"m19.5 21.7-.4-.9"}],["path",{d:"m16.9 15.2-.4-.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qr=["svg",h,[["path",{d:"M2 21a8 8 0 0 1 13.292-6"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M22 19h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $r=["svg",h,[["path",{d:"M2 21a8 8 0 0 1 13.292-6"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M19 16v6"}],["path",{d:"M22 19h-6"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JC=["svg",h,[["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M2 21a8 8 0 0 1 10.434-7.62"}],["circle",{cx:"18",cy:"18",r:"3"}],["path",{d:"m22 22-1.9-1.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jr=["svg",h,[["path",{d:"M2 21a8 8 0 0 1 11.873-7"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"m17 17 5 5"}],["path",{d:"m22 17-5 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yr=["svg",h,[["circle",{cx:"12",cy:"8",r:"5"}],["path",{d:"M20 21a8 8 0 0 0-16 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QC=["svg",h,[["circle",{cx:"10",cy:"7",r:"4"}],["path",{d:"M10.3 15H7a4 4 0 0 0-4 4v2"}],["circle",{cx:"17",cy:"17",r:"3"}],["path",{d:"m21 21-1.9-1.9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tL=["svg",h,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eL=["svg",h,[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"}],["circle",{cx:"12",cy:"7",r:"4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xr=["svg",h,[["path",{d:"M18 21a8 8 0 0 0-16 0"}],["circle",{cx:"10",cy:"8",r:"5"}],["path",{d:"M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aL=["svg",h,[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:"9",cy:"7",r:"4"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iL=["svg",h,[["path",{d:"m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"}],["path",{d:"M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"}],["path",{d:"m2.1 21.8 6.4-6.3"}],["path",{d:"m19 5-7 7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sL=["svg",h,[["path",{d:"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"}],["path",{d:"M7 2v20"}],["path",{d:"M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nL=["svg",h,[["path",{d:"M12 2v20"}],["path",{d:"M2 5h20"}],["path",{d:"M3 3v2"}],["path",{d:"M7 3v2"}],["path",{d:"M17 3v2"}],["path",{d:"M21 3v2"}],["path",{d:"m19 5-7 7-7-7"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oL=["svg",h,[["path",{d:"M8 21s-4-3-4-9 4-9 4-9"}],["path",{d:"M16 3s4 3 4 9-4 9-4 9"}],["line",{x1:"15",x2:"9",y1:"9",y2:"15"}],["line",{x1:"9",x2:"15",y1:"9",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rL=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor"}],["path",{d:"m7.9 7.9 2.7 2.7"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor"}],["path",{d:"m13.4 10.6 2.7-2.7"}],["circle",{cx:"7.5",cy:"16.5",r:".5",fill:"currentColor"}],["path",{d:"m7.9 16.1 2.7-2.7"}],["circle",{cx:"16.5",cy:"16.5",r:".5",fill:"currentColor"}],["path",{d:"m13.4 13.4 2.7 2.7"}],["circle",{cx:"12",cy:"12",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hL=["svg",h,[["path",{d:"M2 2a26.6 26.6 0 0 1 10 20c.9-6.82 1.5-9.5 4-14"}],["path",{d:"M16 8c4 0 6-2 6-6-4 0-6 2-6 6"}],["path",{d:"M17.41 3.6a10 10 0 1 0 3 3"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cL=["svg",h,[["path",{d:"M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z"}],["path",{d:"M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z"}],["path",{d:"M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dL=["svg",h,[["path",{d:"m2 8 2 2-2 2 2 2-2 2"}],["path",{d:"m22 8-2 2 2 2-2 2 2 2"}],["path",{d:"M8 8v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2"}],["path",{d:"M16 10.34V6c0-.55-.45-1-1-1h-4.34"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lL=["svg",h,[["path",{d:"m2 8 2 2-2 2 2 2-2 2"}],["path",{d:"m22 8-2 2 2 2-2 2 2 2"}],["rect",{width:"8",height:"14",x:"8",y:"5",rx:"1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pL=["svg",h,[["path",{d:"M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"}],["path",{d:"M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uL=["svg",h,[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gL=["svg",h,[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2"}],["path",{d:"M2 8h20"}],["circle",{cx:"8",cy:"14",r:"2"}],["path",{d:"M8 12h8"}],["circle",{cx:"16",cy:"14",r:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fL=["svg",h,[["path",{d:"M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z"}],["path",{d:"M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"}],["path",{d:"M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ML=["svg",h,[["circle",{cx:"6",cy:"12",r:"4"}],["circle",{cx:"18",cy:"12",r:"4"}],["line",{x1:"6",x2:"18",y1:"16",y2:"16"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vL=["svg",h,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}],["path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mL=["svg",h,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}],["path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07"}],["path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yL=["svg",h,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xL=["svg",h,[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _L=["svg",h,[["path",{d:"m9 12 2 2 4-4"}],["path",{d:"M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"}],["path",{d:"M22 19H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bL=["svg",h,[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"}],["path",{d:"M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gr=["svg",h,[["path",{d:"M17 14h.01"}],["path",{d:"M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wL=["svg",h,[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const SL=["svg",h,[["circle",{cx:"8",cy:"9",r:"2"}],["path",{d:"m9 17 6.1-6.1a2 2 0 0 1 2.81.01L22 15V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2"}],["path",{d:"M8 21h8"}],["path",{d:"M12 17v4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kr=["svg",h,[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"}],["path",{d:"m14 7 3 3"}],["path",{d:"M5 6v4"}],["path",{d:"M19 14v4"}],["path",{d:"M10 2v2"}],["path",{d:"M7 8H3"}],["path",{d:"M21 16h-4"}],["path",{d:"M11 3H9"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kL=["svg",h,[["path",{d:"M15 4V2"}],["path",{d:"M15 16v-2"}],["path",{d:"M8 9h2"}],["path",{d:"M20 9h2"}],["path",{d:"M17.8 11.8 19 13"}],["path",{d:"M15 9h0"}],["path",{d:"M17.8 6.2 19 5"}],["path",{d:"m3 21 9-9"}],["path",{d:"M12.2 6.2 11 5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const AL=["svg",h,[["path",{d:"M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"}],["path",{d:"M6 18h12"}],["path",{d:"M6 14h12"}],["rect",{width:"12",height:"12",x:"6",y:"10"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const CL=["svg",h,[["path",{d:"M3 6h3"}],["path",{d:"M17 6h.01"}],["rect",{width:"18",height:"20",x:"3",y:"2",rx:"2"}],["circle",{cx:"12",cy:"13",r:"5"}],["path",{d:"M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const LL=["svg",h,[["circle",{cx:"12",cy:"12",r:"6"}],["polyline",{points:"12 10 12 12 13 13"}],["path",{d:"m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"}],["path",{d:"m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const PL=["svg",h,[["path",{d:"M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}],["path",{d:"M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const HL=["svg",h,[["circle",{cx:"12",cy:"4.5",r:"2.5"}],["path",{d:"m10.2 6.3-3.9 3.9"}],["circle",{cx:"4.5",cy:"12",r:"2.5"}],["path",{d:"M7 12h10"}],["circle",{cx:"19.5",cy:"12",r:"2.5"}],["path",{d:"m13.8 17.7 3.9-3.9"}],["circle",{cx:"12",cy:"19.5",r:"2.5"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const VL=["svg",h,[["circle",{cx:"12",cy:"10",r:"8"}],["circle",{cx:"12",cy:"10",r:"3"}],["path",{d:"M7 22h10"}],["path",{d:"M12 22v-4"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const TL=["svg",h,[["path",{d:"M17 17h-5c-1.09-.02-1.94.92-2.5 1.9A3 3 0 1 1 2.57 15"}],["path",{d:"M9 3.4a4 4 0 0 1 6.52.66"}],["path",{d:"m6 17 3.1-5.8a2.5 2.5 0 0 0 .057-2.05"}],["path",{d:"M20.3 20.3a4 4 0 0 1-2.3.7"}],["path",{d:"M18.6 13a4 4 0 0 1 3.357 3.414"}],["path",{d:"m12 6 .6 1"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const EL=["svg",h,[["path",{d:"M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"}],["path",{d:"m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"}],["path",{d:"m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const DL=["svg",h,[["circle",{cx:"12",cy:"5",r:"3"}],["path",{d:"M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const OL=["svg",h,[["path",{d:"m2 22 10-10"}],["path",{d:"m16 8-1.17 1.17"}],["path",{d:"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"m8 8-.53.53a3.5 3.5 0 0 0 0 4.94L9 15l1.53-1.53c.55-.55.88-1.25.98-1.97"}],["path",{d:"M10.91 5.26c.15-.26.34-.51.56-.73L13 3l1.53 1.53a3.5 3.5 0 0 1 .28 4.62"}],["path",{d:"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"}],["path",{d:"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}],["path",{d:"m16 16-.53.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.49 3.49 0 0 1 1.97-.98"}],["path",{d:"M18.74 13.09c.26-.15.51-.34.73-.56L21 11l-1.53-1.53a3.5 3.5 0 0 0-4.62-.28"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const RL=["svg",h,[["path",{d:"M2 22 16 8"}],["path",{d:"M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"}],["path",{d:"M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"}],["path",{d:"M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}],["path",{d:"M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}],["path",{d:"M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const IL=["svg",h,[["circle",{cx:"7",cy:"12",r:"3"}],["path",{d:"M10 9v6"}],["circle",{cx:"17",cy:"12",r:"3"}],["path",{d:"M14 7v8"}],["path",{d:"M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const BL=["svg",h,[["path",{d:"M12 20h.01"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const FL=["svg",h,[["path",{d:"M12 20h.01"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zL=["svg",h,[["path",{d:"M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"}],["path",{d:"M9.6 4.6A2 2 0 1 1 11 8H2"}],["path",{d:"M12.6 19.4A2 2 0 1 0 14 16H2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const NL=["svg",h,[["path",{d:"M8 22h8"}],["path",{d:"M7 10h3m7 0h-1.343"}],["path",{d:"M12 15v7"}],["path",{d:"M7.307 7.307A12.33 12.33 0 0 0 7 10a5 5 0 0 0 7.391 4.391M8.638 2.981C8.75 2.668 8.872 2.34 9 2h6c1.5 4 2 6 2 8 0 .407-.05.809-.145 1.198"}],["line",{x1:"2",x2:"22",y1:"2",y2:"22"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ZL=["svg",h,[["path",{d:"M8 22h8"}],["path",{d:"M7 10h10"}],["path",{d:"M12 15v7"}],["path",{d:"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const WL=["svg",h,[["rect",{width:"8",height:"8",x:"3",y:"3",rx:"2"}],["path",{d:"M7 11v4a2 2 0 0 0 2 2h4"}],["rect",{width:"8",height:"8",x:"13",y:"13",rx:"2"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const UL=["svg",h,[["path",{d:"m19 12-1.5 3"}],["path",{d:"M19.63 18.81 22 20"}],["path",{d:"M6.47 8.23a1.68 1.68 0 0 1 2.44 1.93l-.64 2.08a6.76 6.76 0 0 0 10.16 7.67l.42-.27a1 1 0 1 0-2.73-4.21l-.42.27a1.76 1.76 0 0 1-2.63-1.99l.64-2.08A6.66 6.66 0 0 0 3.94 3.9l-.7.4a1 1 0 1 0 2.55 4.34z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qL=["svg",h,[["line",{x1:"3",x2:"21",y1:"6",y2:"6"}],["path",{d:"M3 12h15a3 3 0 1 1 0 6h-4"}],["polyline",{points:"16 16 14 18 16 20"}],["line",{x1:"3",x2:"10",y1:"18",y2:"18"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $L=["svg",h,[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jL=["svg",h,[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const YL=["svg",h,[["path",{d:"M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"}],["path",{d:"m10 15 5-3-5-3z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const XL=["svg",h,[["path",{d:"M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317"}],["path",{d:"M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773"}],["path",{d:"M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643"}],["path",{d:"m2 2 20 20"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const GL=["svg",h,[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const KL=["svg",h,[["circle",{cx:"11",cy:"11",r:"8"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const JL=["svg",h,[["circle",{cx:"11",cy:"11",r:"8"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11"}]]];/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const QL=Object.freeze(Object.defineProperty({__proto__:null,AArrowDown:ip,AArrowUp:sp,ALargeSmall:np,Accessibility:op,Activity:rp,ActivitySquare:Fo,AirVent:hp,Airplay:cp,AlarmCheck:$n,AlarmClock:lp,AlarmClockCheck:$n,AlarmClockMinus:jn,AlarmClockOff:dp,AlarmClockPlus:Yn,AlarmMinus:jn,AlarmPlus:Yn,AlarmSmoke:pp,Album:up,AlertCircle:h2,AlertOctagon:vo,AlertTriangle:Nr,AlignCenter:Mp,AlignCenterHorizontal:gp,AlignCenterVertical:fp,AlignEndHorizontal:vp,AlignEndVertical:mp,AlignHorizontalDistributeCenter:yp,AlignHorizontalDistributeEnd:xp,AlignHorizontalDistributeStart:_p,AlignHorizontalJustifyCenter:bp,AlignHorizontalJustifyEnd:wp,AlignHorizontalJustifyStart:Sp,AlignHorizontalSpaceAround:kp,AlignHorizontalSpaceBetween:Ap,AlignJustify:Cp,AlignLeft:Lp,AlignRight:Pp,AlignStartHorizontal:Hp,AlignStartVertical:Vp,AlignVerticalDistributeCenter:Tp,AlignVerticalDistributeEnd:Ep,AlignVerticalDistributeStart:Dp,AlignVerticalJustifyCenter:Op,AlignVerticalJustifyEnd:Rp,AlignVerticalJustifyStart:Ip,AlignVerticalSpaceAround:Bp,AlignVerticalSpaceBetween:Fp,Ambulance:zp,Ampersand:Np,Ampersands:Zp,Anchor:Wp,Angry:Up,Annoyed:qp,Antenna:$p,Anvil:jp,Aperture:Yp,AppWindow:Gp,AppWindowMac:Xp,Apple:Kp,Archive:tu,ArchiveRestore:Jp,ArchiveX:Qp,AreaChart:eu,Armchair:au,ArrowBigDown:su,ArrowBigDownDash:iu,ArrowBigLeft:ou,ArrowBigLeftDash:nu,ArrowBigRight:hu,ArrowBigRightDash:ru,ArrowBigUp:du,ArrowBigUpDash:cu,ArrowDown:xu,ArrowDown01:lu,ArrowDown10:pu,ArrowDownAZ:Xn,ArrowDownAz:Xn,ArrowDownCircle:c2,ArrowDownFromLine:uu,ArrowDownLeft:gu,ArrowDownLeftFromCircle:l2,ArrowDownLeftFromSquare:Uo,ArrowDownLeftSquare:zo,ArrowDownNarrowWide:fu,ArrowDownRight:Mu,ArrowDownRightFromCircle:p2,ArrowDownRightFromSquare:qo,ArrowDownRightSquare:No,ArrowDownSquare:Zo,ArrowDownToDot:vu,ArrowDownToLine:mu,ArrowDownUp:yu,ArrowDownWideNarrow:Gn,ArrowDownZA:Kn,ArrowDownZa:Kn,ArrowLeft:Su,ArrowLeftCircle:d2,ArrowLeftFromLine:_u,ArrowLeftRight:bu,ArrowLeftSquare:Wo,ArrowLeftToLine:wu,ArrowRight:Lu,ArrowRightCircle:f2,ArrowRightFromLine:ku,ArrowRightLeft:Au,ArrowRightSquare:Yo,ArrowRightToLine:Cu,ArrowUp:Bu,ArrowUp01:Pu,ArrowUp10:Hu,ArrowUpAZ:Jn,ArrowUpAz:Jn,ArrowUpCircle:M2,ArrowUpDown:Vu,ArrowUpFromDot:Tu,ArrowUpFromLine:Eu,ArrowUpLeft:Du,ArrowUpLeftFromCircle:u2,ArrowUpLeftFromSquare:$o,ArrowUpLeftSquare:Xo,ArrowUpNarrowWide:Qn,ArrowUpRight:Ou,ArrowUpRightFromCircle:g2,ArrowUpRightFromSquare:jo,ArrowUpRightSquare:Go,ArrowUpSquare:Ko,ArrowUpToLine:Ru,ArrowUpWideNarrow:Iu,ArrowUpZA:t2,ArrowUpZa:t2,ArrowsUpFromLine:Fu,Asterisk:zu,AsteriskSquare:Jo,AtSign:Nu,Atom:Zu,AudioLines:Wu,AudioWaveform:Uu,Award:qu,Axe:$u,Axis3D:e2,Axis3d:e2,Baby:ju,Backpack:Yu,Badge:d4,BadgeAlert:Xu,BadgeCent:Gu,BadgeCheck:a2,BadgeDollarSign:Ku,BadgeEuro:Ju,BadgeHelp:Qu,BadgeIndianRupee:t4,BadgeInfo:e4,BadgeJapaneseYen:a4,BadgeMinus:i4,BadgePercent:s4,BadgePlus:n4,BadgePoundSterling:o4,BadgeRussianRuble:r4,BadgeSwissFranc:h4,BadgeX:c4,BaggageClaim:l4,Ban:p4,Banana:u4,Banknote:g4,BarChart:_4,BarChart2:f4,BarChart3:M4,BarChart4:v4,BarChartBig:m4,BarChartHorizontal:x4,BarChartHorizontalBig:y4,Barcode:b4,Baseline:w4,Bath:S4,Battery:H4,BatteryCharging:k4,BatteryFull:A4,BatteryLow:C4,BatteryMedium:L4,BatteryWarning:P4,Beaker:V4,Bean:E4,BeanOff:T4,Bed:R4,BedDouble:D4,BedSingle:O4,Beef:I4,Beer:F4,BeerOff:B4,Bell:$4,BellDot:z4,BellElectric:N4,BellMinus:Z4,BellOff:W4,BellPlus:U4,BellRing:q4,BetweenHorizonalEnd:i2,BetweenHorizonalStart:s2,BetweenHorizontalEnd:i2,BetweenHorizontalStart:s2,BetweenVerticalEnd:j4,BetweenVerticalStart:Y4,Bike:X4,Binary:G4,Biohazard:K4,Bird:J4,Bitcoin:Q4,Blend:t5,Blinds:e5,Blocks:a5,Bluetooth:o5,BluetoothConnected:i5,BluetoothOff:s5,BluetoothSearching:n5,Bold:r5,Bolt:h5,Bomb:c5,Bone:d5,Book:E5,BookA:l5,BookAudio:p5,BookCheck:u5,BookCopy:g5,BookDashed:n2,BookDown:f5,BookHeadphones:M5,BookHeart:v5,BookImage:m5,BookKey:y5,BookLock:x5,BookMarked:_5,BookMinus:b5,BookOpen:k5,BookOpenCheck:w5,BookOpenText:S5,BookPlus:A5,BookTemplate:n2,BookText:C5,BookType:L5,BookUp:H5,BookUp2:P5,BookUser:V5,BookX:T5,Bookmark:B5,BookmarkCheck:D5,BookmarkMinus:O5,BookmarkPlus:R5,BookmarkX:I5,BoomBox:F5,Bot:Z5,BotMessageSquare:z5,BotOff:N5,Box:U5,BoxSelect:W5,Boxes:q5,Braces:o2,Brackets:$5,Brain:X5,BrainCircuit:j5,BrainCog:Y5,BrickWall:G5,Briefcase:Q5,BriefcaseBusiness:K5,BriefcaseMedical:J5,BringToFront:tg,Brush:eg,Bug:sg,BugOff:ag,BugPlay:ig,Building:og,Building2:ng,Bus:hg,BusFront:rg,Cable:dg,CableCar:cg,Cake:pg,CakeSlice:lg,Calculator:ug,Calendar:Pg,CalendarCheck:fg,CalendarCheck2:gg,CalendarClock:Mg,CalendarDays:vg,CalendarFold:mg,CalendarHeart:yg,CalendarMinus:_g,CalendarMinus2:xg,CalendarOff:bg,CalendarPlus:Sg,CalendarPlus2:wg,CalendarRange:kg,CalendarSearch:Ag,CalendarX:Lg,CalendarX2:Cg,Camera:Vg,CameraOff:Hg,CandlestickChart:Tg,Candy:Og,CandyCane:Eg,CandyOff:Dg,Cannabis:Rg,Captions:r2,CaptionsOff:Ig,Car:zg,CarFront:Bg,CarTaxiFront:Fg,Caravan:Ng,Carrot:Zg,CaseLower:Wg,CaseSensitive:Ug,CaseUpper:qg,CassetteTape:$g,Cast:jg,Castle:Yg,Cat:Xg,Cctv:Gg,Check:Jg,CheckCheck:Kg,CheckCircle:v2,CheckCircle2:m2,CheckSquare:tr,CheckSquare2:er,ChefHat:Qg,Cherry:tf,ChevronDown:ef,ChevronDownCircle:y2,ChevronDownSquare:ar,ChevronFirst:af,ChevronLast:sf,ChevronLeft:nf,ChevronLeftCircle:x2,ChevronLeftSquare:ir,ChevronRight:of,ChevronRightCircle:_2,ChevronRightSquare:sr,ChevronUp:rf,ChevronUpCircle:b2,ChevronUpSquare:nr,ChevronsDown:cf,ChevronsDownUp:hf,ChevronsLeft:lf,ChevronsLeftRight:df,ChevronsRight:uf,ChevronsRightLeft:pf,ChevronsUp:ff,ChevronsUpDown:gf,Chrome:Mf,Church:vf,Cigarette:yf,CigaretteOff:mf,Circle:Pf,CircleAlert:h2,CircleArrowDown:c2,CircleArrowLeft:d2,CircleArrowOutDownLeft:l2,CircleArrowOutDownRight:p2,CircleArrowOutUpLeft:u2,CircleArrowOutUpRight:g2,CircleArrowRight:f2,CircleArrowUp:M2,CircleCheck:m2,CircleCheckBig:v2,CircleChevronDown:y2,CircleChevronLeft:x2,CircleChevronRight:_2,CircleChevronUp:b2,CircleDashed:xf,CircleDivide:w2,CircleDollarSign:_f,CircleDot:wf,CircleDotDashed:bf,CircleEllipsis:Sf,CircleEqual:kf,CircleFadingPlus:Af,CircleGauge:S2,CircleHelp:k2,CircleMinus:A2,CircleOff:Cf,CircleParking:L2,CircleParkingOff:C2,CirclePause:P2,CirclePercent:H2,CirclePlay:V2,CirclePlus:T2,CirclePower:E2,CircleSlash:Lf,CircleSlash2:D2,CircleSlashed:D2,CircleStop:O2,CircleUser:I2,CircleUserRound:R2,CircleX:B2,CircuitBoard:Hf,Citrus:Vf,Clapperboard:Tf,Clipboard:Nf,ClipboardCheck:Ef,ClipboardCopy:Df,ClipboardEdit:z2,ClipboardList:Of,ClipboardMinus:Rf,ClipboardPaste:If,ClipboardPen:z2,ClipboardPenLine:F2,ClipboardPlus:Bf,ClipboardSignature:F2,ClipboardType:Ff,ClipboardX:zf,Clock:t3,Clock1:Zf,Clock10:Wf,Clock11:Uf,Clock12:qf,Clock2:$f,Clock3:jf,Clock4:Yf,Clock5:Xf,Clock6:Gf,Clock7:Kf,Clock8:Jf,Clock9:Qf,Cloud:g3,CloudCog:e3,CloudDownload:N2,CloudDrizzle:a3,CloudFog:i3,CloudHail:s3,CloudLightning:n3,CloudMoon:r3,CloudMoonRain:o3,CloudOff:h3,CloudRain:d3,CloudRainWind:c3,CloudSnow:l3,CloudSun:u3,CloudSunRain:p3,CloudUpload:Z2,Cloudy:f3,Clover:M3,Club:v3,Code:m3,Code2:W2,CodeSquare:or,CodeXml:W2,Codepen:y3,Codesandbox:x3,Coffee:_3,Cog:b3,Coins:w3,Columns:U2,Columns2:U2,Columns3:q2,Columns4:S3,Combine:k3,Command:A3,Compass:C3,Component:L3,Computer:P3,ConciergeBell:H3,Cone:V3,Construction:T3,Contact:E3,Contact2:$2,ContactRound:$2,Container:D3,Contrast:O3,Cookie:R3,CookingPot:I3,Copy:W3,CopyCheck:B3,CopyMinus:F3,CopyPlus:z3,CopySlash:N3,CopyX:Z3,Copyleft:U3,Copyright:q3,CornerDownLeft:$3,CornerDownRight:j3,CornerLeftDown:Y3,CornerLeftUp:X3,CornerRightDown:G3,CornerRightUp:K3,CornerUpLeft:J3,CornerUpRight:Q3,Cpu:t6,CreativeCommons:e6,CreditCard:a6,Croissant:i6,Crop:s6,Cross:n6,Crosshair:o6,Crown:r6,Cuboid:h6,CupSoda:c6,CurlyBraces:o2,Currency:d6,Cylinder:l6,Database:g6,DatabaseBackup:p6,DatabaseZap:u6,Delete:f6,Dessert:M6,Diameter:v6,Diamond:x6,DiamondMinus:m6,DiamondPercent:j2,DiamondPlus:y6,Dice1:_6,Dice2:b6,Dice3:w6,Dice4:S6,Dice5:k6,Dice6:A6,Dices:C6,Diff:L6,Disc:T6,Disc2:P6,Disc3:H6,DiscAlbum:V6,Divide:E6,DivideCircle:w2,DivideSquare:cr,Dna:O6,DnaOff:D6,Dock:R6,Dog:I6,DollarSign:B6,Donut:F6,DoorClosed:z6,DoorOpen:N6,Dot:Z6,DotSquare:dr,Download:W6,DownloadCloud:N2,DraftingCompass:U6,Drama:q6,Dribbble:$6,Drill:j6,Droplet:Y6,Droplets:X6,Drum:G6,Drumstick:K6,Dumbbell:J6,Ear:tM,EarOff:Q6,Earth:Y2,EarthLock:eM,Eclipse:aM,Edit:E1,Edit2:Po,Edit3:Lo,Egg:nM,EggFried:iM,EggOff:sM,Ellipsis:G2,EllipsisVertical:X2,Equal:rM,EqualNot:oM,EqualSquare:lr,Eraser:hM,Euro:cM,Expand:dM,ExternalLink:lM,Eye:uM,EyeOff:pM,Facebook:gM,Factory:fM,Fan:MM,FastForward:vM,Feather:mM,Fence:yM,FerrisWheel:xM,Figma:_M,File:_v,FileArchive:bM,FileAudio:SM,FileAudio2:wM,FileAxis3D:K2,FileAxis3d:K2,FileBadge:AM,FileBadge2:kM,FileBarChart:LM,FileBarChart2:CM,FileBox:PM,FileCheck:VM,FileCheck2:HM,FileClock:TM,FileCode:DM,FileCode2:EM,FileCog:J2,FileCog2:J2,FileDiff:OM,FileDigit:RM,FileDown:IM,FileEdit:to,FileHeart:BM,FileImage:FM,FileInput:zM,FileJson:ZM,FileJson2:NM,FileKey:UM,FileKey2:WM,FileLineChart:qM,FileLock:jM,FileLock2:$M,FileMinus:XM,FileMinus2:YM,FileMusic:GM,FileOutput:KM,FilePen:to,FilePenLine:Q2,FilePieChart:JM,FilePlus:tv,FilePlus2:QM,FileQuestion:ev,FileScan:av,FileSearch:sv,FileSearch2:iv,FileSignature:Q2,FileSliders:nv,FileSpreadsheet:ov,FileStack:rv,FileSymlink:hv,FileTerminal:cv,FileText:dv,FileType:pv,FileType2:lv,FileUp:uv,FileVideo:fv,FileVideo2:gv,FileVolume:vv,FileVolume2:Mv,FileWarning:mv,FileX:xv,FileX2:yv,Files:bv,Film:wv,Filter:kv,FilterX:Sv,Fingerprint:Av,FireExtinguisher:Cv,Fish:Hv,FishOff:Lv,FishSymbol:Pv,Flag:Dv,FlagOff:Vv,FlagTriangleLeft:Tv,FlagTriangleRight:Ev,Flame:Rv,FlameKindling:Ov,Flashlight:Bv,FlashlightOff:Iv,FlaskConical:zv,FlaskConicalOff:Fv,FlaskRound:Nv,FlipHorizontal:Wv,FlipHorizontal2:Zv,FlipVertical:qv,FlipVertical2:Uv,Flower:jv,Flower2:$v,Focus:Yv,FoldHorizontal:Xv,FoldVertical:Gv,Folder:w8,FolderArchive:Kv,FolderCheck:Jv,FolderClock:Qv,FolderClosed:t8,FolderCog:eo,FolderCog2:eo,FolderDot:e8,FolderDown:a8,FolderEdit:ao,FolderGit:s8,FolderGit2:i8,FolderHeart:n8,FolderInput:o8,FolderKanban:r8,FolderKey:h8,FolderLock:c8,FolderMinus:d8,FolderOpen:p8,FolderOpenDot:l8,FolderOutput:u8,FolderPen:ao,FolderPlus:g8,FolderRoot:f8,FolderSearch:v8,FolderSearch2:M8,FolderSymlink:m8,FolderSync:y8,FolderTree:x8,FolderUp:_8,FolderX:b8,Folders:S8,Footprints:k8,Forklift:A8,FormInput:Ho,Forward:C8,Frame:L8,Framer:P8,Frown:H8,Fuel:V8,Fullscreen:T8,FunctionSquare:pr,GalleryHorizontal:D8,GalleryHorizontalEnd:E8,GalleryThumbnails:O8,GalleryVertical:I8,GalleryVerticalEnd:R8,Gamepad:F8,Gamepad2:B8,GanttChart:z8,GanttChartSquare:ur,Gauge:N8,GaugeCircle:S2,Gavel:Z8,Gem:W8,Ghost:U8,Gift:q8,GitBranch:j8,GitBranchPlus:$8,GitCommit:io,GitCommitHorizontal:io,GitCommitVertical:Y8,GitCompare:G8,GitCompareArrows:X8,GitFork:K8,GitGraph:J8,GitMerge:Q8,GitPullRequest:nm,GitPullRequestArrow:tm,GitPullRequestClosed:em,GitPullRequestCreate:im,GitPullRequestCreateArrow:am,GitPullRequestDraft:sm,Github:om,Gitlab:rm,GlassWater:hm,Glasses:cm,Globe:lm,Globe2:Y2,GlobeLock:dm,Goal:pm,Grab:um,GraduationCap:gm,Grape:fm,Grid:Ui,Grid2X2:so,Grid2x2:so,Grid2x2Check:Mm,Grid2x2X:vm,Grid3X3:Ui,Grid3x3:Ui,Grip:xm,GripHorizontal:mm,GripVertical:ym,Group:_m,Guitar:bm,Ham:wm,Hammer:Sm,Hand:Pm,HandCoins:km,HandHeart:Am,HandHelping:no,HandMetal:Cm,HandPlatter:Lm,Handshake:Hm,HardDrive:Em,HardDriveDownload:Vm,HardDriveUpload:Tm,HardHat:Dm,Hash:Om,Haze:Rm,HdmiPort:Im,Heading:Um,Heading1:Bm,Heading2:Fm,Heading3:zm,Heading4:Nm,Heading5:Zm,Heading6:Wm,Headphones:qm,Headset:$m,Heart:Km,HeartCrack:jm,HeartHandshake:Ym,HeartOff:Xm,HeartPulse:Gm,Heater:Jm,HelpCircle:k2,HelpingHand:no,Hexagon:Qm,Highlighter:t7,History:e7,Home:a7,Hop:s7,HopOff:i7,Hospital:n7,Hotel:o7,Hourglass:r7,IceCream:ro,IceCream2:oo,IceCreamBowl:oo,IceCreamCone:ro,Image:g7,ImageDown:h7,ImageMinus:c7,ImageOff:d7,ImagePlay:l7,ImagePlus:p7,ImageUp:u7,Images:f7,Import:M7,Inbox:v7,Indent:co,IndentDecrease:ho,IndentIncrease:co,IndianRupee:m7,Infinity:y7,Info:x7,Inspect:yr,InspectionPanel:_7,Instagram:b7,Italic:w7,IterationCcw:S7,IterationCw:k7,JapaneseYen:A7,Joystick:C7,Kanban:L7,KanbanSquare:gr,KanbanSquareDashed:rr,Key:V7,KeyRound:P7,KeySquare:H7,Keyboard:D7,KeyboardMusic:T7,KeyboardOff:E7,Lamp:z7,LampCeiling:O7,LampDesk:R7,LampFloor:I7,LampWallDown:B7,LampWallUp:F7,LandPlot:N7,Landmark:Z7,Languages:W7,Laptop:U7,Laptop2:lo,LaptopMinimal:lo,Lasso:$7,LassoSelect:q7,Laugh:j7,Layers:G7,Layers2:Y7,Layers3:X7,Layout:Co,LayoutDashboard:K7,LayoutGrid:J7,LayoutList:Q7,LayoutPanelLeft:ty,LayoutPanelTop:ey,LayoutTemplate:ay,Leaf:iy,LeafyGreen:sy,Library:oy,LibraryBig:ny,LibrarySquare:fr,LifeBuoy:ry,Ligature:hy,Lightbulb:dy,LightbulbOff:cy,LineChart:ly,Link:gy,Link2:uy,Link2Off:py,Linkedin:fy,List:Hy,ListChecks:My,ListCollapse:vy,ListEnd:my,ListFilter:yy,ListMinus:xy,ListMusic:_y,ListOrdered:by,ListPlus:wy,ListRestart:Sy,ListStart:ky,ListTodo:Ay,ListTree:Cy,ListVideo:Ly,ListX:Py,Loader:Ty,Loader2:po,LoaderCircle:po,LoaderPinwheel:Vy,Locate:Oy,LocateFixed:Ey,LocateOff:Dy,Lock:Iy,LockKeyhole:Ry,LockKeyholeOpen:uo,LockOpen:go,LogIn:By,LogOut:Fy,Lollipop:zy,Luggage:Ny,MSquare:Mr,Magnet:Zy,Mail:Ky,MailCheck:Wy,MailMinus:Uy,MailOpen:qy,MailPlus:$y,MailQuestion:jy,MailSearch:Yy,MailWarning:Xy,MailX:Gy,Mailbox:Jy,Mails:Qy,Map:i9,MapPin:e9,MapPinOff:t9,MapPinned:a9,Martini:s9,Maximize:o9,Maximize2:n9,Medal:r9,Megaphone:c9,MegaphoneOff:h9,Meh:d9,MemoryStick:l9,Menu:p9,MenuSquare:vr,Merge:u9,MessageCircle:S9,MessageCircleCode:g9,MessageCircleDashed:f9,MessageCircleHeart:M9,MessageCircleMore:v9,MessageCircleOff:m9,MessageCirclePlus:y9,MessageCircleQuestion:x9,MessageCircleReply:_9,MessageCircleWarning:b9,MessageCircleX:w9,MessageSquare:F9,MessageSquareCode:k9,MessageSquareDashed:A9,MessageSquareDiff:C9,MessageSquareDot:L9,MessageSquareHeart:P9,MessageSquareMore:H9,MessageSquareOff:V9,MessageSquarePlus:T9,MessageSquareQuote:E9,MessageSquareReply:D9,MessageSquareShare:O9,MessageSquareText:R9,MessageSquareWarning:I9,MessageSquareX:B9,MessagesSquare:z9,Mic:Z9,Mic2:fo,MicOff:N9,MicVocal:fo,Microscope:W9,Microwave:U9,Milestone:q9,Milk:j9,MilkOff:$9,Minimize:X9,Minimize2:Y9,Minus:G9,MinusCircle:A2,MinusSquare:mr,Monitor:hx,MonitorCheck:K9,MonitorDot:J9,MonitorDown:Q9,MonitorOff:tx,MonitorPause:ex,MonitorPlay:ax,MonitorSmartphone:ix,MonitorSpeaker:sx,MonitorStop:nx,MonitorUp:ox,MonitorX:rx,Moon:dx,MoonStar:cx,MoreHorizontal:G2,MoreVertical:X2,Mountain:px,MountainSnow:lx,Mouse:mx,MouseOff:ux,MousePointer:vx,MousePointer2:gx,MousePointerBan:fx,MousePointerClick:Mx,MousePointerSquareDashed:hr,Move:Vx,Move3D:Mo,Move3d:Mo,MoveDiagonal:xx,MoveDiagonal2:yx,MoveDown:wx,MoveDownLeft:_x,MoveDownRight:bx,MoveHorizontal:Sx,MoveLeft:kx,MoveRight:Ax,MoveUp:Px,MoveUpLeft:Cx,MoveUpRight:Lx,MoveVertical:Hx,Music:Ox,Music2:Tx,Music3:Ex,Music4:Dx,Navigation:Fx,Navigation2:Ix,Navigation2Off:Rx,NavigationOff:Bx,Network:zx,Newspaper:Nx,Nfc:Zx,Notebook:$x,NotebookPen:Wx,NotebookTabs:Ux,NotebookText:qx,NotepadText:Yx,NotepadTextDashed:jx,Nut:Gx,NutOff:Xx,Octagon:Kx,OctagonAlert:vo,OctagonPause:mo,OctagonX:yo,Option:Jx,Orbit:Qx,Origami:t_,Outdent:ho,Package:h_,Package2:e_,PackageCheck:a_,PackageMinus:i_,PackageOpen:s_,PackagePlus:n_,PackageSearch:o_,PackageX:r_,PaintBucket:c_,PaintRoller:d_,Paintbrush:p_,Paintbrush2:l_,Palette:u_,Palmtree:zr,PanelBottom:M_,PanelBottomClose:g_,PanelBottomDashed:xo,PanelBottomInactive:xo,PanelBottomOpen:f_,PanelLeft:So,PanelLeftClose:_o,PanelLeftDashed:bo,PanelLeftInactive:bo,PanelLeftOpen:wo,PanelRight:y_,PanelRightClose:v_,PanelRightDashed:ko,PanelRightInactive:ko,PanelRightOpen:m_,PanelTop:b_,PanelTopClose:x_,PanelTopDashed:Ao,PanelTopInactive:Ao,PanelTopOpen:__,PanelsLeftBottom:w_,PanelsLeftRight:q2,PanelsRightBottom:S_,PanelsTopBottom:Eo,PanelsTopLeft:Co,Paperclip:k_,Parentheses:A_,ParkingCircle:L2,ParkingCircleOff:C2,ParkingMeter:C_,ParkingSquare:_r,ParkingSquareOff:xr,PartyPopper:L_,Pause:P_,PauseCircle:P2,PauseOctagon:mo,PawPrint:H_,PcCase:V_,Pen:Po,PenBox:E1,PenLine:Lo,PenSquare:E1,PenTool:T_,Pencil:O_,PencilLine:E_,PencilRuler:D_,Pentagon:R_,Percent:I_,PercentCircle:H2,PercentDiamond:j2,PercentSquare:br,PersonStanding:B_,Phone:q_,PhoneCall:F_,PhoneForwarded:z_,PhoneIncoming:N_,PhoneMissed:Z_,PhoneOff:W_,PhoneOutgoing:U_,Pi:$_,PiSquare:wr,Piano:j_,Pickaxe:Y_,PictureInPicture:G_,PictureInPicture2:X_,PieChart:K_,PiggyBank:J_,Pilcrow:eb,PilcrowLeft:Q_,PilcrowRight:tb,PilcrowSquare:Sr,Pill:ab,Pin:sb,PinOff:ib,Pipette:nb,Pizza:ob,Plane:cb,PlaneLanding:rb,PlaneTakeoff:hb,Play:db,PlayCircle:V2,PlaySquare:kr,Plug:gb,Plug2:lb,PlugZap:ub,PlugZap2:pb,Plus:fb,PlusCircle:T2,PlusSquare:Ar,Pocket:vb,PocketKnife:Mb,Podcast:mb,Pointer:xb,PointerOff:yb,Popcorn:_b,Popsicle:bb,PoundSterling:wb,Power:kb,PowerCircle:E2,PowerOff:Sb,PowerSquare:Cr,Presentation:Ab,Printer:Cb,Projector:Lb,Proportions:Pb,Puzzle:Hb,Pyramid:Vb,QrCode:Tb,Quote:Eb,Rabbit:Db,Radar:Ob,Radiation:Rb,Radical:Ib,Radio:zb,RadioReceiver:Bb,RadioTower:Fb,Radius:Nb,RailSymbol:Zb,Rainbow:Wb,Rat:Ub,Ratio:qb,Receipt:tw,ReceiptCent:$b,ReceiptEuro:jb,ReceiptIndianRupee:Yb,ReceiptJapaneseYen:Xb,ReceiptPoundSterling:Gb,ReceiptRussianRuble:Kb,ReceiptSwissFranc:Jb,ReceiptText:Qb,RectangleEllipsis:Ho,RectangleHorizontal:ew,RectangleVertical:aw,Recycle:iw,Redo:ow,Redo2:sw,RedoDot:nw,RefreshCcw:hw,RefreshCcwDot:rw,RefreshCw:dw,RefreshCwOff:cw,Refrigerator:lw,Regex:pw,RemoveFormatting:uw,Repeat:Mw,Repeat1:gw,Repeat2:fw,Replace:mw,ReplaceAll:vw,Reply:xw,ReplyAll:yw,Rewind:_w,Ribbon:bw,Rocket:ww,RockingChair:Sw,RollerCoaster:kw,Rotate3D:Vo,Rotate3d:Vo,RotateCcw:Cw,RotateCcwSquare:Aw,RotateCw:Pw,RotateCwSquare:Lw,Route:Vw,RouteOff:Hw,Router:Tw,Rows:To,Rows2:To,Rows3:Eo,Rows4:Ew,Rss:Dw,Ruler:Ow,RussianRuble:Rw,Sailboat:Iw,Salad:Bw,Sandwich:Fw,Satellite:Nw,SatelliteDish:zw,Save:Ww,SaveAll:Zw,Scale:Uw,Scale3D:Do,Scale3d:Do,Scaling:qw,Scan:Jw,ScanBarcode:$w,ScanEye:jw,ScanFace:Yw,ScanLine:Xw,ScanSearch:Gw,ScanText:Kw,ScatterChart:Qw,School:tS,School2:Zr,Scissors:aS,ScissorsLineDashed:eS,ScissorsSquare:Lr,ScissorsSquareDashedBottom:Qo,ScreenShare:sS,ScreenShareOff:iS,Scroll:oS,ScrollText:nS,Search:lS,SearchCheck:rS,SearchCode:hS,SearchSlash:cS,SearchX:dS,Send:uS,SendHorizonal:Oo,SendHorizontal:Oo,SendToBack:pS,SeparatorHorizontal:gS,SeparatorVertical:fS,Server:yS,ServerCog:MS,ServerCrash:vS,ServerOff:mS,Settings:_S,Settings2:xS,Shapes:bS,Share:SS,Share2:wS,Sheet:kS,Shell:AS,Shield:RS,ShieldAlert:CS,ShieldBan:LS,ShieldCheck:PS,ShieldClose:Ro,ShieldEllipsis:HS,ShieldHalf:VS,ShieldMinus:TS,ShieldOff:ES,ShieldPlus:DS,ShieldQuestion:OS,ShieldX:Ro,Ship:BS,ShipWheel:IS,Shirt:FS,ShoppingBag:zS,ShoppingBasket:NS,ShoppingCart:ZS,Shovel:WS,ShowerHead:US,Shrink:qS,Shrub:$S,Shuffle:jS,Sidebar:So,SidebarClose:_o,SidebarOpen:wo,Sigma:YS,SigmaSquare:Pr,Signal:QS,SignalHigh:XS,SignalLow:GS,SignalMedium:KS,SignalZero:JS,Signpost:ek,SignpostBig:tk,Siren:ak,SkipBack:ik,SkipForward:sk,Skull:nk,Slack:ok,Slash:rk,SlashSquare:Hr,Slice:hk,Sliders:Io,SlidersHorizontal:ck,SlidersVertical:Io,Smartphone:pk,SmartphoneCharging:dk,SmartphoneNfc:lk,Smile:gk,SmilePlus:uk,Snail:fk,Snowflake:Mk,Sofa:vk,SortAsc:Qn,SortDesc:Gn,Soup:mk,Space:yk,Spade:xk,Sparkle:_k,Sparkles:Bo,Speaker:bk,Speech:wk,SpellCheck:kk,SpellCheck2:Sk,Spline:Ak,Split:Ck,SplitSquareHorizontal:Vr,SplitSquareVertical:Tr,SprayCan:Lk,Sprout:Pk,Square:Dk,SquareActivity:Fo,SquareArrowDown:Zo,SquareArrowDownLeft:zo,SquareArrowDownRight:No,SquareArrowLeft:Wo,SquareArrowOutDownLeft:Uo,SquareArrowOutDownRight:qo,SquareArrowOutUpLeft:$o,SquareArrowOutUpRight:jo,SquareArrowRight:Yo,SquareArrowUp:Ko,SquareArrowUpLeft:Xo,SquareArrowUpRight:Go,SquareAsterisk:Jo,SquareBottomDashedScissors:Qo,SquareCheck:er,SquareCheckBig:tr,SquareChevronDown:ar,SquareChevronLeft:ir,SquareChevronRight:sr,SquareChevronUp:nr,SquareCode:or,SquareDashedBottom:Vk,SquareDashedBottomCode:Hk,SquareDashedKanban:rr,SquareDashedMousePointer:hr,SquareDivide:cr,SquareDot:dr,SquareEqual:lr,SquareFunction:pr,SquareGanttChart:ur,SquareKanban:gr,SquareLibrary:fr,SquareM:Mr,SquareMenu:vr,SquareMinus:mr,SquareMousePointer:yr,SquareParking:_r,SquareParkingOff:xr,SquarePen:E1,SquarePercent:br,SquarePi:wr,SquarePilcrow:Sr,SquarePlay:kr,SquarePlus:Ar,SquarePower:Cr,SquareRadical:Tk,SquareScissors:Lr,SquareSigma:Pr,SquareSlash:Hr,SquareSplitHorizontal:Vr,SquareSplitVertical:Tr,SquareStack:Ek,SquareTerminal:Er,SquareUser:Or,SquareUserRound:Dr,SquareX:Rr,Squircle:Ok,Squirrel:Rk,Stamp:Ik,Star:zk,StarHalf:Bk,StarOff:Fk,Stars:Bo,StepBack:Nk,StepForward:Zk,Stethoscope:Wk,Sticker:Uk,StickyNote:qk,StopCircle:O2,Store:$k,StretchHorizontal:jk,StretchVertical:Yk,Strikethrough:Xk,Subscript:Gk,Subtitles:r2,Sun:eA,SunDim:Kk,SunMedium:Jk,SunMoon:Qk,SunSnow:tA,Sunrise:aA,Sunset:iA,Superscript:sA,SwatchBook:nA,SwissFranc:oA,SwitchCamera:rA,Sword:hA,Swords:cA,Syringe:dA,Table:vA,Table2:lA,TableCellsMerge:pA,TableCellsSplit:uA,TableColumnsSplit:gA,TableProperties:fA,TableRowsSplit:MA,Tablet:yA,TabletSmartphone:mA,Tablets:xA,Tag:_A,Tags:bA,Tally1:wA,Tally2:SA,Tally3:kA,Tally4:AA,Tally5:CA,Tangent:LA,Target:PA,Telescope:HA,Tent:TA,TentTree:VA,Terminal:EA,TerminalSquare:Er,TestTube:DA,TestTube2:Ir,TestTubeDiagonal:Ir,TestTubes:OA,Text:zA,TextCursor:IA,TextCursorInput:RA,TextQuote:BA,TextSearch:FA,TextSelect:Br,TextSelection:Br,Theater:NA,Thermometer:UA,ThermometerSnowflake:ZA,ThermometerSun:WA,ThumbsDown:qA,ThumbsUp:$A,Ticket:QA,TicketCheck:jA,TicketMinus:YA,TicketPercent:XA,TicketPlus:GA,TicketSlash:KA,TicketX:JA,Timer:aC,TimerOff:tC,TimerReset:eC,ToggleLeft:iC,ToggleRight:sC,Tornado:nC,Torus:oC,Touchpad:hC,TouchpadOff:rC,TowerControl:cC,ToyBrick:dC,Tractor:lC,TrafficCone:pC,Train:Fr,TrainFront:gC,TrainFrontTunnel:uC,TrainTrack:fC,TramFront:Fr,Trash:vC,Trash2:MC,TreeDeciduous:mC,TreePalm:zr,TreePine:yC,Trees:xC,Trello:_C,TrendingDown:bC,TrendingUp:wC,Triangle:kC,TriangleAlert:Nr,TriangleRight:SC,Trophy:AC,Truck:CC,Turtle:LC,Tv:HC,Tv2:PC,Twitch:VC,Twitter:TC,Type:EC,Umbrella:OC,UmbrellaOff:DC,Underline:RC,Undo:FC,Undo2:IC,UndoDot:BC,UnfoldHorizontal:zC,UnfoldVertical:NC,Ungroup:ZC,University:Zr,Unlink:UC,Unlink2:WC,Unlock:go,UnlockKeyhole:uo,Unplug:qC,Upload:$C,UploadCloud:Z2,Usb:jC,User:eL,User2:Yr,UserCheck:YC,UserCheck2:Wr,UserCircle:I2,UserCircle2:R2,UserCog:XC,UserCog2:Ur,UserMinus:GC,UserMinus2:qr,UserPlus:KC,UserPlus2:$r,UserRound:Yr,UserRoundCheck:Wr,UserRoundCog:Ur,UserRoundMinus:qr,UserRoundPlus:$r,UserRoundSearch:JC,UserRoundX:jr,UserSearch:QC,UserSquare:Or,UserSquare2:Dr,UserX:tL,UserX2:jr,Users:aL,Users2:Xr,UsersRound:Xr,Utensils:sL,UtensilsCrossed:iL,UtilityPole:nL,Variable:oL,Vault:rL,Vegan:hL,VenetianMask:cL,Verified:a2,Vibrate:lL,VibrateOff:dL,Video:uL,VideoOff:pL,Videotape:gL,View:fL,Voicemail:ML,Volume:xL,Volume1:vL,Volume2:mL,VolumeX:yL,Vote:_L,Wallet:wL,Wallet2:Gr,WalletCards:bL,WalletMinimal:Gr,Wallpaper:SL,Wand:kL,Wand2:Kr,WandSparkles:Kr,Warehouse:AL,WashingMachine:CL,Watch:LL,Waves:PL,Waypoints:HL,Webcam:VL,Webhook:EL,WebhookOff:TL,Weight:DL,Wheat:RL,WheatOff:OL,WholeWord:IL,Wifi:FL,WifiOff:BL,Wind:zL,Wine:ZL,WineOff:NL,Workflow:WL,Worm:UL,WrapText:qL,Wrench:$L,X:jL,XCircle:B2,XOctagon:yo,XSquare:Rr,Youtube:YL,Zap:GL,ZapOff:XL,ZoomIn:KL,ZoomOut:JL},Symbol.toStringTag,{value:"Module"}));/**
 * @license lucide v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tP=({icons:i={},nameAttr:t="data-lucide",attrs:e={}}={})=>{if(!Object.values(i).length)throw new Error(`Please provide an icons object.
If you want to use all the icons you can import it like:
 \`import { createIcons, icons } from 'lucide';
lucide.createIcons({icons});\``);if(typeof document>"u")throw new Error("`createIcons()` only works in a browser environment.");const a=document.querySelectorAll(`[${t}]`);if(Array.from(a).forEach(s=>qn(s,{nameAttr:t,icons:i,attrs:e})),t==="data-lucide"){const s=document.querySelectorAll("[icon-name]");s.length>0&&(console.warn("[Lucide] Some icons were found with the now deprecated icon-name attribute. These will still be replaced for backwards compatibility, but will no longer be supported in v1.0 and you should switch to data-lucide"),Array.from(s).forEach(n=>qn(n,{nameAttr:"icon-name",icons:i,attrs:e})))}};function $t(){tP({icons:QL})}function ut(i,t=!1){const e=document.getElementById("toastNotification"),a=document.getElementById("toastMsg"),s=document.getElementById("toastIcon");!e||!a||!s||(a.textContent=i,t?(s.className="p-1.5 rounded-xl bg-rose-500/20 text-rose-500",s.innerHTML='<i data-lucide="alert-circle" class="w-4 h-4"></i>'):(s.className="p-1.5 rounded-xl bg-sky-500/20 text-sky-500",s.innerHTML='<i data-lucide="shield-check" class="w-4 h-4"></i>'),$t(),le.to(e,{y:0,opacity:1,duration:.3,ease:"back.out(1.7)"}),setTimeout(()=>{le.to(e,{y:-100,opacity:0,duration:.3})},3e3))}let K1=[];function R(i){const t=document.getElementById("auditLogsTerminal");if(!t)return;const e=new Date().toLocaleTimeString("id-ID",{hour12:!1});K1.unshift({timestamp:e,event:i});const a=document.createElement("div");a.className="flex items-center gap-2";const s=document.createElement("span");s.className="text-sky-500 font-bold",s.textContent=`[${e}]`;const n=document.createElement("span");n.textContent=i,a.appendChild(s),a.appendChild(n),t.prepend(a)}function Jr(i){if(K1.length===0){ut("Belum ada log untuk diekspor",!0);return}let t="",e=`audit_logs_${Date.now()}.${i}`,a="";i==="json"?(t=JSON.stringify(K1,null,2),a="application/json"):(t=`Timestamp,Event
`+K1.map(r=>`"${r.timestamp}","${r.event}"`).join(`
`),a="text/csv");const s=new Blob([t],{type:a}),n=URL.createObjectURL(s),o=document.createElement("a");o.href=n,o.download=e,o.click(),URL.revokeObjectURL(n),ut(`Audit Logs berhasil diekspor (${i.toUpperCase()})`),R(`LOG_EXPORT: Exported security logs as ${i.toUpperCase()}`)}/*!
 * @kurkle/color v0.3.4
 * https://github.com/kurkle/color#readme
 * (c) 2024 Jukka Kurkela
 * Released under the MIT License
 */function P1(i){return i+.5|0}const Te=(i,t,e)=>Math.max(Math.min(i,e),t);function Ua(i){return Te(P1(i*2.55),0,255)}function ze(i){return Te(P1(i*255),0,255)}function _e(i){return Te(P1(i/2.55)/100,0,1)}function Qr(i){return Te(P1(i*100),0,100)}const jt={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15},_s=[..."0123456789ABCDEF"],eP=i=>_s[i&15],aP=i=>_s[(i&240)>>4]+_s[i&15],D1=i=>(i&240)>>4===(i&15),iP=i=>D1(i.r)&&D1(i.g)&&D1(i.b)&&D1(i.a);function sP(i){var t=i.length,e;return i[0]==="#"&&(t===4||t===5?e={r:255&jt[i[1]]*17,g:255&jt[i[2]]*17,b:255&jt[i[3]]*17,a:t===5?jt[i[4]]*17:255}:(t===7||t===9)&&(e={r:jt[i[1]]<<4|jt[i[2]],g:jt[i[3]]<<4|jt[i[4]],b:jt[i[5]]<<4|jt[i[6]],a:t===9?jt[i[7]]<<4|jt[i[8]]:255})),e}const nP=(i,t)=>i<255?t(i):"";function oP(i){var t=iP(i)?eP:aP;return i?"#"+t(i.r)+t(i.g)+t(i.b)+nP(i.a,t):void 0}const rP=/^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;function Ac(i,t,e){const a=t*Math.min(e,1-e),s=(n,o=(n+i/30)%12)=>e-a*Math.max(Math.min(o-3,9-o,1),-1);return[s(0),s(8),s(4)]}function hP(i,t,e){const a=(s,n=(s+i/60)%6)=>e-e*t*Math.max(Math.min(n,4-n,1),0);return[a(5),a(3),a(1)]}function cP(i,t,e){const a=Ac(i,1,.5);let s;for(t+e>1&&(s=1/(t+e),t*=s,e*=s),s=0;s<3;s++)a[s]*=1-t-e,a[s]+=t;return a}function dP(i,t,e,a,s){return i===s?(t-e)/a+(t<e?6:0):t===s?(e-i)/a+2:(i-t)/a+4}function nn(i){const e=i.r/255,a=i.g/255,s=i.b/255,n=Math.max(e,a,s),o=Math.min(e,a,s),r=(n+o)/2;let c,d,l;return n!==o&&(l=n-o,d=r>.5?l/(2-n-o):l/(n+o),c=dP(e,a,s,l,n),c=c*60+.5),[c|0,d||0,r]}function on(i,t,e,a){return(Array.isArray(t)?i(t[0],t[1],t[2]):i(t,e,a)).map(ze)}function rn(i,t,e){return on(Ac,i,t,e)}function lP(i,t,e){return on(cP,i,t,e)}function pP(i,t,e){return on(hP,i,t,e)}function Cc(i){return(i%360+360)%360}function uP(i){const t=rP.exec(i);let e=255,a;if(!t)return;t[5]!==a&&(e=t[6]?Ua(+t[5]):ze(+t[5]));const s=Cc(+t[2]),n=+t[3]/100,o=+t[4]/100;return t[1]==="hwb"?a=lP(s,n,o):t[1]==="hsv"?a=pP(s,n,o):a=rn(s,n,o),{r:a[0],g:a[1],b:a[2],a:e}}function gP(i,t){var e=nn(i);e[0]=Cc(e[0]+t),e=rn(e),i.r=e[0],i.g=e[1],i.b=e[2]}function fP(i){if(!i)return;const t=nn(i),e=t[0],a=Qr(t[1]),s=Qr(t[2]);return i.a<255?`hsla(${e}, ${a}%, ${s}%, ${_e(i.a)})`:`hsl(${e}, ${a}%, ${s}%)`}const th={x:"dark",Z:"light",Y:"re",X:"blu",W:"gr",V:"medium",U:"slate",A:"ee",T:"ol",S:"or",B:"ra",C:"lateg",D:"ights",R:"in",Q:"turquois",E:"hi",P:"ro",O:"al",N:"le",M:"de",L:"yello",F:"en",K:"ch",G:"arks",H:"ea",I:"ightg",J:"wh"},eh={OiceXe:"f0f8ff",antiquewEte:"faebd7",aqua:"ffff",aquamarRe:"7fffd4",azuY:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"0",blanKedOmond:"ffebcd",Xe:"ff",XeviTet:"8a2be2",bPwn:"a52a2a",burlywood:"deb887",caMtXe:"5f9ea0",KartYuse:"7fff00",KocTate:"d2691e",cSO:"ff7f50",cSnflowerXe:"6495ed",cSnsilk:"fff8dc",crimson:"dc143c",cyan:"ffff",xXe:"8b",xcyan:"8b8b",xgTMnPd:"b8860b",xWay:"a9a9a9",xgYF:"6400",xgYy:"a9a9a9",xkhaki:"bdb76b",xmagFta:"8b008b",xTivegYF:"556b2f",xSange:"ff8c00",xScEd:"9932cc",xYd:"8b0000",xsOmon:"e9967a",xsHgYF:"8fbc8f",xUXe:"483d8b",xUWay:"2f4f4f",xUgYy:"2f4f4f",xQe:"ced1",xviTet:"9400d3",dAppRk:"ff1493",dApskyXe:"bfff",dimWay:"696969",dimgYy:"696969",dodgerXe:"1e90ff",fiYbrick:"b22222",flSOwEte:"fffaf0",foYstWAn:"228b22",fuKsia:"ff00ff",gaRsbSo:"dcdcdc",ghostwEte:"f8f8ff",gTd:"ffd700",gTMnPd:"daa520",Way:"808080",gYF:"8000",gYFLw:"adff2f",gYy:"808080",honeyMw:"f0fff0",hotpRk:"ff69b4",RdianYd:"cd5c5c",Rdigo:"4b0082",ivSy:"fffff0",khaki:"f0e68c",lavFMr:"e6e6fa",lavFMrXsh:"fff0f5",lawngYF:"7cfc00",NmoncEffon:"fffacd",ZXe:"add8e6",ZcSO:"f08080",Zcyan:"e0ffff",ZgTMnPdLw:"fafad2",ZWay:"d3d3d3",ZgYF:"90ee90",ZgYy:"d3d3d3",ZpRk:"ffb6c1",ZsOmon:"ffa07a",ZsHgYF:"20b2aa",ZskyXe:"87cefa",ZUWay:"778899",ZUgYy:"778899",ZstAlXe:"b0c4de",ZLw:"ffffe0",lime:"ff00",limegYF:"32cd32",lRF:"faf0e6",magFta:"ff00ff",maPon:"800000",VaquamarRe:"66cdaa",VXe:"cd",VScEd:"ba55d3",VpurpN:"9370db",VsHgYF:"3cb371",VUXe:"7b68ee",VsprRggYF:"fa9a",VQe:"48d1cc",VviTetYd:"c71585",midnightXe:"191970",mRtcYam:"f5fffa",mistyPse:"ffe4e1",moccasR:"ffe4b5",navajowEte:"ffdead",navy:"80",Tdlace:"fdf5e6",Tive:"808000",TivedBb:"6b8e23",Sange:"ffa500",SangeYd:"ff4500",ScEd:"da70d6",pOegTMnPd:"eee8aa",pOegYF:"98fb98",pOeQe:"afeeee",pOeviTetYd:"db7093",papayawEp:"ffefd5",pHKpuff:"ffdab9",peru:"cd853f",pRk:"ffc0cb",plum:"dda0dd",powMrXe:"b0e0e6",purpN:"800080",YbeccapurpN:"663399",Yd:"ff0000",Psybrown:"bc8f8f",PyOXe:"4169e1",saddNbPwn:"8b4513",sOmon:"fa8072",sandybPwn:"f4a460",sHgYF:"2e8b57",sHshell:"fff5ee",siFna:"a0522d",silver:"c0c0c0",skyXe:"87ceeb",UXe:"6a5acd",UWay:"708090",UgYy:"708090",snow:"fffafa",sprRggYF:"ff7f",stAlXe:"4682b4",tan:"d2b48c",teO:"8080",tEstN:"d8bfd8",tomato:"ff6347",Qe:"40e0d0",viTet:"ee82ee",JHt:"f5deb3",wEte:"ffffff",wEtesmoke:"f5f5f5",Lw:"ffff00",LwgYF:"9acd32"};function MP(){const i={},t=Object.keys(eh),e=Object.keys(th);let a,s,n,o,r;for(a=0;a<t.length;a++){for(o=r=t[a],s=0;s<e.length;s++)n=e[s],r=r.replace(n,th[n]);n=parseInt(eh[o],16),i[r]=[n>>16&255,n>>8&255,n&255]}return i}let O1;function vP(i){O1||(O1=MP(),O1.transparent=[0,0,0,0]);const t=O1[i.toLowerCase()];return t&&{r:t[0],g:t[1],b:t[2],a:t.length===4?t[3]:255}}const mP=/^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;function yP(i){const t=mP.exec(i);let e=255,a,s,n;if(t){if(t[7]!==a){const o=+t[7];e=t[8]?Ua(o):Te(o*255,0,255)}return a=+t[1],s=+t[3],n=+t[5],a=255&(t[2]?Ua(a):Te(a,0,255)),s=255&(t[4]?Ua(s):Te(s,0,255)),n=255&(t[6]?Ua(n):Te(n,0,255)),{r:a,g:s,b:n,a:e}}}function xP(i){return i&&(i.a<255?`rgba(${i.r}, ${i.g}, ${i.b}, ${_e(i.a)})`:`rgb(${i.r}, ${i.g}, ${i.b})`)}const qi=i=>i<=.0031308?i*12.92:Math.pow(i,1/2.4)*1.055-.055,ya=i=>i<=.04045?i/12.92:Math.pow((i+.055)/1.055,2.4);function _P(i,t,e){const a=ya(_e(i.r)),s=ya(_e(i.g)),n=ya(_e(i.b));return{r:ze(qi(a+e*(ya(_e(t.r))-a))),g:ze(qi(s+e*(ya(_e(t.g))-s))),b:ze(qi(n+e*(ya(_e(t.b))-n))),a:i.a+e*(t.a-i.a)}}function R1(i,t,e){if(i){let a=nn(i);a[t]=Math.max(0,Math.min(a[t]+a[t]*e,t===0?360:1)),a=rn(a),i.r=a[0],i.g=a[1],i.b=a[2]}}function Lc(i,t){return i&&Object.assign(t||{},i)}function ah(i){var t={r:0,g:0,b:0,a:255};return Array.isArray(i)?i.length>=3&&(t={r:i[0],g:i[1],b:i[2],a:255},i.length>3&&(t.a=ze(i[3]))):(t=Lc(i,{r:0,g:0,b:0,a:1}),t.a=ze(t.a)),t}function bP(i){return i.charAt(0)==="r"?yP(i):uP(i)}class m1{constructor(t){if(t instanceof m1)return t;const e=typeof t;let a;e==="object"?a=ah(t):e==="string"&&(a=sP(t)||vP(t)||bP(t)),this._rgb=a,this._valid=!!a}get valid(){return this._valid}get rgb(){var t=Lc(this._rgb);return t&&(t.a=_e(t.a)),t}set rgb(t){this._rgb=ah(t)}rgbString(){return this._valid?xP(this._rgb):void 0}hexString(){return this._valid?oP(this._rgb):void 0}hslString(){return this._valid?fP(this._rgb):void 0}mix(t,e){if(t){const a=this.rgb,s=t.rgb;let n;const o=e===n?.5:e,r=2*o-1,c=a.a-s.a,d=((r*c===-1?r:(r+c)/(1+r*c))+1)/2;n=1-d,a.r=255&d*a.r+n*s.r+.5,a.g=255&d*a.g+n*s.g+.5,a.b=255&d*a.b+n*s.b+.5,a.a=o*a.a+(1-o)*s.a,this.rgb=a}return this}interpolate(t,e){return t&&(this._rgb=_P(this._rgb,t._rgb,e)),this}clone(){return new m1(this.rgb)}alpha(t){return this._rgb.a=ze(t),this}clearer(t){const e=this._rgb;return e.a*=1-t,this}greyscale(){const t=this._rgb,e=P1(t.r*.3+t.g*.59+t.b*.11);return t.r=t.g=t.b=e,this}opaquer(t){const e=this._rgb;return e.a*=1+t,this}negate(){const t=this._rgb;return t.r=255-t.r,t.g=255-t.g,t.b=255-t.b,this}lighten(t){return R1(this._rgb,2,t),this}darken(t){return R1(this._rgb,2,-t),this}saturate(t){return R1(this._rgb,1,t),this}desaturate(t){return R1(this._rgb,1,-t),this}rotate(t){return gP(this._rgb,t),this}}/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */function fe(){}const wP=(()=>{let i=0;return()=>i++})();function F(i){return i==null}function tt(i){if(Array.isArray&&Array.isArray(i))return!0;const t=Object.prototype.toString.call(i);return t.slice(0,7)==="[object"&&t.slice(-6)==="Array]"}function z(i){return i!==null&&Object.prototype.toString.call(i)==="[object Object]"}function rt(i){return(typeof i=="number"||i instanceof Number)&&isFinite(+i)}function Bt(i,t){return rt(i)?i:t}function B(i,t){return typeof i>"u"?t:i}const SP=(i,t)=>typeof i=="string"&&i.endsWith("%")?parseFloat(i)/100:+i/t,Pc=(i,t)=>typeof i=="string"&&i.endsWith("%")?parseFloat(i)/100*t:+i;function X(i,t,e){if(i&&typeof i.call=="function")return i.apply(e,t)}function U(i,t,e,a){let s,n,o;if(tt(i))for(n=i.length,s=0;s<n;s++)t.call(e,i[s],s);else if(z(i))for(o=Object.keys(i),n=o.length,s=0;s<n;s++)t.call(e,i[o[s]],o[s])}function vi(i,t){let e,a,s,n;if(!i||!t||i.length!==t.length)return!1;for(e=0,a=i.length;e<a;++e)if(s=i[e],n=t[e],s.datasetIndex!==n.datasetIndex||s.index!==n.index)return!1;return!0}function mi(i){if(tt(i))return i.map(mi);if(z(i)){const t=Object.create(null),e=Object.keys(i),a=e.length;let s=0;for(;s<a;++s)t[e[s]]=mi(i[e[s]]);return t}return i}function Hc(i){return["__proto__","prototype","constructor"].indexOf(i)===-1}function kP(i,t,e,a){if(!Hc(i))return;const s=t[i],n=e[i];z(s)&&z(n)?y1(s,n,a):t[i]=mi(n)}function y1(i,t,e){const a=tt(t)?t:[t],s=a.length;if(!z(i))return i;e=e||{};const n=e.merger||kP;let o;for(let r=0;r<s;++r){if(o=a[r],!z(o))continue;const c=Object.keys(o);for(let d=0,l=c.length;d<l;++d)n(c[d],i,o,e)}return i}function t1(i,t){return y1(i,t,{merger:AP})}function AP(i,t,e){if(!Hc(i))return;const a=t[i],s=e[i];z(a)&&z(s)?t1(a,s):Object.prototype.hasOwnProperty.call(t,i)||(t[i]=mi(s))}const ih={"":i=>i,x:i=>i.x,y:i=>i.y};function CP(i){const t=i.split("."),e=[];let a="";for(const s of t)a+=s,a.endsWith("\\")?a=a.slice(0,-1)+".":(e.push(a),a="");return e}function LP(i){const t=CP(i);return e=>{for(const a of t){if(a==="")break;e=e&&e[a]}return e}}function Ue(i,t){return(ih[t]||(ih[t]=LP(t)))(i)}function hn(i){return i.charAt(0).toUpperCase()+i.slice(1)}const x1=i=>typeof i<"u",qe=i=>typeof i=="function",sh=(i,t)=>{if(i.size!==t.size)return!1;for(const e of i)if(!t.has(e))return!1;return!0};function PP(i){return i.type==="mouseup"||i.type==="click"||i.type==="contextmenu"}const Z=Math.PI,J=2*Z,HP=J+Z,yi=Number.POSITIVE_INFINITY,VP=Z/180,ct=Z/2,Ke=Z/4,nh=Z*2/3,Ee=Math.log10,pe=Math.sign;function e1(i,t,e){return Math.abs(i-t)<e}function oh(i){const t=Math.round(i);i=e1(i,t,i/1e3)?t:i;const e=Math.pow(10,Math.floor(Ee(i))),a=i/e;return(a<=1?1:a<=2?2:a<=5?5:10)*e}function TP(i){const t=[],e=Math.sqrt(i);let a;for(a=1;a<e;a++)i%a===0&&(t.push(a),t.push(i/a));return e===(e|0)&&t.push(e),t.sort((s,n)=>s-n).pop(),t}function EP(i){return typeof i=="symbol"||typeof i=="object"&&i!==null&&!(Symbol.toPrimitive in i||"toString"in i||"valueOf"in i)}function Ea(i){return!EP(i)&&!isNaN(parseFloat(i))&&isFinite(i)}function DP(i,t){const e=Math.round(i);return e-t<=i&&e+t>=i}function Vc(i,t,e){let a,s,n;for(a=0,s=i.length;a<s;a++)n=i[a][e],isNaN(n)||(t.min=Math.min(t.min,n),t.max=Math.max(t.max,n))}function te(i){return i*(Z/180)}function cn(i){return i*(180/Z)}function rh(i){if(!rt(i))return;let t=1,e=0;for(;Math.round(i*t)/t!==i;)t*=10,e++;return e}function Tc(i,t){const e=t.x-i.x,a=t.y-i.y,s=Math.sqrt(e*e+a*a);let n=Math.atan2(a,e);return n<-.5*Z&&(n+=J),{angle:n,distance:s}}function bs(i,t){return Math.sqrt(Math.pow(t.x-i.x,2)+Math.pow(t.y-i.y,2))}function OP(i,t){return(i-t+HP)%J-Z}function bt(i){return(i%J+J)%J}function _1(i,t,e,a){const s=bt(i),n=bt(t),o=bt(e),r=bt(n-s),c=bt(o-s),d=bt(s-n),l=bt(s-o);return s===n||s===o||a&&n===o||r>c&&d<l}function ft(i,t,e){return Math.max(t,Math.min(e,i))}function RP(i){return ft(i,-32768,32767)}function we(i,t,e,a=1e-6){return i>=Math.min(t,e)-a&&i<=Math.max(t,e)+a}function dn(i,t,e){e=e||(o=>i[o]<t);let a=i.length-1,s=0,n;for(;a-s>1;)n=s+a>>1,e(n)?s=n:a=n;return{lo:s,hi:a}}const Se=(i,t,e,a)=>dn(i,e,a?s=>{const n=i[s][t];return n<e||n===e&&i[s+1][t]===e}:s=>i[s][t]<e),IP=(i,t,e)=>dn(i,e,a=>i[a][t]>=e);function BP(i,t,e){let a=0,s=i.length;for(;a<s&&i[a]<t;)a++;for(;s>a&&i[s-1]>e;)s--;return a>0||s<i.length?i.slice(a,s):i}const Ec=["push","pop","shift","splice","unshift"];function FP(i,t){if(i._chartjs){i._chartjs.listeners.push(t);return}Object.defineProperty(i,"_chartjs",{configurable:!0,enumerable:!1,value:{listeners:[t]}}),Ec.forEach(e=>{const a="_onData"+hn(e),s=i[e];Object.defineProperty(i,e,{configurable:!0,enumerable:!1,value(...n){const o=s.apply(this,n);return i._chartjs.listeners.forEach(r=>{typeof r[a]=="function"&&r[a](...n)}),o}})})}function hh(i,t){const e=i._chartjs;if(!e)return;const a=e.listeners,s=a.indexOf(t);s!==-1&&a.splice(s,1),!(a.length>0)&&(Ec.forEach(n=>{delete i[n]}),delete i._chartjs)}function Dc(i){const t=new Set(i);return t.size===i.length?i:Array.from(t)}const Oc=function(){return typeof window>"u"?function(i){return i()}:window.requestAnimationFrame}();function Rc(i,t){let e=[],a=!1;return function(...s){e=s,a||(a=!0,Oc.call(window,()=>{a=!1,i.apply(t,e)}))}}function zP(i,t){let e;return function(...a){return t?(clearTimeout(e),e=setTimeout(i,t,a)):i.apply(this,a),t}}const ln=i=>i==="start"?"left":i==="end"?"right":"center",xt=(i,t,e)=>i==="start"?t:i==="end"?e:(t+e)/2,NP=(i,t,e,a)=>i===(a?"left":"right")?e:i==="center"?(t+e)/2:t;function Ic(i,t,e){const a=t.length;let s=0,n=a;if(i._sorted){const{iScale:o,vScale:r,_parsed:c}=i,d=i.dataset&&i.dataset.options?i.dataset.options.spanGaps:null,l=o.axis,{min:p,max:u,minDefined:g,maxDefined:M}=o.getUserBounds();if(g){if(s=Math.min(Se(c,l,p).lo,e?a:Se(t,l,o.getPixelForValue(p)).lo),d){const f=c.slice(0,s+1).reverse().findIndex(v=>!F(v[r.axis]));s-=Math.max(0,f)}s=ft(s,0,a-1)}if(M){let f=Math.max(Se(c,o.axis,u,!0).hi+1,e?0:Se(t,l,o.getPixelForValue(u),!0).hi+1);if(d){const v=c.slice(f-1).findIndex(m=>!F(m[r.axis]));f+=Math.max(0,v)}n=ft(f,s,a)-s}else n=a-s}return{start:s,count:n}}function Bc(i){const{xScale:t,yScale:e,_scaleRanges:a}=i,s={xmin:t.min,xmax:t.max,ymin:e.min,ymax:e.max};if(!a)return i._scaleRanges=s,!0;const n=a.xmin!==t.min||a.xmax!==t.max||a.ymin!==e.min||a.ymax!==e.max;return Object.assign(a,s),n}const I1=i=>i===0||i===1,ch=(i,t,e)=>-(Math.pow(2,10*(i-=1))*Math.sin((i-t)*J/e)),dh=(i,t,e)=>Math.pow(2,-10*i)*Math.sin((i-t)*J/e)+1,a1={linear:i=>i,easeInQuad:i=>i*i,easeOutQuad:i=>-i*(i-2),easeInOutQuad:i=>(i/=.5)<1?.5*i*i:-.5*(--i*(i-2)-1),easeInCubic:i=>i*i*i,easeOutCubic:i=>(i-=1)*i*i+1,easeInOutCubic:i=>(i/=.5)<1?.5*i*i*i:.5*((i-=2)*i*i+2),easeInQuart:i=>i*i*i*i,easeOutQuart:i=>-((i-=1)*i*i*i-1),easeInOutQuart:i=>(i/=.5)<1?.5*i*i*i*i:-.5*((i-=2)*i*i*i-2),easeInQuint:i=>i*i*i*i*i,easeOutQuint:i=>(i-=1)*i*i*i*i+1,easeInOutQuint:i=>(i/=.5)<1?.5*i*i*i*i*i:.5*((i-=2)*i*i*i*i+2),easeInSine:i=>-Math.cos(i*ct)+1,easeOutSine:i=>Math.sin(i*ct),easeInOutSine:i=>-.5*(Math.cos(Z*i)-1),easeInExpo:i=>i===0?0:Math.pow(2,10*(i-1)),easeOutExpo:i=>i===1?1:-Math.pow(2,-10*i)+1,easeInOutExpo:i=>I1(i)?i:i<.5?.5*Math.pow(2,10*(i*2-1)):.5*(-Math.pow(2,-10*(i*2-1))+2),easeInCirc:i=>i>=1?i:-(Math.sqrt(1-i*i)-1),easeOutCirc:i=>Math.sqrt(1-(i-=1)*i),easeInOutCirc:i=>(i/=.5)<1?-.5*(Math.sqrt(1-i*i)-1):.5*(Math.sqrt(1-(i-=2)*i)+1),easeInElastic:i=>I1(i)?i:ch(i,.075,.3),easeOutElastic:i=>I1(i)?i:dh(i,.075,.3),easeInOutElastic(i){return I1(i)?i:i<.5?.5*ch(i*2,.1125,.45):.5+.5*dh(i*2-1,.1125,.45)},easeInBack(i){return i*i*((1.70158+1)*i-1.70158)},easeOutBack(i){return(i-=1)*i*((1.70158+1)*i+1.70158)+1},easeInOutBack(i){let t=1.70158;return(i/=.5)<1?.5*(i*i*(((t*=1.525)+1)*i-t)):.5*((i-=2)*i*(((t*=1.525)+1)*i+t)+2)},easeInBounce:i=>1-a1.easeOutBounce(1-i),easeOutBounce(i){return i<1/2.75?7.5625*i*i:i<2/2.75?7.5625*(i-=1.5/2.75)*i+.75:i<2.5/2.75?7.5625*(i-=2.25/2.75)*i+.9375:7.5625*(i-=2.625/2.75)*i+.984375},easeInOutBounce:i=>i<.5?a1.easeInBounce(i*2)*.5:a1.easeOutBounce(i*2-1)*.5+.5};function pn(i){if(i&&typeof i=="object"){const t=i.toString();return t==="[object CanvasPattern]"||t==="[object CanvasGradient]"}return!1}function lh(i){return pn(i)?i:new m1(i)}function $i(i){return pn(i)?i:new m1(i).saturate(.5).darken(.1).hexString()}const ZP=["x","y","borderWidth","radius","tension"],WP=["color","borderColor","backgroundColor"];function UP(i){i.set("animation",{delay:void 0,duration:1e3,easing:"easeOutQuart",fn:void 0,from:void 0,loop:void 0,to:void 0,type:void 0}),i.describe("animation",{_fallback:!1,_indexable:!1,_scriptable:t=>t!=="onProgress"&&t!=="onComplete"&&t!=="fn"}),i.set("animations",{colors:{type:"color",properties:WP},numbers:{type:"number",properties:ZP}}),i.describe("animations",{_fallback:"animation"}),i.set("transitions",{active:{animation:{duration:400}},resize:{animation:{duration:0}},show:{animations:{colors:{from:"transparent"},visible:{type:"boolean",duration:0}}},hide:{animations:{colors:{to:"transparent"},visible:{type:"boolean",easing:"linear",fn:t=>t|0}}}})}function qP(i){i.set("layout",{autoPadding:!0,padding:{top:0,right:0,bottom:0,left:0}})}const ph=new Map;function $P(i,t){t=t||{};const e=i+JSON.stringify(t);let a=ph.get(e);return a||(a=new Intl.NumberFormat(i,t),ph.set(e,a)),a}function H1(i,t,e){return $P(t,e).format(i)}const Fc={values(i){return tt(i)?i:""+i},numeric(i,t,e){if(i===0)return"0";const a=this.chart.options.locale;let s,n=i;if(e.length>1){const d=Math.max(Math.abs(e[0].value),Math.abs(e[e.length-1].value));(d<1e-4||d>1e15)&&(s="scientific"),n=jP(i,e)}const o=Ee(Math.abs(n)),r=isNaN(o)?1:Math.max(Math.min(-1*Math.floor(o),20),0),c={notation:s,minimumFractionDigits:r,maximumFractionDigits:r};return Object.assign(c,this.options.ticks.format),H1(i,a,c)},logarithmic(i,t,e){if(i===0)return"0";const a=e[t].significand||i/Math.pow(10,Math.floor(Ee(i)));return[1,2,3,5,10,15].includes(a)||t>.8*e.length?Fc.numeric.call(this,i,t,e):""}};function jP(i,t){let e=t.length>3?t[2].value-t[1].value:t[1].value-t[0].value;return Math.abs(e)>=1&&i!==Math.floor(i)&&(e=i-Math.floor(i)),e}var Li={formatters:Fc};function YP(i){i.set("scale",{display:!0,offset:!1,reverse:!1,beginAtZero:!1,bounds:"ticks",clip:!0,grace:0,grid:{display:!0,lineWidth:1,drawOnChartArea:!0,drawTicks:!0,tickLength:8,tickWidth:(t,e)=>e.lineWidth,tickColor:(t,e)=>e.color,offset:!1},border:{display:!0,dash:[],dashOffset:0,width:1},title:{display:!1,text:"",padding:{top:4,bottom:4}},ticks:{minRotation:0,maxRotation:50,mirror:!1,textStrokeWidth:0,textStrokeColor:"",padding:3,display:!0,autoSkip:!0,autoSkipPadding:3,labelOffset:0,callback:Li.formatters.values,minor:{},major:{},align:"center",crossAlign:"near",showLabelBackdrop:!1,backdropColor:"rgba(255, 255, 255, 0.75)",backdropPadding:2}}),i.route("scale.ticks","color","","color"),i.route("scale.grid","color","","borderColor"),i.route("scale.border","color","","borderColor"),i.route("scale.title","color","","color"),i.describe("scale",{_fallback:!1,_scriptable:t=>!t.startsWith("before")&&!t.startsWith("after")&&t!=="callback"&&t!=="parser",_indexable:t=>t!=="borderDash"&&t!=="tickBorderDash"&&t!=="dash"}),i.describe("scales",{_fallback:"scale"}),i.describe("scale.ticks",{_scriptable:t=>t!=="backdropPadding"&&t!=="callback",_indexable:t=>t!=="backdropPadding"})}const ga=Object.create(null),ws=Object.create(null);function i1(i,t){if(!t)return i;const e=t.split(".");for(let a=0,s=e.length;a<s;++a){const n=e[a];i=i[n]||(i[n]=Object.create(null))}return i}function ji(i,t,e){return typeof t=="string"?y1(i1(i,t),e):y1(i1(i,""),t)}class XP{constructor(t,e){this.animation=void 0,this.backgroundColor="rgba(0,0,0,0.1)",this.borderColor="rgba(0,0,0,0.1)",this.color="#666",this.datasets={},this.devicePixelRatio=a=>a.chart.platform.getDevicePixelRatio(),this.elements={},this.events=["mousemove","mouseout","click","touchstart","touchmove"],this.font={family:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",size:12,style:"normal",lineHeight:1.2,weight:null},this.hover={},this.hoverBackgroundColor=(a,s)=>$i(s.backgroundColor),this.hoverBorderColor=(a,s)=>$i(s.borderColor),this.hoverColor=(a,s)=>$i(s.color),this.indexAxis="x",this.interaction={mode:"nearest",intersect:!0,includeInvisible:!1},this.maintainAspectRatio=!0,this.onHover=null,this.onClick=null,this.parsing=!0,this.plugins={},this.responsive=!0,this.scale=void 0,this.scales={},this.showLine=!0,this.drawActiveElementsOnTop=!0,this.describe(t),this.apply(e)}set(t,e){return ji(this,t,e)}get(t){return i1(this,t)}describe(t,e){return ji(ws,t,e)}override(t,e){return ji(ga,t,e)}route(t,e,a,s){const n=i1(this,t),o=i1(this,a),r="_"+e;Object.defineProperties(n,{[r]:{value:n[e],writable:!0},[e]:{enumerable:!0,get(){const c=this[r],d=o[s];return z(c)?Object.assign({},d,c):B(c,d)},set(c){this[r]=c}}})}apply(t){t.forEach(e=>e(this))}}var et=new XP({_scriptable:i=>!i.startsWith("on"),_indexable:i=>i!=="events",hover:{_fallback:"interaction"},interaction:{_scriptable:!1,_indexable:!1}},[UP,qP,YP]);function GP(i){return!i||F(i.size)||F(i.family)?null:(i.style?i.style+" ":"")+(i.weight?i.weight+" ":"")+i.size+"px "+i.family}function xi(i,t,e,a,s){let n=t[s];return n||(n=t[s]=i.measureText(s).width,e.push(s)),n>a&&(a=n),a}function KP(i,t,e,a){a=a||{};let s=a.data=a.data||{},n=a.garbageCollect=a.garbageCollect||[];a.font!==t&&(s=a.data={},n=a.garbageCollect=[],a.font=t),i.save(),i.font=t;let o=0;const r=e.length;let c,d,l,p,u;for(c=0;c<r;c++)if(p=e[c],p!=null&&!tt(p))o=xi(i,s,n,o,p);else if(tt(p))for(d=0,l=p.length;d<l;d++)u=p[d],u!=null&&!tt(u)&&(o=xi(i,s,n,o,u));i.restore();const g=n.length/2;if(g>e.length){for(c=0;c<g;c++)delete s[n[c]];n.splice(0,g)}return o}function Je(i,t,e){const a=i.currentDevicePixelRatio,s=e!==0?Math.max(e/2,.5):0;return Math.round((t-s)*a)/a+s}function uh(i,t){!t&&!i||(t=t||i.getContext("2d"),t.save(),t.resetTransform(),t.clearRect(0,0,i.width,i.height),t.restore())}function Ss(i,t,e,a){zc(i,t,e,a,null)}function zc(i,t,e,a,s){let n,o,r,c,d,l,p,u;const g=t.pointStyle,M=t.rotation,f=t.radius;let v=(M||0)*VP;if(g&&typeof g=="object"&&(n=g.toString(),n==="[object HTMLImageElement]"||n==="[object HTMLCanvasElement]")){i.save(),i.translate(e,a),i.rotate(v),i.drawImage(g,-g.width/2,-g.height/2,g.width,g.height),i.restore();return}if(!(isNaN(f)||f<=0)){switch(i.beginPath(),g){default:s?i.ellipse(e,a,s/2,f,0,0,J):i.arc(e,a,f,0,J),i.closePath();break;case"triangle":l=s?s/2:f,i.moveTo(e+Math.sin(v)*l,a-Math.cos(v)*f),v+=nh,i.lineTo(e+Math.sin(v)*l,a-Math.cos(v)*f),v+=nh,i.lineTo(e+Math.sin(v)*l,a-Math.cos(v)*f),i.closePath();break;case"rectRounded":d=f*.516,c=f-d,o=Math.cos(v+Ke)*c,p=Math.cos(v+Ke)*(s?s/2-d:c),r=Math.sin(v+Ke)*c,u=Math.sin(v+Ke)*(s?s/2-d:c),i.arc(e-p,a-r,d,v-Z,v-ct),i.arc(e+u,a-o,d,v-ct,v),i.arc(e+p,a+r,d,v,v+ct),i.arc(e-u,a+o,d,v+ct,v+Z),i.closePath();break;case"rect":if(!M){c=Math.SQRT1_2*f,l=s?s/2:c,i.rect(e-l,a-c,2*l,2*c);break}v+=Ke;case"rectRot":p=Math.cos(v)*(s?s/2:f),o=Math.cos(v)*f,r=Math.sin(v)*f,u=Math.sin(v)*(s?s/2:f),i.moveTo(e-p,a-r),i.lineTo(e+u,a-o),i.lineTo(e+p,a+r),i.lineTo(e-u,a+o),i.closePath();break;case"crossRot":v+=Ke;case"cross":p=Math.cos(v)*(s?s/2:f),o=Math.cos(v)*f,r=Math.sin(v)*f,u=Math.sin(v)*(s?s/2:f),i.moveTo(e-p,a-r),i.lineTo(e+p,a+r),i.moveTo(e+u,a-o),i.lineTo(e-u,a+o);break;case"star":p=Math.cos(v)*(s?s/2:f),o=Math.cos(v)*f,r=Math.sin(v)*f,u=Math.sin(v)*(s?s/2:f),i.moveTo(e-p,a-r),i.lineTo(e+p,a+r),i.moveTo(e+u,a-o),i.lineTo(e-u,a+o),v+=Ke,p=Math.cos(v)*(s?s/2:f),o=Math.cos(v)*f,r=Math.sin(v)*f,u=Math.sin(v)*(s?s/2:f),i.moveTo(e-p,a-r),i.lineTo(e+p,a+r),i.moveTo(e+u,a-o),i.lineTo(e-u,a+o);break;case"line":o=s?s/2:Math.cos(v)*f,r=Math.sin(v)*f,i.moveTo(e-o,a-r),i.lineTo(e+o,a+r);break;case"dash":i.moveTo(e,a),i.lineTo(e+Math.cos(v)*(s?s/2:f),a+Math.sin(v)*f);break;case!1:i.closePath();break}i.fill(),t.borderWidth>0&&i.stroke()}}function ke(i,t,e){return e=e||.5,!t||i&&i.x>t.left-e&&i.x<t.right+e&&i.y>t.top-e&&i.y<t.bottom+e}function Pi(i,t){i.save(),i.beginPath(),i.rect(t.left,t.top,t.right-t.left,t.bottom-t.top),i.clip()}function Hi(i){i.restore()}function JP(i,t,e,a,s){if(!t)return i.lineTo(e.x,e.y);if(s==="middle"){const n=(t.x+e.x)/2;i.lineTo(n,t.y),i.lineTo(n,e.y)}else s==="after"!=!!a?i.lineTo(t.x,e.y):i.lineTo(e.x,t.y);i.lineTo(e.x,e.y)}function QP(i,t,e,a){if(!t)return i.lineTo(e.x,e.y);i.bezierCurveTo(a?t.cp1x:t.cp2x,a?t.cp1y:t.cp2y,a?e.cp2x:e.cp1x,a?e.cp2y:e.cp1y,e.x,e.y)}function tH(i,t){t.translation&&i.translate(t.translation[0],t.translation[1]),F(t.rotation)||i.rotate(t.rotation),t.color&&(i.fillStyle=t.color),t.textAlign&&(i.textAlign=t.textAlign),t.textBaseline&&(i.textBaseline=t.textBaseline)}function eH(i,t,e,a,s){if(s.strikethrough||s.underline){const n=i.measureText(a),o=t-n.actualBoundingBoxLeft,r=t+n.actualBoundingBoxRight,c=e-n.actualBoundingBoxAscent,d=e+n.actualBoundingBoxDescent,l=s.strikethrough?(c+d)/2:d;i.strokeStyle=i.fillStyle,i.beginPath(),i.lineWidth=s.decorationWidth||2,i.moveTo(o,l),i.lineTo(r,l),i.stroke()}}function aH(i,t){const e=i.fillStyle;i.fillStyle=t.color,i.fillRect(t.left,t.top,t.width,t.height),i.fillStyle=e}function fa(i,t,e,a,s,n={}){const o=tt(t)?t:[t],r=n.strokeWidth>0&&n.strokeColor!=="";let c,d;for(i.save(),i.font=s.string,tH(i,n),c=0;c<o.length;++c)d=o[c],n.backdrop&&aH(i,n.backdrop),r&&(n.strokeColor&&(i.strokeStyle=n.strokeColor),F(n.strokeWidth)||(i.lineWidth=n.strokeWidth),i.strokeText(d,e,a,n.maxWidth)),i.fillText(d,e,a,n.maxWidth),eH(i,e,a,d,n),a+=Number(s.lineHeight);i.restore()}function b1(i,t){const{x:e,y:a,w:s,h:n,radius:o}=t;i.arc(e+o.topLeft,a+o.topLeft,o.topLeft,1.5*Z,Z,!0),i.lineTo(e,a+n-o.bottomLeft),i.arc(e+o.bottomLeft,a+n-o.bottomLeft,o.bottomLeft,Z,ct,!0),i.lineTo(e+s-o.bottomRight,a+n),i.arc(e+s-o.bottomRight,a+n-o.bottomRight,o.bottomRight,ct,0,!0),i.lineTo(e+s,a+o.topRight),i.arc(e+s-o.topRight,a+o.topRight,o.topRight,0,-ct,!0),i.lineTo(e+o.topLeft,a)}const iH=/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,sH=/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;function nH(i,t){const e=(""+i).match(iH);if(!e||e[1]==="normal")return t*1.2;switch(i=+e[2],e[3]){case"px":return i;case"%":i/=100;break}return t*i}const oH=i=>+i||0;function un(i,t){const e={},a=z(t),s=a?Object.keys(t):t,n=z(i)?a?o=>B(i[o],i[t[o]]):o=>i[o]:()=>i;for(const o of s)e[o]=oH(n(o));return e}function Nc(i){return un(i,{top:"y",right:"x",bottom:"y",left:"x"})}function la(i){return un(i,["topLeft","topRight","bottomLeft","bottomRight"])}function At(i){const t=Nc(i);return t.width=t.left+t.right,t.height=t.top+t.bottom,t}function gt(i,t){i=i||{},t=t||et.font;let e=B(i.size,t.size);typeof e=="string"&&(e=parseInt(e,10));let a=B(i.style,t.style);a&&!(""+a).match(sH)&&(console.warn('Invalid font style specified: "'+a+'"'),a=void 0);const s={family:B(i.family,t.family),lineHeight:nH(B(i.lineHeight,t.lineHeight),e),size:e,style:a,weight:B(i.weight,t.weight),string:""};return s.string=GP(s),s}function qa(i,t,e,a){let s,n,o;for(s=0,n=i.length;s<n;++s)if(o=i[s],o!==void 0&&o!==void 0)return o}function rH(i,t,e){const{min:a,max:s}=i,n=Pc(t,(s-a)/2),o=(r,c)=>e&&r===0?0:r+c;return{min:o(a,-Math.abs(n)),max:o(s,n)}}function Ye(i,t){return Object.assign(Object.create(i),t)}function gn(i,t=[""],e,a,s=()=>i[0]){const n=e||i;typeof a>"u"&&(a=qc("_fallback",i));const o={[Symbol.toStringTag]:"Object",_cacheable:!0,_scopes:i,_rootScopes:n,_fallback:a,_getTarget:s,override:r=>gn([r,...i],t,n,a)};return new Proxy(o,{deleteProperty(r,c){return delete r[c],delete r._keys,delete i[0][c],!0},get(r,c){return Wc(r,c,()=>fH(c,t,i,r))},getOwnPropertyDescriptor(r,c){return Reflect.getOwnPropertyDescriptor(r._scopes[0],c)},getPrototypeOf(){return Reflect.getPrototypeOf(i[0])},has(r,c){return fh(r).includes(c)},ownKeys(r){return fh(r)},set(r,c,d){const l=r._storage||(r._storage=s());return r[c]=l[c]=d,delete r._keys,!0}})}function Da(i,t,e,a){const s={_cacheable:!1,_proxy:i,_context:t,_subProxy:e,_stack:new Set,_descriptors:Zc(i,a),setContext:n=>Da(i,n,e,a),override:n=>Da(i.override(n),t,e,a)};return new Proxy(s,{deleteProperty(n,o){return delete n[o],delete i[o],!0},get(n,o,r){return Wc(n,o,()=>cH(n,o,r))},getOwnPropertyDescriptor(n,o){return n._descriptors.allKeys?Reflect.has(i,o)?{enumerable:!0,configurable:!0}:void 0:Reflect.getOwnPropertyDescriptor(i,o)},getPrototypeOf(){return Reflect.getPrototypeOf(i)},has(n,o){return Reflect.has(i,o)},ownKeys(){return Reflect.ownKeys(i)},set(n,o,r){return i[o]=r,delete n[o],!0}})}function Zc(i,t={scriptable:!0,indexable:!0}){const{_scriptable:e=t.scriptable,_indexable:a=t.indexable,_allKeys:s=t.allKeys}=i;return{allKeys:s,scriptable:e,indexable:a,isScriptable:qe(e)?e:()=>e,isIndexable:qe(a)?a:()=>a}}const hH=(i,t)=>i?i+hn(t):t,fn=(i,t)=>z(t)&&i!=="adapters"&&(Object.getPrototypeOf(t)===null||t.constructor===Object);function Wc(i,t,e){if(Object.prototype.hasOwnProperty.call(i,t)||t==="constructor")return i[t];const a=e();return i[t]=a,a}function cH(i,t,e){const{_proxy:a,_context:s,_subProxy:n,_descriptors:o}=i;let r=a[t];return qe(r)&&o.isScriptable(t)&&(r=dH(t,r,i,e)),tt(r)&&r.length&&(r=lH(t,r,i,o.isIndexable)),fn(t,r)&&(r=Da(r,s,n&&n[t],o)),r}function dH(i,t,e,a){const{_proxy:s,_context:n,_subProxy:o,_stack:r}=e;if(r.has(i))throw new Error("Recursion detected: "+Array.from(r).join("->")+"->"+i);r.add(i);let c=t(n,o||a);return r.delete(i),fn(i,c)&&(c=Mn(s._scopes,s,i,c)),c}function lH(i,t,e,a){const{_proxy:s,_context:n,_subProxy:o,_descriptors:r}=e;if(typeof n.index<"u"&&a(i))return t[n.index%t.length];if(z(t[0])){const c=t,d=s._scopes.filter(l=>l!==c);t=[];for(const l of c){const p=Mn(d,s,i,l);t.push(Da(p,n,o&&o[i],r))}}return t}function Uc(i,t,e){return qe(i)?i(t,e):i}const pH=(i,t)=>i===!0?t:typeof i=="string"?Ue(t,i):void 0;function uH(i,t,e,a,s){for(const n of t){const o=pH(e,n);if(o){i.add(o);const r=Uc(o._fallback,e,s);if(typeof r<"u"&&r!==e&&r!==a)return r}else if(o===!1&&typeof a<"u"&&e!==a)return null}return!1}function Mn(i,t,e,a){const s=t._rootScopes,n=Uc(t._fallback,e,a),o=[...i,...s],r=new Set;r.add(a);let c=gh(r,o,e,n||e,a);return c===null||typeof n<"u"&&n!==e&&(c=gh(r,o,n,c,a),c===null)?!1:gn(Array.from(r),[""],s,n,()=>gH(t,e,a))}function gh(i,t,e,a,s){for(;e;)e=uH(i,t,e,a,s);return e}function gH(i,t,e){const a=i._getTarget();t in a||(a[t]={});const s=a[t];return tt(s)&&z(e)?e:s||{}}function fH(i,t,e,a){let s;for(const n of t)if(s=qc(hH(n,i),e),typeof s<"u")return fn(i,s)?Mn(e,a,i,s):s}function qc(i,t){for(const e of t){if(!e)continue;const a=e[i];if(typeof a<"u")return a}}function fh(i){let t=i._keys;return t||(t=i._keys=MH(i._scopes)),t}function MH(i){const t=new Set;for(const e of i)for(const a of Object.keys(e).filter(s=>!s.startsWith("_")))t.add(a);return Array.from(t)}function $c(i,t,e,a){const{iScale:s}=i,{key:n="r"}=this._parsing,o=new Array(a);let r,c,d,l;for(r=0,c=a;r<c;++r)d=r+e,l=t[d],o[r]={r:s.parse(Ue(l,n),d)};return o}const vH=Number.EPSILON||1e-14,Oa=(i,t)=>t<i.length&&!i[t].skip&&i[t],jc=i=>i==="x"?"y":"x";function mH(i,t,e,a){const s=i.skip?t:i,n=t,o=e.skip?t:e,r=bs(n,s),c=bs(o,n);let d=r/(r+c),l=c/(r+c);d=isNaN(d)?0:d,l=isNaN(l)?0:l;const p=a*d,u=a*l;return{previous:{x:n.x-p*(o.x-s.x),y:n.y-p*(o.y-s.y)},next:{x:n.x+u*(o.x-s.x),y:n.y+u*(o.y-s.y)}}}function yH(i,t,e){const a=i.length;let s,n,o,r,c,d=Oa(i,0);for(let l=0;l<a-1;++l)if(c=d,d=Oa(i,l+1),!(!c||!d)){if(e1(t[l],0,vH)){e[l]=e[l+1]=0;continue}s=e[l]/t[l],n=e[l+1]/t[l],r=Math.pow(s,2)+Math.pow(n,2),!(r<=9)&&(o=3/Math.sqrt(r),e[l]=s*o*t[l],e[l+1]=n*o*t[l])}}function xH(i,t,e="x"){const a=jc(e),s=i.length;let n,o,r,c=Oa(i,0);for(let d=0;d<s;++d){if(o=r,r=c,c=Oa(i,d+1),!r)continue;const l=r[e],p=r[a];o&&(n=(l-o[e])/3,r[`cp1${e}`]=l-n,r[`cp1${a}`]=p-n*t[d]),c&&(n=(c[e]-l)/3,r[`cp2${e}`]=l+n,r[`cp2${a}`]=p+n*t[d])}}function _H(i,t="x"){const e=jc(t),a=i.length,s=Array(a).fill(0),n=Array(a);let o,r,c,d=Oa(i,0);for(o=0;o<a;++o)if(r=c,c=d,d=Oa(i,o+1),!!c){if(d){const l=d[t]-c[t];s[o]=l!==0?(d[e]-c[e])/l:0}n[o]=r?d?pe(s[o-1])!==pe(s[o])?0:(s[o-1]+s[o])/2:s[o-1]:s[o]}yH(i,s,n),xH(i,n,t)}function B1(i,t,e){return Math.max(Math.min(i,e),t)}function bH(i,t){let e,a,s,n,o,r=ke(i[0],t);for(e=0,a=i.length;e<a;++e)o=n,n=r,r=e<a-1&&ke(i[e+1],t),n&&(s=i[e],o&&(s.cp1x=B1(s.cp1x,t.left,t.right),s.cp1y=B1(s.cp1y,t.top,t.bottom)),r&&(s.cp2x=B1(s.cp2x,t.left,t.right),s.cp2y=B1(s.cp2y,t.top,t.bottom)))}function wH(i,t,e,a,s){let n,o,r,c;if(t.spanGaps&&(i=i.filter(d=>!d.skip)),t.cubicInterpolationMode==="monotone")_H(i,s);else{let d=a?i[i.length-1]:i[0];for(n=0,o=i.length;n<o;++n)r=i[n],c=mH(d,r,i[Math.min(n+1,o-(a?0:1))%o],t.tension),r.cp1x=c.previous.x,r.cp1y=c.previous.y,r.cp2x=c.next.x,r.cp2y=c.next.y,d=r}t.capBezierPoints&&bH(i,e)}function vn(){return typeof window<"u"&&typeof document<"u"}function mn(i){let t=i.parentNode;return t&&t.toString()==="[object ShadowRoot]"&&(t=t.host),t}function _i(i,t,e){let a;return typeof i=="string"?(a=parseInt(i,10),i.indexOf("%")!==-1&&(a=a/100*t.parentNode[e])):a=i,a}const Vi=i=>i.ownerDocument.defaultView.getComputedStyle(i,null);function SH(i,t){return Vi(i).getPropertyValue(t)}const kH=["top","right","bottom","left"];function pa(i,t,e){const a={};e=e?"-"+e:"";for(let s=0;s<4;s++){const n=kH[s];a[n]=parseFloat(i[t+"-"+n+e])||0}return a.width=a.left+a.right,a.height=a.top+a.bottom,a}const AH=(i,t,e)=>(i>0||t>0)&&(!e||!e.shadowRoot);function CH(i,t){const e=i.touches,a=e&&e.length?e[0]:i,{offsetX:s,offsetY:n}=a;let o=!1,r,c;if(AH(s,n,i.target))r=s,c=n;else{const d=t.getBoundingClientRect();r=a.clientX-d.left,c=a.clientY-d.top,o=!0}return{x:r,y:c,box:o}}function aa(i,t){if("native"in i)return i;const{canvas:e,currentDevicePixelRatio:a}=t,s=Vi(e),n=s.boxSizing==="border-box",o=pa(s,"padding"),r=pa(s,"border","width"),{x:c,y:d,box:l}=CH(i,e),p=o.left+(l&&r.left),u=o.top+(l&&r.top);let{width:g,height:M}=t;return n&&(g-=o.width+r.width,M-=o.height+r.height),{x:Math.round((c-p)/g*e.width/a),y:Math.round((d-u)/M*e.height/a)}}function LH(i,t,e){let a,s;if(t===void 0||e===void 0){const n=i&&mn(i);if(!n)t=i.clientWidth,e=i.clientHeight;else{const o=n.getBoundingClientRect(),r=Vi(n),c=pa(r,"border","width"),d=pa(r,"padding");t=o.width-d.width-c.width,e=o.height-d.height-c.height,a=_i(r.maxWidth,n,"clientWidth"),s=_i(r.maxHeight,n,"clientHeight")}}return{width:t,height:e,maxWidth:a||yi,maxHeight:s||yi}}const De=i=>Math.round(i*10)/10;function PH(i,t,e,a){const s=Vi(i),n=pa(s,"margin"),o=_i(s.maxWidth,i,"clientWidth")||yi,r=_i(s.maxHeight,i,"clientHeight")||yi,c=LH(i,t,e);let{width:d,height:l}=c;if(s.boxSizing==="content-box"){const u=pa(s,"border","width"),g=pa(s,"padding");d-=g.width+u.width,l-=g.height+u.height}return d=Math.max(0,d-n.width),l=Math.max(0,a?d/a:l-n.height),d=De(Math.min(d,o,c.maxWidth)),l=De(Math.min(l,r,c.maxHeight)),d&&!l&&(l=De(d/2)),(t!==void 0||e!==void 0)&&a&&c.height&&l>c.height&&(l=c.height,d=De(Math.floor(l*a))),{width:d,height:l}}function Mh(i,t,e){const a=t||1,s=De(i.height*a),n=De(i.width*a);i.height=De(i.height),i.width=De(i.width);const o=i.canvas;return o.style&&(e||!o.style.height&&!o.style.width)&&(o.style.height=`${i.height}px`,o.style.width=`${i.width}px`),i.currentDevicePixelRatio!==a||o.height!==s||o.width!==n?(i.currentDevicePixelRatio=a,o.height=s,o.width=n,i.ctx.setTransform(a,0,0,a,0,0),!0):!1}const HH=function(){let i=!1;try{const t={get passive(){return i=!0,!1}};vn()&&(window.addEventListener("test",null,t),window.removeEventListener("test",null,t))}catch{}return i}();function vh(i,t){const e=SH(i,t),a=e&&e.match(/^(\d+)(\.\d+)?px$/);return a?+a[1]:void 0}function ia(i,t,e,a){return{x:i.x+e*(t.x-i.x),y:i.y+e*(t.y-i.y)}}function VH(i,t,e,a){return{x:i.x+e*(t.x-i.x),y:a==="middle"?e<.5?i.y:t.y:a==="after"?e<1?i.y:t.y:e>0?t.y:i.y}}function TH(i,t,e,a){const s={x:i.cp2x,y:i.cp2y},n={x:t.cp1x,y:t.cp1y},o=ia(i,s,e),r=ia(s,n,e),c=ia(n,t,e),d=ia(o,r,e),l=ia(r,c,e);return ia(d,l,e)}const EH=function(i,t){return{x(e){return i+i+t-e},setWidth(e){t=e},textAlign(e){return e==="center"?e:e==="right"?"left":"right"},xPlus(e,a){return e-a},leftForLtr(e,a){return e-a}}},DH=function(){return{x(i){return i},setWidth(i){},textAlign(i){return i},xPlus(i,t){return i+t},leftForLtr(i,t){return i}}};function Aa(i,t,e){return i?EH(t,e):DH()}function Yc(i,t){let e,a;(t==="ltr"||t==="rtl")&&(e=i.canvas.style,a=[e.getPropertyValue("direction"),e.getPropertyPriority("direction")],e.setProperty("direction",t,"important"),i.prevTextDirection=a)}function Xc(i,t){t!==void 0&&(delete i.prevTextDirection,i.canvas.style.setProperty("direction",t[0],t[1]))}function Gc(i){return i==="angle"?{between:_1,compare:OP,normalize:bt}:{between:we,compare:(t,e)=>t-e,normalize:t=>t}}function mh({start:i,end:t,count:e,loop:a,style:s}){return{start:i%e,end:t%e,loop:a&&(t-i+1)%e===0,style:s}}function OH(i,t,e){const{property:a,start:s,end:n}=e,{between:o,normalize:r}=Gc(a),c=t.length;let{start:d,end:l,loop:p}=i,u,g;if(p){for(d+=c,l+=c,u=0,g=c;u<g&&o(r(t[d%c][a]),s,n);++u)d--,l--;d%=c,l%=c}return l<d&&(l+=c),{start:d,end:l,loop:p,style:i.style}}function Kc(i,t,e){if(!e)return[i];const{property:a,start:s,end:n}=e,o=t.length,{compare:r,between:c,normalize:d}=Gc(a),{start:l,end:p,loop:u,style:g}=OH(i,t,e),M=[];let f=!1,v=null,m,y,_;const b=()=>c(s,_,m)&&r(s,_)!==0,x=()=>r(n,m)===0||c(n,_,m),k=()=>f||b(),w=()=>!f||x();for(let S=l,A=l;S<=p;++S)y=t[S%o],!y.skip&&(m=d(y[a]),m!==_&&(f=c(m,s,n),v===null&&k()&&(v=r(m,s)===0?S:A),v!==null&&w()&&(M.push(mh({start:v,end:S,loop:u,count:o,style:g})),v=null),A=S,_=m));return v!==null&&M.push(mh({start:v,end:p,loop:u,count:o,style:g})),M}function Jc(i,t){const e=[],a=i.segments;for(let s=0;s<a.length;s++){const n=Kc(a[s],i.points,t);n.length&&e.push(...n)}return e}function RH(i,t,e,a){let s=0,n=t-1;if(e&&!a)for(;s<t&&!i[s].skip;)s++;for(;s<t&&i[s].skip;)s++;for(s%=t,e&&(n+=s);n>s&&i[n%t].skip;)n--;return n%=t,{start:s,end:n}}function IH(i,t,e,a){const s=i.length,n=[];let o=t,r=i[t],c;for(c=t+1;c<=e;++c){const d=i[c%s];d.skip||d.stop?r.skip||(a=!1,n.push({start:t%s,end:(c-1)%s,loop:a}),t=o=d.stop?c:null):(o=c,r.skip&&(t=c)),r=d}return o!==null&&n.push({start:t%s,end:o%s,loop:a}),n}function BH(i,t){const e=i.points,a=i.options.spanGaps,s=e.length;if(!s)return[];const n=!!i._loop,{start:o,end:r}=RH(e,s,n,a);if(a===!0)return yh(i,[{start:o,end:r,loop:n}],e,t);const c=r<o?r+s:r,d=!!i._fullLoop&&o===0&&r===s-1;return yh(i,IH(e,o,c,d),e,t)}function yh(i,t,e,a){return!a||!a.setContext||!e?t:FH(i,t,e,a)}function FH(i,t,e,a){const s=i._chart.getContext(),n=xh(i.options),{_datasetIndex:o,options:{spanGaps:r}}=i,c=e.length,d=[];let l=n,p=t[0].start,u=p;function g(M,f,v,m){const y=r?-1:1;if(M!==f){for(M+=c;e[M%c].skip;)M-=y;for(;e[f%c].skip;)f+=y;M%c!==f%c&&(d.push({start:M%c,end:f%c,loop:v,style:m}),l=m,p=f%c)}}for(const M of t){p=r?p:M.start;let f=e[p%c],v;for(u=p+1;u<=M.end;u++){const m=e[u%c];v=xh(a.setContext(Ye(s,{type:"segment",p0:f,p1:m,p0DataIndex:(u-1)%c,p1DataIndex:u%c,datasetIndex:o}))),zH(v,l)&&g(p,u-1,M.loop,l),f=m,l=v}p<u-1&&g(p,u-1,M.loop,l)}return d}function xh(i){return{backgroundColor:i.backgroundColor,borderCapStyle:i.borderCapStyle,borderDash:i.borderDash,borderDashOffset:i.borderDashOffset,borderJoinStyle:i.borderJoinStyle,borderWidth:i.borderWidth,borderColor:i.borderColor}}function zH(i,t){if(!t)return!1;const e=[],a=function(s,n){return pn(n)?(e.includes(n)||e.push(n),e.indexOf(n)):n};return JSON.stringify(i,a)!==JSON.stringify(t,a)}function F1(i,t,e){return i.options.clip?i[e]:t[e]}function NH(i,t){const{xScale:e,yScale:a}=i;return e&&a?{left:F1(e,t,"left"),right:F1(e,t,"right"),top:F1(a,t,"top"),bottom:F1(a,t,"bottom")}:t}function Qc(i,t){const e=t._clip;if(e.disabled)return!1;const a=NH(t,i.chartArea);return{left:e.left===!1?0:a.left-(e.left===!0?0:e.left),right:e.right===!1?i.width:a.right+(e.right===!0?0:e.right),top:e.top===!1?0:a.top-(e.top===!0?0:e.top),bottom:e.bottom===!1?i.height:a.bottom+(e.bottom===!0?0:e.bottom)}}/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */class ZH{constructor(){this._request=null,this._charts=new Map,this._running=!1,this._lastDate=void 0}_notify(t,e,a,s){const n=e.listeners[s],o=e.duration;n.forEach(r=>r({chart:t,initial:e.initial,numSteps:o,currentStep:Math.min(a-e.start,o)}))}_refresh(){this._request||(this._running=!0,this._request=Oc.call(window,()=>{this._update(),this._request=null,this._running&&this._refresh()}))}_update(t=Date.now()){let e=0;this._charts.forEach((a,s)=>{if(!a.running||!a.items.length)return;const n=a.items;let o=n.length-1,r=!1,c;for(;o>=0;--o)c=n[o],c._active?(c._total>a.duration&&(a.duration=c._total),c.tick(t),r=!0):(n[o]=n[n.length-1],n.pop());r&&(s.draw(),this._notify(s,a,t,"progress")),n.length||(a.running=!1,this._notify(s,a,t,"complete"),a.initial=!1),e+=n.length}),this._lastDate=t,e===0&&(this._running=!1)}_getAnims(t){const e=this._charts;let a=e.get(t);return a||(a={running:!1,initial:!0,items:[],listeners:{complete:[],progress:[]}},e.set(t,a)),a}listen(t,e,a){this._getAnims(t).listeners[e].push(a)}add(t,e){!e||!e.length||this._getAnims(t).items.push(...e)}has(t){return this._getAnims(t).items.length>0}start(t){const e=this._charts.get(t);e&&(e.running=!0,e.start=Date.now(),e.duration=e.items.reduce((a,s)=>Math.max(a,s._duration),0),this._refresh())}running(t){if(!this._running)return!1;const e=this._charts.get(t);return!(!e||!e.running||!e.items.length)}stop(t){const e=this._charts.get(t);if(!e||!e.items.length)return;const a=e.items;let s=a.length-1;for(;s>=0;--s)a[s].cancel();e.items=[],this._notify(t,e,Date.now(),"complete")}remove(t){return this._charts.delete(t)}}var Me=new ZH;const _h="transparent",WH={boolean(i,t,e){return e>.5?t:i},color(i,t,e){const a=lh(i||_h),s=a.valid&&lh(t||_h);return s&&s.valid?s.mix(a,e).hexString():t},number(i,t,e){return i+(t-i)*e}};class UH{constructor(t,e,a,s){const n=e[a];s=qa([t.to,s,n,t.from]);const o=qa([t.from,n,s]);this._active=!0,this._fn=t.fn||WH[t.type||typeof o],this._easing=a1[t.easing]||a1.linear,this._start=Math.floor(Date.now()+(t.delay||0)),this._duration=this._total=Math.floor(t.duration),this._loop=!!t.loop,this._target=e,this._prop=a,this._from=o,this._to=s,this._promises=void 0}active(){return this._active}update(t,e,a){if(this._active){this._notify(!1);const s=this._target[this._prop],n=a-this._start,o=this._duration-n;this._start=a,this._duration=Math.floor(Math.max(o,t.duration)),this._total+=n,this._loop=!!t.loop,this._to=qa([t.to,e,s,t.from]),this._from=qa([t.from,s,e])}}cancel(){this._active&&(this.tick(Date.now()),this._active=!1,this._notify(!1))}tick(t){const e=t-this._start,a=this._duration,s=this._prop,n=this._from,o=this._loop,r=this._to;let c;if(this._active=n!==r&&(o||e<a),!this._active){this._target[s]=r,this._notify(!0);return}if(e<0){this._target[s]=n;return}c=e/a%2,c=o&&c>1?2-c:c,c=this._easing(Math.min(1,Math.max(0,c))),this._target[s]=this._fn(n,r,c)}wait(){const t=this._promises||(this._promises=[]);return new Promise((e,a)=>{t.push({res:e,rej:a})})}_notify(t){const e=t?"res":"rej",a=this._promises||[];for(let s=0;s<a.length;s++)a[s][e]()}}class td{constructor(t,e){this._chart=t,this._properties=new Map,this.configure(e)}configure(t){if(!z(t))return;const e=Object.keys(et.animation),a=this._properties;Object.getOwnPropertyNames(t).forEach(s=>{const n=t[s];if(!z(n))return;const o={};for(const r of e)o[r]=n[r];(tt(n.properties)&&n.properties||[s]).forEach(r=>{(r===s||!a.has(r))&&a.set(r,o)})})}_animateOptions(t,e){const a=e.options,s=$H(t,a);if(!s)return[];const n=this._createAnimations(s,a);return a.$shared&&qH(t.options.$animations,a).then(()=>{t.options=a},()=>{}),n}_createAnimations(t,e){const a=this._properties,s=[],n=t.$animations||(t.$animations={}),o=Object.keys(e),r=Date.now();let c;for(c=o.length-1;c>=0;--c){const d=o[c];if(d.charAt(0)==="$")continue;if(d==="options"){s.push(...this._animateOptions(t,e));continue}const l=e[d];let p=n[d];const u=a.get(d);if(p)if(u&&p.active()){p.update(u,l,r);continue}else p.cancel();if(!u||!u.duration){t[d]=l;continue}n[d]=p=new UH(u,t,d,l),s.push(p)}return s}update(t,e){if(this._properties.size===0){Object.assign(t,e);return}const a=this._createAnimations(t,e);if(a.length)return Me.add(this._chart,a),!0}}function qH(i,t){const e=[],a=Object.keys(t);for(let s=0;s<a.length;s++){const n=i[a[s]];n&&n.active()&&e.push(n.wait())}return Promise.all(e)}function $H(i,t){if(!t)return;let e=i.options;if(!e){i.options=t;return}return e.$shared&&(i.options=e=Object.assign({},e,{$shared:!1,$animations:{}})),e}function bh(i,t){const e=i&&i.options||{},a=e.reverse,s=e.min===void 0?t:0,n=e.max===void 0?t:0;return{start:a?n:s,end:a?s:n}}function jH(i,t,e){if(e===!1)return!1;const a=bh(i,e),s=bh(t,e);return{top:s.end,right:a.end,bottom:s.start,left:a.start}}function YH(i){let t,e,a,s;return z(i)?(t=i.top,e=i.right,a=i.bottom,s=i.left):t=e=a=s=i,{top:t,right:e,bottom:a,left:s,disabled:i===!1}}function ed(i,t){const e=[],a=i._getSortedDatasetMetas(t);let s,n;for(s=0,n=a.length;s<n;++s)e.push(a[s].index);return e}function wh(i,t,e,a={}){const s=i.keys,n=a.mode==="single";let o,r,c,d;if(t===null)return;let l=!1;for(o=0,r=s.length;o<r;++o){if(c=+s[o],c===e){if(l=!0,a.all)continue;break}d=i.values[c],rt(d)&&(n||t===0||pe(t)===pe(d))&&(t+=d)}return!l&&!a.all?0:t}function XH(i,t){const{iScale:e,vScale:a}=t,s=e.axis==="x"?"x":"y",n=a.axis==="x"?"x":"y",o=Object.keys(i),r=new Array(o.length);let c,d,l;for(c=0,d=o.length;c<d;++c)l=o[c],r[c]={[s]:l,[n]:i[l]};return r}function Yi(i,t){const e=i&&i.options.stacked;return e||e===void 0&&t.stack!==void 0}function GH(i,t,e){return`${i.id}.${t.id}.${e.stack||e.type}`}function KH(i){const{min:t,max:e,minDefined:a,maxDefined:s}=i.getUserBounds();return{min:a?t:Number.NEGATIVE_INFINITY,max:s?e:Number.POSITIVE_INFINITY}}function JH(i,t,e){const a=i[t]||(i[t]={});return a[e]||(a[e]={})}function Sh(i,t,e,a){for(const s of t.getMatchingVisibleMetas(a).reverse()){const n=i[s.index];if(e&&n>0||!e&&n<0)return s.index}return null}function kh(i,t){const{chart:e,_cachedMeta:a}=i,s=e._stacks||(e._stacks={}),{iScale:n,vScale:o,index:r}=a,c=n.axis,d=o.axis,l=GH(n,o,a),p=t.length;let u;for(let g=0;g<p;++g){const M=t[g],{[c]:f,[d]:v}=M,m=M._stacks||(M._stacks={});u=m[d]=JH(s,l,f),u[r]=v,u._top=Sh(u,o,!0,a.type),u._bottom=Sh(u,o,!1,a.type);const y=u._visualValues||(u._visualValues={});y[r]=v}}function Xi(i,t){const e=i.scales;return Object.keys(e).filter(a=>e[a].axis===t).shift()}function QH(i,t){return Ye(i,{active:!1,dataset:void 0,datasetIndex:t,index:t,mode:"default",type:"dataset"})}function tV(i,t,e){return Ye(i,{active:!1,dataIndex:t,parsed:void 0,raw:void 0,element:e,index:t,mode:"default",type:"data"})}function Ia(i,t){const e=i.controller.index,a=i.vScale&&i.vScale.axis;if(a){t=t||i._parsed;for(const s of t){const n=s._stacks;if(!n||n[a]===void 0||n[a][e]===void 0)return;delete n[a][e],n[a]._visualValues!==void 0&&n[a]._visualValues[e]!==void 0&&delete n[a]._visualValues[e]}}}const Gi=i=>i==="reset"||i==="none",Ah=(i,t)=>t?i:Object.assign({},i),eV=(i,t,e)=>i&&!t.hidden&&t._stacked&&{keys:ed(e,!0),values:null};class ee{constructor(t,e){this.chart=t,this._ctx=t.ctx,this.index=e,this._cachedDataOpts={},this._cachedMeta=this.getMeta(),this._type=this._cachedMeta.type,this.options=void 0,this._parsing=!1,this._data=void 0,this._objectData=void 0,this._sharedOptions=void 0,this._drawStart=void 0,this._drawCount=void 0,this.enableOptionSharing=!1,this.supportsDecimation=!1,this.$context=void 0,this._syncList=[],this.datasetElementType=new.target.datasetElementType,this.dataElementType=new.target.dataElementType,this.initialize()}initialize(){const t=this._cachedMeta;this.configure(),this.linkScales(),t._stacked=Yi(t.vScale,t),this.addElements(),this.options.fill&&!this.chart.isPluginEnabled("filler")&&console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options")}updateIndex(t){this.index!==t&&Ia(this._cachedMeta),this.index=t}linkScales(){const t=this.chart,e=this._cachedMeta,a=this.getDataset(),s=(p,u,g,M)=>p==="x"?u:p==="r"?M:g,n=e.xAxisID=B(a.xAxisID,Xi(t,"x")),o=e.yAxisID=B(a.yAxisID,Xi(t,"y")),r=e.rAxisID=B(a.rAxisID,Xi(t,"r")),c=e.indexAxis,d=e.iAxisID=s(c,n,o,r),l=e.vAxisID=s(c,o,n,r);e.xScale=this.getScaleForId(n),e.yScale=this.getScaleForId(o),e.rScale=this.getScaleForId(r),e.iScale=this.getScaleForId(d),e.vScale=this.getScaleForId(l)}getDataset(){return this.chart.data.datasets[this.index]}getMeta(){return this.chart.getDatasetMeta(this.index)}getScaleForId(t){return this.chart.scales[t]}_getOtherScale(t){const e=this._cachedMeta;return t===e.iScale?e.vScale:e.iScale}reset(){this._update("reset")}_destroy(){const t=this._cachedMeta;this._data&&hh(this._data,this),t._stacked&&Ia(t)}_dataCheck(){const t=this.getDataset(),e=t.data||(t.data=[]),a=this._data;if(z(e)){const s=this._cachedMeta;this._data=XH(e,s)}else if(a!==e){if(a){hh(a,this);const s=this._cachedMeta;Ia(s),s._parsed=[]}e&&Object.isExtensible(e)&&FP(e,this),this._syncList=[],this._data=e}}addElements(){const t=this._cachedMeta;this._dataCheck(),this.datasetElementType&&(t.dataset=new this.datasetElementType)}buildOrUpdateElements(t){const e=this._cachedMeta,a=this.getDataset();let s=!1;this._dataCheck();const n=e._stacked;e._stacked=Yi(e.vScale,e),e.stack!==a.stack&&(s=!0,Ia(e),e.stack=a.stack),this._resyncElements(t),(s||n!==e._stacked)&&(kh(this,e._parsed),e._stacked=Yi(e.vScale,e))}configure(){const t=this.chart.config,e=t.datasetScopeKeys(this._type),a=t.getOptionScopes(this.getDataset(),e,!0);this.options=t.createResolver(a,this.getContext()),this._parsing=this.options.parsing,this._cachedDataOpts={}}parse(t,e){const{_cachedMeta:a,_data:s}=this,{iScale:n,_stacked:o}=a,r=n.axis;let c=t===0&&e===s.length?!0:a._sorted,d=t>0&&a._parsed[t-1],l,p,u;if(this._parsing===!1)a._parsed=s,a._sorted=!0,u=s;else{tt(s[t])?u=this.parseArrayData(a,s,t,e):z(s[t])?u=this.parseObjectData(a,s,t,e):u=this.parsePrimitiveData(a,s,t,e);const g=()=>p[r]===null||d&&p[r]<d[r];for(l=0;l<e;++l)a._parsed[l+t]=p=u[l],c&&(g()&&(c=!1),d=p);a._sorted=c}o&&kh(this,u)}parsePrimitiveData(t,e,a,s){const{iScale:n,vScale:o}=t,r=n.axis,c=o.axis,d=n.getLabels(),l=n===o,p=new Array(s);let u,g,M;for(u=0,g=s;u<g;++u)M=u+a,p[u]={[r]:l||n.parse(d[M],M),[c]:o.parse(e[M],M)};return p}parseArrayData(t,e,a,s){const{xScale:n,yScale:o}=t,r=new Array(s);let c,d,l,p;for(c=0,d=s;c<d;++c)l=c+a,p=e[l],r[c]={x:n.parse(p[0],l),y:o.parse(p[1],l)};return r}parseObjectData(t,e,a,s){const{xScale:n,yScale:o}=t,{xAxisKey:r="x",yAxisKey:c="y"}=this._parsing,d=new Array(s);let l,p,u,g;for(l=0,p=s;l<p;++l)u=l+a,g=e[u],d[l]={x:n.parse(Ue(g,r),u),y:o.parse(Ue(g,c),u)};return d}getParsed(t){return this._cachedMeta._parsed[t]}getDataElement(t){return this._cachedMeta.data[t]}applyStack(t,e,a){const s=this.chart,n=this._cachedMeta,o=e[t.axis],r={keys:ed(s,!0),values:e._stacks[t.axis]._visualValues};return wh(r,o,n.index,{mode:a})}updateRangeFromParsed(t,e,a,s){const n=a[e.axis];let o=n===null?NaN:n;const r=s&&a._stacks[e.axis];s&&r&&(s.values=r,o=wh(s,n,this._cachedMeta.index)),t.min=Math.min(t.min,o),t.max=Math.max(t.max,o)}getMinMax(t,e){const a=this._cachedMeta,s=a._parsed,n=a._sorted&&t===a.iScale,o=s.length,r=this._getOtherScale(t),c=eV(e,a,this.chart),d={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY},{min:l,max:p}=KH(r);let u,g;function M(){g=s[u];const f=g[r.axis];return!rt(g[t.axis])||l>f||p<f}for(u=0;u<o&&!(!M()&&(this.updateRangeFromParsed(d,t,g,c),n));++u);if(n){for(u=o-1;u>=0;--u)if(!M()){this.updateRangeFromParsed(d,t,g,c);break}}return d}getAllParsedValues(t){const e=this._cachedMeta._parsed,a=[];let s,n,o;for(s=0,n=e.length;s<n;++s)o=e[s][t.axis],rt(o)&&a.push(o);return a}getMaxOverflow(){return!1}getLabelAndValue(t){const e=this._cachedMeta,a=e.iScale,s=e.vScale,n=this.getParsed(t);return{label:a?""+a.getLabelForValue(n[a.axis]):"",value:s?""+s.getLabelForValue(n[s.axis]):""}}_update(t){const e=this._cachedMeta;this.update(t||"default"),e._clip=YH(B(this.options.clip,jH(e.xScale,e.yScale,this.getMaxOverflow())))}update(t){}draw(){const t=this._ctx,e=this.chart,a=this._cachedMeta,s=a.data||[],n=e.chartArea,o=[],r=this._drawStart||0,c=this._drawCount||s.length-r,d=this.options.drawActiveElementsOnTop;let l;for(a.dataset&&a.dataset.draw(t,n,r,c),l=r;l<r+c;++l){const p=s[l];p.hidden||(p.active&&d?o.push(p):p.draw(t,n))}for(l=0;l<o.length;++l)o[l].draw(t,n)}getStyle(t,e){const a=e?"active":"default";return t===void 0&&this._cachedMeta.dataset?this.resolveDatasetElementOptions(a):this.resolveDataElementOptions(t||0,a)}getContext(t,e,a){const s=this.getDataset();let n;if(t>=0&&t<this._cachedMeta.data.length){const o=this._cachedMeta.data[t];n=o.$context||(o.$context=tV(this.getContext(),t,o)),n.parsed=this.getParsed(t),n.raw=s.data[t],n.index=n.dataIndex=t}else n=this.$context||(this.$context=QH(this.chart.getContext(),this.index)),n.dataset=s,n.index=n.datasetIndex=this.index;return n.active=!!e,n.mode=a,n}resolveDatasetElementOptions(t){return this._resolveElementOptions(this.datasetElementType.id,t)}resolveDataElementOptions(t,e){return this._resolveElementOptions(this.dataElementType.id,e,t)}_resolveElementOptions(t,e="default",a){const s=e==="active",n=this._cachedDataOpts,o=t+"-"+e,r=n[o],c=this.enableOptionSharing&&x1(a);if(r)return Ah(r,c);const d=this.chart.config,l=d.datasetElementScopeKeys(this._type,t),p=s?[`${t}Hover`,"hover",t,""]:[t,""],u=d.getOptionScopes(this.getDataset(),l),g=Object.keys(et.elements[t]),M=()=>this.getContext(a,s,e),f=d.resolveNamedOptions(u,g,M,p);return f.$shared&&(f.$shared=c,n[o]=Object.freeze(Ah(f,c))),f}_resolveAnimations(t,e,a){const s=this.chart,n=this._cachedDataOpts,o=`animation-${e}`,r=n[o];if(r)return r;let c;if(s.options.animation!==!1){const l=this.chart.config,p=l.datasetAnimationScopeKeys(this._type,e),u=l.getOptionScopes(this.getDataset(),p);c=l.createResolver(u,this.getContext(t,a,e))}const d=new td(s,c&&c.animations);return c&&c._cacheable&&(n[o]=Object.freeze(d)),d}getSharedOptions(t){if(t.$shared)return this._sharedOptions||(this._sharedOptions=Object.assign({},t))}includeOptions(t,e){return!e||Gi(t)||this.chart._animationsDisabled}_getSharedOptions(t,e){const a=this.resolveDataElementOptions(t,e),s=this._sharedOptions,n=this.getSharedOptions(a),o=this.includeOptions(e,n)||n!==s;return this.updateSharedOptions(n,e,a),{sharedOptions:n,includeOptions:o}}updateElement(t,e,a,s){Gi(s)?Object.assign(t,a):this._resolveAnimations(e,s).update(t,a)}updateSharedOptions(t,e,a){t&&!Gi(e)&&this._resolveAnimations(void 0,e).update(t,a)}_setStyle(t,e,a,s){t.active=s;const n=this.getStyle(e,s);this._resolveAnimations(e,a,s).update(t,{options:!s&&this.getSharedOptions(n)||n})}removeHoverStyle(t,e,a){this._setStyle(t,a,"active",!1)}setHoverStyle(t,e,a){this._setStyle(t,a,"active",!0)}_removeDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!1)}_setDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!0)}_resyncElements(t){const e=this._data,a=this._cachedMeta.data;for(const[r,c,d]of this._syncList)this[r](c,d);this._syncList=[];const s=a.length,n=e.length,o=Math.min(n,s);o&&this.parse(0,o),n>s?this._insertElements(s,n-s,t):n<s&&this._removeElements(n,s-n)}_insertElements(t,e,a=!0){const s=this._cachedMeta,n=s.data,o=t+e;let r;const c=d=>{for(d.length+=e,r=d.length-1;r>=o;r--)d[r]=d[r-e]};for(c(n),r=t;r<o;++r)n[r]=new this.dataElementType;this._parsing&&c(s._parsed),this.parse(t,e),a&&this.updateElements(n,t,e,"reset")}updateElements(t,e,a,s){}_removeElements(t,e){const a=this._cachedMeta;if(this._parsing){const s=a._parsed.splice(t,e);a._stacked&&Ia(a,s)}a.data.splice(t,e)}_sync(t){if(this._parsing)this._syncList.push(t);else{const[e,a,s]=t;this[e](a,s)}this.chart._dataChanges.push([this.index,...t])}_onDataPush(){const t=arguments.length;this._sync(["_insertElements",this.getDataset().data.length-t,t])}_onDataPop(){this._sync(["_removeElements",this._cachedMeta.data.length-1,1])}_onDataShift(){this._sync(["_removeElements",0,1])}_onDataSplice(t,e){e&&this._sync(["_removeElements",t,e]);const a=arguments.length-2;a&&this._sync(["_insertElements",t,a])}_onDataUnshift(){this._sync(["_insertElements",0,arguments.length])}}H(ee,"defaults",{}),H(ee,"datasetElementType",null),H(ee,"dataElementType",null);function aV(i,t){if(!i._cache.$bar){const e=i.getMatchingVisibleMetas(t);let a=[];for(let s=0,n=e.length;s<n;s++)a=a.concat(e[s].controller.getAllParsedValues(i));i._cache.$bar=Dc(a.sort((s,n)=>s-n))}return i._cache.$bar}function iV(i){const t=i.iScale,e=aV(t,i.type);let a=t._length,s,n,o,r;const c=()=>{o===32767||o===-32768||(x1(r)&&(a=Math.min(a,Math.abs(o-r)||a)),r=o)};for(s=0,n=e.length;s<n;++s)o=t.getPixelForValue(e[s]),c();for(r=void 0,s=0,n=t.ticks.length;s<n;++s)o=t.getPixelForTick(s),c();return a}function sV(i,t,e,a){const s=e.barThickness;let n,o;return F(s)?(n=t.min*e.categoryPercentage,o=e.barPercentage):(n=s*a,o=1),{chunk:n/a,ratio:o,start:t.pixels[i]-n/2}}function nV(i,t,e,a){const s=t.pixels,n=s[i];let o=i>0?s[i-1]:null,r=i<s.length-1?s[i+1]:null;const c=e.categoryPercentage;o===null&&(o=n-(r===null?t.end-t.start:r-n)),r===null&&(r=n+n-o);const d=n-(n-Math.min(o,r))/2*c;return{chunk:Math.abs(r-o)/2*c/a,ratio:e.barPercentage,start:d}}function oV(i,t,e,a){const s=e.parse(i[0],a),n=e.parse(i[1],a),o=Math.min(s,n),r=Math.max(s,n);let c=o,d=r;Math.abs(o)>Math.abs(r)&&(c=r,d=o),t[e.axis]=d,t._custom={barStart:c,barEnd:d,start:s,end:n,min:o,max:r}}function ad(i,t,e,a){return tt(i)?oV(i,t,e,a):t[e.axis]=e.parse(i,a),t}function Ch(i,t,e,a){const s=i.iScale,n=i.vScale,o=s.getLabels(),r=s===n,c=[];let d,l,p,u;for(d=e,l=e+a;d<l;++d)u=t[d],p={},p[s.axis]=r||s.parse(o[d],d),c.push(ad(u,p,n,d));return c}function Ki(i){return i&&i.barStart!==void 0&&i.barEnd!==void 0}function rV(i,t,e){return i!==0?pe(i):(t.isHorizontal()?1:-1)*(t.min>=e?1:-1)}function hV(i){let t,e,a,s,n;return i.horizontal?(t=i.base>i.x,e="left",a="right"):(t=i.base<i.y,e="bottom",a="top"),t?(s="end",n="start"):(s="start",n="end"),{start:e,end:a,reverse:t,top:s,bottom:n}}function cV(i,t,e,a){let s=t.borderSkipped;const n={};if(!s){i.borderSkipped=n;return}if(s===!0){i.borderSkipped={top:!0,right:!0,bottom:!0,left:!0};return}const{start:o,end:r,reverse:c,top:d,bottom:l}=hV(i);s==="middle"&&e&&(i.enableBorderRadius=!0,(e._top||0)===a?s=d:(e._bottom||0)===a?s=l:(n[Lh(l,o,r,c)]=!0,s=d)),n[Lh(s,o,r,c)]=!0,i.borderSkipped=n}function Lh(i,t,e,a){return a?(i=dV(i,t,e),i=Ph(i,e,t)):i=Ph(i,t,e),i}function dV(i,t,e){return i===t?e:i===e?t:i}function Ph(i,t,e){return i==="start"?t:i==="end"?e:i}function lV(i,{inflateAmount:t},e){i.inflateAmount=t==="auto"?e===1?.33:0:t}class J1 extends ee{parsePrimitiveData(t,e,a,s){return Ch(t,e,a,s)}parseArrayData(t,e,a,s){return Ch(t,e,a,s)}parseObjectData(t,e,a,s){const{iScale:n,vScale:o}=t,{xAxisKey:r="x",yAxisKey:c="y"}=this._parsing,d=n.axis==="x"?r:c,l=o.axis==="x"?r:c,p=[];let u,g,M,f;for(u=a,g=a+s;u<g;++u)f=e[u],M={},M[n.axis]=n.parse(Ue(f,d),u),p.push(ad(Ue(f,l),M,o,u));return p}updateRangeFromParsed(t,e,a,s){super.updateRangeFromParsed(t,e,a,s);const n=a._custom;n&&e===this._cachedMeta.vScale&&(t.min=Math.min(t.min,n.min),t.max=Math.max(t.max,n.max))}getMaxOverflow(){return 0}getLabelAndValue(t){const e=this._cachedMeta,{iScale:a,vScale:s}=e,n=this.getParsed(t),o=n._custom,r=Ki(o)?"["+o.start+", "+o.end+"]":""+s.getLabelForValue(n[s.axis]);return{label:""+a.getLabelForValue(n[a.axis]),value:r}}initialize(){this.enableOptionSharing=!0,super.initialize();const t=this._cachedMeta;t.stack=this.getDataset().stack}update(t){const e=this._cachedMeta;this.updateElements(e.data,0,e.data.length,t)}updateElements(t,e,a,s){const n=s==="reset",{index:o,_cachedMeta:{vScale:r}}=this,c=r.getBasePixel(),d=r.isHorizontal(),l=this._getRuler(),{sharedOptions:p,includeOptions:u}=this._getSharedOptions(e,s);for(let g=e;g<e+a;g++){const M=this.getParsed(g),f=n||F(M[r.axis])?{base:c,head:c}:this._calculateBarValuePixels(g),v=this._calculateBarIndexPixels(g,l),m=(M._stacks||{})[r.axis],y={horizontal:d,base:f.base,enableBorderRadius:!m||Ki(M._custom)||o===m._top||o===m._bottom,x:d?f.head:v.center,y:d?v.center:f.head,height:d?v.size:Math.abs(f.size),width:d?Math.abs(f.size):v.size};u&&(y.options=p||this.resolveDataElementOptions(g,t[g].active?"active":s));const _=y.options||t[g].options;cV(y,_,m,o),lV(y,_,l.ratio),this.updateElement(t[g],g,y,s)}}_getStacks(t,e){const{iScale:a}=this._cachedMeta,s=a.getMatchingVisibleMetas(this._type).filter(l=>l.controller.options.grouped),n=a.options.stacked,o=[],r=this._cachedMeta.controller.getParsed(e),c=r&&r[a.axis],d=l=>{const p=l._parsed.find(g=>g[a.axis]===c),u=p&&p[l.vScale.axis];if(F(u)||isNaN(u))return!0};for(const l of s)if(!(e!==void 0&&d(l))&&((n===!1||o.indexOf(l.stack)===-1||n===void 0&&l.stack===void 0)&&o.push(l.stack),l.index===t))break;return o.length||o.push(void 0),o}_getStackCount(t){return this._getStacks(void 0,t).length}_getAxisCount(){return this._getAxis().length}getFirstScaleIdForIndexAxis(){const t=this.chart.scales,e=this.chart.options.indexAxis;return Object.keys(t).filter(a=>t[a].axis===e).shift()}_getAxis(){const t={},e=this.getFirstScaleIdForIndexAxis();for(const a of this.chart.data.datasets)t[B(this.chart.options.indexAxis==="x"?a.xAxisID:a.yAxisID,e)]=!0;return Object.keys(t)}_getStackIndex(t,e,a){const s=this._getStacks(t,a),n=e!==void 0?s.indexOf(e):-1;return n===-1?s.length-1:n}_getRuler(){const t=this.options,e=this._cachedMeta,a=e.iScale,s=[];let n,o;for(n=0,o=e.data.length;n<o;++n)s.push(a.getPixelForValue(this.getParsed(n)[a.axis],n));const r=t.barThickness;return{min:r||iV(e),pixels:s,start:a._startPixel,end:a._endPixel,stackCount:this._getStackCount(),scale:a,grouped:t.grouped,ratio:r?1:t.categoryPercentage*t.barPercentage}}_calculateBarValuePixels(t){const{_cachedMeta:{vScale:e,_stacked:a,index:s},options:{base:n,minBarLength:o}}=this,r=n||0,c=this.getParsed(t),d=c._custom,l=Ki(d);let p=c[e.axis],u=0,g=a?this.applyStack(e,c,a):p,M,f;g!==p&&(u=g-p,g=p),l&&(p=d.barStart,g=d.barEnd-d.barStart,p!==0&&pe(p)!==pe(d.barEnd)&&(u=0),u+=p);const v=!F(n)&&!l?n:u;let m=e.getPixelForValue(v);if(this.chart.getDataVisibility(t)?M=e.getPixelForValue(u+g):M=m,f=M-m,Math.abs(f)<o){f=rV(f,e,r)*o,p===r&&(m-=f/2);const y=e.getPixelForDecimal(0),_=e.getPixelForDecimal(1),b=Math.min(y,_),x=Math.max(y,_);m=Math.max(Math.min(m,x),b),M=m+f,a&&!l&&(c._stacks[e.axis]._visualValues[s]=e.getValueForPixel(M)-e.getValueForPixel(m))}if(m===e.getPixelForValue(r)){const y=pe(f)*e.getLineWidthForValue(r)/2;m+=y,f-=y}return{size:f,base:m,head:M,center:M+f/2}}_calculateBarIndexPixels(t,e){const a=e.scale,s=this.options,n=s.skipNull,o=B(s.maxBarThickness,1/0);let r,c;const d=this._getAxisCount();if(e.grouped){const l=n?this._getStackCount(t):e.stackCount,p=s.barThickness==="flex"?nV(t,e,s,l*d):sV(t,e,s,l*d),u=this.chart.options.indexAxis==="x"?this.getDataset().xAxisID:this.getDataset().yAxisID,g=this._getAxis().indexOf(B(u,this.getFirstScaleIdForIndexAxis())),M=this._getStackIndex(this.index,this._cachedMeta.stack,n?t:void 0)+g;r=p.start+p.chunk*M+p.chunk/2,c=Math.min(o,p.chunk*p.ratio)}else r=a.getPixelForValue(this.getParsed(t)[a.axis],t),c=Math.min(o,e.min*e.ratio);return{base:r-c/2,head:r+c/2,center:r,size:c}}draw(){const t=this._cachedMeta,e=t.vScale,a=t.data,s=a.length;let n=0;for(;n<s;++n)this.getParsed(n)[e.axis]!==null&&!a[n].hidden&&a[n].draw(this._ctx)}}H(J1,"id","bar"),H(J1,"defaults",{datasetElementType:!1,dataElementType:"bar",categoryPercentage:.8,barPercentage:.9,grouped:!0,animations:{numbers:{type:"number",properties:["x","y","base","width","height"]}}}),H(J1,"overrides",{scales:{_index_:{type:"category",offset:!0,grid:{offset:!0}},_value_:{type:"linear",beginAtZero:!0}}});class Q1 extends ee{initialize(){this.enableOptionSharing=!0,super.initialize()}parsePrimitiveData(t,e,a,s){const n=super.parsePrimitiveData(t,e,a,s);for(let o=0;o<n.length;o++)n[o]._custom=this.resolveDataElementOptions(o+a).radius;return n}parseArrayData(t,e,a,s){const n=super.parseArrayData(t,e,a,s);for(let o=0;o<n.length;o++){const r=e[a+o];n[o]._custom=B(r[2],this.resolveDataElementOptions(o+a).radius)}return n}parseObjectData(t,e,a,s){const n=super.parseObjectData(t,e,a,s);for(let o=0;o<n.length;o++){const r=e[a+o];n[o]._custom=B(r&&r.r&&+r.r,this.resolveDataElementOptions(o+a).radius)}return n}getMaxOverflow(){const t=this._cachedMeta.data;let e=0;for(let a=t.length-1;a>=0;--a)e=Math.max(e,t[a].size(this.resolveDataElementOptions(a))/2);return e>0&&e}getLabelAndValue(t){const e=this._cachedMeta,a=this.chart.data.labels||[],{xScale:s,yScale:n}=e,o=this.getParsed(t),r=s.getLabelForValue(o.x),c=n.getLabelForValue(o.y),d=o._custom;return{label:a[t]||"",value:"("+r+", "+c+(d?", "+d:"")+")"}}update(t){const e=this._cachedMeta.data;this.updateElements(e,0,e.length,t)}updateElements(t,e,a,s){const n=s==="reset",{iScale:o,vScale:r}=this._cachedMeta,{sharedOptions:c,includeOptions:d}=this._getSharedOptions(e,s),l=o.axis,p=r.axis;for(let u=e;u<e+a;u++){const g=t[u],M=!n&&this.getParsed(u),f={},v=f[l]=n?o.getPixelForDecimal(.5):o.getPixelForValue(M[l]),m=f[p]=n?r.getBasePixel():r.getPixelForValue(M[p]);f.skip=isNaN(v)||isNaN(m),d&&(f.options=c||this.resolveDataElementOptions(u,g.active?"active":s),n&&(f.options.radius=0)),this.updateElement(g,u,f,s)}}resolveDataElementOptions(t,e){const a=this.getParsed(t);let s=super.resolveDataElementOptions(t,e);s.$shared&&(s=Object.assign({},s,{$shared:!1}));const n=s.radius;return e!=="active"&&(s.radius=0),s.radius+=B(a&&a._custom,n),s}}H(Q1,"id","bubble"),H(Q1,"defaults",{datasetElementType:!1,dataElementType:"point",animations:{numbers:{type:"number",properties:["x","y","borderWidth","radius"]}}}),H(Q1,"overrides",{scales:{x:{type:"linear"},y:{type:"linear"}}});function pV(i,t,e){let a=1,s=1,n=0,o=0;if(t<J){const r=i,c=r+t,d=Math.cos(r),l=Math.sin(r),p=Math.cos(c),u=Math.sin(c),g=(_,b,x)=>_1(_,r,c,!0)?1:Math.max(b,b*e,x,x*e),M=(_,b,x)=>_1(_,r,c,!0)?-1:Math.min(b,b*e,x,x*e),f=g(0,d,p),v=g(ct,l,u),m=M(Z,d,p),y=M(Z+ct,l,u);a=(f-m)/2,s=(v-y)/2,n=-(f+m)/2,o=-(v+y)/2}return{ratioX:a,ratioY:s,offsetX:n,offsetY:o}}class na extends ee{constructor(t,e){super(t,e),this.enableOptionSharing=!0,this.innerRadius=void 0,this.outerRadius=void 0,this.offsetX=void 0,this.offsetY=void 0}linkScales(){}parse(t,e){const a=this.getDataset().data,s=this._cachedMeta;if(this._parsing===!1)s._parsed=a;else{let n=c=>+a[c];if(z(a[t])){const{key:c="value"}=this._parsing;n=d=>+Ue(a[d],c)}let o,r;for(o=t,r=t+e;o<r;++o)s._parsed[o]=n(o)}}_getRotation(){return te(this.options.rotation-90)}_getCircumference(){return te(this.options.circumference)}_getRotationExtents(){let t=J,e=-J;for(let a=0;a<this.chart.data.datasets.length;++a)if(this.chart.isDatasetVisible(a)&&this.chart.getDatasetMeta(a).type===this._type){const s=this.chart.getDatasetMeta(a).controller,n=s._getRotation(),o=s._getCircumference();t=Math.min(t,n),e=Math.max(e,n+o)}return{rotation:t,circumference:e-t}}update(t){const e=this.chart,{chartArea:a}=e,s=this._cachedMeta,n=s.data,o=this.getMaxBorderWidth()+this.getMaxOffset(n)+this.options.spacing,r=Math.max((Math.min(a.width,a.height)-o)/2,0),c=Math.min(SP(this.options.cutout,r),1),d=this._getRingWeight(this.index),{circumference:l,rotation:p}=this._getRotationExtents(),{ratioX:u,ratioY:g,offsetX:M,offsetY:f}=pV(p,l,c),v=(a.width-o)/u,m=(a.height-o)/g,y=Math.max(Math.min(v,m)/2,0),_=Pc(this.options.radius,y),b=Math.max(_*c,0),x=(_-b)/this._getVisibleDatasetWeightTotal();this.offsetX=M*_,this.offsetY=f*_,s.total=this.calculateTotal(),this.outerRadius=_-x*this._getRingWeightOffset(this.index),this.innerRadius=Math.max(this.outerRadius-x*d,0),this.updateElements(n,0,n.length,t)}_circumference(t,e){const a=this.options,s=this._cachedMeta,n=this._getCircumference();return e&&a.animation.animateRotate||!this.chart.getDataVisibility(t)||s._parsed[t]===null||s.data[t].hidden?0:this.calculateCircumference(s._parsed[t]*n/J)}updateElements(t,e,a,s){const n=s==="reset",o=this.chart,r=o.chartArea,d=o.options.animation,l=(r.left+r.right)/2,p=(r.top+r.bottom)/2,u=n&&d.animateScale,g=u?0:this.innerRadius,M=u?0:this.outerRadius,{sharedOptions:f,includeOptions:v}=this._getSharedOptions(e,s);let m=this._getRotation(),y;for(y=0;y<e;++y)m+=this._circumference(y,n);for(y=e;y<e+a;++y){const _=this._circumference(y,n),b=t[y],x={x:l+this.offsetX,y:p+this.offsetY,startAngle:m,endAngle:m+_,circumference:_,outerRadius:M,innerRadius:g};v&&(x.options=f||this.resolveDataElementOptions(y,b.active?"active":s)),m+=_,this.updateElement(b,y,x,s)}}calculateTotal(){const t=this._cachedMeta,e=t.data;let a=0,s;for(s=0;s<e.length;s++){const n=t._parsed[s];n!==null&&!isNaN(n)&&this.chart.getDataVisibility(s)&&!e[s].hidden&&(a+=Math.abs(n))}return a}calculateCircumference(t){const e=this._cachedMeta.total;return e>0&&!isNaN(t)?J*(Math.abs(t)/e):0}getLabelAndValue(t){const e=this._cachedMeta,a=this.chart,s=a.data.labels||[],n=H1(e._parsed[t],a.options.locale);return{label:s[t]||"",value:n}}getMaxBorderWidth(t){let e=0;const a=this.chart;let s,n,o,r,c;if(!t){for(s=0,n=a.data.datasets.length;s<n;++s)if(a.isDatasetVisible(s)){o=a.getDatasetMeta(s),t=o.data,r=o.controller;break}}if(!t)return 0;for(s=0,n=t.length;s<n;++s)c=r.resolveDataElementOptions(s),c.borderAlign!=="inner"&&(e=Math.max(e,c.borderWidth||0,c.hoverBorderWidth||0));return e}getMaxOffset(t){let e=0;for(let a=0,s=t.length;a<s;++a){const n=this.resolveDataElementOptions(a);e=Math.max(e,n.offset||0,n.hoverOffset||0)}return e}_getRingWeightOffset(t){let e=0;for(let a=0;a<t;++a)this.chart.isDatasetVisible(a)&&(e+=this._getRingWeight(a));return e}_getRingWeight(t){return Math.max(B(this.chart.data.datasets[t].weight,1),0)}_getVisibleDatasetWeightTotal(){return this._getRingWeightOffset(this.chart.data.datasets.length)||1}}H(na,"id","doughnut"),H(na,"defaults",{datasetElementType:!1,dataElementType:"arc",animation:{animateRotate:!0,animateScale:!1},animations:{numbers:{type:"number",properties:["circumference","endAngle","innerRadius","outerRadius","startAngle","x","y","offset","borderWidth","spacing"]}},cutout:"50%",rotation:0,circumference:360,radius:"100%",spacing:0,indexAxis:"r"}),H(na,"descriptors",{_scriptable:t=>t!=="spacing",_indexable:t=>t!=="spacing"&&!t.startsWith("borderDash")&&!t.startsWith("hoverBorderDash")}),H(na,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data,{labels:{pointStyle:a,textAlign:s,color:n,useBorderRadius:o,borderRadius:r}}=t.legend.options;return e.labels.length&&e.datasets.length?e.labels.map((c,d)=>{const p=t.getDatasetMeta(0).controller.getStyle(d);return{text:c,fillStyle:p.backgroundColor,fontColor:n,hidden:!t.getDataVisibility(d),lineDash:p.borderDash,lineDashOffset:p.borderDashOffset,lineJoin:p.borderJoinStyle,lineWidth:p.borderWidth,strokeStyle:p.borderColor,textAlign:s,pointStyle:a,borderRadius:o&&(r||p.borderRadius),index:d}}):[]}},onClick(t,e,a){a.chart.toggleDataVisibility(e.index),a.chart.update()}}}});class ti extends ee{initialize(){this.enableOptionSharing=!0,this.supportsDecimation=!0,super.initialize()}update(t){const e=this._cachedMeta,{dataset:a,data:s=[],_dataset:n}=e,o=this.chart._animationsDisabled;let{start:r,count:c}=Ic(e,s,o);this._drawStart=r,this._drawCount=c,Bc(e)&&(r=0,c=s.length),a._chart=this.chart,a._datasetIndex=this.index,a._decimated=!!n._decimated,a.points=s;const d=this.resolveDatasetElementOptions(t);this.options.showLine||(d.borderWidth=0),d.segment=this.options.segment,this.updateElement(a,void 0,{animated:!o,options:d},t),this.updateElements(s,r,c,t)}updateElements(t,e,a,s){const n=s==="reset",{iScale:o,vScale:r,_stacked:c,_dataset:d}=this._cachedMeta,{sharedOptions:l,includeOptions:p}=this._getSharedOptions(e,s),u=o.axis,g=r.axis,{spanGaps:M,segment:f}=this.options,v=Ea(M)?M:Number.POSITIVE_INFINITY,m=this.chart._animationsDisabled||n||s==="none",y=e+a,_=t.length;let b=e>0&&this.getParsed(e-1);for(let x=0;x<_;++x){const k=t[x],w=m?k:{};if(x<e||x>=y){w.skip=!0;continue}const S=this.getParsed(x),A=F(S[g]),C=w[u]=o.getPixelForValue(S[u],x),L=w[g]=n||A?r.getBasePixel():r.getPixelForValue(c?this.applyStack(r,S,c):S[g],x);w.skip=isNaN(C)||isNaN(L)||A,w.stop=x>0&&Math.abs(S[u]-b[u])>v,f&&(w.parsed=S,w.raw=d.data[x]),p&&(w.options=l||this.resolveDataElementOptions(x,k.active?"active":s)),m||this.updateElement(k,x,w,s),b=S}}getMaxOverflow(){const t=this._cachedMeta,e=t.dataset,a=e.options&&e.options.borderWidth||0,s=t.data||[];if(!s.length)return a;const n=s[0].size(this.resolveDataElementOptions(0)),o=s[s.length-1].size(this.resolveDataElementOptions(s.length-1));return Math.max(a,n,o)/2}draw(){const t=this._cachedMeta;t.dataset.updateControlPoints(this.chart.chartArea,t.iScale.axis),super.draw()}}H(ti,"id","line"),H(ti,"defaults",{datasetElementType:"line",dataElementType:"point",showLine:!0,spanGaps:!1}),H(ti,"overrides",{scales:{_index_:{type:"category"},_value_:{type:"linear"}}});class s1 extends ee{constructor(t,e){super(t,e),this.innerRadius=void 0,this.outerRadius=void 0}getLabelAndValue(t){const e=this._cachedMeta,a=this.chart,s=a.data.labels||[],n=H1(e._parsed[t].r,a.options.locale);return{label:s[t]||"",value:n}}parseObjectData(t,e,a,s){return $c.bind(this)(t,e,a,s)}update(t){const e=this._cachedMeta.data;this._updateRadius(),this.updateElements(e,0,e.length,t)}getMinMax(){const t=this._cachedMeta,e={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY};return t.data.forEach((a,s)=>{const n=this.getParsed(s).r;!isNaN(n)&&this.chart.getDataVisibility(s)&&(n<e.min&&(e.min=n),n>e.max&&(e.max=n))}),e}_updateRadius(){const t=this.chart,e=t.chartArea,a=t.options,s=Math.min(e.right-e.left,e.bottom-e.top),n=Math.max(s/2,0),o=Math.max(a.cutoutPercentage?n/100*a.cutoutPercentage:1,0),r=(n-o)/t.getVisibleDatasetCount();this.outerRadius=n-r*this.index,this.innerRadius=this.outerRadius-r}updateElements(t,e,a,s){const n=s==="reset",o=this.chart,c=o.options.animation,d=this._cachedMeta.rScale,l=d.xCenter,p=d.yCenter,u=d.getIndexAngle(0)-.5*Z;let g=u,M;const f=360/this.countVisibleElements();for(M=0;M<e;++M)g+=this._computeAngle(M,s,f);for(M=e;M<e+a;M++){const v=t[M];let m=g,y=g+this._computeAngle(M,s,f),_=o.getDataVisibility(M)?d.getDistanceFromCenterForValue(this.getParsed(M).r):0;g=y,n&&(c.animateScale&&(_=0),c.animateRotate&&(m=y=u));const b={x:l,y:p,innerRadius:0,outerRadius:_,startAngle:m,endAngle:y,options:this.resolveDataElementOptions(M,v.active?"active":s)};this.updateElement(v,M,b,s)}}countVisibleElements(){const t=this._cachedMeta;let e=0;return t.data.forEach((a,s)=>{!isNaN(this.getParsed(s).r)&&this.chart.getDataVisibility(s)&&e++}),e}_computeAngle(t,e,a){return this.chart.getDataVisibility(t)?te(this.resolveDataElementOptions(t,e).angle||a):0}}H(s1,"id","polarArea"),H(s1,"defaults",{dataElementType:"arc",animation:{animateRotate:!0,animateScale:!0},animations:{numbers:{type:"number",properties:["x","y","startAngle","endAngle","innerRadius","outerRadius"]}},indexAxis:"r",startAngle:0}),H(s1,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data;if(e.labels.length&&e.datasets.length){const{labels:{pointStyle:a,color:s}}=t.legend.options;return e.labels.map((n,o)=>{const c=t.getDatasetMeta(0).controller.getStyle(o);return{text:n,fillStyle:c.backgroundColor,strokeStyle:c.borderColor,fontColor:s,lineWidth:c.borderWidth,pointStyle:a,hidden:!t.getDataVisibility(o),index:o}})}return[]}},onClick(t,e,a){a.chart.toggleDataVisibility(e.index),a.chart.update()}}},scales:{r:{type:"radialLinear",angleLines:{display:!1},beginAtZero:!0,grid:{circular:!0},pointLabels:{display:!1},startAngle:0}}});class ks extends na{}H(ks,"id","pie"),H(ks,"defaults",{cutout:0,rotation:0,circumference:360,radius:"100%"});class ei extends ee{getLabelAndValue(t){const e=this._cachedMeta.vScale,a=this.getParsed(t);return{label:e.getLabels()[t],value:""+e.getLabelForValue(a[e.axis])}}parseObjectData(t,e,a,s){return $c.bind(this)(t,e,a,s)}update(t){const e=this._cachedMeta,a=e.dataset,s=e.data||[],n=e.iScale.getLabels();if(a.points=s,t!=="resize"){const o=this.resolveDatasetElementOptions(t);this.options.showLine||(o.borderWidth=0);const r={_loop:!0,_fullLoop:n.length===s.length,options:o};this.updateElement(a,void 0,r,t)}this.updateElements(s,0,s.length,t)}updateElements(t,e,a,s){const n=this._cachedMeta.rScale,o=s==="reset";for(let r=e;r<e+a;r++){const c=t[r],d=this.resolveDataElementOptions(r,c.active?"active":s),l=n.getPointPositionForValue(r,this.getParsed(r).r),p=o?n.xCenter:l.x,u=o?n.yCenter:l.y,g={x:p,y:u,angle:l.angle,skip:isNaN(p)||isNaN(u),options:d};this.updateElement(c,r,g,s)}}}H(ei,"id","radar"),H(ei,"defaults",{datasetElementType:"line",dataElementType:"point",indexAxis:"r",showLine:!0,elements:{line:{fill:"start"}}}),H(ei,"overrides",{aspectRatio:1,scales:{r:{type:"radialLinear"}}});class ai extends ee{getLabelAndValue(t){const e=this._cachedMeta,a=this.chart.data.labels||[],{xScale:s,yScale:n}=e,o=this.getParsed(t),r=s.getLabelForValue(o.x),c=n.getLabelForValue(o.y);return{label:a[t]||"",value:"("+r+", "+c+")"}}update(t){const e=this._cachedMeta,{data:a=[]}=e,s=this.chart._animationsDisabled;let{start:n,count:o}=Ic(e,a,s);if(this._drawStart=n,this._drawCount=o,Bc(e)&&(n=0,o=a.length),this.options.showLine){this.datasetElementType||this.addElements();const{dataset:r,_dataset:c}=e;r._chart=this.chart,r._datasetIndex=this.index,r._decimated=!!c._decimated,r.points=a;const d=this.resolveDatasetElementOptions(t);d.segment=this.options.segment,this.updateElement(r,void 0,{animated:!s,options:d},t)}else this.datasetElementType&&(delete e.dataset,this.datasetElementType=!1);this.updateElements(a,n,o,t)}addElements(){const{showLine:t}=this.options;!this.datasetElementType&&t&&(this.datasetElementType=this.chart.registry.getElement("line")),super.addElements()}updateElements(t,e,a,s){const n=s==="reset",{iScale:o,vScale:r,_stacked:c,_dataset:d}=this._cachedMeta,l=this.resolveDataElementOptions(e,s),p=this.getSharedOptions(l),u=this.includeOptions(s,p),g=o.axis,M=r.axis,{spanGaps:f,segment:v}=this.options,m=Ea(f)?f:Number.POSITIVE_INFINITY,y=this.chart._animationsDisabled||n||s==="none";let _=e>0&&this.getParsed(e-1);for(let b=e;b<e+a;++b){const x=t[b],k=this.getParsed(b),w=y?x:{},S=F(k[M]),A=w[g]=o.getPixelForValue(k[g],b),C=w[M]=n||S?r.getBasePixel():r.getPixelForValue(c?this.applyStack(r,k,c):k[M],b);w.skip=isNaN(A)||isNaN(C)||S,w.stop=b>0&&Math.abs(k[g]-_[g])>m,v&&(w.parsed=k,w.raw=d.data[b]),u&&(w.options=p||this.resolveDataElementOptions(b,x.active?"active":s)),y||this.updateElement(x,b,w,s),_=k}this.updateSharedOptions(p,s,l)}getMaxOverflow(){const t=this._cachedMeta,e=t.data||[];if(!this.options.showLine){let r=0;for(let c=e.length-1;c>=0;--c)r=Math.max(r,e[c].size(this.resolveDataElementOptions(c))/2);return r>0&&r}const a=t.dataset,s=a.options&&a.options.borderWidth||0;if(!e.length)return s;const n=e[0].size(this.resolveDataElementOptions(0)),o=e[e.length-1].size(this.resolveDataElementOptions(e.length-1));return Math.max(s,n,o)/2}}H(ai,"id","scatter"),H(ai,"defaults",{datasetElementType:!1,dataElementType:"point",showLine:!1,fill:!1}),H(ai,"overrides",{interaction:{mode:"point"},scales:{x:{type:"linear"},y:{type:"linear"}}});var uV=Object.freeze({__proto__:null,BarController:J1,BubbleController:Q1,DoughnutController:na,LineController:ti,PieController:ks,PolarAreaController:s1,RadarController:ei,ScatterController:ai});function Qe(){throw new Error("This method is not implemented: Check that a complete date adapter is provided.")}class yn{constructor(t){H(this,"options");this.options=t||{}}static override(t){Object.assign(yn.prototype,t)}init(){}formats(){return Qe()}parse(){return Qe()}format(){return Qe()}add(){return Qe()}diff(){return Qe()}startOf(){return Qe()}endOf(){return Qe()}}var gV={_date:yn};function fV(i,t,e,a){const{controller:s,data:n,_sorted:o}=i,r=s._cachedMeta.iScale,c=i.dataset&&i.dataset.options?i.dataset.options.spanGaps:null;if(r&&t===r.axis&&t!=="r"&&o&&n.length){const d=r._reversePixels?IP:Se;if(a){if(s._sharedOptions){const l=n[0],p=typeof l.getRange=="function"&&l.getRange(t);if(p){const u=d(n,t,e-p),g=d(n,t,e+p);return{lo:u.lo,hi:g.hi}}}}else{const l=d(n,t,e);if(c){const{vScale:p}=s._cachedMeta,{_parsed:u}=i,g=u.slice(0,l.lo+1).reverse().findIndex(f=>!F(f[p.axis]));l.lo-=Math.max(0,g);const M=u.slice(l.hi).findIndex(f=>!F(f[p.axis]));l.hi+=Math.max(0,M)}return l}}return{lo:0,hi:n.length-1}}function Ti(i,t,e,a,s){const n=i.getSortedVisibleDatasetMetas(),o=e[t];for(let r=0,c=n.length;r<c;++r){const{index:d,data:l}=n[r],{lo:p,hi:u}=fV(n[r],t,o,s);for(let g=p;g<=u;++g){const M=l[g];M.skip||a(M,d,g)}}}function MV(i){const t=i.indexOf("x")!==-1,e=i.indexOf("y")!==-1;return function(a,s){const n=t?Math.abs(a.x-s.x):0,o=e?Math.abs(a.y-s.y):0;return Math.sqrt(Math.pow(n,2)+Math.pow(o,2))}}function Ji(i,t,e,a,s){const n=[];return!s&&!i.isPointInArea(t)||Ti(i,e,t,function(r,c,d){!s&&!ke(r,i.chartArea,0)||r.inRange(t.x,t.y,a)&&n.push({element:r,datasetIndex:c,index:d})},!0),n}function vV(i,t,e,a){let s=[];function n(o,r,c){const{startAngle:d,endAngle:l}=o.getProps(["startAngle","endAngle"],a),{angle:p}=Tc(o,{x:t.x,y:t.y});_1(p,d,l)&&s.push({element:o,datasetIndex:r,index:c})}return Ti(i,e,t,n),s}function mV(i,t,e,a,s,n){let o=[];const r=MV(e);let c=Number.POSITIVE_INFINITY;function d(l,p,u){const g=l.inRange(t.x,t.y,s);if(a&&!g)return;const M=l.getCenterPoint(s);if(!(!!n||i.isPointInArea(M))&&!g)return;const v=r(t,M);v<c?(o=[{element:l,datasetIndex:p,index:u}],c=v):v===c&&o.push({element:l,datasetIndex:p,index:u})}return Ti(i,e,t,d),o}function Qi(i,t,e,a,s,n){return!n&&!i.isPointInArea(t)?[]:e==="r"&&!a?vV(i,t,e,s):mV(i,t,e,a,s,n)}function Hh(i,t,e,a,s){const n=[],o=e==="x"?"inXRange":"inYRange";let r=!1;return Ti(i,e,t,(c,d,l)=>{c[o]&&c[o](t[e],s)&&(n.push({element:c,datasetIndex:d,index:l}),r=r||c.inRange(t.x,t.y,s))}),a&&!r?[]:n}var yV={modes:{index(i,t,e,a){const s=aa(t,i),n=e.axis||"x",o=e.includeInvisible||!1,r=e.intersect?Ji(i,s,n,a,o):Qi(i,s,n,!1,a,o),c=[];return r.length?(i.getSortedVisibleDatasetMetas().forEach(d=>{const l=r[0].index,p=d.data[l];p&&!p.skip&&c.push({element:p,datasetIndex:d.index,index:l})}),c):[]},dataset(i,t,e,a){const s=aa(t,i),n=e.axis||"xy",o=e.includeInvisible||!1;let r=e.intersect?Ji(i,s,n,a,o):Qi(i,s,n,!1,a,o);if(r.length>0){const c=r[0].datasetIndex,d=i.getDatasetMeta(c).data;r=[];for(let l=0;l<d.length;++l)r.push({element:d[l],datasetIndex:c,index:l})}return r},point(i,t,e,a){const s=aa(t,i),n=e.axis||"xy",o=e.includeInvisible||!1;return Ji(i,s,n,a,o)},nearest(i,t,e,a){const s=aa(t,i),n=e.axis||"xy",o=e.includeInvisible||!1;return Qi(i,s,n,e.intersect,a,o)},x(i,t,e,a){const s=aa(t,i);return Hh(i,s,"x",e.intersect,a)},y(i,t,e,a){const s=aa(t,i);return Hh(i,s,"y",e.intersect,a)}}};const id=["left","top","right","bottom"];function Ba(i,t){return i.filter(e=>e.pos===t)}function Vh(i,t){return i.filter(e=>id.indexOf(e.pos)===-1&&e.box.axis===t)}function Fa(i,t){return i.sort((e,a)=>{const s=t?a:e,n=t?e:a;return s.weight===n.weight?s.index-n.index:s.weight-n.weight})}function xV(i){const t=[];let e,a,s,n,o,r;for(e=0,a=(i||[]).length;e<a;++e)s=i[e],{position:n,options:{stack:o,stackWeight:r=1}}=s,t.push({index:e,box:s,pos:n,horizontal:s.isHorizontal(),weight:s.weight,stack:o&&n+o,stackWeight:r});return t}function _V(i){const t={};for(const e of i){const{stack:a,pos:s,stackWeight:n}=e;if(!a||!id.includes(s))continue;const o=t[a]||(t[a]={count:0,placed:0,weight:0,size:0});o.count++,o.weight+=n}return t}function bV(i,t){const e=_V(i),{vBoxMaxWidth:a,hBoxMaxHeight:s}=t;let n,o,r;for(n=0,o=i.length;n<o;++n){r=i[n];const{fullSize:c}=r.box,d=e[r.stack],l=d&&r.stackWeight/d.weight;r.horizontal?(r.width=l?l*a:c&&t.availableWidth,r.height=s):(r.width=a,r.height=l?l*s:c&&t.availableHeight)}return e}function wV(i){const t=xV(i),e=Fa(t.filter(d=>d.box.fullSize),!0),a=Fa(Ba(t,"left"),!0),s=Fa(Ba(t,"right")),n=Fa(Ba(t,"top"),!0),o=Fa(Ba(t,"bottom")),r=Vh(t,"x"),c=Vh(t,"y");return{fullSize:e,leftAndTop:a.concat(n),rightAndBottom:s.concat(c).concat(o).concat(r),chartArea:Ba(t,"chartArea"),vertical:a.concat(s).concat(c),horizontal:n.concat(o).concat(r)}}function Th(i,t,e,a){return Math.max(i[e],t[e])+Math.max(i[a],t[a])}function sd(i,t){i.top=Math.max(i.top,t.top),i.left=Math.max(i.left,t.left),i.bottom=Math.max(i.bottom,t.bottom),i.right=Math.max(i.right,t.right)}function SV(i,t,e,a){const{pos:s,box:n}=e,o=i.maxPadding;if(!z(s)){e.size&&(i[s]-=e.size);const p=a[e.stack]||{size:0,count:1};p.size=Math.max(p.size,e.horizontal?n.height:n.width),e.size=p.size/p.count,i[s]+=e.size}n.getPadding&&sd(o,n.getPadding());const r=Math.max(0,t.outerWidth-Th(o,i,"left","right")),c=Math.max(0,t.outerHeight-Th(o,i,"top","bottom")),d=r!==i.w,l=c!==i.h;return i.w=r,i.h=c,e.horizontal?{same:d,other:l}:{same:l,other:d}}function kV(i){const t=i.maxPadding;function e(a){const s=Math.max(t[a]-i[a],0);return i[a]+=s,s}i.y+=e("top"),i.x+=e("left"),e("right"),e("bottom")}function AV(i,t){const e=t.maxPadding;function a(s){const n={left:0,top:0,right:0,bottom:0};return s.forEach(o=>{n[o]=Math.max(t[o],e[o])}),n}return a(i?["left","right"]:["top","bottom"])}function $a(i,t,e,a){const s=[];let n,o,r,c,d,l;for(n=0,o=i.length,d=0;n<o;++n){r=i[n],c=r.box,c.update(r.width||t.w,r.height||t.h,AV(r.horizontal,t));const{same:p,other:u}=SV(t,e,r,a);d|=p&&s.length,l=l||u,c.fullSize||s.push(r)}return d&&$a(s,t,e,a)||l}function z1(i,t,e,a,s){i.top=e,i.left=t,i.right=t+a,i.bottom=e+s,i.width=a,i.height=s}function Eh(i,t,e,a){const s=e.padding;let{x:n,y:o}=t;for(const r of i){const c=r.box,d=a[r.stack]||{placed:0,weight:1},l=r.stackWeight/d.weight||1;if(r.horizontal){const p=t.w*l,u=d.size||c.height;x1(d.start)&&(o=d.start),c.fullSize?z1(c,s.left,o,e.outerWidth-s.right-s.left,u):z1(c,t.left+d.placed,o,p,u),d.start=o,d.placed+=p,o=c.bottom}else{const p=t.h*l,u=d.size||c.width;x1(d.start)&&(n=d.start),c.fullSize?z1(c,n,s.top,u,e.outerHeight-s.bottom-s.top):z1(c,n,t.top+d.placed,u,p),d.start=n,d.placed+=p,n=c.right}}t.x=n,t.y=o}var St={addBox(i,t){i.boxes||(i.boxes=[]),t.fullSize=t.fullSize||!1,t.position=t.position||"top",t.weight=t.weight||0,t._layers=t._layers||function(){return[{z:0,draw(e){t.draw(e)}}]},i.boxes.push(t)},removeBox(i,t){const e=i.boxes?i.boxes.indexOf(t):-1;e!==-1&&i.boxes.splice(e,1)},configure(i,t,e){t.fullSize=e.fullSize,t.position=e.position,t.weight=e.weight},update(i,t,e,a){if(!i)return;const s=At(i.options.layout.padding),n=Math.max(t-s.width,0),o=Math.max(e-s.height,0),r=wV(i.boxes),c=r.vertical,d=r.horizontal;U(i.boxes,f=>{typeof f.beforeLayout=="function"&&f.beforeLayout()});const l=c.reduce((f,v)=>v.box.options&&v.box.options.display===!1?f:f+1,0)||1,p=Object.freeze({outerWidth:t,outerHeight:e,padding:s,availableWidth:n,availableHeight:o,vBoxMaxWidth:n/2/l,hBoxMaxHeight:o/2}),u=Object.assign({},s);sd(u,At(a));const g=Object.assign({maxPadding:u,w:n,h:o,x:s.left,y:s.top},s),M=bV(c.concat(d),p);$a(r.fullSize,g,p,M),$a(c,g,p,M),$a(d,g,p,M)&&$a(c,g,p,M),kV(g),Eh(r.leftAndTop,g,p,M),g.x+=g.w,g.y+=g.h,Eh(r.rightAndBottom,g,p,M),i.chartArea={left:g.left,top:g.top,right:g.left+g.w,bottom:g.top+g.h,height:g.h,width:g.w},U(r.chartArea,f=>{const v=f.box;Object.assign(v,i.chartArea),v.update(g.w,g.h,{left:0,top:0,right:0,bottom:0})})}};class nd{acquireContext(t,e){}releaseContext(t){return!1}addEventListener(t,e,a){}removeEventListener(t,e,a){}getDevicePixelRatio(){return 1}getMaximumSize(t,e,a,s){return e=Math.max(0,e||t.width),a=a||t.height,{width:e,height:Math.max(0,s?Math.floor(e/s):a)}}isAttached(t){return!0}updateConfig(t){}}class CV extends nd{acquireContext(t){return t&&t.getContext&&t.getContext("2d")||null}updateConfig(t){t.options.animation=!1}}const ii="$chartjs",LV={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",pointerenter:"mouseenter",pointerdown:"mousedown",pointermove:"mousemove",pointerup:"mouseup",pointerleave:"mouseout",pointerout:"mouseout"},Dh=i=>i===null||i==="";function PV(i,t){const e=i.style,a=i.getAttribute("height"),s=i.getAttribute("width");if(i[ii]={initial:{height:a,width:s,style:{display:e.display,height:e.height,width:e.width}}},e.display=e.display||"block",e.boxSizing=e.boxSizing||"border-box",Dh(s)){const n=vh(i,"width");n!==void 0&&(i.width=n)}if(Dh(a))if(i.style.height==="")i.height=i.width/(t||2);else{const n=vh(i,"height");n!==void 0&&(i.height=n)}return i}const od=HH?{passive:!0}:!1;function HV(i,t,e){i&&i.addEventListener(t,e,od)}function VV(i,t,e){i&&i.canvas&&i.canvas.removeEventListener(t,e,od)}function TV(i,t){const e=LV[i.type]||i.type,{x:a,y:s}=aa(i,t);return{type:e,chart:t,native:i,x:a!==void 0?a:null,y:s!==void 0?s:null}}function bi(i,t){for(const e of i)if(e===t||e.contains(t))return!0}function EV(i,t,e){const a=i.canvas,s=new MutationObserver(n=>{let o=!1;for(const r of n)o=o||bi(r.addedNodes,a),o=o&&!bi(r.removedNodes,a);o&&e()});return s.observe(document,{childList:!0,subtree:!0}),s}function DV(i,t,e){const a=i.canvas,s=new MutationObserver(n=>{let o=!1;for(const r of n)o=o||bi(r.removedNodes,a),o=o&&!bi(r.addedNodes,a);o&&e()});return s.observe(document,{childList:!0,subtree:!0}),s}const w1=new Map;let Oh=0;function rd(){const i=window.devicePixelRatio;i!==Oh&&(Oh=i,w1.forEach((t,e)=>{e.currentDevicePixelRatio!==i&&t()}))}function OV(i,t){w1.size||window.addEventListener("resize",rd),w1.set(i,t)}function RV(i){w1.delete(i),w1.size||window.removeEventListener("resize",rd)}function IV(i,t,e){const a=i.canvas,s=a&&mn(a);if(!s)return;const n=Rc((r,c)=>{const d=s.clientWidth;e(r,c),d<s.clientWidth&&e()},window),o=new ResizeObserver(r=>{const c=r[0],d=c.contentRect.width,l=c.contentRect.height;d===0&&l===0||n(d,l)});return o.observe(s),OV(i,n),o}function ts(i,t,e){e&&e.disconnect(),t==="resize"&&RV(i)}function BV(i,t,e){const a=i.canvas,s=Rc(n=>{i.ctx!==null&&e(TV(n,i))},i);return HV(a,t,s),s}class FV extends nd{acquireContext(t,e){const a=t&&t.getContext&&t.getContext("2d");return a&&a.canvas===t?(PV(t,e),a):null}releaseContext(t){const e=t.canvas;if(!e[ii])return!1;const a=e[ii].initial;["height","width"].forEach(n=>{const o=a[n];F(o)?e.removeAttribute(n):e.setAttribute(n,o)});const s=a.style||{};return Object.keys(s).forEach(n=>{e.style[n]=s[n]}),e.width=e.width,delete e[ii],!0}addEventListener(t,e,a){this.removeEventListener(t,e);const s=t.$proxies||(t.$proxies={}),o={attach:EV,detach:DV,resize:IV}[e]||BV;s[e]=o(t,e,a)}removeEventListener(t,e){const a=t.$proxies||(t.$proxies={}),s=a[e];if(!s)return;({attach:ts,detach:ts,resize:ts}[e]||VV)(t,e,s),a[e]=void 0}getDevicePixelRatio(){return window.devicePixelRatio}getMaximumSize(t,e,a,s){return PH(t,e,a,s)}isAttached(t){const e=t&&mn(t);return!!(e&&e.isConnected)}}function zV(i){return!vn()||typeof OffscreenCanvas<"u"&&i instanceof OffscreenCanvas?CV:FV}class ae{constructor(){H(this,"x");H(this,"y");H(this,"active",!1);H(this,"options");H(this,"$animations")}tooltipPosition(t){const{x:e,y:a}=this.getProps(["x","y"],t);return{x:e,y:a}}hasValue(){return Ea(this.x)&&Ea(this.y)}getProps(t,e){const a=this.$animations;if(!e||!a)return this;const s={};return t.forEach(n=>{s[n]=a[n]&&a[n].active()?a[n]._to:this[n]}),s}}H(ae,"defaults",{}),H(ae,"defaultRoutes");function NV(i,t){const e=i.options.ticks,a=ZV(i),s=Math.min(e.maxTicksLimit||a,a),n=e.major.enabled?UV(t):[],o=n.length,r=n[0],c=n[o-1],d=[];if(o>s)return qV(t,d,n,o/s),d;const l=WV(n,t,s);if(o>0){let p,u;const g=o>1?Math.round((c-r)/(o-1)):null;for(N1(t,d,l,F(g)?0:r-g,r),p=0,u=o-1;p<u;p++)N1(t,d,l,n[p],n[p+1]);return N1(t,d,l,c,F(g)?t.length:c+g),d}return N1(t,d,l),d}function ZV(i){const t=i.options.offset,e=i._tickSize(),a=i._length/e+(t?0:1),s=i._maxLength/e;return Math.floor(Math.min(a,s))}function WV(i,t,e){const a=$V(i),s=t.length/e;if(!a)return Math.max(s,1);const n=TP(a);for(let o=0,r=n.length-1;o<r;o++){const c=n[o];if(c>s)return c}return Math.max(s,1)}function UV(i){const t=[];let e,a;for(e=0,a=i.length;e<a;e++)i[e].major&&t.push(e);return t}function qV(i,t,e,a){let s=0,n=e[0],o;for(a=Math.ceil(a),o=0;o<i.length;o++)o===n&&(t.push(i[o]),s++,n=e[s*a])}function N1(i,t,e,a,s){const n=B(a,0),o=Math.min(B(s,i.length),i.length);let r=0,c,d,l;for(e=Math.ceil(e),s&&(c=s-a,e=c/Math.floor(c/e)),l=n;l<0;)r++,l=Math.round(n+r*e);for(d=Math.max(n,0);d<o;d++)d===l&&(t.push(i[d]),r++,l=Math.round(n+r*e))}function $V(i){const t=i.length;let e,a;if(t<2)return!1;for(a=i[0],e=1;e<t;++e)if(i[e]-i[e-1]!==a)return!1;return a}const jV=i=>i==="left"?"right":i==="right"?"left":i,Rh=(i,t,e)=>t==="top"||t==="left"?i[t]+e:i[t]-e,Ih=(i,t)=>Math.min(t||i,i);function Bh(i,t){const e=[],a=i.length/t,s=i.length;let n=0;for(;n<s;n+=a)e.push(i[Math.floor(n)]);return e}function YV(i,t,e){const a=i.ticks.length,s=Math.min(t,a-1),n=i._startPixel,o=i._endPixel,r=1e-6;let c=i.getPixelForTick(s),d;if(!(e&&(a===1?d=Math.max(c-n,o-c):t===0?d=(i.getPixelForTick(1)-c)/2:d=(c-i.getPixelForTick(s-1))/2,c+=s<t?d:-d,c<n-r||c>o+r)))return c}function XV(i,t){U(i,e=>{const a=e.gc,s=a.length/2;let n;if(s>t){for(n=0;n<s;++n)delete e.data[a[n]];a.splice(0,s)}})}function za(i){return i.drawTicks?i.tickLength:0}function Fh(i,t){if(!i.display)return 0;const e=gt(i.font,t),a=At(i.padding);return(tt(i.text)?i.text.length:1)*e.lineHeight+a.height}function GV(i,t){return Ye(i,{scale:t,type:"scale"})}function KV(i,t,e){return Ye(i,{tick:e,index:t,type:"tick"})}function JV(i,t,e){let a=ln(i);return(e&&t!=="right"||!e&&t==="right")&&(a=jV(a)),a}function QV(i,t,e,a){const{top:s,left:n,bottom:o,right:r,chart:c}=i,{chartArea:d,scales:l}=c;let p=0,u,g,M;const f=o-s,v=r-n;if(i.isHorizontal()){if(g=xt(a,n,r),z(e)){const m=Object.keys(e)[0],y=e[m];M=l[m].getPixelForValue(y)+f-t}else e==="center"?M=(d.bottom+d.top)/2+f-t:M=Rh(i,e,t);u=r-n}else{if(z(e)){const m=Object.keys(e)[0],y=e[m];g=l[m].getPixelForValue(y)-v+t}else e==="center"?g=(d.left+d.right)/2-v+t:g=Rh(i,e,t);M=xt(a,o,s),p=e==="left"?-ct:ct}return{titleX:g,titleY:M,maxWidth:u,rotation:p}}class va extends ae{constructor(t){super(),this.id=t.id,this.type=t.type,this.options=void 0,this.ctx=t.ctx,this.chart=t.chart,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this._margins={left:0,right:0,top:0,bottom:0},this.maxWidth=void 0,this.maxHeight=void 0,this.paddingTop=void 0,this.paddingBottom=void 0,this.paddingLeft=void 0,this.paddingRight=void 0,this.axis=void 0,this.labelRotation=void 0,this.min=void 0,this.max=void 0,this._range=void 0,this.ticks=[],this._gridLineItems=null,this._labelItems=null,this._labelSizes=null,this._length=0,this._maxLength=0,this._longestTextCache={},this._startPixel=void 0,this._endPixel=void 0,this._reversePixels=!1,this._userMax=void 0,this._userMin=void 0,this._suggestedMax=void 0,this._suggestedMin=void 0,this._ticksLength=0,this._borderValue=0,this._cache={},this._dataLimitsCached=!1,this.$context=void 0}init(t){this.options=t.setContext(this.getContext()),this.axis=t.axis,this._userMin=this.parse(t.min),this._userMax=this.parse(t.max),this._suggestedMin=this.parse(t.suggestedMin),this._suggestedMax=this.parse(t.suggestedMax)}parse(t,e){return t}getUserBounds(){let{_userMin:t,_userMax:e,_suggestedMin:a,_suggestedMax:s}=this;return t=Bt(t,Number.POSITIVE_INFINITY),e=Bt(e,Number.NEGATIVE_INFINITY),a=Bt(a,Number.POSITIVE_INFINITY),s=Bt(s,Number.NEGATIVE_INFINITY),{min:Bt(t,a),max:Bt(e,s),minDefined:rt(t),maxDefined:rt(e)}}getMinMax(t){let{min:e,max:a,minDefined:s,maxDefined:n}=this.getUserBounds(),o;if(s&&n)return{min:e,max:a};const r=this.getMatchingVisibleMetas();for(let c=0,d=r.length;c<d;++c)o=r[c].controller.getMinMax(this,t),s||(e=Math.min(e,o.min)),n||(a=Math.max(a,o.max));return e=n&&e>a?a:e,a=s&&e>a?e:a,{min:Bt(e,Bt(a,e)),max:Bt(a,Bt(e,a))}}getPadding(){return{left:this.paddingLeft||0,top:this.paddingTop||0,right:this.paddingRight||0,bottom:this.paddingBottom||0}}getTicks(){return this.ticks}getLabels(){const t=this.chart.data;return this.options.labels||(this.isHorizontal()?t.xLabels:t.yLabels)||t.labels||[]}getLabelItems(t=this.chart.chartArea){return this._labelItems||(this._labelItems=this._computeLabelItems(t))}beforeLayout(){this._cache={},this._dataLimitsCached=!1}beforeUpdate(){X(this.options.beforeUpdate,[this])}update(t,e,a){const{beginAtZero:s,grace:n,ticks:o}=this.options,r=o.sampleSize;this.beforeUpdate(),this.maxWidth=t,this.maxHeight=e,this._margins=a=Object.assign({left:0,right:0,top:0,bottom:0},a),this.ticks=null,this._labelSizes=null,this._gridLineItems=null,this._labelItems=null,this.beforeSetDimensions(),this.setDimensions(),this.afterSetDimensions(),this._maxLength=this.isHorizontal()?this.width+a.left+a.right:this.height+a.top+a.bottom,this._dataLimitsCached||(this.beforeDataLimits(),this.determineDataLimits(),this.afterDataLimits(),this._range=rH(this,n,s),this._dataLimitsCached=!0),this.beforeBuildTicks(),this.ticks=this.buildTicks()||[],this.afterBuildTicks();const c=r<this.ticks.length;this._convertTicksToLabels(c?Bh(this.ticks,r):this.ticks),this.configure(),this.beforeCalculateLabelRotation(),this.calculateLabelRotation(),this.afterCalculateLabelRotation(),o.display&&(o.autoSkip||o.source==="auto")&&(this.ticks=NV(this,this.ticks),this._labelSizes=null,this.afterAutoSkip()),c&&this._convertTicksToLabels(this.ticks),this.beforeFit(),this.fit(),this.afterFit(),this.afterUpdate()}configure(){let t=this.options.reverse,e,a;this.isHorizontal()?(e=this.left,a=this.right):(e=this.top,a=this.bottom,t=!t),this._startPixel=e,this._endPixel=a,this._reversePixels=t,this._length=a-e,this._alignToPixels=this.options.alignToPixels}afterUpdate(){X(this.options.afterUpdate,[this])}beforeSetDimensions(){X(this.options.beforeSetDimensions,[this])}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=0,this.right=this.width):(this.height=this.maxHeight,this.top=0,this.bottom=this.height),this.paddingLeft=0,this.paddingTop=0,this.paddingRight=0,this.paddingBottom=0}afterSetDimensions(){X(this.options.afterSetDimensions,[this])}_callHooks(t){this.chart.notifyPlugins(t,this.getContext()),X(this.options[t],[this])}beforeDataLimits(){this._callHooks("beforeDataLimits")}determineDataLimits(){}afterDataLimits(){this._callHooks("afterDataLimits")}beforeBuildTicks(){this._callHooks("beforeBuildTicks")}buildTicks(){return[]}afterBuildTicks(){this._callHooks("afterBuildTicks")}beforeTickToLabelConversion(){X(this.options.beforeTickToLabelConversion,[this])}generateTickLabels(t){const e=this.options.ticks;let a,s,n;for(a=0,s=t.length;a<s;a++)n=t[a],n.label=X(e.callback,[n.value,a,t],this)}afterTickToLabelConversion(){X(this.options.afterTickToLabelConversion,[this])}beforeCalculateLabelRotation(){X(this.options.beforeCalculateLabelRotation,[this])}calculateLabelRotation(){const t=this.options,e=t.ticks,a=Ih(this.ticks.length,t.ticks.maxTicksLimit),s=e.minRotation||0,n=e.maxRotation;let o=s,r,c,d;if(!this._isVisible()||!e.display||s>=n||a<=1||!this.isHorizontal()){this.labelRotation=s;return}const l=this._getLabelSizes(),p=l.widest.width,u=l.highest.height,g=ft(this.chart.width-p,0,this.maxWidth);r=t.offset?this.maxWidth/a:g/(a-1),p+6>r&&(r=g/(a-(t.offset?.5:1)),c=this.maxHeight-za(t.grid)-e.padding-Fh(t.title,this.chart.options.font),d=Math.sqrt(p*p+u*u),o=cn(Math.min(Math.asin(ft((l.highest.height+6)/r,-1,1)),Math.asin(ft(c/d,-1,1))-Math.asin(ft(u/d,-1,1)))),o=Math.max(s,Math.min(n,o))),this.labelRotation=o}afterCalculateLabelRotation(){X(this.options.afterCalculateLabelRotation,[this])}afterAutoSkip(){}beforeFit(){X(this.options.beforeFit,[this])}fit(){const t={width:0,height:0},{chart:e,options:{ticks:a,title:s,grid:n}}=this,o=this._isVisible(),r=this.isHorizontal();if(o){const c=Fh(s,e.options.font);if(r?(t.width=this.maxWidth,t.height=za(n)+c):(t.height=this.maxHeight,t.width=za(n)+c),a.display&&this.ticks.length){const{first:d,last:l,widest:p,highest:u}=this._getLabelSizes(),g=a.padding*2,M=te(this.labelRotation),f=Math.cos(M),v=Math.sin(M);if(r){const m=a.mirror?0:v*p.width+f*u.height;t.height=Math.min(this.maxHeight,t.height+m+g)}else{const m=a.mirror?0:f*p.width+v*u.height;t.width=Math.min(this.maxWidth,t.width+m+g)}this._calculatePadding(d,l,v,f)}}this._handleMargins(),r?(this.width=this._length=e.width-this._margins.left-this._margins.right,this.height=t.height):(this.width=t.width,this.height=this._length=e.height-this._margins.top-this._margins.bottom)}_calculatePadding(t,e,a,s){const{ticks:{align:n,padding:o},position:r}=this.options,c=this.labelRotation!==0,d=r!=="top"&&this.axis==="x";if(this.isHorizontal()){const l=this.getPixelForTick(0)-this.left,p=this.right-this.getPixelForTick(this.ticks.length-1);let u=0,g=0;c?d?(u=s*t.width,g=a*e.height):(u=a*t.height,g=s*e.width):n==="start"?g=e.width:n==="end"?u=t.width:n!=="inner"&&(u=t.width/2,g=e.width/2),this.paddingLeft=Math.max((u-l+o)*this.width/(this.width-l),0),this.paddingRight=Math.max((g-p+o)*this.width/(this.width-p),0)}else{let l=e.height/2,p=t.height/2;n==="start"?(l=0,p=t.height):n==="end"&&(l=e.height,p=0),this.paddingTop=l+o,this.paddingBottom=p+o}}_handleMargins(){this._margins&&(this._margins.left=Math.max(this.paddingLeft,this._margins.left),this._margins.top=Math.max(this.paddingTop,this._margins.top),this._margins.right=Math.max(this.paddingRight,this._margins.right),this._margins.bottom=Math.max(this.paddingBottom,this._margins.bottom))}afterFit(){X(this.options.afterFit,[this])}isHorizontal(){const{axis:t,position:e}=this.options;return e==="top"||e==="bottom"||t==="x"}isFullSize(){return this.options.fullSize}_convertTicksToLabels(t){this.beforeTickToLabelConversion(),this.generateTickLabels(t);let e,a;for(e=0,a=t.length;e<a;e++)F(t[e].label)&&(t.splice(e,1),a--,e--);this.afterTickToLabelConversion()}_getLabelSizes(){let t=this._labelSizes;if(!t){const e=this.options.ticks.sampleSize;let a=this.ticks;e<a.length&&(a=Bh(a,e)),this._labelSizes=t=this._computeLabelSizes(a,a.length,this.options.ticks.maxTicksLimit)}return t}_computeLabelSizes(t,e,a){const{ctx:s,_longestTextCache:n}=this,o=[],r=[],c=Math.floor(e/Ih(e,a));let d=0,l=0,p,u,g,M,f,v,m,y,_,b,x;for(p=0;p<e;p+=c){if(M=t[p].label,f=this._resolveTickFontOptions(p),s.font=v=f.string,m=n[v]=n[v]||{data:{},gc:[]},y=f.lineHeight,_=b=0,!F(M)&&!tt(M))_=xi(s,m.data,m.gc,_,M),b=y;else if(tt(M))for(u=0,g=M.length;u<g;++u)x=M[u],!F(x)&&!tt(x)&&(_=xi(s,m.data,m.gc,_,x),b+=y);o.push(_),r.push(b),d=Math.max(_,d),l=Math.max(b,l)}XV(n,e);const k=o.indexOf(d),w=r.indexOf(l),S=A=>({width:o[A]||0,height:r[A]||0});return{first:S(0),last:S(e-1),widest:S(k),highest:S(w),widths:o,heights:r}}getLabelForValue(t){return t}getPixelForValue(t,e){return NaN}getValueForPixel(t){}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getPixelForDecimal(t){this._reversePixels&&(t=1-t);const e=this._startPixel+t*this._length;return RP(this._alignToPixels?Je(this.chart,e,0):e)}getDecimalForPixel(t){const e=(t-this._startPixel)/this._length;return this._reversePixels?1-e:e}getBasePixel(){return this.getPixelForValue(this.getBaseValue())}getBaseValue(){const{min:t,max:e}=this;return t<0&&e<0?e:t>0&&e>0?t:0}getContext(t){const e=this.ticks||[];if(t>=0&&t<e.length){const a=e[t];return a.$context||(a.$context=KV(this.getContext(),t,a))}return this.$context||(this.$context=GV(this.chart.getContext(),this))}_tickSize(){const t=this.options.ticks,e=te(this.labelRotation),a=Math.abs(Math.cos(e)),s=Math.abs(Math.sin(e)),n=this._getLabelSizes(),o=t.autoSkipPadding||0,r=n?n.widest.width+o:0,c=n?n.highest.height+o:0;return this.isHorizontal()?c*a>r*s?r/a:c/s:c*s<r*a?c/a:r/s}_isVisible(){const t=this.options.display;return t!=="auto"?!!t:this.getMatchingVisibleMetas().length>0}_computeGridLineItems(t){const e=this.axis,a=this.chart,s=this.options,{grid:n,position:o,border:r}=s,c=n.offset,d=this.isHorizontal(),p=this.ticks.length+(c?1:0),u=za(n),g=[],M=r.setContext(this.getContext()),f=M.display?M.width:0,v=f/2,m=function(D){return Je(a,D,f)};let y,_,b,x,k,w,S,A,C,L,P,E;if(o==="top")y=m(this.bottom),w=this.bottom-u,A=y-v,L=m(t.top)+v,E=t.bottom;else if(o==="bottom")y=m(this.top),L=t.top,E=m(t.bottom)-v,w=y+v,A=this.top+u;else if(o==="left")y=m(this.right),k=this.right-u,S=y-v,C=m(t.left)+v,P=t.right;else if(o==="right")y=m(this.left),C=t.left,P=m(t.right)-v,k=y+v,S=this.left+u;else if(e==="x"){if(o==="center")y=m((t.top+t.bottom)/2+.5);else if(z(o)){const D=Object.keys(o)[0],I=o[D];y=m(this.chart.scales[D].getPixelForValue(I))}L=t.top,E=t.bottom,w=y+v,A=w+u}else if(e==="y"){if(o==="center")y=m((t.left+t.right)/2);else if(z(o)){const D=Object.keys(o)[0],I=o[D];y=m(this.chart.scales[D].getPixelForValue(I))}k=y-v,S=k-u,C=t.left,P=t.right}const O=B(s.ticks.maxTicksLimit,p),T=Math.max(1,Math.ceil(p/O));for(_=0;_<p;_+=T){const D=this.getContext(_),I=n.setContext(D),q=r.setContext(D),Y=I.lineWidth,Ct=I.color,It=q.dash||[],vt=q.dashOffset,Jt=I.tickWidth,dt=I.tickColor,yt=I.tickBorderDash||[],ie=I.tickBorderDashOffset;b=YV(this,_,c),b!==void 0&&(x=Je(a,b,Y),d?k=S=C=P=x:w=A=L=E=x,g.push({tx1:k,ty1:w,tx2:S,ty2:A,x1:C,y1:L,x2:P,y2:E,width:Y,color:Ct,borderDash:It,borderDashOffset:vt,tickWidth:Jt,tickColor:dt,tickBorderDash:yt,tickBorderDashOffset:ie}))}return this._ticksLength=p,this._borderValue=y,g}_computeLabelItems(t){const e=this.axis,a=this.options,{position:s,ticks:n}=a,o=this.isHorizontal(),r=this.ticks,{align:c,crossAlign:d,padding:l,mirror:p}=n,u=za(a.grid),g=u+l,M=p?-l:g,f=-te(this.labelRotation),v=[];let m,y,_,b,x,k,w,S,A,C,L,P,E="middle";if(s==="top")k=this.bottom-M,w=this._getXAxisLabelAlignment();else if(s==="bottom")k=this.top+M,w=this._getXAxisLabelAlignment();else if(s==="left"){const T=this._getYAxisLabelAlignment(u);w=T.textAlign,x=T.x}else if(s==="right"){const T=this._getYAxisLabelAlignment(u);w=T.textAlign,x=T.x}else if(e==="x"){if(s==="center")k=(t.top+t.bottom)/2+g;else if(z(s)){const T=Object.keys(s)[0],D=s[T];k=this.chart.scales[T].getPixelForValue(D)+g}w=this._getXAxisLabelAlignment()}else if(e==="y"){if(s==="center")x=(t.left+t.right)/2-g;else if(z(s)){const T=Object.keys(s)[0],D=s[T];x=this.chart.scales[T].getPixelForValue(D)}w=this._getYAxisLabelAlignment(u).textAlign}e==="y"&&(c==="start"?E="top":c==="end"&&(E="bottom"));const O=this._getLabelSizes();for(m=0,y=r.length;m<y;++m){_=r[m],b=_.label;const T=n.setContext(this.getContext(m));S=this.getPixelForTick(m)+n.labelOffset,A=this._resolveTickFontOptions(m),C=A.lineHeight,L=tt(b)?b.length:1;const D=L/2,I=T.color,q=T.textStrokeColor,Y=T.textStrokeWidth;let Ct=w;o?(x=S,w==="inner"&&(m===y-1?Ct=this.options.reverse?"left":"right":m===0?Ct=this.options.reverse?"right":"left":Ct="center"),s==="top"?d==="near"||f!==0?P=-L*C+C/2:d==="center"?P=-O.highest.height/2-D*C+C:P=-O.highest.height+C/2:d==="near"||f!==0?P=C/2:d==="center"?P=O.highest.height/2-D*C:P=O.highest.height-L*C,p&&(P*=-1),f!==0&&!T.showLabelBackdrop&&(x+=C/2*Math.sin(f))):(k=S,P=(1-L)*C/2);let It;if(T.showLabelBackdrop){const vt=At(T.backdropPadding),Jt=O.heights[m],dt=O.widths[m];let yt=P-vt.top,ie=0-vt.left;switch(E){case"middle":yt-=Jt/2;break;case"bottom":yt-=Jt;break}switch(w){case"center":ie-=dt/2;break;case"right":ie-=dt;break;case"inner":m===y-1?ie-=dt:m>0&&(ie-=dt/2);break}It={left:ie,top:yt,width:dt+vt.width,height:Jt+vt.height,color:T.backdropColor}}v.push({label:b,font:A,textOffset:P,options:{rotation:f,color:I,strokeColor:q,strokeWidth:Y,textAlign:Ct,textBaseline:E,translation:[x,k],backdrop:It}})}return v}_getXAxisLabelAlignment(){const{position:t,ticks:e}=this.options;if(-te(this.labelRotation))return t==="top"?"left":"right";let s="center";return e.align==="start"?s="left":e.align==="end"?s="right":e.align==="inner"&&(s="inner"),s}_getYAxisLabelAlignment(t){const{position:e,ticks:{crossAlign:a,mirror:s,padding:n}}=this.options,o=this._getLabelSizes(),r=t+n,c=o.widest.width;let d,l;return e==="left"?s?(l=this.right+n,a==="near"?d="left":a==="center"?(d="center",l+=c/2):(d="right",l+=c)):(l=this.right-r,a==="near"?d="right":a==="center"?(d="center",l-=c/2):(d="left",l=this.left)):e==="right"?s?(l=this.left+n,a==="near"?d="right":a==="center"?(d="center",l-=c/2):(d="left",l-=c)):(l=this.left+r,a==="near"?d="left":a==="center"?(d="center",l+=c/2):(d="right",l=this.right)):d="right",{textAlign:d,x:l}}_computeLabelArea(){if(this.options.ticks.mirror)return;const t=this.chart,e=this.options.position;if(e==="left"||e==="right")return{top:0,left:this.left,bottom:t.height,right:this.right};if(e==="top"||e==="bottom")return{top:this.top,left:0,bottom:this.bottom,right:t.width}}drawBackground(){const{ctx:t,options:{backgroundColor:e},left:a,top:s,width:n,height:o}=this;e&&(t.save(),t.fillStyle=e,t.fillRect(a,s,n,o),t.restore())}getLineWidthForValue(t){const e=this.options.grid;if(!this._isVisible()||!e.display)return 0;const s=this.ticks.findIndex(n=>n.value===t);return s>=0?e.setContext(this.getContext(s)).lineWidth:0}drawGrid(t){const e=this.options.grid,a=this.ctx,s=this._gridLineItems||(this._gridLineItems=this._computeGridLineItems(t));let n,o;const r=(c,d,l)=>{!l.width||!l.color||(a.save(),a.lineWidth=l.width,a.strokeStyle=l.color,a.setLineDash(l.borderDash||[]),a.lineDashOffset=l.borderDashOffset,a.beginPath(),a.moveTo(c.x,c.y),a.lineTo(d.x,d.y),a.stroke(),a.restore())};if(e.display)for(n=0,o=s.length;n<o;++n){const c=s[n];e.drawOnChartArea&&r({x:c.x1,y:c.y1},{x:c.x2,y:c.y2},c),e.drawTicks&&r({x:c.tx1,y:c.ty1},{x:c.tx2,y:c.ty2},{color:c.tickColor,width:c.tickWidth,borderDash:c.tickBorderDash,borderDashOffset:c.tickBorderDashOffset})}}drawBorder(){const{chart:t,ctx:e,options:{border:a,grid:s}}=this,n=a.setContext(this.getContext()),o=a.display?n.width:0;if(!o)return;const r=s.setContext(this.getContext(0)).lineWidth,c=this._borderValue;let d,l,p,u;this.isHorizontal()?(d=Je(t,this.left,o)-o/2,l=Je(t,this.right,r)+r/2,p=u=c):(p=Je(t,this.top,o)-o/2,u=Je(t,this.bottom,r)+r/2,d=l=c),e.save(),e.lineWidth=n.width,e.strokeStyle=n.color,e.beginPath(),e.moveTo(d,p),e.lineTo(l,u),e.stroke(),e.restore()}drawLabels(t){if(!this.options.ticks.display)return;const a=this.ctx,s=this._computeLabelArea();s&&Pi(a,s);const n=this.getLabelItems(t);for(const o of n){const r=o.options,c=o.font,d=o.label,l=o.textOffset;fa(a,d,0,l,c,r)}s&&Hi(a)}drawTitle(){const{ctx:t,options:{position:e,title:a,reverse:s}}=this;if(!a.display)return;const n=gt(a.font),o=At(a.padding),r=a.align;let c=n.lineHeight/2;e==="bottom"||e==="center"||z(e)?(c+=o.bottom,tt(a.text)&&(c+=n.lineHeight*(a.text.length-1))):c+=o.top;const{titleX:d,titleY:l,maxWidth:p,rotation:u}=QV(this,c,e,r);fa(t,a.text,0,0,n,{color:a.color,maxWidth:p,rotation:u,textAlign:JV(r,e,s),textBaseline:"middle",translation:[d,l]})}draw(t){this._isVisible()&&(this.drawBackground(),this.drawGrid(t),this.drawBorder(),this.drawTitle(),this.drawLabels(t))}_layers(){const t=this.options,e=t.ticks&&t.ticks.z||0,a=B(t.grid&&t.grid.z,-1),s=B(t.border&&t.border.z,0);return!this._isVisible()||this.draw!==va.prototype.draw?[{z:e,draw:n=>{this.draw(n)}}]:[{z:a,draw:n=>{this.drawBackground(),this.drawGrid(n),this.drawTitle()}},{z:s,draw:()=>{this.drawBorder()}},{z:e,draw:n=>{this.drawLabels(n)}}]}getMatchingVisibleMetas(t){const e=this.chart.getSortedVisibleDatasetMetas(),a=this.axis+"AxisID",s=[];let n,o;for(n=0,o=e.length;n<o;++n){const r=e[n];r[a]===this.id&&(!t||r.type===t)&&s.push(r)}return s}_resolveTickFontOptions(t){const e=this.options.ticks.setContext(this.getContext(t));return gt(e.font)}_maxDigits(){const t=this._resolveTickFontOptions(0).lineHeight;return(this.isHorizontal()?this.width:this.height)/t}}class Z1{constructor(t,e,a){this.type=t,this.scope=e,this.override=a,this.items=Object.create(null)}isForType(t){return Object.prototype.isPrototypeOf.call(this.type.prototype,t.prototype)}register(t){const e=Object.getPrototypeOf(t);let a;aT(e)&&(a=this.register(e));const s=this.items,n=t.id,o=this.scope+"."+n;if(!n)throw new Error("class does not have id: "+t);return n in s||(s[n]=t,tT(t,o,a),this.override&&et.override(t.id,t.overrides)),o}get(t){return this.items[t]}unregister(t){const e=this.items,a=t.id,s=this.scope;a in e&&delete e[a],s&&a in et[s]&&(delete et[s][a],this.override&&delete ga[a])}}function tT(i,t,e){const a=y1(Object.create(null),[e?et.get(e):{},et.get(t),i.defaults]);et.set(t,a),i.defaultRoutes&&eT(t,i.defaultRoutes),i.descriptors&&et.describe(t,i.descriptors)}function eT(i,t){Object.keys(t).forEach(e=>{const a=e.split("."),s=a.pop(),n=[i].concat(a).join("."),o=t[e].split("."),r=o.pop(),c=o.join(".");et.route(n,s,c,r)})}function aT(i){return"id"in i&&"defaults"in i}class iT{constructor(){this.controllers=new Z1(ee,"datasets",!0),this.elements=new Z1(ae,"elements"),this.plugins=new Z1(Object,"plugins"),this.scales=new Z1(va,"scales"),this._typedRegistries=[this.controllers,this.scales,this.elements]}add(...t){this._each("register",t)}remove(...t){this._each("unregister",t)}addControllers(...t){this._each("register",t,this.controllers)}addElements(...t){this._each("register",t,this.elements)}addPlugins(...t){this._each("register",t,this.plugins)}addScales(...t){this._each("register",t,this.scales)}getController(t){return this._get(t,this.controllers,"controller")}getElement(t){return this._get(t,this.elements,"element")}getPlugin(t){return this._get(t,this.plugins,"plugin")}getScale(t){return this._get(t,this.scales,"scale")}removeControllers(...t){this._each("unregister",t,this.controllers)}removeElements(...t){this._each("unregister",t,this.elements)}removePlugins(...t){this._each("unregister",t,this.plugins)}removeScales(...t){this._each("unregister",t,this.scales)}_each(t,e,a){[...e].forEach(s=>{const n=a||this._getRegistryForType(s);a||n.isForType(s)||n===this.plugins&&s.id?this._exec(t,n,s):U(s,o=>{const r=a||this._getRegistryForType(o);this._exec(t,r,o)})})}_exec(t,e,a){const s=hn(t);X(a["before"+s],[],a),e[t](a),X(a["after"+s],[],a)}_getRegistryForType(t){for(let e=0;e<this._typedRegistries.length;e++){const a=this._typedRegistries[e];if(a.isForType(t))return a}return this.plugins}_get(t,e,a){const s=e.get(t);if(s===void 0)throw new Error('"'+t+'" is not a registered '+a+".");return s}}var ne=new iT;class sT{constructor(){this._init=void 0}notify(t,e,a,s){if(e==="beforeInit"&&(this._init=this._createDescriptors(t,!0),this._notify(this._init,t,"install")),this._init===void 0)return;const n=s?this._descriptors(t).filter(s):this._descriptors(t),o=this._notify(n,t,e,a);return e==="afterDestroy"&&(this._notify(n,t,"stop"),this._notify(this._init,t,"uninstall"),this._init=void 0),o}_notify(t,e,a,s){s=s||{};for(const n of t){const o=n.plugin,r=o[a],c=[e,s,n.options];if(X(r,c,o)===!1&&s.cancelable)return!1}return!0}invalidate(){F(this._cache)||(this._oldCache=this._cache,this._cache=void 0)}_descriptors(t){if(this._cache)return this._cache;const e=this._cache=this._createDescriptors(t);return this._notifyStateChanges(t),e}_createDescriptors(t,e){const a=t&&t.config,s=B(a.options&&a.options.plugins,{}),n=nT(a);return s===!1&&!e?[]:rT(t,n,s,e)}_notifyStateChanges(t){const e=this._oldCache||[],a=this._cache,s=(n,o)=>n.filter(r=>!o.some(c=>r.plugin.id===c.plugin.id));this._notify(s(e,a),t,"stop"),this._notify(s(a,e),t,"start")}}function nT(i){const t={},e=[],a=Object.keys(ne.plugins.items);for(let n=0;n<a.length;n++)e.push(ne.getPlugin(a[n]));const s=i.plugins||[];for(let n=0;n<s.length;n++){const o=s[n];e.indexOf(o)===-1&&(e.push(o),t[o.id]=!0)}return{plugins:e,localIds:t}}function oT(i,t){return!t&&i===!1?null:i===!0?{}:i}function rT(i,{plugins:t,localIds:e},a,s){const n=[],o=i.getContext();for(const r of t){const c=r.id,d=oT(a[c],s);d!==null&&n.push({plugin:r,options:hT(i.config,{plugin:r,local:e[c]},d,o)})}return n}function hT(i,{plugin:t,local:e},a,s){const n=i.pluginScopeKeys(t),o=i.getOptionScopes(a,n);return e&&t.defaults&&o.push(t.defaults),i.createResolver(o,s,[""],{scriptable:!1,indexable:!1,allKeys:!0})}function As(i,t){const e=et.datasets[i]||{};return((t.datasets||{})[i]||{}).indexAxis||t.indexAxis||e.indexAxis||"x"}function cT(i,t){let e=i;return i==="_index_"?e=t:i==="_value_"&&(e=t==="x"?"y":"x"),e}function dT(i,t){return i===t?"_index_":"_value_"}function zh(i){if(i==="x"||i==="y"||i==="r")return i}function lT(i){if(i==="top"||i==="bottom")return"x";if(i==="left"||i==="right")return"y"}function Cs(i,...t){if(zh(i))return i;for(const e of t){const a=e.axis||lT(e.position)||i.length>1&&zh(i[0].toLowerCase());if(a)return a}throw new Error(`Cannot determine type of '${i}' axis. Please provide 'axis' or 'position' option.`)}function Nh(i,t,e){if(e[t+"AxisID"]===i)return{axis:t}}function pT(i,t){if(t.data&&t.data.datasets){const e=t.data.datasets.filter(a=>a.xAxisID===i||a.yAxisID===i);if(e.length)return Nh(i,"x",e[0])||Nh(i,"y",e[0])}return{}}function uT(i,t){const e=ga[i.type]||{scales:{}},a=t.scales||{},s=As(i.type,t),n=Object.create(null);return Object.keys(a).forEach(o=>{const r=a[o];if(!z(r))return console.error(`Invalid scale configuration for scale: ${o}`);if(r._proxy)return console.warn(`Ignoring resolver passed as options for scale: ${o}`);const c=Cs(o,r,pT(o,i),et.scales[r.type]),d=dT(c,s),l=e.scales||{};n[o]=t1(Object.create(null),[{axis:c},r,l[c],l[d]])}),i.data.datasets.forEach(o=>{const r=o.type||i.type,c=o.indexAxis||As(r,t),l=(ga[r]||{}).scales||{};Object.keys(l).forEach(p=>{const u=cT(p,c),g=o[u+"AxisID"]||u;n[g]=n[g]||Object.create(null),t1(n[g],[{axis:u},a[g],l[p]])})}),Object.keys(n).forEach(o=>{const r=n[o];t1(r,[et.scales[r.type],et.scale])}),n}function hd(i){const t=i.options||(i.options={});t.plugins=B(t.plugins,{}),t.scales=uT(i,t)}function cd(i){return i=i||{},i.datasets=i.datasets||[],i.labels=i.labels||[],i}function gT(i){return i=i||{},i.data=cd(i.data),hd(i),i}const Zh=new Map,dd=new Set;function W1(i,t){let e=Zh.get(i);return e||(e=t(),Zh.set(i,e),dd.add(e)),e}const Na=(i,t,e)=>{const a=Ue(t,e);a!==void 0&&i.add(a)};class fT{constructor(t){this._config=gT(t),this._scopeCache=new Map,this._resolverCache=new Map}get platform(){return this._config.platform}get type(){return this._config.type}set type(t){this._config.type=t}get data(){return this._config.data}set data(t){this._config.data=cd(t)}get options(){return this._config.options}set options(t){this._config.options=t}get plugins(){return this._config.plugins}update(){const t=this._config;this.clearCache(),hd(t)}clearCache(){this._scopeCache.clear(),this._resolverCache.clear()}datasetScopeKeys(t){return W1(t,()=>[[`datasets.${t}`,""]])}datasetAnimationScopeKeys(t,e){return W1(`${t}.transition.${e}`,()=>[[`datasets.${t}.transitions.${e}`,`transitions.${e}`],[`datasets.${t}`,""]])}datasetElementScopeKeys(t,e){return W1(`${t}-${e}`,()=>[[`datasets.${t}.elements.${e}`,`datasets.${t}`,`elements.${e}`,""]])}pluginScopeKeys(t){const e=t.id,a=this.type;return W1(`${a}-plugin-${e}`,()=>[[`plugins.${e}`,...t.additionalOptionScopes||[]]])}_cachedScopes(t,e){const a=this._scopeCache;let s=a.get(t);return(!s||e)&&(s=new Map,a.set(t,s)),s}getOptionScopes(t,e,a){const{options:s,type:n}=this,o=this._cachedScopes(t,a),r=o.get(e);if(r)return r;const c=new Set;e.forEach(l=>{t&&(c.add(t),l.forEach(p=>Na(c,t,p))),l.forEach(p=>Na(c,s,p)),l.forEach(p=>Na(c,ga[n]||{},p)),l.forEach(p=>Na(c,et,p)),l.forEach(p=>Na(c,ws,p))});const d=Array.from(c);return d.length===0&&d.push(Object.create(null)),dd.has(e)&&o.set(e,d),d}chartOptionScopes(){const{options:t,type:e}=this;return[t,ga[e]||{},et.datasets[e]||{},{type:e},et,ws]}resolveNamedOptions(t,e,a,s=[""]){const n={$shared:!0},{resolver:o,subPrefixes:r}=Wh(this._resolverCache,t,s);let c=o;if(vT(o,e)){n.$shared=!1,a=qe(a)?a():a;const d=this.createResolver(t,a,r);c=Da(o,a,d)}for(const d of e)n[d]=c[d];return n}createResolver(t,e,a=[""],s){const{resolver:n}=Wh(this._resolverCache,t,a);return z(e)?Da(n,e,void 0,s):n}}function Wh(i,t,e){let a=i.get(t);a||(a=new Map,i.set(t,a));const s=e.join();let n=a.get(s);return n||(n={resolver:gn(t,e),subPrefixes:e.filter(r=>!r.toLowerCase().includes("hover"))},a.set(s,n)),n}const MT=i=>z(i)&&Object.getOwnPropertyNames(i).some(t=>qe(i[t]));function vT(i,t){const{isScriptable:e,isIndexable:a}=Zc(i);for(const s of t){const n=e(s),o=a(s),r=(o||n)&&i[s];if(n&&(qe(r)||MT(r))||o&&tt(r))return!0}return!1}var mT="4.5.1";const yT=["top","bottom","left","right","chartArea"];function Uh(i,t){return i==="top"||i==="bottom"||yT.indexOf(i)===-1&&t==="x"}function qh(i,t){return function(e,a){return e[i]===a[i]?e[t]-a[t]:e[i]-a[i]}}function $h(i){const t=i.chart,e=t.options.animation;t.notifyPlugins("afterRender"),X(e&&e.onComplete,[i],t)}function xT(i){const t=i.chart,e=t.options.animation;X(e&&e.onProgress,[i],t)}function ld(i){return vn()&&typeof i=="string"?i=document.getElementById(i):i&&i.length&&(i=i[0]),i&&i.canvas&&(i=i.canvas),i}const si={},jh=i=>{const t=ld(i);return Object.values(si).filter(e=>e.canvas===t).pop()};function _T(i,t,e){const a=Object.keys(i);for(const s of a){const n=+s;if(n>=t){const o=i[s];delete i[s],(e>0||n>t)&&(i[n+e]=o)}}}function bT(i,t,e,a){return!e||i.type==="mouseout"?null:a?t:i}class be{static register(...t){ne.add(...t),Yh()}static unregister(...t){ne.remove(...t),Yh()}constructor(t,e){const a=this.config=new fT(e),s=ld(t),n=jh(s);if(n)throw new Error("Canvas is already in use. Chart with ID '"+n.id+"' must be destroyed before the canvas with ID '"+n.canvas.id+"' can be reused.");const o=a.createResolver(a.chartOptionScopes(),this.getContext());this.platform=new(a.platform||zV(s)),this.platform.updateConfig(a);const r=this.platform.acquireContext(s,o.aspectRatio),c=r&&r.canvas,d=c&&c.height,l=c&&c.width;if(this.id=wP(),this.ctx=r,this.canvas=c,this.width=l,this.height=d,this._options=o,this._aspectRatio=this.aspectRatio,this._layers=[],this._metasets=[],this._stacks=void 0,this.boxes=[],this.currentDevicePixelRatio=void 0,this.chartArea=void 0,this._active=[],this._lastEvent=void 0,this._listeners={},this._responsiveListeners=void 0,this._sortedMetasets=[],this.scales={},this._plugins=new sT,this.$proxies={},this._hiddenIndices={},this.attached=!1,this._animationsDisabled=void 0,this.$context=void 0,this._doResize=zP(p=>this.update(p),o.resizeDelay||0),this._dataChanges=[],si[this.id]=this,!r||!c){console.error("Failed to create chart: can't acquire context from the given item");return}Me.listen(this,"complete",$h),Me.listen(this,"progress",xT),this._initialize(),this.attached&&this.update()}get aspectRatio(){const{options:{aspectRatio:t,maintainAspectRatio:e},width:a,height:s,_aspectRatio:n}=this;return F(t)?e&&n?n:s?a/s:null:t}get data(){return this.config.data}set data(t){this.config.data=t}get options(){return this._options}set options(t){this.config.options=t}get registry(){return ne}_initialize(){return this.notifyPlugins("beforeInit"),this.options.responsive?this.resize():Mh(this,this.options.devicePixelRatio),this.bindEvents(),this.notifyPlugins("afterInit"),this}clear(){return uh(this.canvas,this.ctx),this}stop(){return Me.stop(this),this}resize(t,e){Me.running(this)?this._resizeBeforeDraw={width:t,height:e}:this._resize(t,e)}_resize(t,e){const a=this.options,s=this.canvas,n=a.maintainAspectRatio&&this.aspectRatio,o=this.platform.getMaximumSize(s,t,e,n),r=a.devicePixelRatio||this.platform.getDevicePixelRatio(),c=this.width?"resize":"attach";this.width=o.width,this.height=o.height,this._aspectRatio=this.aspectRatio,Mh(this,r,!0)&&(this.notifyPlugins("resize",{size:o}),X(a.onResize,[this,o],this),this.attached&&this._doResize(c)&&this.render())}ensureScalesHaveIDs(){const e=this.options.scales||{};U(e,(a,s)=>{a.id=s})}buildOrUpdateScales(){const t=this.options,e=t.scales,a=this.scales,s=Object.keys(a).reduce((o,r)=>(o[r]=!1,o),{});let n=[];e&&(n=n.concat(Object.keys(e).map(o=>{const r=e[o],c=Cs(o,r),d=c==="r",l=c==="x";return{options:r,dposition:d?"chartArea":l?"bottom":"left",dtype:d?"radialLinear":l?"category":"linear"}}))),U(n,o=>{const r=o.options,c=r.id,d=Cs(c,r),l=B(r.type,o.dtype);(r.position===void 0||Uh(r.position,d)!==Uh(o.dposition))&&(r.position=o.dposition),s[c]=!0;let p=null;if(c in a&&a[c].type===l)p=a[c];else{const u=ne.getScale(l);p=new u({id:c,type:l,ctx:this.ctx,chart:this}),a[p.id]=p}p.init(r,t)}),U(s,(o,r)=>{o||delete a[r]}),U(a,o=>{St.configure(this,o,o.options),St.addBox(this,o)})}_updateMetasets(){const t=this._metasets,e=this.data.datasets.length,a=t.length;if(t.sort((s,n)=>s.index-n.index),a>e){for(let s=e;s<a;++s)this._destroyDatasetMeta(s);t.splice(e,a-e)}this._sortedMetasets=t.slice(0).sort(qh("order","index"))}_removeUnreferencedMetasets(){const{_metasets:t,data:{datasets:e}}=this;t.length>e.length&&delete this._stacks,t.forEach((a,s)=>{e.filter(n=>n===a._dataset).length===0&&this._destroyDatasetMeta(s)})}buildOrUpdateControllers(){const t=[],e=this.data.datasets;let a,s;for(this._removeUnreferencedMetasets(),a=0,s=e.length;a<s;a++){const n=e[a];let o=this.getDatasetMeta(a);const r=n.type||this.config.type;if(o.type&&o.type!==r&&(this._destroyDatasetMeta(a),o=this.getDatasetMeta(a)),o.type=r,o.indexAxis=n.indexAxis||As(r,this.options),o.order=n.order||0,o.index=a,o.label=""+n.label,o.visible=this.isDatasetVisible(a),o.controller)o.controller.updateIndex(a),o.controller.linkScales();else{const c=ne.getController(r),{datasetElementType:d,dataElementType:l}=et.datasets[r];Object.assign(c,{dataElementType:ne.getElement(l),datasetElementType:d&&ne.getElement(d)}),o.controller=new c(this,a),t.push(o.controller)}}return this._updateMetasets(),t}_resetElements(){U(this.data.datasets,(t,e)=>{this.getDatasetMeta(e).controller.reset()},this)}reset(){this._resetElements(),this.notifyPlugins("reset")}update(t){const e=this.config;e.update();const a=this._options=e.createResolver(e.chartOptionScopes(),this.getContext()),s=this._animationsDisabled=!a.animation;if(this._updateScales(),this._checkEventBindings(),this._updateHiddenIndices(),this._plugins.invalidate(),this.notifyPlugins("beforeUpdate",{mode:t,cancelable:!0})===!1)return;const n=this.buildOrUpdateControllers();this.notifyPlugins("beforeElementsUpdate");let o=0;for(let d=0,l=this.data.datasets.length;d<l;d++){const{controller:p}=this.getDatasetMeta(d),u=!s&&n.indexOf(p)===-1;p.buildOrUpdateElements(u),o=Math.max(+p.getMaxOverflow(),o)}o=this._minPadding=a.layout.autoPadding?o:0,this._updateLayout(o),s||U(n,d=>{d.reset()}),this._updateDatasets(t),this.notifyPlugins("afterUpdate",{mode:t}),this._layers.sort(qh("z","_idx"));const{_active:r,_lastEvent:c}=this;c?this._eventHandler(c,!0):r.length&&this._updateHoverStyles(r,r,!0),this.render()}_updateScales(){U(this.scales,t=>{St.removeBox(this,t)}),this.ensureScalesHaveIDs(),this.buildOrUpdateScales()}_checkEventBindings(){const t=this.options,e=new Set(Object.keys(this._listeners)),a=new Set(t.events);(!sh(e,a)||!!this._responsiveListeners!==t.responsive)&&(this.unbindEvents(),this.bindEvents())}_updateHiddenIndices(){const{_hiddenIndices:t}=this,e=this._getUniformDataChanges()||[];for(const{method:a,start:s,count:n}of e){const o=a==="_removeElements"?-n:n;_T(t,s,o)}}_getUniformDataChanges(){const t=this._dataChanges;if(!t||!t.length)return;this._dataChanges=[];const e=this.data.datasets.length,a=n=>new Set(t.filter(o=>o[0]===n).map((o,r)=>r+","+o.splice(1).join(","))),s=a(0);for(let n=1;n<e;n++)if(!sh(s,a(n)))return;return Array.from(s).map(n=>n.split(",")).map(n=>({method:n[1],start:+n[2],count:+n[3]}))}_updateLayout(t){if(this.notifyPlugins("beforeLayout",{cancelable:!0})===!1)return;St.update(this,this.width,this.height,t);const e=this.chartArea,a=e.width<=0||e.height<=0;this._layers=[],U(this.boxes,s=>{a&&s.position==="chartArea"||(s.configure&&s.configure(),this._layers.push(...s._layers()))},this),this._layers.forEach((s,n)=>{s._idx=n}),this.notifyPlugins("afterLayout")}_updateDatasets(t){if(this.notifyPlugins("beforeDatasetsUpdate",{mode:t,cancelable:!0})!==!1){for(let e=0,a=this.data.datasets.length;e<a;++e)this.getDatasetMeta(e).controller.configure();for(let e=0,a=this.data.datasets.length;e<a;++e)this._updateDataset(e,qe(t)?t({datasetIndex:e}):t);this.notifyPlugins("afterDatasetsUpdate",{mode:t})}}_updateDataset(t,e){const a=this.getDatasetMeta(t),s={meta:a,index:t,mode:e,cancelable:!0};this.notifyPlugins("beforeDatasetUpdate",s)!==!1&&(a.controller._update(e),s.cancelable=!1,this.notifyPlugins("afterDatasetUpdate",s))}render(){this.notifyPlugins("beforeRender",{cancelable:!0})!==!1&&(Me.has(this)?this.attached&&!Me.running(this)&&Me.start(this):(this.draw(),$h({chart:this})))}draw(){let t;if(this._resizeBeforeDraw){const{width:a,height:s}=this._resizeBeforeDraw;this._resizeBeforeDraw=null,this._resize(a,s)}if(this.clear(),this.width<=0||this.height<=0||this.notifyPlugins("beforeDraw",{cancelable:!0})===!1)return;const e=this._layers;for(t=0;t<e.length&&e[t].z<=0;++t)e[t].draw(this.chartArea);for(this._drawDatasets();t<e.length;++t)e[t].draw(this.chartArea);this.notifyPlugins("afterDraw")}_getSortedDatasetMetas(t){const e=this._sortedMetasets,a=[];let s,n;for(s=0,n=e.length;s<n;++s){const o=e[s];(!t||o.visible)&&a.push(o)}return a}getSortedVisibleDatasetMetas(){return this._getSortedDatasetMetas(!0)}_drawDatasets(){if(this.notifyPlugins("beforeDatasetsDraw",{cancelable:!0})===!1)return;const t=this.getSortedVisibleDatasetMetas();for(let e=t.length-1;e>=0;--e)this._drawDataset(t[e]);this.notifyPlugins("afterDatasetsDraw")}_drawDataset(t){const e=this.ctx,a={meta:t,index:t.index,cancelable:!0},s=Qc(this,t);this.notifyPlugins("beforeDatasetDraw",a)!==!1&&(s&&Pi(e,s),t.controller.draw(),s&&Hi(e),a.cancelable=!1,this.notifyPlugins("afterDatasetDraw",a))}isPointInArea(t){return ke(t,this.chartArea,this._minPadding)}getElementsAtEventForMode(t,e,a,s){const n=yV.modes[e];return typeof n=="function"?n(this,t,a,s):[]}getDatasetMeta(t){const e=this.data.datasets[t],a=this._metasets;let s=a.filter(n=>n&&n._dataset===e).pop();return s||(s={type:null,data:[],dataset:null,controller:null,hidden:null,xAxisID:null,yAxisID:null,order:e&&e.order||0,index:t,_dataset:e,_parsed:[],_sorted:!1},a.push(s)),s}getContext(){return this.$context||(this.$context=Ye(null,{chart:this,type:"chart"}))}getVisibleDatasetCount(){return this.getSortedVisibleDatasetMetas().length}isDatasetVisible(t){const e=this.data.datasets[t];if(!e)return!1;const a=this.getDatasetMeta(t);return typeof a.hidden=="boolean"?!a.hidden:!e.hidden}setDatasetVisibility(t,e){const a=this.getDatasetMeta(t);a.hidden=!e}toggleDataVisibility(t){this._hiddenIndices[t]=!this._hiddenIndices[t]}getDataVisibility(t){return!this._hiddenIndices[t]}_updateVisibility(t,e,a){const s=a?"show":"hide",n=this.getDatasetMeta(t),o=n.controller._resolveAnimations(void 0,s);x1(e)?(n.data[e].hidden=!a,this.update()):(this.setDatasetVisibility(t,a),o.update(n,{visible:a}),this.update(r=>r.datasetIndex===t?s:void 0))}hide(t,e){this._updateVisibility(t,e,!1)}show(t,e){this._updateVisibility(t,e,!0)}_destroyDatasetMeta(t){const e=this._metasets[t];e&&e.controller&&e.controller._destroy(),delete this._metasets[t]}_stop(){let t,e;for(this.stop(),Me.remove(this),t=0,e=this.data.datasets.length;t<e;++t)this._destroyDatasetMeta(t)}destroy(){this.notifyPlugins("beforeDestroy");const{canvas:t,ctx:e}=this;this._stop(),this.config.clearCache(),t&&(this.unbindEvents(),uh(t,e),this.platform.releaseContext(e),this.canvas=null,this.ctx=null),delete si[this.id],this.notifyPlugins("afterDestroy")}toBase64Image(...t){return this.canvas.toDataURL(...t)}bindEvents(){this.bindUserEvents(),this.options.responsive?this.bindResponsiveEvents():this.attached=!0}bindUserEvents(){const t=this._listeners,e=this.platform,a=(n,o)=>{e.addEventListener(this,n,o),t[n]=o},s=(n,o,r)=>{n.offsetX=o,n.offsetY=r,this._eventHandler(n)};U(this.options.events,n=>a(n,s))}bindResponsiveEvents(){this._responsiveListeners||(this._responsiveListeners={});const t=this._responsiveListeners,e=this.platform,a=(c,d)=>{e.addEventListener(this,c,d),t[c]=d},s=(c,d)=>{t[c]&&(e.removeEventListener(this,c,d),delete t[c])},n=(c,d)=>{this.canvas&&this.resize(c,d)};let o;const r=()=>{s("attach",r),this.attached=!0,this.resize(),a("resize",n),a("detach",o)};o=()=>{this.attached=!1,s("resize",n),this._stop(),this._resize(0,0),a("attach",r)},e.isAttached(this.canvas)?r():o()}unbindEvents(){U(this._listeners,(t,e)=>{this.platform.removeEventListener(this,e,t)}),this._listeners={},U(this._responsiveListeners,(t,e)=>{this.platform.removeEventListener(this,e,t)}),this._responsiveListeners=void 0}updateHoverStyle(t,e,a){const s=a?"set":"remove";let n,o,r,c;for(e==="dataset"&&(n=this.getDatasetMeta(t[0].datasetIndex),n.controller["_"+s+"DatasetHoverStyle"]()),r=0,c=t.length;r<c;++r){o=t[r];const d=o&&this.getDatasetMeta(o.datasetIndex).controller;d&&d[s+"HoverStyle"](o.element,o.datasetIndex,o.index)}}getActiveElements(){return this._active||[]}setActiveElements(t){const e=this._active||[],a=t.map(({datasetIndex:n,index:o})=>{const r=this.getDatasetMeta(n);if(!r)throw new Error("No dataset found at index "+n);return{datasetIndex:n,element:r.data[o],index:o}});!vi(a,e)&&(this._active=a,this._lastEvent=null,this._updateHoverStyles(a,e))}notifyPlugins(t,e,a){return this._plugins.notify(this,t,e,a)}isPluginEnabled(t){return this._plugins._cache.filter(e=>e.plugin.id===t).length===1}_updateHoverStyles(t,e,a){const s=this.options.hover,n=(c,d)=>c.filter(l=>!d.some(p=>l.datasetIndex===p.datasetIndex&&l.index===p.index)),o=n(e,t),r=a?t:n(t,e);o.length&&this.updateHoverStyle(o,s.mode,!1),r.length&&s.mode&&this.updateHoverStyle(r,s.mode,!0)}_eventHandler(t,e){const a={event:t,replay:e,cancelable:!0,inChartArea:this.isPointInArea(t)},s=o=>(o.options.events||this.options.events).includes(t.native.type);if(this.notifyPlugins("beforeEvent",a,s)===!1)return;const n=this._handleEvent(t,e,a.inChartArea);return a.cancelable=!1,this.notifyPlugins("afterEvent",a,s),(n||a.changed)&&this.render(),this}_handleEvent(t,e,a){const{_active:s=[],options:n}=this,o=e,r=this._getActiveElements(t,s,a,o),c=PP(t),d=bT(t,this._lastEvent,a,c);a&&(this._lastEvent=null,X(n.onHover,[t,r,this],this),c&&X(n.onClick,[t,r,this],this));const l=!vi(r,s);return(l||e)&&(this._active=r,this._updateHoverStyles(r,s,e)),this._lastEvent=d,l}_getActiveElements(t,e,a,s){if(t.type==="mouseout")return[];if(!a)return e;const n=this.options.hover;return this.getElementsAtEventForMode(t,n.mode,n,s)}}H(be,"defaults",et),H(be,"instances",si),H(be,"overrides",ga),H(be,"registry",ne),H(be,"version",mT),H(be,"getChart",jh);function Yh(){return U(be.instances,i=>i._plugins.invalidate())}function wT(i,t,e){const{startAngle:a,x:s,y:n,outerRadius:o,innerRadius:r,options:c}=t,{borderWidth:d,borderJoinStyle:l}=c,p=Math.min(d/o,bt(a-e));if(i.beginPath(),i.arc(s,n,o-d/2,a+p/2,e-p/2),r>0){const u=Math.min(d/r,bt(a-e));i.arc(s,n,r+d/2,e-u/2,a+u/2,!0)}else{const u=Math.min(d/2,o*bt(a-e));if(l==="round")i.arc(s,n,u,e-Z/2,a+Z/2,!0);else if(l==="bevel"){const g=2*u*u,M=-g*Math.cos(e+Z/2)+s,f=-g*Math.sin(e+Z/2)+n,v=g*Math.cos(a+Z/2)+s,m=g*Math.sin(a+Z/2)+n;i.lineTo(M,f),i.lineTo(v,m)}}i.closePath(),i.moveTo(0,0),i.rect(0,0,i.canvas.width,i.canvas.height),i.clip("evenodd")}function ST(i,t,e){const{startAngle:a,pixelMargin:s,x:n,y:o,outerRadius:r,innerRadius:c}=t;let d=s/r;i.beginPath(),i.arc(n,o,r,a-d,e+d),c>s?(d=s/c,i.arc(n,o,c,e+d,a-d,!0)):i.arc(n,o,s,e+ct,a-ct),i.closePath(),i.clip()}function kT(i){return un(i,["outerStart","outerEnd","innerStart","innerEnd"])}function AT(i,t,e,a){const s=kT(i.options.borderRadius),n=(e-t)/2,o=Math.min(n,a*t/2),r=c=>{const d=(e-Math.min(n,c))*a/2;return ft(c,0,Math.min(n,d))};return{outerStart:r(s.outerStart),outerEnd:r(s.outerEnd),innerStart:ft(s.innerStart,0,o),innerEnd:ft(s.innerEnd,0,o)}}function xa(i,t,e,a){return{x:e+i*Math.cos(t),y:a+i*Math.sin(t)}}function wi(i,t,e,a,s,n){const{x:o,y:r,startAngle:c,pixelMargin:d,innerRadius:l}=t,p=Math.max(t.outerRadius+a+e-d,0),u=l>0?l+a+e+d:0;let g=0;const M=s-c;if(a){const T=l>0?l-a:0,D=p>0?p-a:0,I=(T+D)/2,q=I!==0?M*I/(I+a):M;g=(M-q)/2}const f=Math.max(.001,M*p-e/Z)/p,v=(M-f)/2,m=c+v+g,y=s-v-g,{outerStart:_,outerEnd:b,innerStart:x,innerEnd:k}=AT(t,u,p,y-m),w=p-_,S=p-b,A=m+_/w,C=y-b/S,L=u+x,P=u+k,E=m+x/L,O=y-k/P;if(i.beginPath(),n){const T=(A+C)/2;if(i.arc(o,r,p,A,T),i.arc(o,r,p,T,C),b>0){const Y=xa(S,C,o,r);i.arc(Y.x,Y.y,b,C,y+ct)}const D=xa(P,y,o,r);if(i.lineTo(D.x,D.y),k>0){const Y=xa(P,O,o,r);i.arc(Y.x,Y.y,k,y+ct,O+Math.PI)}const I=(y-k/u+(m+x/u))/2;if(i.arc(o,r,u,y-k/u,I,!0),i.arc(o,r,u,I,m+x/u,!0),x>0){const Y=xa(L,E,o,r);i.arc(Y.x,Y.y,x,E+Math.PI,m-ct)}const q=xa(w,m,o,r);if(i.lineTo(q.x,q.y),_>0){const Y=xa(w,A,o,r);i.arc(Y.x,Y.y,_,m-ct,A)}}else{i.moveTo(o,r);const T=Math.cos(A)*p+o,D=Math.sin(A)*p+r;i.lineTo(T,D);const I=Math.cos(C)*p+o,q=Math.sin(C)*p+r;i.lineTo(I,q)}i.closePath()}function CT(i,t,e,a,s){const{fullCircles:n,startAngle:o,circumference:r}=t;let c=t.endAngle;if(n){wi(i,t,e,a,c,s);for(let d=0;d<n;++d)i.fill();isNaN(r)||(c=o+(r%J||J))}return wi(i,t,e,a,c,s),i.fill(),c}function LT(i,t,e,a,s){const{fullCircles:n,startAngle:o,circumference:r,options:c}=t,{borderWidth:d,borderJoinStyle:l,borderDash:p,borderDashOffset:u,borderRadius:g}=c,M=c.borderAlign==="inner";if(!d)return;i.setLineDash(p||[]),i.lineDashOffset=u,M?(i.lineWidth=d*2,i.lineJoin=l||"round"):(i.lineWidth=d,i.lineJoin=l||"bevel");let f=t.endAngle;if(n){wi(i,t,e,a,f,s);for(let v=0;v<n;++v)i.stroke();isNaN(r)||(f=o+(r%J||J))}M&&ST(i,t,f),c.selfJoin&&f-o>=Z&&g===0&&l!=="miter"&&wT(i,t,f),n||(wi(i,t,e,a,f,s),i.stroke())}class ja extends ae{constructor(e){super();H(this,"circumference");H(this,"endAngle");H(this,"fullCircles");H(this,"innerRadius");H(this,"outerRadius");H(this,"pixelMargin");H(this,"startAngle");this.options=void 0,this.circumference=void 0,this.startAngle=void 0,this.endAngle=void 0,this.innerRadius=void 0,this.outerRadius=void 0,this.pixelMargin=0,this.fullCircles=0,e&&Object.assign(this,e)}inRange(e,a,s){const n=this.getProps(["x","y"],s),{angle:o,distance:r}=Tc(n,{x:e,y:a}),{startAngle:c,endAngle:d,innerRadius:l,outerRadius:p,circumference:u}=this.getProps(["startAngle","endAngle","innerRadius","outerRadius","circumference"],s),g=(this.options.spacing+this.options.borderWidth)/2,M=B(u,d-c),f=_1(o,c,d)&&c!==d,v=M>=J||f,m=we(r,l+g,p+g);return v&&m}getCenterPoint(e){const{x:a,y:s,startAngle:n,endAngle:o,innerRadius:r,outerRadius:c}=this.getProps(["x","y","startAngle","endAngle","innerRadius","outerRadius"],e),{offset:d,spacing:l}=this.options,p=(n+o)/2,u=(r+c+l+d)/2;return{x:a+Math.cos(p)*u,y:s+Math.sin(p)*u}}tooltipPosition(e){return this.getCenterPoint(e)}draw(e){const{options:a,circumference:s}=this,n=(a.offset||0)/4,o=(a.spacing||0)/2,r=a.circular;if(this.pixelMargin=a.borderAlign==="inner"?.33:0,this.fullCircles=s>J?Math.floor(s/J):0,s===0||this.innerRadius<0||this.outerRadius<0)return;e.save();const c=(this.startAngle+this.endAngle)/2;e.translate(Math.cos(c)*n,Math.sin(c)*n);const d=1-Math.sin(Math.min(Z,s||0)),l=n*d;e.fillStyle=a.backgroundColor,e.strokeStyle=a.borderColor,CT(e,this,l,o,r),LT(e,this,l,o,r),e.restore()}}H(ja,"id","arc"),H(ja,"defaults",{borderAlign:"center",borderColor:"#fff",borderDash:[],borderDashOffset:0,borderJoinStyle:void 0,borderRadius:0,borderWidth:2,offset:0,spacing:0,angle:void 0,circular:!0,selfJoin:!1}),H(ja,"defaultRoutes",{backgroundColor:"backgroundColor"}),H(ja,"descriptors",{_scriptable:!0,_indexable:e=>e!=="borderDash"});function pd(i,t,e=t){i.lineCap=B(e.borderCapStyle,t.borderCapStyle),i.setLineDash(B(e.borderDash,t.borderDash)),i.lineDashOffset=B(e.borderDashOffset,t.borderDashOffset),i.lineJoin=B(e.borderJoinStyle,t.borderJoinStyle),i.lineWidth=B(e.borderWidth,t.borderWidth),i.strokeStyle=B(e.borderColor,t.borderColor)}function PT(i,t,e){i.lineTo(e.x,e.y)}function HT(i){return i.stepped?JP:i.tension||i.cubicInterpolationMode==="monotone"?QP:PT}function ud(i,t,e={}){const a=i.length,{start:s=0,end:n=a-1}=e,{start:o,end:r}=t,c=Math.max(s,o),d=Math.min(n,r),l=s<o&&n<o||s>r&&n>r;return{count:a,start:c,loop:t.loop,ilen:d<c&&!l?a+d-c:d-c}}function VT(i,t,e,a){const{points:s,options:n}=t,{count:o,start:r,loop:c,ilen:d}=ud(s,e,a),l=HT(n);let{move:p=!0,reverse:u}=a||{},g,M,f;for(g=0;g<=d;++g)M=s[(r+(u?d-g:g))%o],!M.skip&&(p?(i.moveTo(M.x,M.y),p=!1):l(i,f,M,u,n.stepped),f=M);return c&&(M=s[(r+(u?d:0))%o],l(i,f,M,u,n.stepped)),!!c}function TT(i,t,e,a){const s=t.points,{count:n,start:o,ilen:r}=ud(s,e,a),{move:c=!0,reverse:d}=a||{};let l=0,p=0,u,g,M,f,v,m;const y=b=>(o+(d?r-b:b))%n,_=()=>{f!==v&&(i.lineTo(l,v),i.lineTo(l,f),i.lineTo(l,m))};for(c&&(g=s[y(0)],i.moveTo(g.x,g.y)),u=0;u<=r;++u){if(g=s[y(u)],g.skip)continue;const b=g.x,x=g.y,k=b|0;k===M?(x<f?f=x:x>v&&(v=x),l=(p*l+b)/++p):(_(),i.lineTo(b,x),M=k,p=0,f=v=x),m=x}_()}function Ls(i){const t=i.options,e=t.borderDash&&t.borderDash.length;return!i._decimated&&!i._loop&&!t.tension&&t.cubicInterpolationMode!=="monotone"&&!t.stepped&&!e?TT:VT}function ET(i){return i.stepped?VH:i.tension||i.cubicInterpolationMode==="monotone"?TH:ia}function DT(i,t,e,a){let s=t._path;s||(s=t._path=new Path2D,t.path(s,e,a)&&s.closePath()),pd(i,t.options),i.stroke(s)}function OT(i,t,e,a){const{segments:s,options:n}=t,o=Ls(t);for(const r of s)pd(i,n,r.style),i.beginPath(),o(i,t,r,{start:e,end:e+a-1})&&i.closePath(),i.stroke()}const RT=typeof Path2D=="function";function IT(i,t,e,a){RT&&!t.options.segment?DT(i,t,e,a):OT(i,t,e,a)}class Oe extends ae{constructor(t){super(),this.animated=!0,this.options=void 0,this._chart=void 0,this._loop=void 0,this._fullLoop=void 0,this._path=void 0,this._points=void 0,this._segments=void 0,this._decimated=!1,this._pointsUpdated=!1,this._datasetIndex=void 0,t&&Object.assign(this,t)}updateControlPoints(t,e){const a=this.options;if((a.tension||a.cubicInterpolationMode==="monotone")&&!a.stepped&&!this._pointsUpdated){const s=a.spanGaps?this._loop:this._fullLoop;wH(this._points,a,t,s,e),this._pointsUpdated=!0}}set points(t){this._points=t,delete this._segments,delete this._path,this._pointsUpdated=!1}get points(){return this._points}get segments(){return this._segments||(this._segments=BH(this,this.options.segment))}first(){const t=this.segments,e=this.points;return t.length&&e[t[0].start]}last(){const t=this.segments,e=this.points,a=t.length;return a&&e[t[a-1].end]}interpolate(t,e){const a=this.options,s=t[e],n=this.points,o=Jc(this,{property:e,start:s,end:s});if(!o.length)return;const r=[],c=ET(a);let d,l;for(d=0,l=o.length;d<l;++d){const{start:p,end:u}=o[d],g=n[p],M=n[u];if(g===M){r.push(g);continue}const f=Math.abs((s-g[e])/(M[e]-g[e])),v=c(g,M,f,a.stepped);v[e]=t[e],r.push(v)}return r.length===1?r[0]:r}pathSegment(t,e,a){return Ls(this)(t,this,e,a)}path(t,e,a){const s=this.segments,n=Ls(this);let o=this._loop;e=e||0,a=a||this.points.length-e;for(const r of s)o&=n(t,this,r,{start:e,end:e+a-1});return!!o}draw(t,e,a,s){const n=this.options||{};(this.points||[]).length&&n.borderWidth&&(t.save(),IT(t,this,a,s),t.restore()),this.animated&&(this._pointsUpdated=!1,this._path=void 0)}}H(Oe,"id","line"),H(Oe,"defaults",{borderCapStyle:"butt",borderDash:[],borderDashOffset:0,borderJoinStyle:"miter",borderWidth:3,capBezierPoints:!0,cubicInterpolationMode:"default",fill:!1,spanGaps:!1,stepped:!1,tension:0}),H(Oe,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"}),H(Oe,"descriptors",{_scriptable:!0,_indexable:t=>t!=="borderDash"&&t!=="fill"});function Xh(i,t,e,a){const s=i.options,{[e]:n}=i.getProps([e],a);return Math.abs(t-n)<s.radius+s.hitRadius}class ni extends ae{constructor(e){super();H(this,"parsed");H(this,"skip");H(this,"stop");this.options=void 0,this.parsed=void 0,this.skip=void 0,this.stop=void 0,e&&Object.assign(this,e)}inRange(e,a,s){const n=this.options,{x:o,y:r}=this.getProps(["x","y"],s);return Math.pow(e-o,2)+Math.pow(a-r,2)<Math.pow(n.hitRadius+n.radius,2)}inXRange(e,a){return Xh(this,e,"x",a)}inYRange(e,a){return Xh(this,e,"y",a)}getCenterPoint(e){const{x:a,y:s}=this.getProps(["x","y"],e);return{x:a,y:s}}size(e){e=e||this.options||{};let a=e.radius||0;a=Math.max(a,a&&e.hoverRadius||0);const s=a&&e.borderWidth||0;return(a+s)*2}draw(e,a){const s=this.options;this.skip||s.radius<.1||!ke(this,a,this.size(s)/2)||(e.strokeStyle=s.borderColor,e.lineWidth=s.borderWidth,e.fillStyle=s.backgroundColor,Ss(e,s,this.x,this.y))}getRange(){const e=this.options||{};return e.radius+e.hitRadius}}H(ni,"id","point"),H(ni,"defaults",{borderWidth:1,hitRadius:1,hoverBorderWidth:1,hoverRadius:4,pointStyle:"circle",radius:3,rotation:0}),H(ni,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});function gd(i,t){const{x:e,y:a,base:s,width:n,height:o}=i.getProps(["x","y","base","width","height"],t);let r,c,d,l,p;return i.horizontal?(p=o/2,r=Math.min(e,s),c=Math.max(e,s),d=a-p,l=a+p):(p=n/2,r=e-p,c=e+p,d=Math.min(a,s),l=Math.max(a,s)),{left:r,top:d,right:c,bottom:l}}function Re(i,t,e,a){return i?0:ft(t,e,a)}function BT(i,t,e){const a=i.options.borderWidth,s=i.borderSkipped,n=Nc(a);return{t:Re(s.top,n.top,0,e),r:Re(s.right,n.right,0,t),b:Re(s.bottom,n.bottom,0,e),l:Re(s.left,n.left,0,t)}}function FT(i,t,e){const{enableBorderRadius:a}=i.getProps(["enableBorderRadius"]),s=i.options.borderRadius,n=la(s),o=Math.min(t,e),r=i.borderSkipped,c=a||z(s);return{topLeft:Re(!c||r.top||r.left,n.topLeft,0,o),topRight:Re(!c||r.top||r.right,n.topRight,0,o),bottomLeft:Re(!c||r.bottom||r.left,n.bottomLeft,0,o),bottomRight:Re(!c||r.bottom||r.right,n.bottomRight,0,o)}}function zT(i){const t=gd(i),e=t.right-t.left,a=t.bottom-t.top,s=BT(i,e/2,a/2),n=FT(i,e/2,a/2);return{outer:{x:t.left,y:t.top,w:e,h:a,radius:n},inner:{x:t.left+s.l,y:t.top+s.t,w:e-s.l-s.r,h:a-s.t-s.b,radius:{topLeft:Math.max(0,n.topLeft-Math.max(s.t,s.l)),topRight:Math.max(0,n.topRight-Math.max(s.t,s.r)),bottomLeft:Math.max(0,n.bottomLeft-Math.max(s.b,s.l)),bottomRight:Math.max(0,n.bottomRight-Math.max(s.b,s.r))}}}}function es(i,t,e,a){const s=t===null,n=e===null,r=i&&!(s&&n)&&gd(i,a);return r&&(s||we(t,r.left,r.right))&&(n||we(e,r.top,r.bottom))}function NT(i){return i.topLeft||i.topRight||i.bottomLeft||i.bottomRight}function ZT(i,t){i.rect(t.x,t.y,t.w,t.h)}function as(i,t,e={}){const a=i.x!==e.x?-t:0,s=i.y!==e.y?-t:0,n=(i.x+i.w!==e.x+e.w?t:0)-a,o=(i.y+i.h!==e.y+e.h?t:0)-s;return{x:i.x+a,y:i.y+s,w:i.w+n,h:i.h+o,radius:i.radius}}class oi extends ae{constructor(t){super(),this.options=void 0,this.horizontal=void 0,this.base=void 0,this.width=void 0,this.height=void 0,this.inflateAmount=void 0,t&&Object.assign(this,t)}draw(t){const{inflateAmount:e,options:{borderColor:a,backgroundColor:s}}=this,{inner:n,outer:o}=zT(this),r=NT(o.radius)?b1:ZT;t.save(),(o.w!==n.w||o.h!==n.h)&&(t.beginPath(),r(t,as(o,e,n)),t.clip(),r(t,as(n,-e,o)),t.fillStyle=a,t.fill("evenodd")),t.beginPath(),r(t,as(n,e)),t.fillStyle=s,t.fill(),t.restore()}inRange(t,e,a){return es(this,t,e,a)}inXRange(t,e){return es(this,t,null,e)}inYRange(t,e){return es(this,null,t,e)}getCenterPoint(t){const{x:e,y:a,base:s,horizontal:n}=this.getProps(["x","y","base","horizontal"],t);return{x:n?(e+s)/2:e,y:n?a:(a+s)/2}}getRange(t){return t==="x"?this.width/2:this.height/2}}H(oi,"id","bar"),H(oi,"defaults",{borderSkipped:"start",borderWidth:0,borderRadius:0,inflateAmount:"auto",pointStyle:void 0}),H(oi,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});var WT=Object.freeze({__proto__:null,ArcElement:ja,BarElement:oi,LineElement:Oe,PointElement:ni});const Ps=["rgb(54, 162, 235)","rgb(255, 99, 132)","rgb(255, 159, 64)","rgb(255, 205, 86)","rgb(75, 192, 192)","rgb(153, 102, 255)","rgb(201, 203, 207)"],Gh=Ps.map(i=>i.replace("rgb(","rgba(").replace(")",", 0.5)"));function fd(i){return Ps[i%Ps.length]}function Md(i){return Gh[i%Gh.length]}function UT(i,t){return i.borderColor=fd(t),i.backgroundColor=Md(t),++t}function qT(i,t){return i.backgroundColor=i.data.map(()=>fd(t++)),t}function $T(i,t){return i.backgroundColor=i.data.map(()=>Md(t++)),t}function jT(i){let t=0;return(e,a)=>{const s=i.getDatasetMeta(a).controller;s instanceof na?t=qT(e,t):s instanceof s1?t=$T(e,t):s&&(t=UT(e,t))}}function Kh(i){let t;for(t in i)if(i[t].borderColor||i[t].backgroundColor)return!0;return!1}function YT(i){return i&&(i.borderColor||i.backgroundColor)}function XT(){return et.borderColor!=="rgba(0,0,0,0.1)"||et.backgroundColor!=="rgba(0,0,0,0.1)"}var GT={id:"colors",defaults:{enabled:!0,forceOverride:!1},beforeLayout(i,t,e){if(!e.enabled)return;const{data:{datasets:a},options:s}=i.config,{elements:n}=s,o=Kh(a)||YT(s)||n&&Kh(n)||XT();if(!e.forceOverride&&o)return;const r=jT(i);a.forEach(r)}};function KT(i,t,e,a,s){const n=s.samples||a;if(n>=e)return i.slice(t,t+e);const o=[],r=(e-2)/(n-2);let c=0;const d=t+e-1;let l=t,p,u,g,M,f;for(o[c++]=i[l],p=0;p<n-2;p++){let v=0,m=0,y;const _=Math.floor((p+1)*r)+1+t,b=Math.min(Math.floor((p+2)*r)+1,e)+t,x=b-_;for(y=_;y<b;y++)v+=i[y].x,m+=i[y].y;v/=x,m/=x;const k=Math.floor(p*r)+1+t,w=Math.min(Math.floor((p+1)*r)+1,e)+t,{x:S,y:A}=i[l];for(g=M=-1,y=k;y<w;y++)M=.5*Math.abs((S-v)*(i[y].y-A)-(S-i[y].x)*(m-A)),M>g&&(g=M,u=i[y],f=y);o[c++]=u,l=f}return o[c++]=i[d],o}function JT(i,t,e,a){let s=0,n=0,o,r,c,d,l,p,u,g,M,f;const v=[],m=t+e-1,y=i[t].x,b=i[m].x-y;for(o=t;o<t+e;++o){r=i[o],c=(r.x-y)/b*a,d=r.y;const x=c|0;if(x===l)d<M?(M=d,p=o):d>f&&(f=d,u=o),s=(n*s+r.x)/++n;else{const k=o-1;if(!F(p)&&!F(u)){const w=Math.min(p,u),S=Math.max(p,u);w!==g&&w!==k&&v.push({...i[w],x:s}),S!==g&&S!==k&&v.push({...i[S],x:s})}o>0&&k!==g&&v.push(i[k]),v.push(r),l=x,n=0,M=f=d,p=u=g=o}}return v}function vd(i){if(i._decimated){const t=i._data;delete i._decimated,delete i._data,Object.defineProperty(i,"data",{configurable:!0,enumerable:!0,writable:!0,value:t})}}function Jh(i){i.data.datasets.forEach(t=>{vd(t)})}function QT(i,t){const e=t.length;let a=0,s;const{iScale:n}=i,{min:o,max:r,minDefined:c,maxDefined:d}=n.getUserBounds();return c&&(a=ft(Se(t,n.axis,o).lo,0,e-1)),d?s=ft(Se(t,n.axis,r).hi+1,a,e)-a:s=e-a,{start:a,count:s}}var tE={id:"decimation",defaults:{algorithm:"min-max",enabled:!1},beforeElementsUpdate:(i,t,e)=>{if(!e.enabled){Jh(i);return}const a=i.width;i.data.datasets.forEach((s,n)=>{const{_data:o,indexAxis:r}=s,c=i.getDatasetMeta(n),d=o||s.data;if(qa([r,i.options.indexAxis])==="y"||!c.controller.supportsDecimation)return;const l=i.scales[c.xAxisID];if(l.type!=="linear"&&l.type!=="time"||i.options.parsing)return;let{start:p,count:u}=QT(c,d);const g=e.threshold||4*a;if(u<=g){vd(s);return}F(o)&&(s._data=d,delete s.data,Object.defineProperty(s,"data",{configurable:!0,enumerable:!0,get:function(){return this._decimated},set:function(f){this._data=f}}));let M;switch(e.algorithm){case"lttb":M=KT(d,p,u,a,e);break;case"min-max":M=JT(d,p,u,a);break;default:throw new Error(`Unsupported decimation algorithm '${e.algorithm}'`)}s._decimated=M})},destroy(i){Jh(i)}};function eE(i,t,e){const a=i.segments,s=i.points,n=t.points,o=[];for(const r of a){let{start:c,end:d}=r;d=Ei(c,d,s);const l=Hs(e,s[c],s[d],r.loop);if(!t.segments){o.push({source:r,target:l,start:s[c],end:s[d]});continue}const p=Jc(t,l);for(const u of p){const g=Hs(e,n[u.start],n[u.end],u.loop),M=Kc(r,s,g);for(const f of M)o.push({source:f,target:u,start:{[e]:Qh(l,g,"start",Math.max)},end:{[e]:Qh(l,g,"end",Math.min)}})}}return o}function Hs(i,t,e,a){if(a)return;let s=t[i],n=e[i];return i==="angle"&&(s=bt(s),n=bt(n)),{property:i,start:s,end:n}}function aE(i,t){const{x:e=null,y:a=null}=i||{},s=t.points,n=[];return t.segments.forEach(({start:o,end:r})=>{r=Ei(o,r,s);const c=s[o],d=s[r];a!==null?(n.push({x:c.x,y:a}),n.push({x:d.x,y:a})):e!==null&&(n.push({x:e,y:c.y}),n.push({x:e,y:d.y}))}),n}function Ei(i,t,e){for(;t>i;t--){const a=e[t];if(!isNaN(a.x)&&!isNaN(a.y))break}return t}function Qh(i,t,e,a){return i&&t?a(i[e],t[e]):i?i[e]:t?t[e]:0}function md(i,t){let e=[],a=!1;return tt(i)?(a=!0,e=i):e=aE(i,t),e.length?new Oe({points:e,options:{tension:0},_loop:a,_fullLoop:a}):null}function t0(i){return i&&i.fill!==!1}function iE(i,t,e){let s=i[t].fill;const n=[t];let o;if(!e)return s;for(;s!==!1&&n.indexOf(s)===-1;){if(!rt(s))return s;if(o=i[s],!o)return!1;if(o.visible)return s;n.push(s),s=o.fill}return!1}function sE(i,t,e){const a=hE(i);if(z(a))return isNaN(a.value)?!1:a;let s=parseFloat(a);return rt(s)&&Math.floor(s)===s?nE(a[0],t,s,e):["origin","start","end","stack","shape"].indexOf(a)>=0&&a}function nE(i,t,e,a){return(i==="-"||i==="+")&&(e=t+e),e===t||e<0||e>=a?!1:e}function oE(i,t){let e=null;return i==="start"?e=t.bottom:i==="end"?e=t.top:z(i)?e=t.getPixelForValue(i.value):t.getBasePixel&&(e=t.getBasePixel()),e}function rE(i,t,e){let a;return i==="start"?a=e:i==="end"?a=t.options.reverse?t.min:t.max:z(i)?a=i.value:a=t.getBaseValue(),a}function hE(i){const t=i.options,e=t.fill;let a=B(e&&e.target,e);return a===void 0&&(a=!!t.backgroundColor),a===!1||a===null?!1:a===!0?"origin":a}function cE(i){const{scale:t,index:e,line:a}=i,s=[],n=a.segments,o=a.points,r=dE(t,e);r.push(md({x:null,y:t.bottom},a));for(let c=0;c<n.length;c++){const d=n[c];for(let l=d.start;l<=d.end;l++)lE(s,o[l],r)}return new Oe({points:s,options:{}})}function dE(i,t){const e=[],a=i.getMatchingVisibleMetas("line");for(let s=0;s<a.length;s++){const n=a[s];if(n.index===t)break;n.hidden||e.unshift(n.dataset)}return e}function lE(i,t,e){const a=[];for(let s=0;s<e.length;s++){const n=e[s],{first:o,last:r,point:c}=pE(n,t,"x");if(!(!c||o&&r)){if(o)a.unshift(c);else if(i.push(c),!r)break}}i.push(...a)}function pE(i,t,e){const a=i.interpolate(t,e);if(!a)return{};const s=a[e],n=i.segments,o=i.points;let r=!1,c=!1;for(let d=0;d<n.length;d++){const l=n[d],p=o[l.start][e],u=o[l.end][e];if(we(s,p,u)){r=s===p,c=s===u;break}}return{first:r,last:c,point:a}}class yd{constructor(t){this.x=t.x,this.y=t.y,this.radius=t.radius}pathSegment(t,e,a){const{x:s,y:n,radius:o}=this;return e=e||{start:0,end:J},t.arc(s,n,o,e.end,e.start,!0),!a.bounds}interpolate(t){const{x:e,y:a,radius:s}=this,n=t.angle;return{x:e+Math.cos(n)*s,y:a+Math.sin(n)*s,angle:n}}}function uE(i){const{chart:t,fill:e,line:a}=i;if(rt(e))return gE(t,e);if(e==="stack")return cE(i);if(e==="shape")return!0;const s=fE(i);return s instanceof yd?s:md(s,a)}function gE(i,t){const e=i.getDatasetMeta(t);return e&&i.isDatasetVisible(t)?e.dataset:null}function fE(i){return(i.scale||{}).getPointPositionForValue?vE(i):ME(i)}function ME(i){const{scale:t={},fill:e}=i,a=oE(e,t);if(rt(a)){const s=t.isHorizontal();return{x:s?a:null,y:s?null:a}}return null}function vE(i){const{scale:t,fill:e}=i,a=t.options,s=t.getLabels().length,n=a.reverse?t.max:t.min,o=rE(e,t,n),r=[];if(a.grid.circular){const c=t.getPointPositionForValue(0,n);return new yd({x:c.x,y:c.y,radius:t.getDistanceFromCenterForValue(o)})}for(let c=0;c<s;++c)r.push(t.getPointPositionForValue(c,o));return r}function is(i,t,e){const a=uE(t),{chart:s,index:n,line:o,scale:r,axis:c}=t,d=o.options,l=d.fill,p=d.backgroundColor,{above:u=p,below:g=p}=l||{},M=s.getDatasetMeta(n),f=Qc(s,M);a&&o.points.length&&(Pi(i,e),mE(i,{line:o,target:a,above:u,below:g,area:e,scale:r,axis:c,clip:f}),Hi(i))}function mE(i,t){const{line:e,target:a,above:s,below:n,area:o,scale:r,clip:c}=t,d=e._loop?"angle":t.axis;i.save();let l=n;n!==s&&(d==="x"?(e0(i,a,o.top),ss(i,{line:e,target:a,color:s,scale:r,property:d,clip:c}),i.restore(),i.save(),e0(i,a,o.bottom)):d==="y"&&(a0(i,a,o.left),ss(i,{line:e,target:a,color:n,scale:r,property:d,clip:c}),i.restore(),i.save(),a0(i,a,o.right),l=s)),ss(i,{line:e,target:a,color:l,scale:r,property:d,clip:c}),i.restore()}function e0(i,t,e){const{segments:a,points:s}=t;let n=!0,o=!1;i.beginPath();for(const r of a){const{start:c,end:d}=r,l=s[c],p=s[Ei(c,d,s)];n?(i.moveTo(l.x,l.y),n=!1):(i.lineTo(l.x,e),i.lineTo(l.x,l.y)),o=!!t.pathSegment(i,r,{move:o}),o?i.closePath():i.lineTo(p.x,e)}i.lineTo(t.first().x,e),i.closePath(),i.clip()}function a0(i,t,e){const{segments:a,points:s}=t;let n=!0,o=!1;i.beginPath();for(const r of a){const{start:c,end:d}=r,l=s[c],p=s[Ei(c,d,s)];n?(i.moveTo(l.x,l.y),n=!1):(i.lineTo(e,l.y),i.lineTo(l.x,l.y)),o=!!t.pathSegment(i,r,{move:o}),o?i.closePath():i.lineTo(e,p.y)}i.lineTo(e,t.first().y),i.closePath(),i.clip()}function ss(i,t){const{line:e,target:a,property:s,color:n,scale:o,clip:r}=t,c=eE(e,a,s);for(const{source:d,target:l,start:p,end:u}of c){const{style:{backgroundColor:g=n}={}}=d,M=a!==!0;i.save(),i.fillStyle=g,yE(i,o,r,M&&Hs(s,p,u)),i.beginPath();const f=!!e.pathSegment(i,d);let v;if(M){f?i.closePath():i0(i,a,u,s);const m=!!a.pathSegment(i,l,{move:f,reverse:!0});v=f&&m,v||i0(i,a,p,s)}i.closePath(),i.fill(v?"evenodd":"nonzero"),i.restore()}}function yE(i,t,e,a){const s=t.chart.chartArea,{property:n,start:o,end:r}=a||{};if(n==="x"||n==="y"){let c,d,l,p;n==="x"?(c=o,d=s.top,l=r,p=s.bottom):(c=s.left,d=o,l=s.right,p=r),i.beginPath(),e&&(c=Math.max(c,e.left),l=Math.min(l,e.right),d=Math.max(d,e.top),p=Math.min(p,e.bottom)),i.rect(c,d,l-c,p-d),i.clip()}}function i0(i,t,e,a){const s=t.interpolate(e,a);s&&i.lineTo(s.x,s.y)}var xE={id:"filler",afterDatasetsUpdate(i,t,e){const a=(i.data.datasets||[]).length,s=[];let n,o,r,c;for(o=0;o<a;++o)n=i.getDatasetMeta(o),r=n.dataset,c=null,r&&r.options&&r instanceof Oe&&(c={visible:i.isDatasetVisible(o),index:o,fill:sE(r,o,a),chart:i,axis:n.controller.options.indexAxis,scale:n.vScale,line:r}),n.$filler=c,s.push(c);for(o=0;o<a;++o)c=s[o],!(!c||c.fill===!1)&&(c.fill=iE(s,o,e.propagate))},beforeDraw(i,t,e){const a=e.drawTime==="beforeDraw",s=i.getSortedVisibleDatasetMetas(),n=i.chartArea;for(let o=s.length-1;o>=0;--o){const r=s[o].$filler;r&&(r.line.updateControlPoints(n,r.axis),a&&r.fill&&is(i.ctx,r,n))}},beforeDatasetsDraw(i,t,e){if(e.drawTime!=="beforeDatasetsDraw")return;const a=i.getSortedVisibleDatasetMetas();for(let s=a.length-1;s>=0;--s){const n=a[s].$filler;t0(n)&&is(i.ctx,n,i.chartArea)}},beforeDatasetDraw(i,t,e){const a=t.meta.$filler;!t0(a)||e.drawTime!=="beforeDatasetDraw"||is(i.ctx,a,i.chartArea)},defaults:{propagate:!0,drawTime:"beforeDatasetDraw"}};const s0=(i,t)=>{let{boxHeight:e=t,boxWidth:a=t}=i;return i.usePointStyle&&(e=Math.min(e,t),a=i.pointStyleWidth||Math.min(a,t)),{boxWidth:a,boxHeight:e,itemHeight:Math.max(t,e)}},_E=(i,t)=>i!==null&&t!==null&&i.datasetIndex===t.datasetIndex&&i.index===t.index;class n0 extends ae{constructor(t){super(),this._added=!1,this.legendHitBoxes=[],this._hoveredItem=null,this.doughnutMode=!1,this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this.legendItems=void 0,this.columnSizes=void 0,this.lineWidths=void 0,this.maxHeight=void 0,this.maxWidth=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.height=void 0,this.width=void 0,this._margins=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e,a){this.maxWidth=t,this.maxHeight=e,this._margins=a,this.setDimensions(),this.buildLabels(),this.fit()}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=this._margins.left,this.right=this.width):(this.height=this.maxHeight,this.top=this._margins.top,this.bottom=this.height)}buildLabels(){const t=this.options.labels||{};let e=X(t.generateLabels,[this.chart],this)||[];t.filter&&(e=e.filter(a=>t.filter(a,this.chart.data))),t.sort&&(e=e.sort((a,s)=>t.sort(a,s,this.chart.data))),this.options.reverse&&e.reverse(),this.legendItems=e}fit(){const{options:t,ctx:e}=this;if(!t.display){this.width=this.height=0;return}const a=t.labels,s=gt(a.font),n=s.size,o=this._computeTitleHeight(),{boxWidth:r,itemHeight:c}=s0(a,n);let d,l;e.font=s.string,this.isHorizontal()?(d=this.maxWidth,l=this._fitRows(o,n,r,c)+10):(l=this.maxHeight,d=this._fitCols(o,s,r,c)+10),this.width=Math.min(d,t.maxWidth||this.maxWidth),this.height=Math.min(l,t.maxHeight||this.maxHeight)}_fitRows(t,e,a,s){const{ctx:n,maxWidth:o,options:{labels:{padding:r}}}=this,c=this.legendHitBoxes=[],d=this.lineWidths=[0],l=s+r;let p=t;n.textAlign="left",n.textBaseline="middle";let u=-1,g=-l;return this.legendItems.forEach((M,f)=>{const v=a+e/2+n.measureText(M.text).width;(f===0||d[d.length-1]+v+2*r>o)&&(p+=l,d[d.length-(f>0?0:1)]=0,g+=l,u++),c[f]={left:0,top:g,row:u,width:v,height:s},d[d.length-1]+=v+r}),p}_fitCols(t,e,a,s){const{ctx:n,maxHeight:o,options:{labels:{padding:r}}}=this,c=this.legendHitBoxes=[],d=this.columnSizes=[],l=o-t;let p=r,u=0,g=0,M=0,f=0;return this.legendItems.forEach((v,m)=>{const{itemWidth:y,itemHeight:_}=bE(a,e,n,v,s);m>0&&g+_+2*r>l&&(p+=u+r,d.push({width:u,height:g}),M+=u+r,f++,u=g=0),c[m]={left:M,top:g,col:f,width:y,height:_},u=Math.max(u,y),g+=_+r}),p+=u,d.push({width:u,height:g}),p}adjustHitBoxes(){if(!this.options.display)return;const t=this._computeTitleHeight(),{legendHitBoxes:e,options:{align:a,labels:{padding:s},rtl:n}}=this,o=Aa(n,this.left,this.width);if(this.isHorizontal()){let r=0,c=xt(a,this.left+s,this.right-this.lineWidths[r]);for(const d of e)r!==d.row&&(r=d.row,c=xt(a,this.left+s,this.right-this.lineWidths[r])),d.top+=this.top+t+s,d.left=o.leftForLtr(o.x(c),d.width),c+=d.width+s}else{let r=0,c=xt(a,this.top+t+s,this.bottom-this.columnSizes[r].height);for(const d of e)d.col!==r&&(r=d.col,c=xt(a,this.top+t+s,this.bottom-this.columnSizes[r].height)),d.top=c,d.left+=this.left+s,d.left=o.leftForLtr(o.x(d.left),d.width),c+=d.height+s}}isHorizontal(){return this.options.position==="top"||this.options.position==="bottom"}draw(){if(this.options.display){const t=this.ctx;Pi(t,this),this._draw(),Hi(t)}}_draw(){const{options:t,columnSizes:e,lineWidths:a,ctx:s}=this,{align:n,labels:o}=t,r=et.color,c=Aa(t.rtl,this.left,this.width),d=gt(o.font),{padding:l}=o,p=d.size,u=p/2;let g;this.drawTitle(),s.textAlign=c.textAlign("left"),s.textBaseline="middle",s.lineWidth=.5,s.font=d.string;const{boxWidth:M,boxHeight:f,itemHeight:v}=s0(o,p),m=function(k,w,S){if(isNaN(M)||M<=0||isNaN(f)||f<0)return;s.save();const A=B(S.lineWidth,1);if(s.fillStyle=B(S.fillStyle,r),s.lineCap=B(S.lineCap,"butt"),s.lineDashOffset=B(S.lineDashOffset,0),s.lineJoin=B(S.lineJoin,"miter"),s.lineWidth=A,s.strokeStyle=B(S.strokeStyle,r),s.setLineDash(B(S.lineDash,[])),o.usePointStyle){const C={radius:f*Math.SQRT2/2,pointStyle:S.pointStyle,rotation:S.rotation,borderWidth:A},L=c.xPlus(k,M/2),P=w+u;zc(s,C,L,P,o.pointStyleWidth&&M)}else{const C=w+Math.max((p-f)/2,0),L=c.leftForLtr(k,M),P=la(S.borderRadius);s.beginPath(),Object.values(P).some(E=>E!==0)?b1(s,{x:L,y:C,w:M,h:f,radius:P}):s.rect(L,C,M,f),s.fill(),A!==0&&s.stroke()}s.restore()},y=function(k,w,S){fa(s,S.text,k,w+v/2,d,{strikethrough:S.hidden,textAlign:c.textAlign(S.textAlign)})},_=this.isHorizontal(),b=this._computeTitleHeight();_?g={x:xt(n,this.left+l,this.right-a[0]),y:this.top+l+b,line:0}:g={x:this.left+l,y:xt(n,this.top+b+l,this.bottom-e[0].height),line:0},Yc(this.ctx,t.textDirection);const x=v+l;this.legendItems.forEach((k,w)=>{s.strokeStyle=k.fontColor,s.fillStyle=k.fontColor;const S=s.measureText(k.text).width,A=c.textAlign(k.textAlign||(k.textAlign=o.textAlign)),C=M+u+S;let L=g.x,P=g.y;c.setWidth(this.width),_?w>0&&L+C+l>this.right&&(P=g.y+=x,g.line++,L=g.x=xt(n,this.left+l,this.right-a[g.line])):w>0&&P+x>this.bottom&&(L=g.x=L+e[g.line].width+l,g.line++,P=g.y=xt(n,this.top+b+l,this.bottom-e[g.line].height));const E=c.x(L);if(m(E,P,k),L=NP(A,L+M+u,_?L+C:this.right,t.rtl),y(c.x(L),P,k),_)g.x+=C+l;else if(typeof k.text!="string"){const O=d.lineHeight;g.y+=xd(k,O)+l}else g.y+=x}),Xc(this.ctx,t.textDirection)}drawTitle(){const t=this.options,e=t.title,a=gt(e.font),s=At(e.padding);if(!e.display)return;const n=Aa(t.rtl,this.left,this.width),o=this.ctx,r=e.position,c=a.size/2,d=s.top+c;let l,p=this.left,u=this.width;if(this.isHorizontal())u=Math.max(...this.lineWidths),l=this.top+d,p=xt(t.align,p,this.right-u);else{const M=this.columnSizes.reduce((f,v)=>Math.max(f,v.height),0);l=d+xt(t.align,this.top,this.bottom-M-t.labels.padding-this._computeTitleHeight())}const g=xt(r,p,p+u);o.textAlign=n.textAlign(ln(r)),o.textBaseline="middle",o.strokeStyle=e.color,o.fillStyle=e.color,o.font=a.string,fa(o,e.text,g,l,a)}_computeTitleHeight(){const t=this.options.title,e=gt(t.font),a=At(t.padding);return t.display?e.lineHeight+a.height:0}_getLegendItemAt(t,e){let a,s,n;if(we(t,this.left,this.right)&&we(e,this.top,this.bottom)){for(n=this.legendHitBoxes,a=0;a<n.length;++a)if(s=n[a],we(t,s.left,s.left+s.width)&&we(e,s.top,s.top+s.height))return this.legendItems[a]}return null}handleEvent(t){const e=this.options;if(!kE(t.type,e))return;const a=this._getLegendItemAt(t.x,t.y);if(t.type==="mousemove"||t.type==="mouseout"){const s=this._hoveredItem,n=_E(s,a);s&&!n&&X(e.onLeave,[t,s,this],this),this._hoveredItem=a,a&&!n&&X(e.onHover,[t,a,this],this)}else a&&X(e.onClick,[t,a,this],this)}}function bE(i,t,e,a,s){const n=wE(a,i,t,e),o=SE(s,a,t.lineHeight);return{itemWidth:n,itemHeight:o}}function wE(i,t,e,a){let s=i.text;return s&&typeof s!="string"&&(s=s.reduce((n,o)=>n.length>o.length?n:o)),t+e.size/2+a.measureText(s).width}function SE(i,t,e){let a=i;return typeof t.text!="string"&&(a=xd(t,e)),a}function xd(i,t){const e=i.text?i.text.length:0;return t*e}function kE(i,t){return!!((i==="mousemove"||i==="mouseout")&&(t.onHover||t.onLeave)||t.onClick&&(i==="click"||i==="mouseup"))}var AE={id:"legend",_element:n0,start(i,t,e){const a=i.legend=new n0({ctx:i.ctx,options:e,chart:i});St.configure(i,a,e),St.addBox(i,a)},stop(i){St.removeBox(i,i.legend),delete i.legend},beforeUpdate(i,t,e){const a=i.legend;St.configure(i,a,e),a.options=e},afterUpdate(i){const t=i.legend;t.buildLabels(),t.adjustHitBoxes()},afterEvent(i,t){t.replay||i.legend.handleEvent(t.event)},defaults:{display:!0,position:"top",align:"center",fullSize:!0,reverse:!1,weight:1e3,onClick(i,t,e){const a=t.datasetIndex,s=e.chart;s.isDatasetVisible(a)?(s.hide(a),t.hidden=!0):(s.show(a),t.hidden=!1)},onHover:null,onLeave:null,labels:{color:i=>i.chart.options.color,boxWidth:40,padding:10,generateLabels(i){const t=i.data.datasets,{labels:{usePointStyle:e,pointStyle:a,textAlign:s,color:n,useBorderRadius:o,borderRadius:r}}=i.legend.options;return i._getSortedDatasetMetas().map(c=>{const d=c.controller.getStyle(e?0:void 0),l=At(d.borderWidth);return{text:t[c.index].label,fillStyle:d.backgroundColor,fontColor:n,hidden:!c.visible,lineCap:d.borderCapStyle,lineDash:d.borderDash,lineDashOffset:d.borderDashOffset,lineJoin:d.borderJoinStyle,lineWidth:(l.width+l.height)/4,strokeStyle:d.borderColor,pointStyle:a||d.pointStyle,rotation:d.rotation,textAlign:s||d.textAlign,borderRadius:o&&(r||d.borderRadius),datasetIndex:c.index}},this)}},title:{color:i=>i.chart.options.color,display:!1,position:"center",text:""}},descriptors:{_scriptable:i=>!i.startsWith("on"),labels:{_scriptable:i=>!["generateLabels","filter","sort"].includes(i)}}};class xn extends ae{constructor(t){super(),this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this._padding=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e){const a=this.options;if(this.left=0,this.top=0,!a.display){this.width=this.height=this.right=this.bottom=0;return}this.width=this.right=t,this.height=this.bottom=e;const s=tt(a.text)?a.text.length:1;this._padding=At(a.padding);const n=s*gt(a.font).lineHeight+this._padding.height;this.isHorizontal()?this.height=n:this.width=n}isHorizontal(){const t=this.options.position;return t==="top"||t==="bottom"}_drawArgs(t){const{top:e,left:a,bottom:s,right:n,options:o}=this,r=o.align;let c=0,d,l,p;return this.isHorizontal()?(l=xt(r,a,n),p=e+t,d=n-a):(o.position==="left"?(l=a+t,p=xt(r,s,e),c=Z*-.5):(l=n-t,p=xt(r,e,s),c=Z*.5),d=s-e),{titleX:l,titleY:p,maxWidth:d,rotation:c}}draw(){const t=this.ctx,e=this.options;if(!e.display)return;const a=gt(e.font),n=a.lineHeight/2+this._padding.top,{titleX:o,titleY:r,maxWidth:c,rotation:d}=this._drawArgs(n);fa(t,e.text,0,0,a,{color:e.color,maxWidth:c,rotation:d,textAlign:ln(e.align),textBaseline:"middle",translation:[o,r]})}}function CE(i,t){const e=new xn({ctx:i.ctx,options:t,chart:i});St.configure(i,e,t),St.addBox(i,e),i.titleBlock=e}var LE={id:"title",_element:xn,start(i,t,e){CE(i,e)},stop(i){const t=i.titleBlock;St.removeBox(i,t),delete i.titleBlock},beforeUpdate(i,t,e){const a=i.titleBlock;St.configure(i,a,e),a.options=e},defaults:{align:"center",display:!1,font:{weight:"bold"},fullSize:!0,padding:10,position:"top",text:"",weight:2e3},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const U1=new WeakMap;var PE={id:"subtitle",start(i,t,e){const a=new xn({ctx:i.ctx,options:e,chart:i});St.configure(i,a,e),St.addBox(i,a),U1.set(i,a)},stop(i){St.removeBox(i,U1.get(i)),U1.delete(i)},beforeUpdate(i,t,e){const a=U1.get(i);St.configure(i,a,e),a.options=e},defaults:{align:"center",display:!1,font:{weight:"normal"},fullSize:!0,padding:0,position:"top",text:"",weight:1500},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Ya={average(i){if(!i.length)return!1;let t,e,a=new Set,s=0,n=0;for(t=0,e=i.length;t<e;++t){const r=i[t].element;if(r&&r.hasValue()){const c=r.tooltipPosition();a.add(c.x),s+=c.y,++n}}return n===0||a.size===0?!1:{x:[...a].reduce((r,c)=>r+c)/a.size,y:s/n}},nearest(i,t){if(!i.length)return!1;let e=t.x,a=t.y,s=Number.POSITIVE_INFINITY,n,o,r;for(n=0,o=i.length;n<o;++n){const c=i[n].element;if(c&&c.hasValue()){const d=c.getCenterPoint(),l=bs(t,d);l<s&&(s=l,r=c)}}if(r){const c=r.tooltipPosition();e=c.x,a=c.y}return{x:e,y:a}}};function se(i,t){return t&&(tt(t)?Array.prototype.push.apply(i,t):i.push(t)),i}function ve(i){return(typeof i=="string"||i instanceof String)&&i.indexOf(`
`)>-1?i.split(`
`):i}function HE(i,t){const{element:e,datasetIndex:a,index:s}=t,n=i.getDatasetMeta(a).controller,{label:o,value:r}=n.getLabelAndValue(s);return{chart:i,label:o,parsed:n.getParsed(s),raw:i.data.datasets[a].data[s],formattedValue:r,dataset:n.getDataset(),dataIndex:s,datasetIndex:a,element:e}}function o0(i,t){const e=i.chart.ctx,{body:a,footer:s,title:n}=i,{boxWidth:o,boxHeight:r}=t,c=gt(t.bodyFont),d=gt(t.titleFont),l=gt(t.footerFont),p=n.length,u=s.length,g=a.length,M=At(t.padding);let f=M.height,v=0,m=a.reduce((b,x)=>b+x.before.length+x.lines.length+x.after.length,0);if(m+=i.beforeBody.length+i.afterBody.length,p&&(f+=p*d.lineHeight+(p-1)*t.titleSpacing+t.titleMarginBottom),m){const b=t.displayColors?Math.max(r,c.lineHeight):c.lineHeight;f+=g*b+(m-g)*c.lineHeight+(m-1)*t.bodySpacing}u&&(f+=t.footerMarginTop+u*l.lineHeight+(u-1)*t.footerSpacing);let y=0;const _=function(b){v=Math.max(v,e.measureText(b).width+y)};return e.save(),e.font=d.string,U(i.title,_),e.font=c.string,U(i.beforeBody.concat(i.afterBody),_),y=t.displayColors?o+2+t.boxPadding:0,U(a,b=>{U(b.before,_),U(b.lines,_),U(b.after,_)}),y=0,e.font=l.string,U(i.footer,_),e.restore(),v+=M.width,{width:v,height:f}}function VE(i,t){const{y:e,height:a}=t;return e<a/2?"top":e>i.height-a/2?"bottom":"center"}function TE(i,t,e,a){const{x:s,width:n}=a,o=e.caretSize+e.caretPadding;if(i==="left"&&s+n+o>t.width||i==="right"&&s-n-o<0)return!0}function EE(i,t,e,a){const{x:s,width:n}=e,{width:o,chartArea:{left:r,right:c}}=i;let d="center";return a==="center"?d=s<=(r+c)/2?"left":"right":s<=n/2?d="left":s>=o-n/2&&(d="right"),TE(d,i,t,e)&&(d="center"),d}function r0(i,t,e){const a=e.yAlign||t.yAlign||VE(i,e);return{xAlign:e.xAlign||t.xAlign||EE(i,t,e,a),yAlign:a}}function DE(i,t){let{x:e,width:a}=i;return t==="right"?e-=a:t==="center"&&(e-=a/2),e}function OE(i,t,e){let{y:a,height:s}=i;return t==="top"?a+=e:t==="bottom"?a-=s+e:a-=s/2,a}function h0(i,t,e,a){const{caretSize:s,caretPadding:n,cornerRadius:o}=i,{xAlign:r,yAlign:c}=e,d=s+n,{topLeft:l,topRight:p,bottomLeft:u,bottomRight:g}=la(o);let M=DE(t,r);const f=OE(t,c,d);return c==="center"?r==="left"?M+=d:r==="right"&&(M-=d):r==="left"?M-=Math.max(l,u)+s:r==="right"&&(M+=Math.max(p,g)+s),{x:ft(M,0,a.width-t.width),y:ft(f,0,a.height-t.height)}}function q1(i,t,e){const a=At(e.padding);return t==="center"?i.x+i.width/2:t==="right"?i.x+i.width-a.right:i.x+a.left}function c0(i){return se([],ve(i))}function RE(i,t,e){return Ye(i,{tooltip:t,tooltipItems:e,type:"tooltip"})}function d0(i,t){const e=t&&t.dataset&&t.dataset.tooltip&&t.dataset.tooltip.callbacks;return e?i.override(e):i}const _d={beforeTitle:fe,title(i){if(i.length>0){const t=i[0],e=t.chart.data.labels,a=e?e.length:0;if(this&&this.options&&this.options.mode==="dataset")return t.dataset.label||"";if(t.label)return t.label;if(a>0&&t.dataIndex<a)return e[t.dataIndex]}return""},afterTitle:fe,beforeBody:fe,beforeLabel:fe,label(i){if(this&&this.options&&this.options.mode==="dataset")return i.label+": "+i.formattedValue||i.formattedValue;let t=i.dataset.label||"";t&&(t+=": ");const e=i.formattedValue;return F(e)||(t+=e),t},labelColor(i){const e=i.chart.getDatasetMeta(i.datasetIndex).controller.getStyle(i.dataIndex);return{borderColor:e.borderColor,backgroundColor:e.backgroundColor,borderWidth:e.borderWidth,borderDash:e.borderDash,borderDashOffset:e.borderDashOffset,borderRadius:0}},labelTextColor(){return this.options.bodyColor},labelPointStyle(i){const e=i.chart.getDatasetMeta(i.datasetIndex).controller.getStyle(i.dataIndex);return{pointStyle:e.pointStyle,rotation:e.rotation}},afterLabel:fe,afterBody:fe,beforeFooter:fe,footer:fe,afterFooter:fe};function Pt(i,t,e,a){const s=i[t].call(e,a);return typeof s>"u"?_d[t].call(e,a):s}class Vs extends ae{constructor(t){super(),this.opacity=0,this._active=[],this._eventPosition=void 0,this._size=void 0,this._cachedAnimations=void 0,this._tooltipItems=[],this.$animations=void 0,this.$context=void 0,this.chart=t.chart,this.options=t.options,this.dataPoints=void 0,this.title=void 0,this.beforeBody=void 0,this.body=void 0,this.afterBody=void 0,this.footer=void 0,this.xAlign=void 0,this.yAlign=void 0,this.x=void 0,this.y=void 0,this.height=void 0,this.width=void 0,this.caretX=void 0,this.caretY=void 0,this.labelColors=void 0,this.labelPointStyles=void 0,this.labelTextColors=void 0}initialize(t){this.options=t,this._cachedAnimations=void 0,this.$context=void 0}_resolveAnimations(){const t=this._cachedAnimations;if(t)return t;const e=this.chart,a=this.options.setContext(this.getContext()),s=a.enabled&&e.options.animation&&a.animations,n=new td(this.chart,s);return s._cacheable&&(this._cachedAnimations=Object.freeze(n)),n}getContext(){return this.$context||(this.$context=RE(this.chart.getContext(),this,this._tooltipItems))}getTitle(t,e){const{callbacks:a}=e,s=Pt(a,"beforeTitle",this,t),n=Pt(a,"title",this,t),o=Pt(a,"afterTitle",this,t);let r=[];return r=se(r,ve(s)),r=se(r,ve(n)),r=se(r,ve(o)),r}getBeforeBody(t,e){return c0(Pt(e.callbacks,"beforeBody",this,t))}getBody(t,e){const{callbacks:a}=e,s=[];return U(t,n=>{const o={before:[],lines:[],after:[]},r=d0(a,n);se(o.before,ve(Pt(r,"beforeLabel",this,n))),se(o.lines,Pt(r,"label",this,n)),se(o.after,ve(Pt(r,"afterLabel",this,n))),s.push(o)}),s}getAfterBody(t,e){return c0(Pt(e.callbacks,"afterBody",this,t))}getFooter(t,e){const{callbacks:a}=e,s=Pt(a,"beforeFooter",this,t),n=Pt(a,"footer",this,t),o=Pt(a,"afterFooter",this,t);let r=[];return r=se(r,ve(s)),r=se(r,ve(n)),r=se(r,ve(o)),r}_createItems(t){const e=this._active,a=this.chart.data,s=[],n=[],o=[];let r=[],c,d;for(c=0,d=e.length;c<d;++c)r.push(HE(this.chart,e[c]));return t.filter&&(r=r.filter((l,p,u)=>t.filter(l,p,u,a))),t.itemSort&&(r=r.sort((l,p)=>t.itemSort(l,p,a))),U(r,l=>{const p=d0(t.callbacks,l);s.push(Pt(p,"labelColor",this,l)),n.push(Pt(p,"labelPointStyle",this,l)),o.push(Pt(p,"labelTextColor",this,l))}),this.labelColors=s,this.labelPointStyles=n,this.labelTextColors=o,this.dataPoints=r,r}update(t,e){const a=this.options.setContext(this.getContext()),s=this._active;let n,o=[];if(!s.length)this.opacity!==0&&(n={opacity:0});else{const r=Ya[a.position].call(this,s,this._eventPosition);o=this._createItems(a),this.title=this.getTitle(o,a),this.beforeBody=this.getBeforeBody(o,a),this.body=this.getBody(o,a),this.afterBody=this.getAfterBody(o,a),this.footer=this.getFooter(o,a);const c=this._size=o0(this,a),d=Object.assign({},r,c),l=r0(this.chart,a,d),p=h0(a,d,l,this.chart);this.xAlign=l.xAlign,this.yAlign=l.yAlign,n={opacity:1,x:p.x,y:p.y,width:c.width,height:c.height,caretX:r.x,caretY:r.y}}this._tooltipItems=o,this.$context=void 0,n&&this._resolveAnimations().update(this,n),t&&a.external&&a.external.call(this,{chart:this.chart,tooltip:this,replay:e})}drawCaret(t,e,a,s){const n=this.getCaretPosition(t,a,s);e.lineTo(n.x1,n.y1),e.lineTo(n.x2,n.y2),e.lineTo(n.x3,n.y3)}getCaretPosition(t,e,a){const{xAlign:s,yAlign:n}=this,{caretSize:o,cornerRadius:r}=a,{topLeft:c,topRight:d,bottomLeft:l,bottomRight:p}=la(r),{x:u,y:g}=t,{width:M,height:f}=e;let v,m,y,_,b,x;return n==="center"?(b=g+f/2,s==="left"?(v=u,m=v-o,_=b+o,x=b-o):(v=u+M,m=v+o,_=b-o,x=b+o),y=v):(s==="left"?m=u+Math.max(c,l)+o:s==="right"?m=u+M-Math.max(d,p)-o:m=this.caretX,n==="top"?(_=g,b=_-o,v=m-o,y=m+o):(_=g+f,b=_+o,v=m+o,y=m-o),x=_),{x1:v,x2:m,x3:y,y1:_,y2:b,y3:x}}drawTitle(t,e,a){const s=this.title,n=s.length;let o,r,c;if(n){const d=Aa(a.rtl,this.x,this.width);for(t.x=q1(this,a.titleAlign,a),e.textAlign=d.textAlign(a.titleAlign),e.textBaseline="middle",o=gt(a.titleFont),r=a.titleSpacing,e.fillStyle=a.titleColor,e.font=o.string,c=0;c<n;++c)e.fillText(s[c],d.x(t.x),t.y+o.lineHeight/2),t.y+=o.lineHeight+r,c+1===n&&(t.y+=a.titleMarginBottom-r)}}_drawColorBox(t,e,a,s,n){const o=this.labelColors[a],r=this.labelPointStyles[a],{boxHeight:c,boxWidth:d}=n,l=gt(n.bodyFont),p=q1(this,"left",n),u=s.x(p),g=c<l.lineHeight?(l.lineHeight-c)/2:0,M=e.y+g;if(n.usePointStyle){const f={radius:Math.min(d,c)/2,pointStyle:r.pointStyle,rotation:r.rotation,borderWidth:1},v=s.leftForLtr(u,d)+d/2,m=M+c/2;t.strokeStyle=n.multiKeyBackground,t.fillStyle=n.multiKeyBackground,Ss(t,f,v,m),t.strokeStyle=o.borderColor,t.fillStyle=o.backgroundColor,Ss(t,f,v,m)}else{t.lineWidth=z(o.borderWidth)?Math.max(...Object.values(o.borderWidth)):o.borderWidth||1,t.strokeStyle=o.borderColor,t.setLineDash(o.borderDash||[]),t.lineDashOffset=o.borderDashOffset||0;const f=s.leftForLtr(u,d),v=s.leftForLtr(s.xPlus(u,1),d-2),m=la(o.borderRadius);Object.values(m).some(y=>y!==0)?(t.beginPath(),t.fillStyle=n.multiKeyBackground,b1(t,{x:f,y:M,w:d,h:c,radius:m}),t.fill(),t.stroke(),t.fillStyle=o.backgroundColor,t.beginPath(),b1(t,{x:v,y:M+1,w:d-2,h:c-2,radius:m}),t.fill()):(t.fillStyle=n.multiKeyBackground,t.fillRect(f,M,d,c),t.strokeRect(f,M,d,c),t.fillStyle=o.backgroundColor,t.fillRect(v,M+1,d-2,c-2))}t.fillStyle=this.labelTextColors[a]}drawBody(t,e,a){const{body:s}=this,{bodySpacing:n,bodyAlign:o,displayColors:r,boxHeight:c,boxWidth:d,boxPadding:l}=a,p=gt(a.bodyFont);let u=p.lineHeight,g=0;const M=Aa(a.rtl,this.x,this.width),f=function(S){e.fillText(S,M.x(t.x+g),t.y+u/2),t.y+=u+n},v=M.textAlign(o);let m,y,_,b,x,k,w;for(e.textAlign=o,e.textBaseline="middle",e.font=p.string,t.x=q1(this,v,a),e.fillStyle=a.bodyColor,U(this.beforeBody,f),g=r&&v!=="right"?o==="center"?d/2+l:d+2+l:0,b=0,k=s.length;b<k;++b){for(m=s[b],y=this.labelTextColors[b],e.fillStyle=y,U(m.before,f),_=m.lines,r&&_.length&&(this._drawColorBox(e,t,b,M,a),u=Math.max(p.lineHeight,c)),x=0,w=_.length;x<w;++x)f(_[x]),u=p.lineHeight;U(m.after,f)}g=0,u=p.lineHeight,U(this.afterBody,f),t.y-=n}drawFooter(t,e,a){const s=this.footer,n=s.length;let o,r;if(n){const c=Aa(a.rtl,this.x,this.width);for(t.x=q1(this,a.footerAlign,a),t.y+=a.footerMarginTop,e.textAlign=c.textAlign(a.footerAlign),e.textBaseline="middle",o=gt(a.footerFont),e.fillStyle=a.footerColor,e.font=o.string,r=0;r<n;++r)e.fillText(s[r],c.x(t.x),t.y+o.lineHeight/2),t.y+=o.lineHeight+a.footerSpacing}}drawBackground(t,e,a,s){const{xAlign:n,yAlign:o}=this,{x:r,y:c}=t,{width:d,height:l}=a,{topLeft:p,topRight:u,bottomLeft:g,bottomRight:M}=la(s.cornerRadius);e.fillStyle=s.backgroundColor,e.strokeStyle=s.borderColor,e.lineWidth=s.borderWidth,e.beginPath(),e.moveTo(r+p,c),o==="top"&&this.drawCaret(t,e,a,s),e.lineTo(r+d-u,c),e.quadraticCurveTo(r+d,c,r+d,c+u),o==="center"&&n==="right"&&this.drawCaret(t,e,a,s),e.lineTo(r+d,c+l-M),e.quadraticCurveTo(r+d,c+l,r+d-M,c+l),o==="bottom"&&this.drawCaret(t,e,a,s),e.lineTo(r+g,c+l),e.quadraticCurveTo(r,c+l,r,c+l-g),o==="center"&&n==="left"&&this.drawCaret(t,e,a,s),e.lineTo(r,c+p),e.quadraticCurveTo(r,c,r+p,c),e.closePath(),e.fill(),s.borderWidth>0&&e.stroke()}_updateAnimationTarget(t){const e=this.chart,a=this.$animations,s=a&&a.x,n=a&&a.y;if(s||n){const o=Ya[t.position].call(this,this._active,this._eventPosition);if(!o)return;const r=this._size=o0(this,t),c=Object.assign({},o,this._size),d=r0(e,t,c),l=h0(t,c,d,e);(s._to!==l.x||n._to!==l.y)&&(this.xAlign=d.xAlign,this.yAlign=d.yAlign,this.width=r.width,this.height=r.height,this.caretX=o.x,this.caretY=o.y,this._resolveAnimations().update(this,l))}}_willRender(){return!!this.opacity}draw(t){const e=this.options.setContext(this.getContext());let a=this.opacity;if(!a)return;this._updateAnimationTarget(e);const s={width:this.width,height:this.height},n={x:this.x,y:this.y};a=Math.abs(a)<.001?0:a;const o=At(e.padding),r=this.title.length||this.beforeBody.length||this.body.length||this.afterBody.length||this.footer.length;e.enabled&&r&&(t.save(),t.globalAlpha=a,this.drawBackground(n,t,s,e),Yc(t,e.textDirection),n.y+=o.top,this.drawTitle(n,t,e),this.drawBody(n,t,e),this.drawFooter(n,t,e),Xc(t,e.textDirection),t.restore())}getActiveElements(){return this._active||[]}setActiveElements(t,e){const a=this._active,s=t.map(({datasetIndex:r,index:c})=>{const d=this.chart.getDatasetMeta(r);if(!d)throw new Error("Cannot find a dataset at index "+r);return{datasetIndex:r,element:d.data[c],index:c}}),n=!vi(a,s),o=this._positionChanged(s,e);(n||o)&&(this._active=s,this._eventPosition=e,this._ignoreReplayEvents=!0,this.update(!0))}handleEvent(t,e,a=!0){if(e&&this._ignoreReplayEvents)return!1;this._ignoreReplayEvents=!1;const s=this.options,n=this._active||[],o=this._getActiveElements(t,n,e,a),r=this._positionChanged(o,t),c=e||!vi(o,n)||r;return c&&(this._active=o,(s.enabled||s.external)&&(this._eventPosition={x:t.x,y:t.y},this.update(!0,e))),c}_getActiveElements(t,e,a,s){const n=this.options;if(t.type==="mouseout")return[];if(!s)return e.filter(r=>this.chart.data.datasets[r.datasetIndex]&&this.chart.getDatasetMeta(r.datasetIndex).controller.getParsed(r.index)!==void 0);const o=this.chart.getElementsAtEventForMode(t,n.mode,n,a);return n.reverse&&o.reverse(),o}_positionChanged(t,e){const{caretX:a,caretY:s,options:n}=this,o=Ya[n.position].call(this,t,e);return o!==!1&&(a!==o.x||s!==o.y)}}H(Vs,"positioners",Ya);var IE={id:"tooltip",_element:Vs,positioners:Ya,afterInit(i,t,e){e&&(i.tooltip=new Vs({chart:i,options:e}))},beforeUpdate(i,t,e){i.tooltip&&i.tooltip.initialize(e)},reset(i,t,e){i.tooltip&&i.tooltip.initialize(e)},afterDraw(i){const t=i.tooltip;if(t&&t._willRender()){const e={tooltip:t};if(i.notifyPlugins("beforeTooltipDraw",{...e,cancelable:!0})===!1)return;t.draw(i.ctx),i.notifyPlugins("afterTooltipDraw",e)}},afterEvent(i,t){if(i.tooltip){const e=t.replay;i.tooltip.handleEvent(t.event,e,t.inChartArea)&&(t.changed=!0)}},defaults:{enabled:!0,external:null,position:"average",backgroundColor:"rgba(0,0,0,0.8)",titleColor:"#fff",titleFont:{weight:"bold"},titleSpacing:2,titleMarginBottom:6,titleAlign:"left",bodyColor:"#fff",bodySpacing:2,bodyFont:{},bodyAlign:"left",footerColor:"#fff",footerSpacing:2,footerMarginTop:6,footerFont:{weight:"bold"},footerAlign:"left",padding:6,caretPadding:2,caretSize:5,cornerRadius:6,boxHeight:(i,t)=>t.bodyFont.size,boxWidth:(i,t)=>t.bodyFont.size,multiKeyBackground:"#fff",displayColors:!0,boxPadding:0,borderColor:"rgba(0,0,0,0)",borderWidth:0,animation:{duration:400,easing:"easeOutQuart"},animations:{numbers:{type:"number",properties:["x","y","width","height","caretX","caretY"]},opacity:{easing:"linear",duration:200}},callbacks:_d},defaultRoutes:{bodyFont:"font",footerFont:"font",titleFont:"font"},descriptors:{_scriptable:i=>i!=="filter"&&i!=="itemSort"&&i!=="external",_indexable:!1,callbacks:{_scriptable:!1,_indexable:!1},animation:{_fallback:!1},animations:{_fallback:"animation"}},additionalOptionScopes:["interaction"]},BE=Object.freeze({__proto__:null,Colors:GT,Decimation:tE,Filler:xE,Legend:AE,SubTitle:PE,Title:LE,Tooltip:IE});const FE=(i,t,e,a)=>(typeof t=="string"?(e=i.push(t)-1,a.unshift({index:e,label:t})):isNaN(t)&&(e=null),e);function zE(i,t,e,a){const s=i.indexOf(t);if(s===-1)return FE(i,t,e,a);const n=i.lastIndexOf(t);return s!==n?e:s}const NE=(i,t)=>i===null?null:ft(Math.round(i),0,t);function l0(i){const t=this.getLabels();return i>=0&&i<t.length?t[i]:i}class Ts extends va{constructor(t){super(t),this._startValue=void 0,this._valueRange=0,this._addedLabels=[]}init(t){const e=this._addedLabels;if(e.length){const a=this.getLabels();for(const{index:s,label:n}of e)a[s]===n&&a.splice(s,1);this._addedLabels=[]}super.init(t)}parse(t,e){if(F(t))return null;const a=this.getLabels();return e=isFinite(e)&&a[e]===t?e:zE(a,t,B(e,t),this._addedLabels),NE(e,a.length-1)}determineDataLimits(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let{min:a,max:s}=this.getMinMax(!0);this.options.bounds==="ticks"&&(t||(a=0),e||(s=this.getLabels().length-1)),this.min=a,this.max=s}buildTicks(){const t=this.min,e=this.max,a=this.options.offset,s=[];let n=this.getLabels();n=t===0&&e===n.length-1?n:n.slice(t,e+1),this._valueRange=Math.max(n.length-(a?0:1),1),this._startValue=this.min-(a?.5:0);for(let o=t;o<=e;o++)s.push({value:o});return s}getLabelForValue(t){return l0.call(this,t)}configure(){super.configure(),this.isHorizontal()||(this._reversePixels=!this._reversePixels)}getPixelForValue(t){return typeof t!="number"&&(t=this.parse(t)),t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getValueForPixel(t){return Math.round(this._startValue+this.getDecimalForPixel(t)*this._valueRange)}getBasePixel(){return this.bottom}}H(Ts,"id","category"),H(Ts,"defaults",{ticks:{callback:l0}});function ZE(i,t){const e=[],{bounds:s,step:n,min:o,max:r,precision:c,count:d,maxTicks:l,maxDigits:p,includeBounds:u}=i,g=n||1,M=l-1,{min:f,max:v}=t,m=!F(o),y=!F(r),_=!F(d),b=(v-f)/(p+1);let x=oh((v-f)/M/g)*g,k,w,S,A;if(x<1e-14&&!m&&!y)return[{value:f},{value:v}];A=Math.ceil(v/x)-Math.floor(f/x),A>M&&(x=oh(A*x/M/g)*g),F(c)||(k=Math.pow(10,c),x=Math.ceil(x*k)/k),s==="ticks"?(w=Math.floor(f/x)*x,S=Math.ceil(v/x)*x):(w=f,S=v),m&&y&&n&&DP((r-o)/n,x/1e3)?(A=Math.round(Math.min((r-o)/x,l)),x=(r-o)/A,w=o,S=r):_?(w=m?o:w,S=y?r:S,A=d-1,x=(S-w)/A):(A=(S-w)/x,e1(A,Math.round(A),x/1e3)?A=Math.round(A):A=Math.ceil(A));const C=Math.max(rh(x),rh(w));k=Math.pow(10,F(c)?C:c),w=Math.round(w*k)/k,S=Math.round(S*k)/k;let L=0;for(m&&(u&&w!==o?(e.push({value:o}),w<o&&L++,e1(Math.round((w+L*x)*k)/k,o,p0(o,b,i))&&L++):w<o&&L++);L<A;++L){const P=Math.round((w+L*x)*k)/k;if(y&&P>r)break;e.push({value:P})}return y&&u&&S!==r?e.length&&e1(e[e.length-1].value,r,p0(r,b,i))?e[e.length-1].value=r:e.push({value:r}):(!y||S===r)&&e.push({value:S}),e}function p0(i,t,{horizontal:e,minRotation:a}){const s=te(a),n=(e?Math.sin(s):Math.cos(s))||.001,o=.75*t*(""+i).length;return Math.min(t/n,o)}class Si extends va{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._endValue=void 0,this._valueRange=0}parse(t,e){return F(t)||(typeof t=="number"||t instanceof Number)&&!isFinite(+t)?null:+t}handleTickRangeOptions(){const{beginAtZero:t}=this.options,{minDefined:e,maxDefined:a}=this.getUserBounds();let{min:s,max:n}=this;const o=c=>s=e?s:c,r=c=>n=a?n:c;if(t){const c=pe(s),d=pe(n);c<0&&d<0?r(0):c>0&&d>0&&o(0)}if(s===n){let c=n===0?1:Math.abs(n*.05);r(n+c),t||o(s-c)}this.min=s,this.max=n}getTickLimit(){const t=this.options.ticks;let{maxTicksLimit:e,stepSize:a}=t,s;return a?(s=Math.ceil(this.max/a)-Math.floor(this.min/a)+1,s>1e3&&(console.warn(`scales.${this.id}.ticks.stepSize: ${a} would result generating up to ${s} ticks. Limiting to 1000.`),s=1e3)):(s=this.computeTickLimit(),e=e||11),e&&(s=Math.min(e,s)),s}computeTickLimit(){return Number.POSITIVE_INFINITY}buildTicks(){const t=this.options,e=t.ticks;let a=this.getTickLimit();a=Math.max(2,a);const s={maxTicks:a,bounds:t.bounds,min:t.min,max:t.max,precision:e.precision,step:e.stepSize,count:e.count,maxDigits:this._maxDigits(),horizontal:this.isHorizontal(),minRotation:e.minRotation||0,includeBounds:e.includeBounds!==!1},n=this._range||this,o=ZE(s,n);return t.bounds==="ticks"&&Vc(o,this,"value"),t.reverse?(o.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),o}configure(){const t=this.ticks;let e=this.min,a=this.max;if(super.configure(),this.options.offset&&t.length){const s=(a-e)/Math.max(t.length-1,1)/2;e-=s,a+=s}this._startValue=e,this._endValue=a,this._valueRange=a-e}getLabelForValue(t){return H1(t,this.chart.options.locale,this.options.ticks.format)}}class Es extends Si{determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=rt(t)?t:0,this.max=rt(e)?e:1,this.handleTickRangeOptions()}computeTickLimit(){const t=this.isHorizontal(),e=t?this.width:this.height,a=te(this.options.ticks.minRotation),s=(t?Math.sin(a):Math.cos(a))||.001,n=this._resolveTickFontOptions(0);return Math.ceil(e/Math.min(40,n.lineHeight/s))}getPixelForValue(t){return t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getValueForPixel(t){return this._startValue+this.getDecimalForPixel(t)*this._valueRange}}H(Es,"id","linear"),H(Es,"defaults",{ticks:{callback:Li.formatters.numeric}});const S1=i=>Math.floor(Ee(i)),ta=(i,t)=>Math.pow(10,S1(i)+t);function u0(i){return i/Math.pow(10,S1(i))===1}function g0(i,t,e){const a=Math.pow(10,e),s=Math.floor(i/a);return Math.ceil(t/a)-s}function WE(i,t){const e=t-i;let a=S1(e);for(;g0(i,t,a)>10;)a++;for(;g0(i,t,a)<10;)a--;return Math.min(a,S1(i))}function UE(i,{min:t,max:e}){t=Bt(i.min,t);const a=[],s=S1(t);let n=WE(t,e),o=n<0?Math.pow(10,Math.abs(n)):1;const r=Math.pow(10,n),c=s>n?Math.pow(10,s):0,d=Math.round((t-c)*o)/o,l=Math.floor((t-c)/r/10)*r*10;let p=Math.floor((d-l)/Math.pow(10,n)),u=Bt(i.min,Math.round((c+l+p*Math.pow(10,n))*o)/o);for(;u<e;)a.push({value:u,major:u0(u),significand:p}),p>=10?p=p<15?15:20:p++,p>=20&&(n++,p=2,o=n>=0?1:o),u=Math.round((c+l+p*Math.pow(10,n))*o)/o;const g=Bt(i.max,u);return a.push({value:g,major:u0(g),significand:p}),a}class Ds extends va{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._valueRange=0}parse(t,e){const a=Si.prototype.parse.apply(this,[t,e]);if(a===0){this._zero=!0;return}return rt(a)&&a>0?a:null}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=rt(t)?Math.max(0,t):null,this.max=rt(e)?Math.max(0,e):null,this.options.beginAtZero&&(this._zero=!0),this._zero&&this.min!==this._suggestedMin&&!rt(this._userMin)&&(this.min=t===ta(this.min,0)?ta(this.min,-1):ta(this.min,0)),this.handleTickRangeOptions()}handleTickRangeOptions(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let a=this.min,s=this.max;const n=r=>a=t?a:r,o=r=>s=e?s:r;a===s&&(a<=0?(n(1),o(10)):(n(ta(a,-1)),o(ta(s,1)))),a<=0&&n(ta(s,-1)),s<=0&&o(ta(a,1)),this.min=a,this.max=s}buildTicks(){const t=this.options,e={min:this._userMin,max:this._userMax},a=UE(e,this);return t.bounds==="ticks"&&Vc(a,this,"value"),t.reverse?(a.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),a}getLabelForValue(t){return t===void 0?"0":H1(t,this.chart.options.locale,this.options.ticks.format)}configure(){const t=this.min;super.configure(),this._startValue=Ee(t),this._valueRange=Ee(this.max)-Ee(t)}getPixelForValue(t){return(t===void 0||t===0)&&(t=this.min),t===null||isNaN(t)?NaN:this.getPixelForDecimal(t===this.min?0:(Ee(t)-this._startValue)/this._valueRange)}getValueForPixel(t){const e=this.getDecimalForPixel(t);return Math.pow(10,this._startValue+e*this._valueRange)}}H(Ds,"id","logarithmic"),H(Ds,"defaults",{ticks:{callback:Li.formatters.logarithmic,major:{enabled:!0}}});function Os(i){const t=i.ticks;if(t.display&&i.display){const e=At(t.backdropPadding);return B(t.font&&t.font.size,et.font.size)+e.height}return 0}function qE(i,t,e){return e=tt(e)?e:[e],{w:KP(i,t.string,e),h:e.length*t.lineHeight}}function f0(i,t,e,a,s){return i===a||i===s?{start:t-e/2,end:t+e/2}:i<a||i>s?{start:t-e,end:t}:{start:t,end:t+e}}function $E(i){const t={l:i.left+i._padding.left,r:i.right-i._padding.right,t:i.top+i._padding.top,b:i.bottom-i._padding.bottom},e=Object.assign({},t),a=[],s=[],n=i._pointLabels.length,o=i.options.pointLabels,r=o.centerPointLabels?Z/n:0;for(let c=0;c<n;c++){const d=o.setContext(i.getPointLabelContext(c));s[c]=d.padding;const l=i.getPointPosition(c,i.drawingArea+s[c],r),p=gt(d.font),u=qE(i.ctx,p,i._pointLabels[c]);a[c]=u;const g=bt(i.getIndexAngle(c)+r),M=Math.round(cn(g)),f=f0(M,l.x,u.w,0,180),v=f0(M,l.y,u.h,90,270);jE(e,t,g,f,v)}i.setCenterPoint(t.l-e.l,e.r-t.r,t.t-e.t,e.b-t.b),i._pointLabelItems=GE(i,a,s)}function jE(i,t,e,a,s){const n=Math.abs(Math.sin(e)),o=Math.abs(Math.cos(e));let r=0,c=0;a.start<t.l?(r=(t.l-a.start)/n,i.l=Math.min(i.l,t.l-r)):a.end>t.r&&(r=(a.end-t.r)/n,i.r=Math.max(i.r,t.r+r)),s.start<t.t?(c=(t.t-s.start)/o,i.t=Math.min(i.t,t.t-c)):s.end>t.b&&(c=(s.end-t.b)/o,i.b=Math.max(i.b,t.b+c))}function YE(i,t,e){const a=i.drawingArea,{extra:s,additionalAngle:n,padding:o,size:r}=e,c=i.getPointPosition(t,a+s+o,n),d=Math.round(cn(bt(c.angle+ct))),l=QE(c.y,r.h,d),p=KE(d),u=JE(c.x,r.w,p);return{visible:!0,x:c.x,y:l,textAlign:p,left:u,top:l,right:u+r.w,bottom:l+r.h}}function XE(i,t){if(!t)return!0;const{left:e,top:a,right:s,bottom:n}=i;return!(ke({x:e,y:a},t)||ke({x:e,y:n},t)||ke({x:s,y:a},t)||ke({x:s,y:n},t))}function GE(i,t,e){const a=[],s=i._pointLabels.length,n=i.options,{centerPointLabels:o,display:r}=n.pointLabels,c={extra:Os(n)/2,additionalAngle:o?Z/s:0};let d;for(let l=0;l<s;l++){c.padding=e[l],c.size=t[l];const p=YE(i,l,c);a.push(p),r==="auto"&&(p.visible=XE(p,d),p.visible&&(d=p))}return a}function KE(i){return i===0||i===180?"center":i<180?"left":"right"}function JE(i,t,e){return e==="right"?i-=t:e==="center"&&(i-=t/2),i}function QE(i,t,e){return e===90||e===270?i-=t/2:(e>270||e<90)&&(i-=t),i}function tD(i,t,e){const{left:a,top:s,right:n,bottom:o}=e,{backdropColor:r}=t;if(!F(r)){const c=la(t.borderRadius),d=At(t.backdropPadding);i.fillStyle=r;const l=a-d.left,p=s-d.top,u=n-a+d.width,g=o-s+d.height;Object.values(c).some(M=>M!==0)?(i.beginPath(),b1(i,{x:l,y:p,w:u,h:g,radius:c}),i.fill()):i.fillRect(l,p,u,g)}}function eD(i,t){const{ctx:e,options:{pointLabels:a}}=i;for(let s=t-1;s>=0;s--){const n=i._pointLabelItems[s];if(!n.visible)continue;const o=a.setContext(i.getPointLabelContext(s));tD(e,o,n);const r=gt(o.font),{x:c,y:d,textAlign:l}=n;fa(e,i._pointLabels[s],c,d+r.lineHeight/2,r,{color:o.color,textAlign:l,textBaseline:"middle"})}}function bd(i,t,e,a){const{ctx:s}=i;if(e)s.arc(i.xCenter,i.yCenter,t,0,J);else{let n=i.getPointPosition(0,t);s.moveTo(n.x,n.y);for(let o=1;o<a;o++)n=i.getPointPosition(o,t),s.lineTo(n.x,n.y)}}function aD(i,t,e,a,s){const n=i.ctx,o=t.circular,{color:r,lineWidth:c}=t;!o&&!a||!r||!c||e<0||(n.save(),n.strokeStyle=r,n.lineWidth=c,n.setLineDash(s.dash||[]),n.lineDashOffset=s.dashOffset,n.beginPath(),bd(i,e,o,a),n.closePath(),n.stroke(),n.restore())}function iD(i,t,e){return Ye(i,{label:e,index:t,type:"pointLabel"})}class Xa extends Si{constructor(t){super(t),this.xCenter=void 0,this.yCenter=void 0,this.drawingArea=void 0,this._pointLabels=[],this._pointLabelItems=[]}setDimensions(){const t=this._padding=At(Os(this.options)/2),e=this.width=this.maxWidth-t.width,a=this.height=this.maxHeight-t.height;this.xCenter=Math.floor(this.left+e/2+t.left),this.yCenter=Math.floor(this.top+a/2+t.top),this.drawingArea=Math.floor(Math.min(e,a)/2)}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!1);this.min=rt(t)&&!isNaN(t)?t:0,this.max=rt(e)&&!isNaN(e)?e:0,this.handleTickRangeOptions()}computeTickLimit(){return Math.ceil(this.drawingArea/Os(this.options))}generateTickLabels(t){Si.prototype.generateTickLabels.call(this,t),this._pointLabels=this.getLabels().map((e,a)=>{const s=X(this.options.pointLabels.callback,[e,a],this);return s||s===0?s:""}).filter((e,a)=>this.chart.getDataVisibility(a))}fit(){const t=this.options;t.display&&t.pointLabels.display?$E(this):this.setCenterPoint(0,0,0,0)}setCenterPoint(t,e,a,s){this.xCenter+=Math.floor((t-e)/2),this.yCenter+=Math.floor((a-s)/2),this.drawingArea-=Math.min(this.drawingArea/2,Math.max(t,e,a,s))}getIndexAngle(t){const e=J/(this._pointLabels.length||1),a=this.options.startAngle||0;return bt(t*e+te(a))}getDistanceFromCenterForValue(t){if(F(t))return NaN;const e=this.drawingArea/(this.max-this.min);return this.options.reverse?(this.max-t)*e:(t-this.min)*e}getValueForDistanceFromCenter(t){if(F(t))return NaN;const e=t/(this.drawingArea/(this.max-this.min));return this.options.reverse?this.max-e:this.min+e}getPointLabelContext(t){const e=this._pointLabels||[];if(t>=0&&t<e.length){const a=e[t];return iD(this.getContext(),t,a)}}getPointPosition(t,e,a=0){const s=this.getIndexAngle(t)-ct+a;return{x:Math.cos(s)*e+this.xCenter,y:Math.sin(s)*e+this.yCenter,angle:s}}getPointPositionForValue(t,e){return this.getPointPosition(t,this.getDistanceFromCenterForValue(e))}getBasePosition(t){return this.getPointPositionForValue(t||0,this.getBaseValue())}getPointLabelPosition(t){const{left:e,top:a,right:s,bottom:n}=this._pointLabelItems[t];return{left:e,top:a,right:s,bottom:n}}drawBackground(){const{backgroundColor:t,grid:{circular:e}}=this.options;if(t){const a=this.ctx;a.save(),a.beginPath(),bd(this,this.getDistanceFromCenterForValue(this._endValue),e,this._pointLabels.length),a.closePath(),a.fillStyle=t,a.fill(),a.restore()}}drawGrid(){const t=this.ctx,e=this.options,{angleLines:a,grid:s,border:n}=e,o=this._pointLabels.length;let r,c,d;if(e.pointLabels.display&&eD(this,o),s.display&&this.ticks.forEach((l,p)=>{if(p!==0||p===0&&this.min<0){c=this.getDistanceFromCenterForValue(l.value);const u=this.getContext(p),g=s.setContext(u),M=n.setContext(u);aD(this,g,c,o,M)}}),a.display){for(t.save(),r=o-1;r>=0;r--){const l=a.setContext(this.getPointLabelContext(r)),{color:p,lineWidth:u}=l;!u||!p||(t.lineWidth=u,t.strokeStyle=p,t.setLineDash(l.borderDash),t.lineDashOffset=l.borderDashOffset,c=this.getDistanceFromCenterForValue(e.reverse?this.min:this.max),d=this.getPointPosition(r,c),t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(d.x,d.y),t.stroke())}t.restore()}}drawBorder(){}drawLabels(){const t=this.ctx,e=this.options,a=e.ticks;if(!a.display)return;const s=this.getIndexAngle(0);let n,o;t.save(),t.translate(this.xCenter,this.yCenter),t.rotate(s),t.textAlign="center",t.textBaseline="middle",this.ticks.forEach((r,c)=>{if(c===0&&this.min>=0&&!e.reverse)return;const d=a.setContext(this.getContext(c)),l=gt(d.font);if(n=this.getDistanceFromCenterForValue(this.ticks[c].value),d.showLabelBackdrop){t.font=l.string,o=t.measureText(r.label).width,t.fillStyle=d.backdropColor;const p=At(d.backdropPadding);t.fillRect(-o/2-p.left,-n-l.size/2-p.top,o+p.width,l.size+p.height)}fa(t,r.label,0,-n,l,{color:d.color,strokeColor:d.textStrokeColor,strokeWidth:d.textStrokeWidth})}),t.restore()}drawTitle(){}}H(Xa,"id","radialLinear"),H(Xa,"defaults",{display:!0,animate:!0,position:"chartArea",angleLines:{display:!0,lineWidth:1,borderDash:[],borderDashOffset:0},grid:{circular:!1},startAngle:0,ticks:{showLabelBackdrop:!0,callback:Li.formatters.numeric},pointLabels:{backdropColor:void 0,backdropPadding:2,display:!0,font:{size:10},callback(t){return t},padding:5,centerPointLabels:!1}}),H(Xa,"defaultRoutes",{"angleLines.color":"borderColor","pointLabels.color":"color","ticks.color":"color"}),H(Xa,"descriptors",{angleLines:{_fallback:"grid"}});const Di={millisecond:{common:!0,size:1,steps:1e3},second:{common:!0,size:1e3,steps:60},minute:{common:!0,size:6e4,steps:60},hour:{common:!0,size:36e5,steps:24},day:{common:!0,size:864e5,steps:30},week:{common:!1,size:6048e5,steps:4},month:{common:!0,size:2628e6,steps:12},quarter:{common:!1,size:7884e6,steps:4},year:{common:!0,size:3154e7}},Vt=Object.keys(Di);function M0(i,t){return i-t}function v0(i,t){if(F(t))return null;const e=i._adapter,{parser:a,round:s,isoWeekday:n}=i._parseOpts;let o=t;return typeof a=="function"&&(o=a(o)),rt(o)||(o=typeof a=="string"?e.parse(o,a):e.parse(o)),o===null?null:(s&&(o=s==="week"&&(Ea(n)||n===!0)?e.startOf(o,"isoWeek",n):e.startOf(o,s)),+o)}function m0(i,t,e,a){const s=Vt.length;for(let n=Vt.indexOf(i);n<s-1;++n){const o=Di[Vt[n]],r=o.steps?o.steps:Number.MAX_SAFE_INTEGER;if(o.common&&Math.ceil((e-t)/(r*o.size))<=a)return Vt[n]}return Vt[s-1]}function sD(i,t,e,a,s){for(let n=Vt.length-1;n>=Vt.indexOf(e);n--){const o=Vt[n];if(Di[o].common&&i._adapter.diff(s,a,o)>=t-1)return o}return Vt[e?Vt.indexOf(e):0]}function nD(i){for(let t=Vt.indexOf(i)+1,e=Vt.length;t<e;++t)if(Di[Vt[t]].common)return Vt[t]}function y0(i,t,e){if(!e)i[t]=!0;else if(e.length){const{lo:a,hi:s}=dn(e,t),n=e[a]>=t?e[a]:e[s];i[n]=!0}}function oD(i,t,e,a){const s=i._adapter,n=+s.startOf(t[0].value,a),o=t[t.length-1].value;let r,c;for(r=n;r<=o;r=+s.add(r,1,a))c=e[r],c>=0&&(t[c].major=!0);return t}function x0(i,t,e){const a=[],s={},n=t.length;let o,r;for(o=0;o<n;++o)r=t[o],s[r]=o,a.push({value:r,major:!1});return n===0||!e?a:oD(i,a,s,e)}class k1 extends va{constructor(t){super(t),this._cache={data:[],labels:[],all:[]},this._unit="day",this._majorUnit=void 0,this._offsets={},this._normalized=!1,this._parseOpts=void 0}init(t,e={}){const a=t.time||(t.time={}),s=this._adapter=new gV._date(t.adapters.date);s.init(e),t1(a.displayFormats,s.formats()),this._parseOpts={parser:a.parser,round:a.round,isoWeekday:a.isoWeekday},super.init(t),this._normalized=e.normalized}parse(t,e){return t===void 0?null:v0(this,t)}beforeLayout(){super.beforeLayout(),this._cache={data:[],labels:[],all:[]}}determineDataLimits(){const t=this.options,e=this._adapter,a=t.time.unit||"day";let{min:s,max:n,minDefined:o,maxDefined:r}=this.getUserBounds();function c(d){!o&&!isNaN(d.min)&&(s=Math.min(s,d.min)),!r&&!isNaN(d.max)&&(n=Math.max(n,d.max))}(!o||!r)&&(c(this._getLabelBounds()),(t.bounds!=="ticks"||t.ticks.source!=="labels")&&c(this.getMinMax(!1))),s=rt(s)&&!isNaN(s)?s:+e.startOf(Date.now(),a),n=rt(n)&&!isNaN(n)?n:+e.endOf(Date.now(),a)+1,this.min=Math.min(s,n-1),this.max=Math.max(s+1,n)}_getLabelBounds(){const t=this.getLabelTimestamps();let e=Number.POSITIVE_INFINITY,a=Number.NEGATIVE_INFINITY;return t.length&&(e=t[0],a=t[t.length-1]),{min:e,max:a}}buildTicks(){const t=this.options,e=t.time,a=t.ticks,s=a.source==="labels"?this.getLabelTimestamps():this._generate();t.bounds==="ticks"&&s.length&&(this.min=this._userMin||s[0],this.max=this._userMax||s[s.length-1]);const n=this.min,o=this.max,r=BP(s,n,o);return this._unit=e.unit||(a.autoSkip?m0(e.minUnit,this.min,this.max,this._getLabelCapacity(n)):sD(this,r.length,e.minUnit,this.min,this.max)),this._majorUnit=!a.major.enabled||this._unit==="year"?void 0:nD(this._unit),this.initOffsets(s),t.reverse&&r.reverse(),x0(this,r,this._majorUnit)}afterAutoSkip(){this.options.offsetAfterAutoskip&&this.initOffsets(this.ticks.map(t=>+t.value))}initOffsets(t=[]){let e=0,a=0,s,n;this.options.offset&&t.length&&(s=this.getDecimalForValue(t[0]),t.length===1?e=1-s:e=(this.getDecimalForValue(t[1])-s)/2,n=this.getDecimalForValue(t[t.length-1]),t.length===1?a=n:a=(n-this.getDecimalForValue(t[t.length-2]))/2);const o=t.length<3?.5:.25;e=ft(e,0,o),a=ft(a,0,o),this._offsets={start:e,end:a,factor:1/(e+1+a)}}_generate(){const t=this._adapter,e=this.min,a=this.max,s=this.options,n=s.time,o=n.unit||m0(n.minUnit,e,a,this._getLabelCapacity(e)),r=B(s.ticks.stepSize,1),c=o==="week"?n.isoWeekday:!1,d=Ea(c)||c===!0,l={};let p=e,u,g;if(d&&(p=+t.startOf(p,"isoWeek",c)),p=+t.startOf(p,d?"day":o),t.diff(a,e,o)>1e5*r)throw new Error(e+" and "+a+" are too far apart with stepSize of "+r+" "+o);const M=s.ticks.source==="data"&&this.getDataTimestamps();for(u=p,g=0;u<a;u=+t.add(u,r,o),g++)y0(l,u,M);return(u===a||s.bounds==="ticks"||g===1)&&y0(l,u,M),Object.keys(l).sort(M0).map(f=>+f)}getLabelForValue(t){const e=this._adapter,a=this.options.time;return a.tooltipFormat?e.format(t,a.tooltipFormat):e.format(t,a.displayFormats.datetime)}format(t,e){const s=this.options.time.displayFormats,n=this._unit,o=e||s[n];return this._adapter.format(t,o)}_tickFormatFunction(t,e,a,s){const n=this.options,o=n.ticks.callback;if(o)return X(o,[t,e,a],this);const r=n.time.displayFormats,c=this._unit,d=this._majorUnit,l=c&&r[c],p=d&&r[d],u=a[e],g=d&&p&&u&&u.major;return this._adapter.format(t,s||(g?p:l))}generateTickLabels(t){let e,a,s;for(e=0,a=t.length;e<a;++e)s=t[e],s.label=this._tickFormatFunction(s.value,e,t)}getDecimalForValue(t){return t===null?NaN:(t-this.min)/(this.max-this.min)}getPixelForValue(t){const e=this._offsets,a=this.getDecimalForValue(t);return this.getPixelForDecimal((e.start+a)*e.factor)}getValueForPixel(t){const e=this._offsets,a=this.getDecimalForPixel(t)/e.factor-e.end;return this.min+a*(this.max-this.min)}_getLabelSize(t){const e=this.options.ticks,a=this.ctx.measureText(t).width,s=te(this.isHorizontal()?e.maxRotation:e.minRotation),n=Math.cos(s),o=Math.sin(s),r=this._resolveTickFontOptions(0).size;return{w:a*n+r*o,h:a*o+r*n}}_getLabelCapacity(t){const e=this.options.time,a=e.displayFormats,s=a[e.unit]||a.millisecond,n=this._tickFormatFunction(t,0,x0(this,[t],this._majorUnit),s),o=this._getLabelSize(n),r=Math.floor(this.isHorizontal()?this.width/o.w:this.height/o.h)-1;return r>0?r:1}getDataTimestamps(){let t=this._cache.data||[],e,a;if(t.length)return t;const s=this.getMatchingVisibleMetas();if(this._normalized&&s.length)return this._cache.data=s[0].controller.getAllParsedValues(this);for(e=0,a=s.length;e<a;++e)t=t.concat(s[e].controller.getAllParsedValues(this));return this._cache.data=this.normalize(t)}getLabelTimestamps(){const t=this._cache.labels||[];let e,a;if(t.length)return t;const s=this.getLabels();for(e=0,a=s.length;e<a;++e)t.push(v0(this,s[e]));return this._cache.labels=this._normalized?t:this.normalize(t)}normalize(t){return Dc(t.sort(M0))}}H(k1,"id","time"),H(k1,"defaults",{bounds:"data",adapters:{},time:{parser:!1,unit:!1,round:!1,isoWeekday:!1,minUnit:"millisecond",displayFormats:{}},ticks:{source:"auto",callback:!1,major:{enabled:!1}}});function $1(i,t,e){let a=0,s=i.length-1,n,o,r,c;e?(t>=i[a].pos&&t<=i[s].pos&&({lo:a,hi:s}=Se(i,"pos",t)),{pos:n,time:r}=i[a],{pos:o,time:c}=i[s]):(t>=i[a].time&&t<=i[s].time&&({lo:a,hi:s}=Se(i,"time",t)),{time:n,pos:r}=i[a],{time:o,pos:c}=i[s]);const d=o-n;return d?r+(c-r)*(t-n)/d:r}class Rs extends k1{constructor(t){super(t),this._table=[],this._minPos=void 0,this._tableRange=void 0}initOffsets(){const t=this._getTimestampsForTable(),e=this._table=this.buildLookupTable(t);this._minPos=$1(e,this.min),this._tableRange=$1(e,this.max)-this._minPos,super.initOffsets(t)}buildLookupTable(t){const{min:e,max:a}=this,s=[],n=[];let o,r,c,d,l;for(o=0,r=t.length;o<r;++o)d=t[o],d>=e&&d<=a&&s.push(d);if(s.length<2)return[{time:e,pos:0},{time:a,pos:1}];for(o=0,r=s.length;o<r;++o)l=s[o+1],c=s[o-1],d=s[o],Math.round((l+c)/2)!==d&&n.push({time:d,pos:o/(r-1)});return n}_generate(){const t=this.min,e=this.max;let a=super.getDataTimestamps();return(!a.includes(t)||!a.length)&&a.splice(0,0,t),(!a.includes(e)||a.length===1)&&a.push(e),a.sort((s,n)=>s-n)}_getTimestampsForTable(){let t=this._cache.all||[];if(t.length)return t;const e=this.getDataTimestamps(),a=this.getLabelTimestamps();return e.length&&a.length?t=this.normalize(e.concat(a)):t=e.length?e:a,t=this._cache.all=t,t}getDecimalForValue(t){return($1(this._table,t)-this._minPos)/this._tableRange}getValueForPixel(t){const e=this._offsets,a=this.getDecimalForPixel(t)/e.factor-e.end;return $1(this._table,a*this._tableRange+this._minPos,!0)}}H(Rs,"id","timeseries"),H(Rs,"defaults",k1.defaults);var rD=Object.freeze({__proto__:null,CategoryScale:Ts,LinearScale:Es,LogarithmicScale:Ds,RadialLinearScale:Xa,TimeScale:k1,TimeSeriesScale:Rs});const hD=[uV,WT,BE,rD];be.register(...hD);let ns=null;function _n(i="throughput",t=!1){const e=document.getElementById("analyticsChart");if(!e)return;const a=e.getContext("2d");ns&&ns.destroy();const s=t?"#38bdf8":"#0284c7",n=t?"rgba(255, 255, 255, 0.1)":"rgba(0, 0, 0, 0.05)",o=t?"#94a3b8":"#64748b";let r=[1200,980,2400,3100,2850,3400,4120],c="Gateway Throughput (Req/s)";i==="latency"?(r=[18,14,22,12,15,11,9],c="Average Latency (ms)"):i==="failed"&&(r=[3,1,12,4,2,8,1],c="Failed Login Attempts"),ns=new be(a,{type:"line",data:{labels:["00:00","04:00","08:00","12:00","16:00","20:00","Now"],datasets:[{label:c,data:r,borderColor:s,borderWidth:3,fill:!0,backgroundColor:t?"rgba(56, 189, 248, 0.12)":"rgba(2, 132, 199, 0.08)",tension:.4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{x:{grid:{color:n},ticks:{color:o,font:{size:10,weight:"600"}}},y:{grid:{color:n},ticks:{color:o,font:{size:10,weight:"600"}}}}}})}function cD(i,t){R(`METRIC_VIEW: Changed dashboard metric to ${i.toUpperCase()}`),_n(i,t)}const _0={ID:{step1Title:"Masuk ke Enterprise Workspace",step1Desc:"Masukkan email perusahaan untuk resolusi tenant otomatis.",emailLabel:"Email Corporate",continueBtn:"Lanjutkan",orSSO:"atau opsi masuk",demoError:"Simulasi Maintenance / Network Error State",changeBtn:"Ganti",passLabel:"Kata Sandi Enterprise",trustDevice:"Percayai perangkat ini (30 hari)",forgotPass:"Lupa Sandi?",authVerifyBtn:"Otentikasi & Verifikasi Risiko",mfaTitle:"Verifikasi MFA Berbasis Risiko",mfaDesc:"Masukkan kode verifikasi 6 digit dari authenticator"},EN:{step1Title:"Sign in to Enterprise Workspace",step1Desc:"Enter corporate email for automatic tenant resolution.",emailLabel:"Corporate Email",continueBtn:"Continue",orSSO:"or sign-in options",demoError:"Simulate Maintenance / Network Error State",changeBtn:"Change",passLabel:"Enterprise Password",trustDevice:"Trust this device (30 days)",forgotPass:"Forgot Password?",authVerifyBtn:"Authenticate & Verify Risk",mfaTitle:"Risk-Based MFA Verification",mfaDesc:"Enter the 6-digit verification code from your authenticator"}};function dD(i){i.isDarkMode=!i.isDarkMode,document.documentElement.classList.toggle("dark",i.isDarkMode);const t=document.getElementById("themeIcon"),e=document.getElementById("dashThemeIcon"),a=i.isDarkMode?"sun":"moon";t&&t.setAttribute("data-lucide",a),e&&e.setAttribute("data-lucide",a),$t(),ut(`Mode Tampilan: ${i.isDarkMode?"Dark Mode":"Light Mode"}`),R(`THEME_CHANGE: Switched to ${i.isDarkMode?"Dark":"Light"} Mode`)}function lD(i){i.currentLang=i.currentLang==="ID"?"EN":"ID";const t=document.getElementById("langLabel");t&&(t.textContent=i.currentLang),document.querySelectorAll("[data-i18n]").forEach(e=>{const a=e.getAttribute("data-i18n");_0[i.currentLang][a]&&(e.textContent=_0[i.currentLang][a])}),ut(`Bahasa diubah ke ${i.currentLang==="ID"?"Bahasa Indonesia":"English"}`),R(`LOCALE_CHANGE: Language set to ${i.currentLang}`)}function wd(i){const t=document.getElementById(i);t&&(t.classList.remove("hidden"),le.to(t,{opacity:1,duration:.3}))}function bn(i){const t=document.getElementById(i);t&&le.to(t,{opacity:0,duration:.2,onComplete:()=>t.classList.add("hidden")})}const b0={idle:{title:"Ready",text:"Choose an authentication method."},loading:{title:"Verifying identity",text:"Securely processing your request…"},success:{title:"Identity verified",text:"Authentication completed successfully."},error:{title:"Verification failed",text:"We could not complete this step. Try again or choose another method."},locked:{title:"Temporarily locked",text:"Additional attempts are blocked for this challenge."}};function Sd(){if(document.getElementById("authStatusPanel"))return document.getElementById("authStatusPanel");const i=document.createElement("div");i.id="authStatusPanel",i.className="auth-status-panel hidden",i.setAttribute("role","status"),i.setAttribute("aria-live","polite"),i.innerHTML='<div id="authStatusIcon" class="auth-status-icon"><i data-lucide="shield-check" class="w-4 h-4"></i></div><div class="min-w-0"><div id="authStatusTitle" class="auth-status-title"></div><div id="authStatusText" class="auth-status-text"></div></div>';const t=document.getElementById("authStepViewport");return t==null||t.prepend(i),$t(),i}function nt(i="idle",t=""){var n;const e=Sd();if(i==="idle")return re(),e;const a=b0[i]||b0.idle;e.classList.remove("hidden","status-loading","status-success","status-error","status-locked"),e.classList.add(`status-${i}`),e.dataset.state=i,document.getElementById("authStatusTitle").textContent=a.title,document.getElementById("authStatusText").textContent=t||a.text;const s=(n=document.getElementById("authStatusIcon"))==null?void 0:n.querySelector("[data-lucide]");return s&&s.setAttribute("data-lucide",i==="loading"?"loader-circle":i==="success"?"badge-check":i==="error"?"triangle-alert":i==="locked"?"lock-keyhole":"shield-check"),$t(),i==="loading"&&le.to(e,{opacity:1,duration:.15}),["error","locked"].includes(i)&&(e.setAttribute("tabindex","-1"),requestAnimationFrame(()=>e.focus({preventScroll:!0}))),e}function re(){var i;(i=document.getElementById("authStatusPanel"))==null||i.classList.add("hidden")}function K(i,t,e="Processing…"){i&&(t?(i.dataset.originalHtml=i.innerHTML,i.disabled=!0,i.setAttribute("aria-busy","true"),i.classList.add("is-processing"),i.innerHTML=`<span class="inline-flex items-center justify-center gap-2"><span class="auth-spinner"></span>${e}</span>`):(i.disabled=!1,i.removeAttribute("aria-busy"),i.classList.remove("is-processing"),i.dataset.originalHtml&&(i.innerHTML=i.dataset.originalHtml),$t()))}function w0({button:i,method:t,onSuccess:e,onError:a,loadingText:s="Verifying…",delay:n=850}){K(i,!0,s),nt("loading",`${t} provider is securely processing the authentication request.`),window.setTimeout(()=>{K(i,!1),nt("success",`${t} verification completed. Applying organization security policy.`),ut(`${t} verification berhasil`),e==null||e()},n)}function lt(i){nt("error",i),ut(i,!0)}const pD={VITE_AUTH_MODE:"api",VITE_LOGIN_USERNAME_MODE:"username",VITE_MAT_ERP_API_BASE_URL:"",VITE_MAT_ERP_APP_URL:"/"},j1=pD||{},Oi={authMode:j1.VITE_AUTH_MODE||"mock",apiBaseUrl:(j1.VITE_MAT_ERP_API_BASE_URL||"").replace(/\/$/,""),appRedirectUrl:j1.VITE_MAT_ERP_APP_URL||"",loginUsernameMode:j1.VITE_LOGIN_USERNAME_MODE||"email"};function ce(){return Oi.authMode==="api"}let n1=null,Ga=60,ye=0,G=null,Ca="authenticator",ua=!1;function kd(){const i=new Uint32Array(4);return crypto.getRandomValues(i),Array.from(i,t=>t.toString(16).padStart(8,"0")).join("-")}function uD({email:i,tenant:t,risk:e,method:a="authenticator"}){return Ca=a,G={id:kd(),email:i,tenantId:t.id,method:a,riskScore:e.score,createdAt:Date.now(),expiresAt:Date.now()+6e4,status:"pending",attempts:0},ye=0,ua=!1,V1(),R(`AUTH_CHALLENGE_CREATED: id=${G.id} method=${a} risk=${e.score}`),G}function gD(i,t,e){const a=document.querySelectorAll(".otp-digit");a.forEach((s,n)=>{s.addEventListener("input",o=>{var c,d;const r=o.target.value.replace(/\D/g,"").slice(-1);o.target.value=r,(c=s.closest(".otp-digit-wrapper"))==null||c.classList.toggle("filled",!!r),(d=document.getElementById("otpErrorMsg"))==null||d.classList.add("hidden"),r&&n<a.length-1&&a[n+1].focus(),r&&n===a.length-1&&ri(i,t,e)}),s.addEventListener("paste",o=>{var c,d;const r=(((c=o.clipboardData)==null?void 0:c.getData("text"))||"").replace(/\D/g,"").slice(0,6);r&&(o.preventDefault(),[...r].forEach((l,p)=>{var u;a[p]&&(a[p].value=l,(u=a[p].closest(".otp-digit-wrapper"))==null||u.classList.add("filled"))}),(d=a[Math.min(r.length,a.length)-1])==null||d.focus(),r.length===6&&ri(i,t,e))}),s.addEventListener("keydown",o=>{var r;o.key==="Backspace"&&!s.value&&n>0&&(o.preventDefault(),a[n-1].value="",(r=a[n-1].closest(".otp-digit-wrapper"))==null||r.classList.remove("filled"),a[n-1].focus()),o.key==="ArrowLeft"&&n>0&&(o.preventDefault(),a[n-1].focus()),o.key==="ArrowRight"&&n<a.length-1&&(o.preventDefault(),a[n+1].focus()),o.key==="Enter"&&n===a.length-1&&(o.preventDefault(),ri(i,t,e))})})}function ri(i,t,e){if(ua)return;const a=document.querySelectorAll(".otp-digit"),s=[...a].map(c=>c.value).join("");if(s.length!==6)return;if(ce()){R("MFA_SUBMIT: forwarding OTP to backend"),i==null||i({code:s,method:Ca,apiMode:!0});return}if(!G||G.status!=="pending")return;if(Date.now()>=G.expiresAt){Ad(),e==null||e();return}ua=!0;const n=document.getElementById("otpSpinner"),o=document.getElementById("otpBtnText"),r=document.getElementById("btnVerifyOtp");r&&(r.disabled=!0),n==null||n.classList.remove("hidden"),o&&(o.textContent="Memvalidasi…"),window.setTimeout(()=>{if(n==null||n.classList.add("hidden"),o&&(o.textContent="Konfirmasi Token"),r&&(r.disabled=!1),ua=!1,!/^\d{6}$/.test(s))return fD(a,t);G.status="verified",nt("success","MFA verified. Establishing your protected enterprise session…"),R(`MFA_SUCCESS: challenge=${G.id} provider=${Ca}`),ut("MFA berhasil diverifikasi"),i==null||i({challenge:G,method:Ca})},550)}function fD(i,t){var n,o;ye+=1,G&&(G.attempts=ye);const e=Math.max(0,3-ye);(n=document.getElementById("otpErrorMsg"))==null||n.classList.remove("hidden"),nt("error",`Kode tidak valid. ${e>0?`${e} attempt${e===1?"":"s"} remaining.`:"Challenge is locked."}`);const a=document.getElementById("lockoutWarningText");a&&(a.textContent=`Kode tidak valid. Sisa percobaan: ${e}`),R(`MFA_FAILED: challenge=${(G==null?void 0:G.id)||"unknown"} attempt=${ye}/3`),V1(),(o=i[0])==null||o.focus();const s=document.getElementById("otpContainer");s&&(s.classList.remove("otp-shake"),s.offsetWidth,s.classList.add("otp-shake")),nt("error",`Kode tidak valid. ${e>0?`${e} attempt${e===1?"":"s"} remaining.`:"Challenge is locked."}`),ut("Kode verifikasi tidak valid",!0),ye>=3&&MD(),t==null||t({type:ye>=3?"locked":"invalid",attempts:ye})}function MD(){var t;G&&(G.status="locked"),nt("locked","This verification challenge is locked. Choose another verification method."),clearInterval(n1),ua=!1,(t=document.getElementById("mfaChallengeContent"))==null||t.classList.add("hidden");const i=document.getElementById("mfaLockedPanel");i==null||i.classList.remove("hidden"),$t()}function Ad(){var e;G&&(G.status="expired"),clearInterval(n1),ua=!1,(e=document.getElementById("otpErrorMsg"))==null||e.classList.remove("hidden");const i=document.getElementById("lockoutWarningText");i&&(i.textContent="Challenge telah kedaluwarsa. Kirim challenge baru."),ut("Challenge MFA telah kedaluwarsa",!0),R(`MFA_EXPIRED: challenge=${(G==null?void 0:G.id)||"unknown"}`);const t=document.getElementById("resendOtpBtn");t&&!t.disabled&&requestAnimationFrame(()=>t.focus())}async function vD({onSuccess:i}={}){if(R("PASSKEY_REQUEST: WebAuthn authentication requested"),!window.PublicKeyCredential||!navigator.credentials)return R("PASSKEY_UNAVAILABLE: WebAuthn unavailable"),lt("Passkey tidak tersedia pada browser ini. Pilih SSO atau Password."),!1;const t=document.getElementById("btnPasskey");K(t,!0,"Preparing Passkey…"),nt("loading","Preparing a secure WebAuthn challenge on this device…");try{return await new Promise(e=>window.setTimeout(e,900)),K(t,!1),nt("success","Passkey verified. Applying organization security policy…"),R("PASSKEY_PROVIDER_SIMULATED: WebAuthn server boundary ready"),i==null||i({method:"passkey",verified:!0,simulated:!0}),!0}catch(e){return K(t,!1),R(`PASSKEY_ERROR: ${e.name||"UnknownError"}`),lt("Passkey gagal diproses. Gunakan metode autentikasi lain."),!1}}function Cd(){clearInterval(n1),Ga=60;const i=document.getElementById("timerCountdown"),t=document.getElementById("resendOtpBtn");t&&(t.disabled=!0,t.className="text-slate-500 cursor-not-allowed"),i&&(i.textContent="60s"),n1=setInterval(()=>{Ga-=1,i&&(i.textContent=`${Ga}s`),Ga<=0&&(clearInterval(n1),Ad(),t&&(t.disabled=!1,t.className="text-sky-500 font-bold hover:underline cursor-pointer"))},1e3)}function mD(){!G||Ga>0||(G={...G,id:kd(),createdAt:Date.now(),expiresAt:Date.now()+6e4,status:"pending",attempts:0},ye=0,ua=!1,Ca=G.method,V1(),R(`MFA_RESEND: New challenge=${G.id} method=${Ca}`),Cd(),ut("Challenge MFA baru telah dibuat"))}function V1(){document.querySelectorAll(".otp-digit").forEach(i=>{var t;i.value="",(t=i.closest(".otp-digit-wrapper"))==null||t.classList.remove("filled")})}class Is extends Error{constructor(t,e={}){super(t||"Request autentikasi gagal."),this.name="MatErpAuthError",this.code=e.code||e.error||"AUTH_REQUEST_FAILED",this.data=e}}function yD(i){return`${Oi.apiBaseUrl}${i}`}async function Yt(i,{method:t="GET",body:e,csrfToken:a}={}){const s={Accept:"application/json"};e!==void 0&&(s["Content-Type"]="application/json"),a&&(s["x-csrf-token"]=a);let n;try{n=await fetch(yD(i),{method:t,headers:s,credentials:"include",body:e===void 0?void 0:JSON.stringify(e)})}catch(c){throw new Is("Tidak bisa menghubungi server MAT ERP. Pastikan backend MAT ERP V2 sedang berjalan.",{code:"NETWORK_ERROR",cause:c})}const o=await n.text(),r=o?xD(o):{};if(!n.ok)throw new Is(r.message||r.error||`MAT ERP menolak request (${n.status}).`,r);return r}function xD(i){try{return JSON.parse(i)}catch{return{message:i}}}function S0(i){const t=String(i).replace(/-/g,"+").replace(/_/g,"/"),e=t.padEnd(Math.ceil(t.length/4)*4,"="),a=atob(e),s=new Uint8Array(a.length);for(let n=0;n<a.length;n+=1)s[n]=a.charCodeAt(n);return s.buffer}function os(i){const t=new Uint8Array(i);let e="";for(let a=0;a<t.length;a+=1)e+=String.fromCharCode(t[a]);return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}const oa={tenantContext({email:i}={}){return Yt(`/api/auth/tenant-context${i?`?email=${encodeURIComponent(i)}`:""}`)},signup(i){return Yt("/api/auth/signup",{method:"POST",body:i})},providers(){return Yt("/api/auth/providers")},loginWithPassword({username:i,password:t}){return Yt("/api/auth/login",{method:"POST",body:{username:i,password:t}})},completeMfa({mfaToken:i,code:t}){return Yt("/api/auth/mfa",{method:"POST",body:{mfaToken:i,code:t}})},changePasswordRequired({changeToken:i,newPassword:t}){return Yt("/api/auth/change-password-required",{method:"POST",body:{changeToken:i,newPassword:t}})},session(){return Yt("/api/auth/session")},devices(){return Yt("/api/auth/devices")},logout(i){return Yt("/api/auth/logout",{method:"POST",csrfToken:i})},logoutAll(i){return Yt("/api/auth/logout-all",{method:"POST",csrfToken:i})},async loginWithPasskey({username:i}){if(!window.PublicKeyCredential||!navigator.credentials)throw new Is("Browser/perangkat ini belum mendukung passkey.",{code:"PASSKEY_UNSUPPORTED"});const t=await Yt("/api/auth/passkey/login/options",{method:"POST",body:{username:i}}),e=await navigator.credentials.get({publicKey:{challenge:S0(t.challenge),allowCredentials:(t.allowCredentials||[]).map(a=>({type:"public-key",id:S0(a.id),transports:a.transports})),userVerification:t.userVerification,timeout:t.timeout,rpId:window.location.hostname}});return Yt("/api/auth/passkey/login",{method:"POST",body:{username:i,credential:{id:e.id,authenticatorData:os(e.response.authenticatorData),clientDataJSON:os(e.response.clientDataJSON),signature:os(e.response.signature)}}})}},_D={"acme-global.io":{id:"tn_acme_global",name:"ACME Global Enterprise",workspace:"acme-global.singularity.io",environment:"PRD-US",region:"US East",policy:{mfaRequired:!0,passkeyEnabled:!0,ssoEnabled:!0,mfaMethods:["authenticator","recovery"],deviceTrustDays:30,sessionIdleSeconds:900}},"techcorp.io":{id:"tn_techcorp",name:"TechCorp Industries",workspace:"techcorp.singularity.io",environment:"PRD-EU",region:"EU West",policy:{mfaRequired:!0,passkeyEnabled:!0,ssoEnabled:!0,mfaMethods:["authenticator","email","recovery"],deviceTrustDays:30,sessionIdleSeconds:900}},"mandiriabaditeknik.com":{id:"tn_mat",name:"Mandiri Abadi Teknik",workspace:"mat.singularity.io",environment:"PRD-ID",region:"APAC Indonesia",policy:{mfaRequired:!0,passkeyEnabled:!0,ssoEnabled:!0,mfaMethods:["authenticator","recovery"],deviceTrustDays:30,sessionIdleSeconds:900}}},wn={mfaRequired:!0,passkeyEnabled:!0,ssoEnabled:!1,mfaMethods:["authenticator","recovery"],deviceTrustDays:30,sessionIdleSeconds:900};function bD(i){const t={...wn,...i.authPolicy||{}};return{id:`tn_${i.code}`,code:i.code,name:i.name,workspace:i.workspace,environment:i.environment,region:i.region,status:i.status,branding:i.branding||{},policy:t}}function wD(){return Oi.loginUsernameMode==="username"}function k0(){return{id:"tn_workspace",code:"workspace",name:"Enterprise Workspace",workspace:typeof location<"u"&&location.host?location.host:"workspace",environment:"—",region:"—",status:"active",branding:{},policy:structuredClone(wn)}}async function SD(i){const t=String(i||"").trim(),e=wD();if(ce()){let o;if(e){if(!t)return{ok:!1,reason:"INVALID_USERNAME",domain:""}}else{const l=t.toLowerCase(),p=l.split("@")[1]||"";if(!l.includes("@")||!p||l.split("@").length!==2)return{ok:!1,reason:"INVALID_EMAIL",domain:p};o=l}const r=o?o.split("@")[1]:"";let c;try{c=await oa.tenantContext(o?{email:o}:{})}catch(l){return R(`TENANT_RESOLVE_ERROR: ${l.message}`),e?{ok:!0,tenant:k0(),domain:r,degraded:!0}:{ok:!1,reason:"RESOLVE_ERROR",domain:r}}if(!c||!c.resolved)return e?(R("TENANT_RESOLVE_FALLBACK: host-based, proceeding"),{ok:!0,tenant:k0(),domain:r,degraded:!0}):(R(`TENANT_RESOLVE_FAILED: ${r?"domain="+r:"host-based"}`),{ok:!1,reason:"UNKNOWN_ORGANIZATION",domain:r});const d=bD(c.tenant);return d.status==="suspended"?(R(`TENANT_SUSPENDED: tenant=${d.code}`),{ok:!1,reason:"TENANT_SUSPENDED",domain:r,tenant:d}):(R(`TENANT_RESOLVE: tenant=${d.code} environment=${d.environment}`),{ok:!0,tenant:d,domain:r})}if(e){const o={id:"tn_mock",code:"mock",name:"Demo Workspace",workspace:"demo.singularity.io",environment:"DEV",region:"Local",status:"active",branding:{},policy:structuredClone(wn)};return R("TENANT_RESOLVE: username-mode mock workspace"),{ok:!0,tenant:o,domain:""}}const a=t.toLowerCase(),s=a.split("@")[1]||"";if(!a.includes("@")||!s||a.split("@").length!==2)return{ok:!1,reason:"INVALID_EMAIL",domain:s};const n=_D[s];return n?(R(`TENANT_RESOLVE: domain=${s} tenant=${n.id} environment=${n.environment}`),{ok:!0,tenant:structuredClone(n),domain:s}):(R(`TENANT_RESOLVE_FAILED: domain=${s||"unknown"}`),{ok:!1,reason:"UNKNOWN_ORGANIZATION",domain:s})}function kD(i){let t=0;for(let e=0;e<i.length;e+=1)t=(t<<5)-t+i.charCodeAt(e)|0;return Math.abs(t)}function AD({email:i,tenant:t}){const e=Intl.DateTimeFormat().resolvedOptions().timeZone||"unknown",a=`${navigator.userAgent}|${screen.width}x${screen.height}|${e}`,n=12+kD(`${i}|${t.id}|${a}`)%54,o=n>=55?"HIGH":n>=35?"MEDIUM":"LOW",r=[{label:"Device posture",value:n>58?"Unrecognized":"Recognized",state:n>58?"warning":"positive"},{label:"Network context",value:n>45?"Unfamiliar":"Known",state:n>45?"warning":"positive"},{label:"Location context",value:"Consistent",state:"positive"},{label:"Browser fingerprint",value:n>50?"New":"Known",state:n>50?"warning":"positive"}],c=!!(t.policy.mfaRequired||o!=="LOW");return R(`RISK_EVAL: score=${n} level=${o} stepUp=${c} timezone=${e}`),{score:n,level:o,stepUpRequired:c,signals:r,timezone:e}}function CD({tenant:i,risk:t}){const e=(i==null?void 0:i.policy)||{},a=(t==null?void 0:t.level)==="HIGH",s=[];e.passkeyEnabled&&s.push("passkey"),e.ssoEnabled&&s.push("sso"),s.push("password");const n=!!(e.mfaRequired||a||t!=null&&t.stepUpRequired),o=e.mfaMethods||["authenticator","recovery"],r={primaryMethods:s,stepUpRequired:n,mfaMethods:o,deviceTrustDays:e.deviceTrustDays||30,sessionIdleSeconds:e.sessionIdleSeconds||15*60,reauthOnUnlock:!0};return R(`AUTH_PLAN: methods=${s.join(",")} stepUp=${n} mfa=${o.join(",")}`),r}const LD=15*60*1e3;let Bs=null,A1=!1,C1=!1,o1=null,Fs=LD;function PD({onLock:i,idleSeconds:t=900}={}){A1=!1,C1=!0,o1=i,Fs=Math.max(30,t)*1e3,Sn(),R(`SESSION_STARTED: idlePolicy=${Math.round(Fs/1e3)}s reauth=true`)}function HD(i){o1=i,["mousemove","keydown","pointerdown","touchstart","scroll"].forEach(e=>window.addEventListener(e,Sn,{passive:!0}))}function Sn(){A1||!C1||(clearTimeout(Bs),Bs=setTimeout(()=>VD(),Fs))}function VD(){A1||!C1||(A1=!0,C1=!1,clearTimeout(Bs),wd("autoLockOverlay"),requestAnimationFrame(()=>{var i;return(i=document.getElementById("btnUnlockSession"))==null?void 0:i.focus({preventScroll:!0})}),ut("Sesi dikunci untuk melindungi workspace",!0),R("SESSION_LOCK: Idle timeout reached; re-authentication required"),o1==null||o1())}function TD({verified:i=!1}={}){return i?(A1=!1,C1=!0,bn("autoLockOverlay"),Sn(),ut("Session re-authenticated"),R("SESSION_UNLOCKED: Re-authentication assertion accepted by prototype boundary"),!0):(ut("Re-authentication required before unlocking",!0),R("SESSION_UNLOCK_BLOCKED: Fresh authentication assertion required"),!1)}const A0={discovery:{resolve:"tenant_resolving"},tenant_resolving:{success:"auth_method",error:"discovery"},auth_method:{authenticate:"authenticating"},authenticating:{success:"step_up",skip_mfa:"session_establishing",error:"auth_method",cancel:"auth_method"},step_up:{challenge:"mfa_challenging",success:"session_establishing",error:"auth_method"},mfa_challenging:{verify:"mfa_verifying",resend:"mfa_challenging",cancel:"auth_method"},mfa_verifying:{success:"session_establishing",error:"mfa_challenging",locked:"mfa_locked"},mfa_locked:{fallback:"auth_method"},session_establishing:{success:"authenticated",error:"auth_method"},authenticated:{lock:"session_locked",logout:"discovery"},session_locked:{reauthenticate:"session_reauthenticating",logout:"discovery"},session_reauthenticating:{success:"authenticated",error:"session_locked"}};function ED(i="discovery"){let t=i;const e=[{state:t,at:Date.now()}];return{get state(){return t},get history(){return[...e]},can(a){var s;return!!((s=A0[t])!=null&&s[a])},transition(a){var n;const s=(n=A0[t])==null?void 0:n[a];return s?(t=s,e.push({state:t,event:a,at:Date.now()}),{ok:!0,state:t,event:a}):{ok:!1,state:t,event:a}},reset(){return t="discovery",e.push({state:t,event:"reset",at:Date.now()}),t}}}function C0(i){return typeof i=="string"&&i.length>=12&&/[A-Z]/.test(i)&&/[a-z]/.test(i)&&/[0-9]/.test(i)&&/[\W_]/.test(i)}function DD(i={}){i.accentColor&&document.documentElement.style.setProperty("--tenant-accent",i.accentColor);const t=document.querySelector(".global-brand-image"),e=i.logoUrl;t&&typeof e=="string"&&(e.startsWith("data:image/")||e.startsWith("/"))&&(t.src=e,t.alt=`${i.displayName||"Tenant"} — Identity Gateway`)}function OD(){if(!ce())return;const i=[...document.querySelectorAll("[data-social-auth]")];i.length&&oa.providers().then(t=>{const e=t&&t.providers||[];if(!e.length){i.forEach(n=>{n.hidden=!0,n.innerHTML=""});return}const a=n=>n==="google"?"chrome":n==="microsoft"?"grid-2x2":"shield-check",s=e.map(n=>`<a href="/api/auth/oauth/${encodeURIComponent(n.id)}/start" data-provider="${n.id}" class="auth-method-card social-btn w-full"><i data-lucide="${a(n.icon)}" class="w-4 h-4"></i><span>Lanjutkan dengan ${n.label}</span></a>`).join("");i.forEach(n=>{n.innerHTML=`<div class="social-sep"><span>atau</span></div><div class="social-list">${s}</div>`,n.hidden=!1}),$t(),R(`SOCIAL_PROVIDERS: ${e.map(n=>n.id).join(",")}`)}).catch(()=>{i.forEach(t=>{t.hidden=!0})})}function RD(){const i=new URLSearchParams(location.search).get("oauth_error");i&&(ut(`Login provider gagal: ${i}`,!0),R(`OAUTH_ERROR: ${i}`),history.replaceState(null,"",location.pathname))}function ID(){document.querySelectorAll('input[type="password"]:not([data-pw-enhanced])').forEach(i=>{i.dataset.pwEnhanced="1";let t=i.parentElement;if(!t||getComputedStyle(t).position==="static"){const a=document.createElement("span");a.className="pw-wrap",i.parentNode.insertBefore(a,i),a.appendChild(i),t=a}i.classList.add("has-pw-toggle");const e=document.createElement("button");e.type="button",e.className="pw-toggle",e.tabIndex=-1,e.setAttribute("aria-label","Lihat kata sandi"),e.innerHTML='<i data-lucide="eye" class="w-4 h-4"></i>',e.addEventListener("click",()=>{const a=i.type==="password";i.type=a?"text":"password",e.innerHTML=`<i data-lucide="${a?"eye-off":"eye"}" class="w-4 h-4"></i>`,e.setAttribute("aria-label",a?"Sembunyikan kata sandi":"Lihat kata sandi"),$t()}),t.appendChild(e)}),$t()}function $e(i=V.flow.state){const t=[...document.querySelectorAll("#authFlowIndicator .auth-flow-step")],e=document.getElementById("secureSessionBadge");if(e){const s=i==="authenticated";e.classList.toggle("hidden",!s),e.setAttribute("aria-hidden",s?"false":"true")}if(!t.length)return;let a=0;["auth_method","authenticating"].includes(i)?a=0:["tenant_resolving","step_up","mfa_challenging","mfa_verifying","mfa_locked"].includes(i)?a=1:["session_establishing","authenticated","session_locked","session_reauthenticating"].includes(i)&&(a=2),t.forEach((s,n)=>{const o=n===a,r=n<a||i==="authenticated";s.classList.toggle("active",o),s.classList.toggle("complete",r),s.setAttribute("aria-current",o?"step":"false")})}function W(i){const t=V.flow.transition(i);return t.ok?($e(t.state),t):(R(`AUTH_STATE_BLOCKED: state=${t.state} event=${i}`),t)}function L0(){var i;return((i=window.matchMedia)==null?void 0:i.call(window,"(prefers-reduced-motion: reduce)").matches)===!0}function _t(i){i&&requestAnimationFrame(()=>{i.offsetParent!==null&&!i.disabled&&i.focus({preventScroll:!0})})}function Ie(i){const t=["stepEmailDiscovery","stepSignup","stepCredentials","stepPasswordChange","stepMfa"],e=document.getElementById("authStepViewport");t.forEach(a=>{const s=document.getElementById(a);if(!s)return;const n=a===i;s.classList.toggle("hidden",!n),s.classList.toggle("is-active",n),s.setAttribute("aria-hidden",n?"false":"true"),n?(s.style.opacity="1",s.style.transform="none",s.style.translate="none",s.style.scale=""):(s.style.opacity="",s.style.transform="",s.style.translate="",s.style.scale="")}),e==null||e.scrollTo({top:0,behavior:"auto"})}function Qt(i){document.querySelectorAll(".auth-method-card").forEach(t=>{t.disabled=i,t.setAttribute("aria-disabled",i?"true":"false")})}function r1(){document.querySelectorAll(".auth-method-card").forEach(i=>{i.classList.remove("is-selected"),i.removeAttribute("aria-current"),i.removeAttribute("aria-pressed")})}function hi(i){r1(),i&&(i.classList.add("is-selected"),i.setAttribute("aria-current","true"),i.setAttribute("aria-pressed","true"))}function Lt(i,t){const e=document.getElementById(i);e&&(e.textContent=t)}function h1(i="Terjadi gangguan interaksi. Pilihan autentikasi sudah diaktifkan ulang."){document.querySelectorAll('[aria-busy="true"]').forEach(t=>{K(t,!1)}),Qt(!1),["authenticating"].includes(V.flow.state)&&W("cancel"),lt(i),_t(document.querySelector(".auth-method-card:not([disabled])")||document.getElementById("discoveryEmail"))}function BD(){window.addEventListener("error",i=>{var t;if(!(i instanceof ErrorEvent)){R(`RESOURCE_ERROR_IGNORED: target=${((t=i.target)==null?void 0:t.tagName)||"unknown"}`);return}R(`RUNTIME_ERROR: ${i.message||"unknown"}`),h1("Sistem sempat error, tapi tombol sudah dipulihkan. Coba pilih metode lain.")}),window.addEventListener("unhandledrejection",i=>{var t;R(`RUNTIME_REJECTION: ${((t=i.reason)==null?void 0:t.message)||i.reason||"unknown"}`),h1("Provider autentikasi gagal merespons. Tombol sudah aktif lagi.")})}function FD(){document.addEventListener("keydown",i=>{const t=document.getElementById("mfaFallbackPanel");if(i.key==="Escape"){if(t&&!t.classList.contains("hidden")){kn(),_t(document.getElementById("btnAnotherMfa"));return}const a=document.getElementById("activeSessionsModal");if(a&&!a.classList.contains("hidden")){bn("activeSessionsModal"),_t(document.getElementById("btnOpenActiveSessions"));return}}const e=document.getElementById("activeSessionsModal");if(i.key==="Tab"&&e&&!e.classList.contains("hidden")){const a=[...e.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!a.length)return;const s=a[0],n=a[a.length-1];i.shiftKey&&document.activeElement===s?(i.preventDefault(),n.focus()):!i.shiftKey&&document.activeElement===n&&(i.preventDefault(),s.focus())}})}const V={currentLang:"ID",isDarkMode:!1,isDashboardActive:!1,identity:{email:"",tenant:null,risk:null,plan:null,challenge:null,authMethod:null},flow:ED()};document.addEventListener("DOMContentLoaded",()=>{window.__SINGULARITY_BOOTED=!0,$t(),$e("discovery");const i=document.getElementById("authCard");i&&le.from(i,{y:20,opacity:0,duration:.6,ease:"back.out(1.2)"}),gD(Le,Pd,Ld),Sd(),zD(),FD(),BD(),window.addEventListener("identity:retry",ND),XD(),OD(),RD(),ID()});function zD(){HD(()=>{V.isDashboardActive=!1})}function ND(){var t,e,a,s,n,o,r,c;V.identity={email:"",tenant:null,risk:null,plan:null,challenge:null,authMethod:null},V.flow.reset(),$e("discovery"),re(),Ie("stepEmailDiscovery"),(t=document.getElementById("mfaLockedPanel"))==null||t.classList.add("hidden"),(e=document.getElementById("mfaChallengeContent"))==null||e.classList.remove("hidden");const i=document.getElementById("stepEmailDiscovery");i==null||i.classList.add("is-active"),(a=document.getElementById("riskBadge"))==null||a.classList.add("hidden"),(s=document.getElementById("envBadge"))==null||s.classList.add("hidden"),(n=document.getElementById("securityContext"))==null||n.classList.add("hidden"),(o=document.getElementById("formPasswordAuth"))==null||o.classList.add("hidden"),(r=document.getElementById("authMethodsPanel"))==null||r.classList.remove("is-collapsed"),r1(),Qt(!1),(c=document.getElementById("discoveryEmail"))==null||c.focus(),ut("Silakan mulai autentikasi dengan metode lain")}function ZD(i,t,e){var a,s,n,o,r;Lt("resolvedTenantName",i.name),Lt("resolvedWorkspace",`${i.workspace} • ${i.environment}`),Lt("dashTenantLabel",i.name.toUpperCase()),Lt("envText",i.environment),Lt("riskScore",t.score),Lt("riskLevel",t.level),Lt("riskDescription",t.stepUpRequired?"Step-up verification required by organization policy.":"Low-risk authentication path."),Lt("securityContextText",`${t.level} risk • ${i.region} • MFA ${e.stepUpRequired?"required":"not required"}`),(a=document.getElementById("riskBadge"))==null||a.classList.remove("hidden"),(s=document.getElementById("riskBadge"))==null||s.classList.add("flex"),(n=document.getElementById("envBadge"))==null||n.classList.remove("hidden"),(o=document.getElementById("envBadge"))==null||o.classList.add("flex"),(r=document.getElementById("securityContext"))==null||r.classList.remove("hidden")}function Ld(){V.flow.state==="mfa_verifying"&&W("error"),$e(V.flow.state)}function Pd(i={}){if(i.type==="locked"){W("locked"),$e("mfa_locked");return}V.flow.state==="mfa_verifying"&&W("error"),$e(V.flow.state)}function WD(){var t,e,a,s;if(re(),!!document.getElementById("stepCredentials")){if(Ie("stepCredentials"),ce()){(t=document.getElementById("btnPasskey"))==null||t.classList.add("hidden"),(e=document.getElementById("btnSsoAuth"))==null||e.classList.add("hidden"),V.identity.authMethod="password",hi(document.getElementById("btnPasswordMethod")),(a=document.getElementById("authMethodsPanel"))==null||a.classList.add("is-collapsed"),(s=document.getElementById("formPasswordAuth"))==null||s.classList.remove("hidden"),_t(document.getElementById("authPassword"));return}_t(document.getElementById("btnPasskey"))}}function UD(){var a;if(re(),Lt("pwChangeUsername",V.identity.username||"—"),Lt("pwChangeTenantName",((a=V.identity.tenant)==null?void 0:a.name)||"Enterprise Workspace"),!document.getElementById("stepPasswordChange"))return;const t=document.getElementById("pwChangeNew");t&&(t.value="");const e=document.getElementById("pwChangeConfirm");e&&(e.value=""),Ie("stepPasswordChange"),nt("idle","Kata sandi Anda perlu diperbarui sebelum masuk."),_t(t)}function c1(i="authenticator"){var s,n,o,r,c,d,l,p,u;V.identity.authMethod=V.identity.authMethod||"password",V.identity.challenge=uD({email:V.identity.email,tenant:V.identity.tenant,risk:V.identity.risk,method:i}),W("challenge");const t={authenticator:{label:"Authenticator app",title:"Verify your identity",desc:"Authenticator verification • Enter the 6-digit code from your authenticator app.",icon:"smartphone"},email:{label:"Email verification",title:"Verify your identity",desc:"Email verification • Enter the 6-digit code sent to your verified address.",icon:"mail"},recovery:{label:"Recovery credential",title:"Recover your access",desc:"Use one unused recovery credential issued by your organization.",icon:"life-buoy"}},e=t[i]||t.authenticator;Lt("mfaTitle",e.title),Lt("mfaDesc",e.desc),Lt("mfaMethodLabel",e.label),(s=document.getElementById("mfaMethodIcon"))==null||s.setAttribute("data-lucide",e.icon),Lt("mfaTenantName",((n=V.identity.tenant)==null?void 0:n.name)||"Enterprise Workspace"),Lt("mfaRiskScore",((o=V.identity.risk)==null?void 0:o.score)??"—"),document.getElementById("stepMfa")&&(Ie("stepMfa"),(r=document.getElementById("mfaFallbackPanel"))==null||r.classList.add("hidden"),(c=document.getElementById("mfaLockedPanel"))==null||c.classList.add("hidden"),(d=document.getElementById("mfaChallengeContent"))==null||d.classList.remove("hidden"),(l=document.getElementById("recoveryContainer"))==null||l.classList.toggle("hidden",i!=="recovery"),(p=document.getElementById("otpContainer"))==null||p.classList.toggle("hidden",i==="recovery"),(u=document.getElementById("otpErrorMsg"))==null||u.classList.add("hidden"),$t(),i!=="recovery"?(Cd(),_t(document.querySelector(".otp-digit"))):(V1(),_t(document.getElementById("recoveryCodeInput"))))}function qD(){var t;const i=document.getElementById("mfaFallbackPanel");i&&(i.classList.remove("hidden"),(t=document.getElementById("btnAnotherMfa"))==null||t.setAttribute("aria-expanded","true"),i.scrollIntoView({behavior:"smooth",block:"nearest"}),R("MFA_FALLBACK_OPTIONS_OPENED"),$t())}function kn(){var i,t;(i=document.getElementById("mfaFallbackPanel"))==null||i.classList.add("hidden"),(t=document.getElementById("btnAnotherMfa"))==null||t.setAttribute("aria-expanded","false")}function $D(i){if(kn(),i==="recovery"){V.identity.authMethod="recovery",c1("recovery"),R(`MFA_FALLBACK_SELECTED: method=${i}`),ut("Recovery credential dipilih");return}if(i==="passkey"){V.identity.authMethod="passkey-mfa";const t=document.querySelector('[data-mfa-fallback="passkey"]');nt("loading","Preparing passkey verification for this security step…"),K(t,!0,"Verifying…"),window.setTimeout(()=>{K(t,!1,"Passkey"),W("verify"),R("MFA_FALLBACK_SUCCESS: method=passkey simulated"),nt("success","Passkey verified. Establishing your protected enterprise session…"),Le()},850);return}if(i==="security-key"){V.identity.authMethod="security-key-mfa";const t=document.querySelector('[data-mfa-fallback="security-key"]');nt("loading","Waiting for your registered security key…"),K(t,!0,"Waiting…"),window.setTimeout(()=>{K(t,!1,"Security key"),W("verify"),R("MFA_FALLBACK_SUCCESS: method=security-key simulated"),nt("success","Security key verified. Establishing your protected enterprise session…"),Le()},900)}}async function Le(i){var t,e;if(ce()){const a=[...document.querySelectorAll(".otp-digit")].map(o=>o.value).join("").trim(),s=((e=(t=document.getElementById("recoveryCodeInput"))==null?void 0:t.value)==null?void 0:e.trim())||"",n=(i==null?void 0:i.code)||(V.identity.authMethod==="recovery"?s:a);nt("loading","Memverifikasi kode verifikasi…");try{const o=await oa.completeMfa({mfaToken:V.identity.mfaToken,code:n});ci(o)}catch(o){lt((o==null?void 0:o.message)||"Kode verifikasi salah atau kedaluwarsa."),R(`MFA_FAILED: ${(o==null?void 0:o.code)||"ERROR"}`)}return}W("success"),nt("success","Identity verified. Establishing secure enterprise session…"),R(`AUTHENTICATION_COMPLETE: tenant=${V.identity.tenant.id} method=${V.identity.authMethod} risk=${V.identity.risk.score}`),YD()}function ci(i){if(i&&i.mfaRequired){V.identity.mfaToken=i.mfaToken,W("success"),c1("authenticator"),nt("idle","Masukkan kode verifikasi dari authenticator Anda."),R("MFA_REQUIRED: step-up challenge issued");return}if(i&&i.passwordChangeRequired){V.identity.changeToken=i.changeToken,W("success"),UD(),R("PASSWORD_CHANGE_REQUIRED: forced rotation challenge issued");return}if(i&&i.user){V.identity.serverUser=i.user,jD();return}lt("Respons autentikasi tidak dikenali. Silakan coba lagi.")}function jD(){var t,e;W("success"),nt("success","Identitas terverifikasi. Membuka workspace…"),R(`AUTHENTICATION_COMPLETE: tenant=${((t=V.identity.tenant)==null?void 0:t.code)||((e=V.identity.tenant)==null?void 0:e.id)||"—"} method=${V.identity.authMethod}`);const i=Oi.appRedirectUrl||"/";window.setTimeout(()=>{window.location.assign(i)},500)}function YD(){const i=document.getElementById("scanBeam"),t=document.querySelector(".auth-gateway-wrap"),e=document.querySelector(".identity-rail"),a=document.getElementById("securityContext"),s=document.getElementById("dashboardContainer");if(!s||!t)return;document.body.classList.add("dashboard-mode"),e==null||e.classList.add("dashboard-hidden"),a==null||a.classList.add("dashboard-hidden");const n=()=>{var o,r;t.classList.add("hidden"),t.style.removeProperty("opacity"),t.style.removeProperty("transform"),s.classList.remove("hidden"),s.style.opacity="1",s.setAttribute("aria-hidden","false"),V.isDashboardActive=!0,requestAnimationFrame(()=>{requestAnimationFrame(()=>{_n("throughput",V.isDarkMode),$t()})}),PD({idleSeconds:((r=(o=V.identity.tenant)==null?void 0:o.policy)==null?void 0:r.sessionIdleSeconds)||900,onLock:()=>{V.isDashboardActive=!1}}),R("SESSION_ESTABLISHED: Identity Gateway session context established"),R("COMMAND_CENTER_READY: Secure enterprise workspace loaded")};i?le.fromTo(i,{top:"0%",opacity:0},{top:"100%",opacity:1,duration:.45,repeat:1,yoyo:!0,onComplete:()=>{if(L0()){n();return}le.to(t,{scale:.94,opacity:0,duration:.28,onComplete:n})}}):L0()?n():le.to(t,{scale:.94,opacity:0,duration:.28,onComplete:n})}function XD(){var i,t,e,a,s,n,o,r,c,d,l,p,u,g,M,f,v,m,y,_,b,x,k,w,S,A;document.querySelectorAll(".btn-toggle-theme").forEach(C=>C.addEventListener("click",()=>dD(V))),(i=document.getElementById("btnToggleLang"))==null||i.addEventListener("click",()=>lD(V)),(t=document.getElementById("formEmailDiscovery"))==null||t.addEventListener("submit",async C=>{var T,D,I;C.preventDefault();const L=((T=document.getElementById("discoveryEmail"))==null?void 0:T.value.trim())||"",P=C.currentTarget.querySelector("button[type=submit]");K(P,!0);let E;try{E=await SD(L)}catch{E={ok:!1,reason:"RESOLVE_ERROR"}}finally{K(P,!1)}if(!E.ok){const q=E.reason==="INVALID_EMAIL"?"Masukkan email corporate yang valid":E.reason==="TENANT_SUSPENDED"?`Langganan ${((D=E.tenant)==null?void 0:D.name)||"organisasi"} sedang ditangguhkan. Hubungi Singularity.`:E.reason==="RESOLVE_ERROR"?"Tidak bisa menghubungi server Singularity. Coba lagi.":"Organization tidak ditemukan untuk email tersebut";ut(q,!0),(I=document.getElementById("discoveryEmail"))==null||I.focus();return}W("resolve");const{tenant:O}=E;V.identity.email=L,V.identity.username=L,V.identity.tenant=O,W("success"),V.identity.risk=AD({email:L,tenant:O}),V.identity.plan=CD({tenant:O,risk:V.identity.risk}),ZD(O,V.identity.risk,V.identity.plan),WD(),DD(O.branding),R(`IDENTITY_CONTEXT_READY: tenant=${O.id} region=${O.region}`)}),(e=document.getElementById("btnPasswordMethod"))==null||e.addEventListener("click",()=>{const C=document.getElementById("authMethodsPanel"),L=document.getElementById("formPasswordAuth");hi(document.getElementById("btnPasswordMethod")),Qt(!1),C==null||C.classList.add("is-collapsed"),L==null||L.classList.remove("hidden"),re(),_t(document.getElementById("authPassword"))}),(a=document.getElementById("btnBackAuthMethods"))==null||a.addEventListener("click",()=>{var C,L;(C=document.getElementById("formPasswordAuth"))==null||C.classList.add("hidden"),(L=document.getElementById("authMethodsPanel"))==null||L.classList.remove("is-collapsed"),r1(),Qt(!1),re(),_t(document.getElementById("btnPasswordMethod"))}),(s=document.getElementById("btnChangeOrganization"))==null||s.addEventListener("click",()=>{var L,P,E,O;re(),V.identity={email:"",tenant:null,risk:null,plan:null,challenge:null,authMethod:null},V.flow.reset(),$e("discovery"),Ie("stepEmailDiscovery"),(L=document.getElementById("formPasswordAuth"))==null||L.classList.add("hidden"),(P=document.getElementById("authMethodsPanel"))==null||P.classList.remove("is-collapsed"),r1(),Qt(!1),(E=document.getElementById("riskBadge"))==null||E.classList.add("hidden"),(O=document.getElementById("envBadge"))==null||O.classList.add("hidden");const C=document.getElementById("discoveryEmail");C&&(C.value="",requestAnimationFrame(()=>C.focus())),ut("Organization context cleared"),R("IDENTITY_CONTEXT_CLEARED: user_changed_organization")}),(n=document.getElementById("btnSsoAuth"))==null||n.addEventListener("click",()=>{const C=document.getElementById("btnSsoAuth");if(V.identity.authMethod="sso",hi(C),Qt(!1),!W("authenticate").ok){h1();return}Qt(!0),R(`SSO_REQUEST: tenant=${V.identity.tenant.id} provider=organization-idp`),w0({button:C,method:"Enterprise SSO",loadingText:"Connecting to organization IdP…",onSuccess:()=>{var P;Qt(!1),(P=V.identity.plan)!=null&&P.stepUpRequired?(W("success"),c1("authenticator")):(W("skip_mfa"),Le())}})}),(o=document.getElementById("formPasswordAuth"))==null||o.addEventListener("submit",async C=>{var O;C.preventDefault();const L=C.currentTarget.querySelector("button[type=submit]");V.identity.authMethod="password";const P=((O=document.getElementById("authPassword"))==null?void 0:O.value)||"";if(P.length<(ce()?1:4)){lt(ce()?"Masukkan kata sandi Anda.":"Password minimal 4 karakter untuk simulasi prototype.");return}if(!W("authenticate").ok){h1();return}if(ce()){K(L,!0,"Memverifikasi…"),nt("loading","Memverifikasi kredensial ke server Singularity…");try{const T=await oa.loginWithPassword({username:V.identity.username||V.identity.email,password:P});K(L,!1),ci(T)}catch(T){K(L,!1),V.flow.state==="authenticating"&&W("cancel"),lt((T==null?void 0:T.message)||"Autentikasi gagal. Periksa username dan kata sandi Anda."),R(`AUTH_FAILED: ${(T==null?void 0:T.code)||"ERROR"}`)}return}w0({button:L,method:"Password",loadingText:"Verifying password…",onSuccess:()=>{var T;(T=V.identity.plan)!=null&&T.stepUpRequired?(W("success"),c1("authenticator")):(W("skip_mfa"),Le())}})}),(r=document.getElementById("formPasswordChange"))==null||r.addEventListener("submit",async C=>{var O,T;C.preventDefault();const L=C.currentTarget.querySelector("button[type=submit]"),P=((O=document.getElementById("pwChangeNew"))==null?void 0:O.value)||"",E=((T=document.getElementById("pwChangeConfirm"))==null?void 0:T.value)||"";if(!C0(P)){lt("Kata sandi minimal 12 karakter dan memuat huruf besar, kecil, angka, serta simbol.");return}if(P!==E){lt("Konfirmasi kata sandi tidak cocok.");return}if(!ce()){lt("Mode simulasi: penggantian kata sandi tidak tersedia.");return}K(L,!0,"Menyimpan…"),nt("loading","Menyimpan kata sandi baru…");try{const D=await oa.changePasswordRequired({changeToken:V.identity.changeToken,newPassword:P});K(L,!1),ci(D)}catch(D){K(L,!1),lt((D==null?void 0:D.message)||"Gagal mengganti kata sandi. Coba lagi."),R(`PASSWORD_CHANGE_FAILED: ${(D==null?void 0:D.code)||"ERROR"}`)}}),(c=document.getElementById("btnOpenSignup"))==null||c.addEventListener("click",()=>{re(),Ie("stepSignup"),_t(document.getElementById("signupCompany")),R("SIGNUP_OPENED")}),(d=document.getElementById("btnBackToLogin"))==null||d.addEventListener("click",()=>{re(),Ie("stepEmailDiscovery"),_t(document.getElementById("discoveryEmail"))}),(l=document.getElementById("formSignup"))==null||l.addEventListener("submit",async C=>{var Y,Ct,It,vt,Jt,dt,yt,ie,An;if(C.preventDefault(),!ce()){lt("Mode simulasi: pendaftaran tidak tersedia.");return}const L=C.currentTarget.querySelector("button[type=submit]"),P=((Y=document.getElementById("signupCompany"))==null?void 0:Y.value.trim())||"",E=((Ct=document.getElementById("signupCode"))==null?void 0:Ct.value.trim())||"",O=((It=document.getElementById("signupUsername"))==null?void 0:It.value.trim())||"",T=((vt=document.getElementById("signupDisplayName"))==null?void 0:vt.value.trim())||"",D=((Jt=document.getElementById("signupPassword"))==null?void 0:Jt.value)||"",I=((dt=document.getElementById("signupPasswordConfirm"))==null?void 0:dt.value)||"",q=((yt=document.getElementById("signupPlan"))==null?void 0:yt.value)||"starter";if(P.length<2){lt("Nama perusahaan minimal 2 karakter.");return}if(!/^[A-Za-z0-9-]+$/.test(E)){lt("Kode organisasi hanya boleh huruf, angka, dan tanda hubung.");return}if(!O){lt("Username owner wajib diisi.");return}if(!C0(D)){lt("Kata sandi minimal 12 karakter dan memuat huruf besar, kecil, angka, serta simbol.");return}if(D!==I){lt("Konfirmasi kata sandi tidak cocok.");return}K(L,!0,"Membuat organisasi…"),nt("loading","Menyiapkan organisasi & workspace Anda…");try{const ge=await oa.signup({companyName:P,tenantCode:E,ownerUsername:O,ownerDisplayName:T,password:D,planCode:q});R(`SIGNUP_OK: tenant=${((ie=ge.tenant)==null?void 0:ie.code)||"—"} owner=${((An=ge.owner)==null?void 0:An.username)||O}`),nt("success","Organisasi dibuat. Masuk otomatis…"),V.identity.username=O;const Hd=await oa.loginWithPassword({username:O,password:D});K(L,!1),ci(Hd)}catch(ge){K(L,!1),lt((ge==null?void 0:ge.message)||"Gagal membuat organisasi. Coba lagi."),R(`SIGNUP_FAILED: ${(ge==null?void 0:ge.code)||"ERROR"}`)}}),(p=document.getElementById("btnPasskey"))==null||p.addEventListener("click",async()=>{const C=document.getElementById("btnPasskey");if(V.identity.authMethod="passkey",hi(C),!W("authenticate").ok){h1();return}Qt(!0),await vD({onSuccess:()=>{var E;Qt(!1),W("success"),(E=V.identity.plan)!=null&&E.stepUpRequired?c1("authenticator"):(W("skip_mfa"),Le())}})||(W("cancel"),r1(),Qt(!1),_t(document.getElementById("btnSsoAuth")))}),(u=document.getElementById("btnBackToCredentials"))==null||u.addEventListener("click",()=>{V1(),re(),V.identity.challenge=null,V.flow.can("cancel")&&V.flow.transition("cancel"),$e(V.flow.state),Ie("stepCredentials"),_t(document.getElementById("btnPasskey")),R("MFA_BACK_TO_AUTH_METHODS: user_requested_back_navigation")}),(g=document.getElementById("btnVerifyOtp"))==null||g.addEventListener("click",()=>{if([...document.querySelectorAll(".otp-digit")].map(P=>P.value).join("").length!==6){lt("Masukkan 6 digit kode verifikasi terlebih dahulu."),_t(document.querySelector(".otp-digit"));return}W("verify").ok&&ri(Le,Pd,Ld)}),document.querySelectorAll(".otp-digit").forEach(C=>C.addEventListener("keydown",L=>{var P;L.key==="Enter"&&(L.preventDefault(),(P=document.getElementById("btnVerifyOtp"))==null||P.click())})),(M=document.getElementById("resendOtpBtn"))==null||M.addEventListener("click",()=>{W("resend"),mD()}),(f=document.getElementById("btnAnotherMfa"))==null||f.addEventListener("click",qD),(v=document.getElementById("btnCloseMfaFallback"))==null||v.addEventListener("click",kn),(m=document.getElementById("btnRetryIdentity"))==null||m.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("identity:retry"))),document.querySelectorAll("[data-mfa-fallback]").forEach(C=>C.addEventListener("click",()=>$D(C.dataset.mfaFallback))),(y=document.getElementById("btnVerifyRecovery"))==null||y.addEventListener("click",()=>{const C=document.getElementById("recoveryCodeInput");if(((C==null?void 0:C.value)||"").trim().length<8){lt("Masukkan recovery credential yang valid untuk simulasi."),C==null||C.focus();return}K(document.getElementById("btnVerifyRecovery"),!0,"Verifying…"),V.identity.authMethod="recovery",window.setTimeout(()=>{K(document.getElementById("btnVerifyRecovery"),!1,"Verify recovery credential"),W("verify"),R("MFA_FALLBACK_SUCCESS: method=recovery simulated"),nt("success","Recovery credential verified. Establishing your protected enterprise session…"),Le()},650)}),(_=document.getElementById("chartMetricSelect"))==null||_.addEventListener("change",C=>{cD(C.target.value,V.isDarkMode),requestAnimationFrame(()=>_n(C.target.value,V.isDarkMode))}),(b=document.getElementById("btnExportCsv"))==null||b.addEventListener("click",()=>Jr("csv")),(x=document.getElementById("btnExportJson"))==null||x.addEventListener("click",()=>Jr("json")),(k=document.getElementById("btnOpenActiveSessions"))==null||k.addEventListener("click",()=>{wd("activeSessionsModal"),_t(document.getElementById("btnCloseActiveSessions"))}),(w=document.getElementById("btnCloseActiveSessions"))==null||w.addEventListener("click",()=>bn("activeSessionsModal")),(S=document.getElementById("btnUnlockSession"))==null||S.addEventListener("click",()=>{const C=document.getElementById("btnUnlockSession");K(C,!0,"Re-authenticating…"),W("reauthenticate"),setTimeout(()=>{TD({verified:!0}),K(C,!1),V.isDashboardActive=!0,W("success")},700)}),(A=document.getElementById("btnRevokeOtherSessions"))==null||A.addEventListener("click",()=>{R("SESSION_REVOKE_ALL_OTHER: requested"),ut("Revoke request dicatat — provider session API diperlukan")}),document.querySelectorAll(".session-revoke").forEach(C=>C.addEventListener("click",()=>{R("SESSION_REVOKE: requested"),ut("Session revoke request dicatat")}))}
