(function(){
'use strict';
var DATA={},ST={tab:'home',sub:'up',cat:'全部',flt:'全部',q:'',nsub:'tw',ncat:'全部',nimp:'全部',rng:66,mask:false,open:false,cur:null};
var PK=['tab','sub','cat','flt','nsub','ncat','nimp','mask','rng'];
var URLS={D:'data.json',S:'stocks.json',H:'hist.json',U:'us.json',N:'news.json',E:'enews.json',M:'market.json'};
var TAGS={breakout:{t:'技術面偏多（突破）',e:'🚀',c:'#5c6bc0'},prep:{t:'接近突破',e:'⚡',c:'#f9a825'},dip:{t:'跌深出現止跌跡象',e:'🛟',c:'#ef6c00'},near:{t:'接近低檔支撐',e:'📉',c:'#0097a7'},weak:{t:'弱勢走勢',e:'⛔',c:'#78909c'},none:{t:'無明確訊號',e:'➖',c:'#9e9e9e'}};
var CKL=['收盤站上月線（MA20）','收盤站上季線（MA60）','月線上彎','MACD 柱狀體為正','RSI 在 50～75 健康區','今日量能不低於 20 日均量'];
var INTRO={up:'已放量突破前高、均線多頭排列的標的（含 ETF），依量比排序。點進去看走勢圖與入選原因。',dip:'自半年高點大跌逾 30%、RSI 曾超賣且開始回升。跌深不代表會漲，請自行確認跌的原因。',gain:'今日漲幅前 10 名（已排除成交量過低者）。',act:'今日成交值前 10 名，代表資金最集中的標的。'};
var SUBS=[['up','🚀 突破'],['dip','🛟 超跌'],['flow','💧 資金流向'],['gain','🔥 漲幅'],['act','💰 成交值']];
function $(i){return document.getElementById(i);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function J(u){return fetch(u+'?'+Date.now()).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
function load(){var a=[].slice.call(arguments);return Promise.all(a.map(function(n){if(DATA[n]!==undefined)return DATA[n];return J(URLS[n]).then(function(d){DATA[n]=d;return d;}).catch(function(){DATA[n]=null;return null;});}));}
function loadQ(){var h=location.hostname,p=(location.pathname.split('/')[1]||'');if(!/github\.io$/.test(h)||!p){DATA.Q=null;return Promise.resolve();}
 return fetch('https://raw.githubusercontent.com/'+h.split('.')[0]+'/'+p+'/quotes/quotes.json?t='+Math.floor(Date.now()/60000)).then(function(r){return r.json();}).then(function(q){DATA.Q=q;}).catch(function(){DATA.Q=null;});}
function wl(){try{return JSON.parse(localStorage.getItem('wl')||'[]').map(function(k){return k.indexOf(':')<0?'tw:'+k:k;});}catch(e){return[];}}
function setwl(a){try{localStorage.setItem('wl',JSON.stringify(a));}catch(e){}}
function has(k){return wl().indexOf(k)>=0;}
function saveSt(){try{var o={};PK.forEach(function(k){o[k]=ST[k];});localStorage.setItem('st2',JSON.stringify(o));}catch(e){}}
function restore(){try{var o=JSON.parse(localStorage.getItem('st2')||'{}');PK.forEach(function(k){if(o[k]!==undefined)ST[k]=o[k];});}catch(e){}}
function f2(n,d){return(n==null||isNaN(n))?'—':Number(n).toFixed(d==null?2:d);}
function sg(p){return(p==null||isNaN(p))?'—':(p>=0?'+':'')+Number(p).toFixed(2)+'%';}
function cl(p){return p>=0?'u':'d';}
function cpc(p){return'<span class="'+cl(p)+'">'+sg(p)+'</span>';}
function lots(n){return n==null?'—':Math.round(n).toLocaleString();}
function big(n){if(!n)return'—';return n>=1e12?(n/1e12).toFixed(2)+' 兆美元':Math.round(n/1e8).toLocaleString()+' 億美元';}
function empty(t){return'<div class="empty">'+t+'</div>';}
function ani(){[].forEach.call(document.querySelectorAll('.row,.card,.tile,.hint,.fcard'),function(e,i){e.style.setProperty('--i',Math.min(i,10));});}
/* 報價覆蓋（盤中／收盤後更新） */
function qtw(c){var Q=DATA.Q,D=DATA.D;return(Q&&Q.tw&&D&&Q.tw_d>=D.date&&Q.tw[c])||null;}
function qus(s){var Q=DATA.Q;return(Q&&Q.us&&Q.us[s])||null;}
function qix(s){var Q=DATA.Q;return(Q&&Q.ix&&Q.ix[s])||null;}
function mkItem(s){var m=DATA.M,x=m&&m.items.filter(function(y){return y.sym==s;})[0];if(!x)return null;var q=qix(s);return q?{sym:s,name:x.name,e:x.e,c:q[0],p:q[1],ch:q[2],sp:x.sp}:x;}
function qbanner(){var Q=DATA.Q;return Q&&Q.upd?'<div class="qb"><span class="live"></span>報價更新 '+esc(Q.upd)+'（Yahoo 延遲約 15～20 分鐘）。技術訊號與榜單以最近一次收盤分析為準。</div>':'';}
function spark(a,up){if(!a||a.length<2)return'';var mn=Math.min.apply(null,a),mx=Math.max.apply(null,a),pts=a.map(function(v,i){return(i*100/(a.length-1)).toFixed(1)+','+(28-(v-mn)/((mx-mn)||1)*28).toFixed(1);}).join(' ');return'<svg class="sp" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline fill="none" stroke="'+(up?'#d9434b':'#2a9d62')+'" stroke-width="2" points="'+pts+'"/></svg>';}
function row(o){var g=TAGS[o.t]||TAGS.none,up=o.p>=0;return'<div class="row" data-a="open" data-k="'+esc(o.k)+'" style="--c:'+g.c+'"><div class="rl"><div class="rn">'+esc(o.n)+'<span class="cd">'+esc(o.code)+(o.e?' · ETF':'')+'</span></div><span class="pill">'+g.e+' '+g.t+'</span>'+(o.sub?'<div class="rsub">'+esc(o.sub)+'</div>':'')+'</div><div class="rr">'+(o.sp||'')+'<div class="px '+cl(o.p)+'">'+f2(o.c)+'</div><div class="pc '+cl(o.p)+'">'+(up?'▲ ':'▼ ')+Math.abs(o.p).toFixed(2)+'%</div></div></div>';}
function twRow(code,x,sub){var q=qtw(code);return row({k:'tw:'+code,n:x.n,code:code,e:x.e,t:x.t,c:q?q[0]:x.c,p:q?q[1]:x.p,sub:sub});}
function usRow(u){var q=qus(u.sym),p=q?q[1]:(u.p||0);return row({k:'us:'+u.sym,n:u.n,code:u.sym,t:u.t,c:q?q[0]:u.c,p:p,sp:spark(u.hist.slice(-30),p>=0),sub:u.cat+(u.cap?' · 市值 '+big(u.cap):'')});}
function chips(list,cur,act,cnt){return'<div class="cps">'+list.map(function(x){return'<button class="cp'+(x==cur?' on':'')+'" data-a="'+act+'" data-v="'+esc(x)+'">'+esc(x)+(cnt&&cnt[x]!=null?' '+cnt[x]:'')+'</button>';}).join('')+'</div>';}
function seg(list,cur,act){return'<div class="seg">'+list.map(function(x){return'<button class="'+(x[0]==cur?'on':'')+'" data-a="'+act+'" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';}

/* ---------- 首頁 ---------- */
function vHome(){
 var d=DATA.D;if(!d)return empty('尚無資料<br>請先到 GitHub 的 Actions 手動執行一次');
 var tw=mkItem('^TWII'),m=DATA.M,f=d.flow,h=qbanner()+'<div class="tiles"><div class="tile"><small>📈 台股加權</small><b>'+(tw?tw.c.toLocaleString():'—')+'</b>'+(tw?cpc(tw.p):'')+'</div>'+
 '<div class="tile" data-a="sub" data-v="up"><small>🚀 突破偏多</small><b data-n="'+d.up.total+'">'+d.up.total+'</b><span>檔</span></div><div class="tile" data-a="sub" data-v="dip"><small>🛟 超跌止跌</small><b data-n="'+d.dip.total+'">'+d.dip.total+'</b><span>檔</span></div></div>';
 if(f)h+='<div class="hint" data-a="sub" data-v="flow">💧 <b>今日資金流向</b><br>'+esc(f.headline)+'<br><span class="s2">點開看族群細節 ›</span></div>';
 if(m&&m.hint&&m.hint.length)h+='<div class="hint"><b>🌎 對今天台股的參考</b><br>'+m.hint.map(esc).join('<br>')+'</div>';
 h+=seg(SUBS,ST.sub,'sub');
 if(ST.sub=='flow')return h+vFlow();
 h+='<div class="intro">'+INTRO[ST.sub]+'</div>';
 var L=(d[ST.sub]||{}).stocks||[];
 if(!L.length)return h+empty('🌤 目前沒有符合條件的標的');
 return h+L.map(function(x){var sub=ST.sub=='gain'?'成交量 '+lots(x.q)+' 張':ST.sub=='act'?'成交值約 '+f2(x.tn,1)+' 億':(x.b||(x.w&&x.w[0])||'');return twRow(x.code,x,sub);}).join('');
}
function flowRow(r,mx){var up=r.d>=0;return'<div class="fcard"><div class="fh"><span>'+esc(r.ind)+'</span><span class="'+cl(r.d)+'">'+(up?'+':'')+r.d.toFixed(2)+' pp</span></div><div class="bar"><i class="'+(up?'bi':'bo')+'" style="width:'+Math.max(4,Math.abs(r.d)/mx*100).toFixed(0)+'%"></i></div>'+
 '<div class="fm">成交值 '+r.tn+' 億（占比 '+r.share+'%，近5日均 '+r.avg+'%）・量能 '+f2(r.ratio)+'x・加權漲跌 '+cpc(r.pct)+'<br>主力：'+(r.top||[]).map(function(s){return'<a data-a="open" data-k="tw:'+esc(s.code)+'">'+esc(s.name)+' '+sg(s.pct)+'</a>';}).join(' ')+'</div></div>';}
function vFlow(){var f=DATA.D&&DATA.D.flow;if(!f)return empty('資金流向資料尚未產生<br>（需要累積足夠的成交資料，請重新執行一次 Actions）');
 var mx=Math.max.apply(null,f.inflow.concat(f.outflow).map(function(x){return Math.abs(x.d);}))||1,nm=function(L){return L.slice(0,3).map(function(r){return esc(r.ind);}).join('<br>');};
 return'<div class="intro">以各產業「今日成交值占全市場比重」對比「近 5 日平均占比」，增加＝資金流入、減少＝資金流出（pp＝百分點）。僅含上市櫃個股，不含 ETF。</div>'+
 '<div class="hint"><b>💧 '+esc(f.headline)+'</b></div><div class="flw"><div class="fo">流出<br>'+nm(f.outflow)+'</div><div class="ar">➜</div><div class="fi">流入<br>'+nm(f.inflow)+'</div></div>'+
 '<div class="intro"><b>🔺 資金流入族群</b></div>'+f.inflow.map(function(r){return flowRow(r,mx);}).join('')+'<div class="intro"><b>🔻 資金流出族群</b></div>'+f.outflow.map(function(r){return flowRow(r,mx);}).join('')+
 '<div class="fcard"><details><summary>全部族群排行（占比變化）</summary><ul style="margin-top:8px">'+f.rows.map(function(r){return'<li style="padding-left:0">'+esc(r.ind)+'　<span class="'+cl(r.d)+'">'+(r.d>=0?'+':'')+r.d.toFixed(2)+' pp</span>　'+cpc(r.pct)+'</li>';}).join('').replace(/<li style="padding-left:0">/g,'<li style="padding-left:0;list-style:none">')+'</ul></details></div>';}

/* ---------- 台股查詢 ---------- */
function vTW(){return qbanner()+'<div class="sbox"><input id="q" type="search" placeholder="🔍 輸入代號或名稱（含 ETF），如 2330、0050、台積電" value="'+esc(ST.q)+'"></div>'+chips(['全部','個股','ETF','有訊號'],ST.flt,'flt')+'<div id="rl"></div>';}
function drawTW(){load('S').then(function(){var S=DATA.S,el=$('rl');if(!el)return;if(!S){el.innerHTML=empty('資料載入失敗');return;}
 var q=ST.q.trim().toLowerCase(),pri={breakout:0,prep:1,dip:2,near:3,weak:5,none:6},flt=ST.flt;
 if(!q&&flt=='全部')flt='有訊號';
 var L=Object.keys(S.s).filter(function(c){var x=S.s[c];if(flt=='個股'&&x.e)return false;if(flt=='ETF'&&!x.e)return false;if(flt=='有訊號'&&!(x.t=='breakout'||x.t=='prep'||x.t=='dip'))return false;return!q||c.indexOf(q)==0||x.n.toLowerCase().indexOf(q)>=0;});
 L.sort(function(a,b){return(pri[S.s[a].t]-pri[S.s[b].t])||(a<b?-1:1);});
 var note=(!q&&ST.flt=='全部')?'未輸入關鍵字，顯示今日有訊號的標的・':'';
 el.innerHTML='<div class="cnt">'+note+'共 '+L.length+' 檔'+(L.length>60?'，顯示前 60 檔':'')+'</div>'+(L.slice(0,60).map(function(c){var x=S.s[c];return twRow(c,x,(x.i||'')+(x.x?(x.i?'・':'')+x.x:''));}).join('')||empty('找不到符合的標的'));ani();});}

/* ---------- 美股 ---------- */
function vUS(){var m=DATA.M,h=qbanner();
 if(m&&m.items.length){h+='<div class="strip">'+m.items.filter(function(x){return x.sym!='^TWII';}).map(function(x){x=mkItem(x.sym);var y=x.sym=='^TNX',v=y?x.ch:x.p;return'<div class="mc"><small>'+x.e+' '+esc(x.name)+'</small><b>'+x.c.toLocaleString()+'</b><span class="'+cl(x.p)+'" style="font-size:12px;font-weight:600">'+(x.p>=0?'▲ ':'▼ ')+Math.abs(v).toFixed(y?3:2)+(y?' 點':'%')+'</span>'+spark(x.sp,x.p>=0)+'</div>';}).join('')+'</div>';
 if(m.hint&&m.hint.length)h+='<div class="hint">'+m.hint.map(esc).join('<br>')+'</div>';}
 return h+'<div class="sbox"><input id="q" type="search" placeholder="🔍 搜尋美股代號或中文名，如 NVDA、特斯拉、SPCX" value="'+esc(ST.q)+'"></div><div id="uc"></div><div id="rl"></div>';}
function drawUS(){load('U').then(function(){var U=DATA.U,el=$('rl');if(!el)return;if(!U||!U.items.length){el.innerHTML=empty('尚無美股資料');return;}
 var cats=['全部'];U.items.forEach(function(x){if(cats.indexOf(x.cat)<0)cats.push(x.cat);});$('uc').innerHTML=chips(cats,ST.cat,'cat');
 var q=ST.q.trim().toLowerCase(),L=U.items.filter(function(x){return(ST.cat=='全部'||x.cat==ST.cat)&&(!q||x.sym.toLowerCase().indexOf(q)>=0||x.n.toLowerCase().indexOf(q)>=0);});
 el.innerHTML='<div class="cnt">依市值排序・共 '+L.length+' 檔</div>'+(L.map(usRow).join('')||empty('找不到符合的標的'));ani();});}

/* ---------- 新聞（分類＋影響篩選） ---------- */
function vNews(){return seg([['tw','🇹🇼 總經／台灣'],['en','🌐 國際英文＋中譯']],ST.nsub,'nsub')+'<div id="nl">'+empty('載入中…')+'</div>';}
function drawNews(){var n=ST.nsub=='tw'?'N':'E';load(n).then(function(){var el=$('nl');if(!el)return;el.innerHTML=ST.nsub=='tw'?twNews(DATA.N):enNews(DATA.E);ani();});}
function toolbar(items,extra){var cats=['全部'],cnt={'全部':items.length};items.forEach(function(x){var c=x.cat||'其他';if(cats.indexOf(c)<0){cats.push(c);cnt[c]=0;}cnt[c]++;});
 var ic={'全部':items.length};['偏多','偏空','中性'].forEach(function(k){ic[k]=items.filter(function(x){return(x.dir||'中性')==k;}).length;});
 return'<div class="tbar">'+chips(cats,ST.ncat,'ncat',cnt)+chips(['全部','偏多','偏空','中性'],ST.nimp,'nimp',ic)+(extra||'')+'</div>';}
function filt(items){return items.map(function(x,i){x._i=i;return x;}).filter(function(x){return(ST.ncat=='全部'||(x.cat||'其他')==ST.ncat)&&(ST.nimp=='全部'||(x.dir||'中性')==ST.nimp);});}
function dirBadge(d){d=d||'中性';return'<span class="badge '+(d=='偏多'?'b-up':d=='偏空'?'b-dn':'b-mid')+'">'+(d=='中性'?'影響中性':'對股市'+d)+'</span>';}
function dirColor(d){return d=='偏多'?'#d9434b':d=='偏空'?'#2a9d62':'#8a93a3';}
function twNews(N){if(!N||!N.items.length)return empty('尚無新聞資料');
 var L=filt(N.items);
 return'<div class="hint"><b>📰 今日重點'+(N.mode=='ai'?'（AI 分析）':'（規則式推測）')+'</b><br>'+(N.summary||[]).map(esc).join('<br>')+'</div>'+toolbar(N.items)+
 '<div class="cnt">依標題做的推測，可能判斷錯誤；點標題到原網站看全文。共 '+L.length+' 則</div>'+
 (L.map(function(x){var lk=/^https?:/.test(x.link)?x.link:'#';
 return'<div class="card" style="--c:'+dirColor(x.dir)+'"><div class="top2"><div class="s2">'+esc(x.cat)+' · '+esc(x.src||'')+' · '+esc(x.t)+'</div>'+dirBadge(x.dir)+'</div><a class="nt" href="'+esc(lk)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a>'+
 ((x.sectors||x.why)?'<div class="imp"><b>📊 對股市的影響</b>'+(x.sectors?'可能影響：'+esc(x.sectors)+'<br>':'')+esc(x.why||'')+'</div>':'')+'</div>';}).join('')||empty('這個分類目前沒有新聞'));}
function zh(t){return t?'<div class="zh'+(ST.mask?' mk':'')+'" data-a="reveal">'+esc(t)+'</div>':'';}
function enNews(E){if(!E||!E.items.length)return empty('尚無英文新聞資料');
 var L=filt(E.items),h='';
 if(E.brief&&E.brief.length)h+='<div class="hint"><b>🌐 今日國際重點（對股市）</b><br>'+E.brief.map(esc).join('<br>')+'</div>';
 else h+='<div class="hint"><b>🌐 國際英文新聞</b><br>每則都有「對股市的影響」（規則式推測）。要自動中文翻譯與單字，請設定 ANTHROPIC_API_KEY；沒設定可點每則的「🌐 翻譯」。</div>';
 h+=toolbar(E.items,'<div class="cps"><button class="cp'+(ST.mask?' on':'')+'" data-a="mask">🙈 學習模式：遮住中文'+(ST.mask?'（已開）':'')+'</button></div>');
 return h+'<div class="cnt">共 '+L.length+' 則・點「原文摘要・中文・單字」展開；開學習模式後點模糊的中文看答案</div>'+(L.map(function(x){var lk=/^https?:/.test(x.link)?x.link:'#',gt='https://translate.google.com/?sl=en&tl=zh-TW&op=translate&text='+encodeURIComponent(x.title+'\n'+(x.sum||''));
 var vo=(x.vo&&x.vo.length)?'<div>'+x.vo.map(function(v){return'<span class="vo"><b>'+esc(v.w)+'</b> <span class="'+(ST.mask?'zh mk':'')+'" data-a="reveal" style="background:none;padding:0;margin:0">'+esc(v.zh)+'</span></span>';}).join('')+'</div>':'';
 return'<div class="card" style="--c:'+dirColor(x.dir)+'"><div class="top2"><div class="s2">'+esc(x.cat||'其他')+' · '+esc(x.src)+' · '+esc(x.t)+'</div>'+dirBadge(x.dir)+'</div><div class="et">'+esc(x.title)+'</div>'+zh(x.zt)+
 ((x.im||x.sec)?'<div class="imp"><b>📊 對股市的影響</b>'+(x.sec?'可能影響：'+esc(x.sec)+'<br>':'')+esc(x.im||'')+'</div>':'')+
 '<details><summary>原文摘要・中文・單字</summary>'+(x.sum?'<div class="es">'+esc(x.sum)+'</div>':'')+zh(x.zs)+vo+'</details>'+
 '<div class="tools"><button data-a="speak" data-i="'+x._i+'">🔊 朗讀</button><a href="'+esc(gt)+'" target="_blank" rel="noopener">🌐 翻譯</a><a href="'+esc(lk)+'" target="_blank" rel="noopener">📄 原文</a></div></div>';}).join('')||empty('這個分類目前沒有新聞'));}

/* ---------- 自選 ---------- */
function vMy(){return qbanner()+'<div id="rl">'+empty('載入中…')+'</div>';}
function drawMy(){load('S','U').then(function(){var el=$('rl');if(!el)return;var ks=wl(),h='';
 if(!ks.length){el.innerHTML=empty('還沒有自選<br>在標的詳細頁按「☆ 加自選」就會出現在這裡');return;}
 ks.forEach(function(k){var p=k.split(':'),id=p.slice(1).join(':');if(p[0]=='tw'){var x=DATA.S&&DATA.S.s[id];if(x)h+=twRow(id,x,x.b||'');}else{var u=DATA.U&&DATA.U.items.filter(function(y){return y.sym==id;})[0];if(u)h+=usRow(u);}});
 el.innerHTML='<div class="cnt">共 '+ks.length+' 檔自選</div>'+(h||empty('找不到自選資料'));ani();});}

/* ---------- 走勢圖 ---------- */
function ma(a,n){var o=[],s=0;for(var i=0;i<a.length;i++){s+=a[i];if(i>=n)s-=a[i-n];o.push(i>=n-1?s/n:null);}return o;}
function drawChart(){var el=$('ch'),cu=ST.cur;if(!el||!cu)return;var c=cu.c;if(!c||c.length<2){el.innerHTML=empty('沒有走勢資料');return;}
 var n=c.length,m20=ma(c,20),m60=ma(c,60),k=Math.min(ST.rng,n),s=n-k,cc=c.slice(s),a=m20.slice(s),b=m60.slice(s),R=cu.d?cu.d.length:0,
 dd=function(i){return cu.d&&R-n+s+i>=0?cu.d[R-n+s+i]:'';};
 var all=cc.concat(a.filter(function(v){return v!=null;}),b.filter(function(v){return v!=null;}));(cu.lv||[]).forEach(function(l){if(l.v>0)all.push(l.v);});
 var mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),pad=(mx-mn)*.06||1;mn-=pad;mx+=pad;
 var W=340,H=190,L=40,Rr=8,T=14,B=22,X=function(i){return L+i*(W-L-Rr)/(k-1);},Y=function(v){return T+(1-(v-mn)/(mx-mn))*(H-T-B);};
 var path=function(arr){var d='',on=false;arr.forEach(function(v,i){if(v==null){on=false;return;}d+=(on?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1);on=true;});return d;};
 var up=cc[k-1]>=cc[0],col=up?'#d9434b':'#2a9d62',g='',i;
 for(i=0;i<=3;i++){var v=mn+(mx-mn)*i/3,y=Y(v);g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y+'" y2="'+y+'" stroke="rgba(128,128,128,.2)"/><text x="'+(L-4)+'" y="'+(y+3)+'" font-size="9" text-anchor="end" fill="#888">'+(v>=100?v.toFixed(0):v.toFixed(1))+'</text>';}
 [0,Math.floor((k-1)/2),k-1].forEach(function(j,t){g+='<text x="'+X(j)+'" y="'+(H-6)+'" font-size="9" fill="#888" text-anchor="'+(t==0?'start':t==2?'end':'middle')+'">'+dd(j)+'</text>';});
 (cu.lv||[]).forEach(function(l){if(l.v>mn&&l.v<mx){var y=Y(l.v);g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y+'" y2="'+y+'" stroke="'+l.c+'" stroke-dasharray="4 3"/><text x="'+(W-Rr)+'" y="'+(y-3)+'" font-size="9" fill="'+l.c+'" text-anchor="end">'+l.t+' '+f2(l.v)+'</text>';}});
 var area=path(cc)+'L'+X(k-1)+','+(H-B)+'L'+X(0)+','+(H-B)+'Z';
 el.innerHTML='<svg id="cs" viewBox="0 0 '+W+' '+H+'" style="width:100%;touch-action:pan-y">'+g+'<path d="'+area+'" fill="'+col+'" opacity=".08"/><path class="ln" pathLength="1" d="'+path(b)+'" fill="none" stroke="#3b6fe0" stroke-width="1.4"/><path class="ln" pathLength="1" d="'+path(a)+'" fill="none" stroke="#f9a825" stroke-width="1.4"/><path class="ln" pathLength="1" d="'+path(cc)+'" fill="none" stroke="'+col+'" stroke-width="2"/><circle cx="'+X(k-1)+'" cy="'+Y(cc[k-1])+'" r="3" fill="'+col+'"/><line id="cx" y1="'+T+'" y2="'+(H-B)+'" stroke="#888" opacity="0"/><text id="tip" x="'+L+'" y="9" font-size="10" fill="#888"></text></svg>';
 var sv=el.querySelector&&el.querySelector('svg');if(!sv)return;
 var mv=function(e){var r=sv.getBoundingClientRect(),t=e.touches?e.touches[0]:e,vx=(t.clientX-r.left)*W/r.width,j=Math.max(0,Math.min(k-1,Math.round((vx-L)/(W-L-Rr)*(k-1))));
  var l=$('cx');l.setAttribute('x1',X(j));l.setAttribute('x2',X(j));l.setAttribute('opacity','1');
  $('tip').textContent=dd(j)+'  收 '+f2(cc[j])+(a[j]!=null?'  MA20 '+f2(a[j]):'')+(b[j]!=null?'  MA60 '+f2(b[j]):'');};
 sv.addEventListener('pointermove',mv);sv.addEventListener('touchmove',mv,{passive:true});}

/* ---------- 詳細頁 ---------- */
function openDetail(k){var p=k.split(':'),id=p.slice(1).join(':');ST.open=true;
 $('dt').className='sheet on';$('dt').innerHTML='<div class="sb"><button data-a="back">←</button><span class="st">載入中…</span></div><div class="sc">'+empty('載入中…')+'</div>';
 try{history.pushState({dt:1},'');}catch(e){}
 if(p[0]=='tw')load('S','H').then(function(){showTW(id);});else load('U').then(function(){showUS(id);});}
function closeDetail(){ST.open=false;$('dt').className='sheet';ST.cur=null;if(ST.tab=='my')drawMy();}
function starBtn(k){return'<button data-a="tog" data-k="'+esc(k)+'">'+(has(k)?'★ 已自選':'☆ 加自選')+'</button>';}
function info(list){return'<div class="grid">'+list.map(function(x){return'<div><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join('')+'</div>';}
function signal(x){var g=TAGS[x.t]||TAGS.none,ck=x.ck||'',n=0,i,h='';for(i=0;i<ck.length;i++)if(ck[i]=='1')n++;
 h+='<div class="box2" style="--c:'+g.c+'"><h3>技術面解讀</h3><span class="pill">'+g.e+' '+g.t+'</span>';
 if(x.b)h+='<div class="buy">💡 <b>觀察重點</b>　'+esc(x.b)+(x.s?'<br>技術價位參考：'+f2(x.s,1):'')+'</div>';
 if(x.w&&x.w.length)h+='<h3 style="margin-top:12px">為什麼是這個狀態？</h3><ul>'+x.w.map(function(i){return'<li>'+esc(i)+'</li>';}).join('')+'</ul>';
 if(ck.length==6){var lab=n>=5?'技術面偏強':n>=3?'中性偏多':n>=1?'中性偏弱':'技術面偏弱';
  h+='<h3 style="margin-top:12px">6 項技術檢查：'+n+' / 6（'+lab+'）</h3><div class="meter">'+[0,1,2,3,4,5].map(function(j){return'<i class="'+(j<n?'on':'')+'"></i>';}).join('')+'</div><div class="ck">'+CKL.map(function(t,j){return'<div><span>'+(ck[j]=='1'?'✅':'⬜')+'</span><span>'+t+'</span></div>';}).join('')+'</div>';}
 else h+='<div class="s2" style="margin-top:8px">上市（櫃）時間較短，資料不足，無法完整計算技術指標。</div>';
 return h+'</div>';}
function chartBox(){return'<div class="box2"><h3>走勢圖（收盤）</h3><div id="ch"></div><div class="rng">'+[[22,'1個月'],[66,'3個月'],[100,'近100日']].map(function(r){return'<button class="cp'+(ST.rng==r[0]?' on':'')+'" data-a="rng" data-v="'+r[0]+'">'+r[1]+'</button>';}).join('')+'</div><div class="lgd"><i style="background:#d9434b"></i>收盤<i style="background:#f9a825"></i>MA20<i style="background:#3b6fe0"></i>MA60<i style="background:#ef6c00"></i>技術價位</div></div>';}
function sheet(title,key,html){$('dt').innerHTML='<div class="sb"><button data-a="back">←</button><span class="st">'+esc(title)+'</span>'+starBtn(key)+'</div><div class="sc">'+html+'</div>';$('dt').scrollTop=0;drawChart();}
function showTW(code){var S=DATA.S,x=S&&S.s[code];if(!x){sheet('找不到','tw:'+code,empty('找不到這檔標的'));return;}
 var H=DATA.H,q=qtw(code),c=H&&H.s[code]?H.s[code].slice():null,d=H&&H.d?H.d.slice():null,price=q?q[0]:x.c,pct=q?q[1]:x.p;
 if(q&&c&&d&&DATA.Q.tw_d>(DATA.D.date||'')){c.push(q[0]);d.push(DATA.Q.tw_d.slice(5));}
 ST.cur={c:c,d:d,lv:x.s?[{v:x.s,t:'技術價位',c:'#ef6c00'}]:[]};
 sheet(x.n+' '+code,'tw:'+code,'<div><span class="big '+cl(pct)+'">'+f2(price)+'</span><span class="bp '+cl(pct)+'">'+(pct>=0?'▲ ':'▼ ')+Math.abs(pct).toFixed(2)+'%</span></div><div class="s2">'+[x.e?'ETF':'',x.i,x.x].filter(Boolean).join('・')+(q?'・報價 '+esc(DATA.Q.upd):'')+'</div>'+
 chartBox()+signal(x)+'<div class="box2"><h3>個股資訊</h3>'+info([['52週高／低',f2(x.h)+' / '+f2(x.l)],['距52週高',x.h?sg((price/x.h-1)*100):'—'],['近5日',sg(x.g5)],['近20日',sg(x.g20)],['成交量',x.q!=null?lots(x.q)+' 張':'—'],['成交值',x.tn!=null?f2(x.tn)+' 億':'—'],['本益比',x.e?'—':f2(x.pe,1)],['殖利率',x.y!=null?f2(x.y)+'%':'—'],['股價淨值比',x.e?'—':f2(x.pb)],['RSI(14)',f2(x.r,1)],['量比',x.v!=null?x.v+'x':'—'],['月線／季線',f2(x.a)+' / '+f2(x.z)]])+
 '<div class="lk" style="margin-top:12px"><a href="https://tw.stock.yahoo.com/quote/'+code+(x.x=='上櫃'?'.TWO':'.TW')+'" target="_blank" rel="noopener">Yahoo 股市</a><a href="https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID='+code+'" target="_blank" rel="noopener">Goodinfo</a></div></div><div class="s2" style="margin-top:12px;line-height:1.6">以上為技術面整理，不構成投資建議；技術指標以最近一次收盤分析為準。本益比等官方資料若欄位缺漏會顯示「—」。</div>');}
function showUS(sym){var U=DATA.U,u=U&&U.items.filter(function(y){return y.sym==sym;})[0];if(!u){sheet('找不到','us:'+sym,empty('找不到這檔標的'));return;}
 var q=qus(sym),p=q?q[1]:(u.p||0),price=q?q[0]:u.c;
 ST.cur={c:u.hist,d:U.dates,lv:u.s?[{v:u.s,t:'技術價位',c:'#ef6c00'}]:[]};
 sheet(u.n+' '+u.sym,'us:'+sym,'<div><span class="big '+cl(p)+'">'+f2(price)+'</span><span class="bp '+cl(p)+'">'+(p>=0?'▲ ':'▼ ')+Math.abs(p).toFixed(2)+'%</span></div><div class="s2">美元・'+esc(u.cat)+(q?'・報價 '+esc(DATA.Q.upd):'')+'</div>'+
 chartBox()+signal(u)+'<div class="box2"><h3>基本資訊</h3>'+info([['市值',big(u.cap)],['類別',esc(u.cat)],['52週高／低',f2(u.h)+' / '+f2(u.l)],['距52週高',u.h?sg((price/u.h-1)*100):'—'],['近5日',sg(u.g5)],['近20日',sg(u.g20)],['RSI(14)',f2(u.r,1)],['月線／季線',f2(u.a)+' / '+f2(u.z)]])+
 '<div class="lk" style="margin-top:12px"><a href="https://finance.yahoo.com/quote/'+encodeURIComponent(sym)+'" target="_blank" rel="noopener">Yahoo Finance</a></div></div><div class="s2" style="margin-top:12px;line-height:1.6">技術指標以最近一次收盤分析為準；以上為技術面整理，不構成投資建議。</div>');}

/* ---------- 主流程 ---------- */
function countUp(){[].forEach.call(document.querySelectorAll('[data-n]'),function(e){var n=+e.dataset.n,t0=Date.now();if(!n||!window.requestAnimationFrame)return;(function f(){var r=Math.min(1,(Date.now()-t0)/700);e.textContent=Math.round(n*(1-Math.pow(1-r,3)));if(r<1)requestAnimationFrame(f);})();});}
function render(){
 [].forEach.call(document.querySelectorAll('#nav button'),function(b){b.className=b.dataset.v==ST.tab?'on':'';});
 var v=$('view'),t=ST.tab;
 if(t=='home'){v.innerHTML=vHome();countUp();}
 else if(t=='tw'){v.innerHTML=vTW();drawTW();}
 else if(t=='us'){v.innerHTML=vUS();drawUS();}
 else if(t=='news'){v.innerHTML=vNews();drawNews();}
 else{v.innerHTML=vMy();drawMy();}
 ani();
}
function act(a,d){
 if(a=='tab'){ST.tab=d.v;if(ST.open)history.back();ST.q='';window.scrollTo(0,0);render();}
 else if(a=='sub'){ST.tab='home';ST.sub=d.v;window.scrollTo(0,0);render();}
 else if(a=='flt'){ST.flt=d.v;render();}
 else if(a=='cat'){ST.cat=d.v;drawUS();}
 else if(a=='nsub'){ST.nsub=d.v;ST.ncat='全部';ST.nimp='全部';render();}
 else if(a=='ncat'){ST.ncat=d.v;drawNews();}
 else if(a=='nimp'){ST.nimp=d.v;drawNews();}
 else if(a=='mask'){ST.mask=!ST.mask;drawNews();}
 else if(a=='reveal'){if(d.el)d.el.className=d.el.className.replace(' mk','');}
 else if(a=='speak'){var x=DATA.E&&DATA.E.items[+d.i];if(x&&window.speechSynthesis){speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(x.title+'. '+(x.sum||''));u.lang='en-US';u.rate=.9;speechSynthesis.speak(u);}}
 else if(a=='open'){openDetail(d.k);}
 else if(a=='back'){if(ST.open){try{history.back();}catch(e){closeDetail();}}}
 else if(a=='rng'){ST.rng=+d.v;[].forEach.call(document.querySelectorAll('.rng .cp'),function(b){b.className='cp'+(+b.dataset.v==ST.rng?' on':'');});drawChart();}
 else if(a=='tog'){var w=wl(),i=w.indexOf(d.k);if(i<0)w.push(d.k);else w.splice(i,1);setwl(w);[].forEach.call(document.querySelectorAll('[data-a="tog"]'),function(b){if(b.dataset.k==d.k)b.textContent=has(d.k)?'★ 已自選':'☆ 加自選';});if(ST.tab=='my'&&!ST.open)drawMy();}
 else if(a=='dis'){$('dis').style.display='flex';}
 else if(a=='ok'){try{localStorage.setItem('ack1','1');}catch(e){}$('dis').style.display='none';}
 saveSt();
}
document.addEventListener('click',function(e){var t=e.target.closest('[data-a]');if(!t)return;if(t.tagName=='A'&&t.href)return;var d={};for(var k in t.dataset)d[k]=t.dataset[k];d.el=t;act(t.dataset.a,d);});
document.addEventListener('input',function(e){if(e.target.id!='q')return;ST.q=e.target.value;if(ST.tab=='tw')drawTW();else if(ST.tab=='us')drawUS();});
window.addEventListener('popstate',function(){if(ST.open)closeDetail();});
try{if(localStorage.getItem('ack1'))$('dis').style.display='none';}catch(e){}
restore();render();
Promise.all([load('D'),load('M'),loadQ()]).then(function(){var d=DATA.D;$('meta').textContent=d?'資料日 '+d.date+'　更新 '+d.updated:'尚無資料，請先到 Actions 手動執行一次';
 var items=['^SOX','^IXIC','^DJI'].map(function(s){return mkItem(s);}).filter(Boolean);
 if(items.length)$('mk').textContent='🌎 '+items.map(function(x){return({'^SOX':'費半','^IXIC':'那指','^DJI':'道瓊'})[x.sym]+' '+(x.p>=0?'+':'')+x.p.toFixed(2)+'%';}).join('　');
 render();});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
window.__app={act:act,render:render,ST:ST,DATA:DATA};
})();
