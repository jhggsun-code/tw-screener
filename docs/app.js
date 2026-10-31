(function(){
'use strict';
var DATA={},ST={tab:'home',sub:'up',cat:'全部',flt:'全部',q:'',nsub:'tw',ncat:'全部',nimp:'全部',rng:66,mask:false,open:false,cur:null};
var PK=['tab','sub','cat','flt','nsub','ncat','nimp','mask','rng'],ccat='全部';
var URLS={K:'health.json',C:'chips.json',B:'backtest.json',V:'events.json',D:'data.json',S:'stocks.json',H:'hist.json',U:'us.json',N:'news.json',E:'enews.json',M:'market.json'};
var TAGS={breakout:{t:'技術面偏多（突破）',e:'🚀',c:'#5c6bc0'},prep:{t:'接近突破',e:'⚡',c:'#f9a825'},dip:{t:'跌深出現止跌跡象',e:'🛟',c:'#ef6c00'},near:{t:'接近低檔支撐',e:'📉',c:'#0097a7'},weak:{t:'弱勢走勢',e:'⛔',c:'#78909c'},none:{t:'無明確訊號',e:'➖',c:'#9e9e9e'},bull:{t:'多頭排列',e:'📈',c:'#5c6bc0'},bear:{t:'空頭排列',e:'📉',c:'#78909c'},range:{t:'盤整震盪',e:'➖',c:'#9e9e9e'}};
var CKL=['收盤站上月線（MA20）','收盤站上季線（MA60）','月線上彎','MACD 柱狀體為正','RSI 在 50～75 健康區','今日量能不低於 20 日均量'];
var INTRO={pick:'',dip:'自半年高點大跌逾 30%、RSI 曾超賣且開始回升。跌深不代表會漲，請自行確認跌的原因。',gain:'今日漲幅前 10 名（已排除成交量過低者）。',act:'今日成交值前 10 名，代表資金最集中的標的。'};
var SUBS=[['pick','🎯 精選5檔'],['flow','💧 資金流向'],['dip','🛟 超跌'],['gain','🔥 漲幅'],['act','💰 成交值']];
function $(i){return document.getElementById(i);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function J(u){return fetch(u+'?'+Date.now()).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text?r.text():r.json();}).then(function(t){if(typeof t!='string')return t;
 try{return JSON.parse(t);}catch(e){try{return JSON.parse(t.replace(/(:|\[|,)\s*-?(NaN|Infinity)(?=\s*[,\]}])/g,'$1null'));}catch(e2){throw new Error('資料格式錯誤');}}});}
function norm(n,d){/* 缺漏欄位補預設值，避免單一欄位缺失就讓整頁出錯 */
 try{if(!d||typeof d!='object')return d;
  if(n=='D'){['up','dip','gain','act'].forEach(function(k){if(d[k]&&!Array.isArray(d[k].stocks))d[k].stocks=[];});var f=d.flow;if(f){['inflow','outflow','rows'].forEach(function(k){f[k]=(f[k]||[]).filter(Boolean);});}}
  else if(n=='U'){d.items=(d.items||[]).filter(Boolean).map(function(u){u.hist=u.hist||[];u.w=u.w||[];return u;});}
  else if(n=='M'){d.items=(d.items||[]).filter(Boolean).map(function(x){x.sp=x.sp||[];x.hist=x.hist||[];return x;});}
  else if(n=='N'||n=='E'){d.items=(d.items||[]).filter(Boolean);}
  else if(n=='S'){d.s=d.s||{};}
  else if(n=='V'){d.events=d.events||[];}
 }catch(e){}return d;}
function load(){var a=[].slice.call(arguments);return Promise.all(a.map(function(n){if(DATA[n]!==undefined)return DATA[n];return J(URLS[n]).then(function(d){d=norm(n,d);DATA[n]=d;return d;}).catch(function(e){DATA[n]=null;(DATA._e=DATA._e||{})[n]=String(e&&e.message||e);return null;});}));}
function loadQ(){var h=location.hostname,p=(location.pathname.split('/')[1]||'');if(!/github\.io$/.test(h)||!p){DATA.Q=null;return Promise.resolve();}
 return fetch('https://raw.githubusercontent.com/'+h.split('.')[0]+'/'+p+'/quotes/quotes.json?t='+Math.floor(Date.now()/60000)).then(function(r){return r.json();}).then(function(q){DATA.Q=q;}).catch(function(){DATA.Q=null;});}
function wl(){try{return JSON.parse(localStorage.getItem('wl')||'[]').map(function(k){return k.indexOf(':')<0?'tw:'+k:k;});}catch(e){return[];}}
function setwl(a){try{localStorage.setItem('wl',JSON.stringify(a));}catch(e){}}
function has(k){return wl().indexOf(k)>=0;}
function saveSt(){try{var o={};PK.forEach(function(k){o[k]=ST[k];});localStorage.setItem('st2',JSON.stringify(o));}catch(e){}}
function restore(){try{var o=JSON.parse(localStorage.getItem('st2')||'{}');PK.forEach(function(k){if(o[k]!==undefined)ST[k]=o[k];});}catch(e){}}
function ln(n){return(n==null||isNaN(n))?'—':Number(n).toLocaleString();}
function f2(n,d){return(n==null||isNaN(n))?'—':Number(n).toFixed(d==null?2:d);}
function sg(p){return(p==null||isNaN(p))?'—':(p>=0?'+':'')+Number(p).toFixed(2)+'%';}
function cl(p){return p>=0?'u':'d';}
function cpc(p){return'<span class="'+cl(p)+'">'+sg(p)+'</span>';}
function ag(n,d){return(n==null||isNaN(n))?'':Math.abs(n).toFixed(d==null?2:d);}
function chgTxt(p,cg,d){p=p||0;return(p>=0?'▲ ':'▼ ')+(cg!=null?ag(cg,d)+'（'+Math.abs(p).toFixed(2)+'%）':Math.abs(p).toFixed(2)+'%');}
function stars(n){n=n||1;return'★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);}
function tpe(){return new Date(Date.now()+8*3600000);}
function dleft(s){var n=tpe(),t=Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()),p=String(s).slice(0,10).split('-');return Math.round((Date.UTC(+p[0],+p[1]-1,+p[2])-t)/864e5);}
function wk(){var dow=tpe().getUTCDay()||7;return dow>=6?[8-dow,14-dow]:[1-dow,7-dow];}
function weekLabel(){return(tpe().getUTCDay()||7)>=6?'下週':'本週';}
function inWeek(days){var r=wk();return days>=r[0]&&days<=r[1];}
function mdDays(s){var m=/^(\d\d)\/(\d\d)/.exec(s||'');if(!m)return null;var n=tpe(),y=n.getUTCFullYear();if(+m[1]-1>n.getUTCMonth()+6)y--;return dleft(y+'-'+m[1]+'-'+m[2]);}
function lots(n){return n==null?'—':Math.round(n).toLocaleString();}
function big(n){if(!n)return'—';return n>=1e12?(n/1e12).toFixed(2)+' 兆美元':Math.round(n/1e8).toLocaleString()+' 億美元';}
function empty(t){return'<div class="empty">'+t+'</div>';}
function ani(){[].forEach.call(document.querySelectorAll('.row,.card,.tile,.hint,.fcard'),function(e,i){e.style.setProperty('--i',Math.min(i,10));});}
/* 報價覆蓋（盤中／收盤後更新） */
function liveOk(){var L=DATA.L;return!!(L&&L.t&&(Date.now()/1000-L.t)<180);}
function loadL(){var h=location.hostname,p=(location.pathname.split('/')[1]||'');if(!/github\.io$/.test(h)||!p){DATA.L=null;return Promise.resolve();}
 return fetch('https://raw.githubusercontent.com/'+h.split('.')[0]+'/'+p+'/live/live.json?t='+Math.floor(Date.now()/15000)).then(function(r){return r.json();}).then(function(l){DATA.L=l;}).catch(function(){});}
function qtw(c){var L=DATA.L;if(liveOk()&&L.tw&&L.tw[c])return L.tw[c];var Q=DATA.Q,D=DATA.D;return(Q&&Q.tw&&D&&Q.tw_d>=D.date&&Q.tw[c])||null;}
function qus(s){var Q=DATA.Q;return(Q&&Q.us&&Q.us[s])||null;}
function qix(s){var L=DATA.L;if(liveOk()&&L.ix&&L.ix[s])return L.ix[s];var Q=DATA.Q;return(Q&&Q.ix&&Q.ix[s])||null;}
function mkItem(s){var m=DATA.M,x=m&&m.items.filter(function(y){return y.sym==s;})[0];if(!x)return null;var q=qix(s);if(!q)return x;var o={};for(var k in x)o[k]=x[k];o.c=q[0];o.p=q[1];o.ch=q[2];return o;}
function qbInner(){var Q=DATA.Q;if(liveOk())return'<div class="qb"><span class="live"></span>⚡ 即時報價 '+esc(DATA.L.upd)+'（'+(DATA.L.src=='yahoo'?'Yahoo，可能延遲':'證交所基本市況報導')+'，約每 30 秒更新）。技術訊號與榜單以最近一次收盤分析為準。</div>';
 if(!(Q&&Q.upd))return'';
 if(!inHours())return'<div class="qb">✅ 目前為收盤後，顯示最近一個交易日的<b>收盤價</b>（證交所／櫃買官方資料）。更新 '+esc(Q.upd)+'。技術訊號與榜單以收盤分析為準。</div>';
 return'<div class="qb"><span class="live"></span>報價更新 '+esc(Q.upd)+'（Yahoo 延遲約 15～20 分鐘；加權指數與自選股請啟用 live.yml 取得約 30 秒更新）。技術訊號與榜單以最近一次收盤分析為準。</div>';}
function qbanner(){return'<div id="qbn">'+qbInner()+'</div>';}
function spark(a,up){if(!a||a.length<2)return'';var mn=Math.min.apply(null,a),mx=Math.max.apply(null,a),pts=a.map(function(v,i){return(i*100/(a.length-1)).toFixed(1)+','+(28-(v-mn)/((mx-mn)||1)*28).toFixed(1);}).join(' ');return'<svg class="sp" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline fill="none" stroke="'+(up?'#d9434b':'#2a9d62')+'" stroke-width="2" points="'+pts+'"/></svg>';}
function row(o){var g=TAGS[o.t]||TAGS.none;return'<div class="row" data-a="open" data-k="'+esc(o.k)+'" data-code="'+esc(o.code)+'" style="--c:'+g.c+'"><div class="rl"><div class="rn">'+esc(o.n)+'<span class="cd">'+esc(o.code)+(o.e?' · ETF':'')+'</span></div>'+(o.nopill?'':'<span class="pill">'+g.e+' '+g.t+'</span>')+''+(o.sub?'<div class="rsub">'+esc(o.sub)+'</div>':'')+'</div><div class="rr">'+(o.sp||'')+'<div class="px '+cl(o.p)+'">'+f2(o.c)+'</div><div class="pc '+cl(o.p)+'">'+chgTxt(o.p,o.cg)+'</div></div></div>';}
function twRow(code,x,sub){var q=qtw(code);return row({k:'tw:'+code,n:x.n,code:code,e:x.e,t:x.t,c:q?q[0]:x.c,p:q?q[1]:x.p,cg:q&&q[2]!=null?q[2]:x.cg,sub:sub});}
function usRow(u){var q=qus(u.sym),p=q?q[1]:(u.p||0);return row({k:'us:'+u.sym,n:u.n,code:u.sym,t:u.t,c:q?q[0]:u.c,p:p,cg:q&&q[2]!=null?q[2]:u.cg,sp:spark(u.hist.slice(-30),p>=0),sub:u.cat+(u.cap?' · 市值 '+big(u.cap):'')});}
function chips(list,cur,act,cnt){return'<div class="cps">'+list.map(function(x){return'<button class="cp'+(x==cur?' on':'')+'" data-a="'+act+'" data-v="'+esc(x)+'">'+esc(x)+(cnt&&cnt[x]!=null?' '+cnt[x]:'')+'</button>';}).join('')+'</div>';}
function seg(list,cur,act){return'<div class="seg">'+list.map(function(x){return'<button class="'+(x[0]==cur?'on':'')+'" data-a="'+act+'" data-v="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';}

/* ---------- 首頁 ---------- */
function evList(){var V=DATA.V,L=[];if(!V)return L;(V.events||[]).forEach(function(e){L.push({d:e.d,md:e.md,wd:e.wd,mk:e.mk,title:e.title,tip:e.tip,est:e.est});});
 ((V.er||{}).up||[]).forEach(function(e){L.push({d:e.d,md:e.d.slice(5).replace('-','/'),wd:'',mk:'er',title:e.n+' 財報／法說',tip:'公布日期為估計，以公司公告為準。'+(e.tw?'台灣相關：'+e.tw+'。':'')});});
 L.forEach(function(e){e.days=dleft(e.d);});return L.filter(function(e){return inWeek(e.days);}).sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0;});}
function whenTxt(n){return n<0?'已過':n==0?'今天':n==1?'明天':'還有 '+n+' 天';}
function twiiHtml(){var tw=mkItem('^TWII');return'📈 台股加權 <b>'+(tw?ln(tw.c):'—')+'</b> '+(tw?'<span class="'+cl(tw.p)+'">'+chgTxt(tw.p,tw.ch,2)+'</span>':'');}
function backChip(){return'<div class="cps"><button class="cp" data-a="sub" data-v="pick">← 返回今日</button></div>';}
function vHl(){var K=DATA.K;if(K===undefined){load('K').then(function(){if(ST.sub=='hl'&&ST.tab=='home')render();});return empty('載入中…');}
 if(!K||!K.items||!K.items.length)return empty('尚無資料狀態<br>請重新執行一次 daily-screener');
 var ic={ok:'✅',warn:'⚠️',bad:'❌'},Q=DATA.Q,L=DATA.L;
 return'<div class="intro"><b>🩺 資料狀態</b>　'+esc(K.gen||'')+' 完整分析時檢查。❌ 代表該來源失敗（也會推播到 Discord／Telegram），⚠️ 代表資料不完整但不影響使用。</div>'+
 K.items.map(function(x){return'<div class="fcard"><div class="fh"><span>'+(ic[x.s]||'•')+' '+esc(x.n)+'</span></div><div class="fm">'+esc(x.d)+'</div></div>';}).join('')+
 '<div class="fcard"><div class="fh"><span>⚡ 即時報價</span></div><div class="fm">個股報價（Yahoo／官方收盤）：'+(Q&&Q.upd?esc(Q.upd):'尚無')+'<br>即時加權指數：'+(liveOk()?esc(L.upd)+'（'+(L.src=='yahoo'?'Yahoo':'證交所')+'）':'未啟用或已過期（盤中才會更新）')+'</div></div>'+useHtml();}
function vChip(){var C=DATA.C;if(C===undefined){load('C').then(function(){if(ST.sub=='chip'&&ST.tab=='home')render();});return empty('載入中…');}
 if(!C||!C.date)return empty('尚無法人資料<br>可能今日尚未公布，或證交所介面改版');
 var m=C.mkt,h='<div class="intro"><b>🏦 三大法人買賣超</b>　資料日 '+esc(C.date)+'。外資＝外資及陸資；個股單位為張，全市場為億元；僅含上市個股。</div>';
 if(m)h+='<div class="grid" style="margin:10px 14px">'+['外資','投信','自營商','合計'].map(function(k){var v=m[k];return'<div><small>'+k+'</small><b class="'+cl(v)+'">'+(v>=0?'+':'')+f2(v,1)+' 億</b></div>';}).join('')+'</div>';
 var rf=function(r){return row({k:'tw:'+r.code,n:r.n,code:r.code,t:'none',nopill:1,c:r.c,p:r.p,sub:'外資 '+lots(r.fi)+'・投信 '+lots(r.it)+'・合計 '+lots(r.tt)+' 張'});};
 return h+'<div class="intro"><b>📈 外資買超前 8</b></div>'+(C.buy||[]).map(rf).join('')+'<div class="intro"><b>📉 外資賣超前 8</b></div>'+(C.sell||[]).map(rf).join('');}
function hd(){try{return JSON.parse(localStorage.getItem('hd')||'{}');}catch(e){return{};}}
function hdCalc(k,price,stop){var h=hd()[k];if(!h||!h.c||!h.q)return null;var m=k.indexOf('tw:')==0?1000:1,cost=h.c*h.q*m,pl=price*h.q*m-cost;return{pl:pl,pct:pl/cost*100,dist:stop?(price/stop-1)*100:null};}
function hdHtml(k,price,stop){var r=hdCalc(k,price,stop);if(!r)return'輸入成本與數量，就會顯示損益與距離技術價位多遠。';return'損益 <b class="'+cl(r.pl)+'">'+(r.pl>=0?'+':'')+Math.round(r.pl).toLocaleString()+'（'+sg(r.pct)+'）</b>'+(r.dist!=null?'　距技術價位 '+sg(r.dist):'');}
function holdBox(k,price,stop){var h=hd()[k]||{},u=k.indexOf('tw:')==0?'張':'股';
 return'<div class="box2"><h3>我的持股（只存在這支手機）</h3><div class="grid"><div><small>平均成本</small><input id="hd_c" type="number" step="any" inputmode="decimal" data-k="'+esc(k)+'" value="'+(h.c||'')+'" style="width:100%"></div><div><small>數量（'+u+'）</small><input id="hd_q" type="number" step="any" inputmode="decimal" data-k="'+esc(k)+'" value="'+(h.q||'')+'" style="width:100%"></div></div><div class="es" id="hd_pl" data-p="'+price+'" data-s="'+(stop||0)+'">'+hdHtml(k,price,stop)+'</div></div>';}
function vHome(){
 var d=DATA.D;if(!d)return empty('尚無資料'+(DATA._e&&DATA._e.D?'<br>原因：data.json '+esc(DATA._e.D):'')+'<br>請先到 GitHub 的 Actions 手動執行一次，或見 SOP「畫面顯示尚無資料」');
 if(['pick','flow','dip','gain','act','cal','cyc','bt','hl','chip'].indexOf(ST.sub)<0)ST.sub='pick';
 var m=DATA.M,f=d.flow,b=d.breadth,h=qbanner();
 if(ST.sub=='cal')return h+backChip()+vCal();
 if(ST.sub=='cyc')return h+backChip()+vCyc();
 if(ST.sub=='hl')return h+backChip()+vHl();
 if(ST.sub=='chip')return h+backChip()+vChip();
 if(ST.sub=='bt'){if(DATA.B===undefined){load('B').then(function(){if(ST.sub=='bt'&&ST.tab=='home')render();});return h+backChip()+empty('載入中…');}return h+backChip()+vBt();}
 var snap='<span id="twii">'+twiiHtml()+'</span>';
 if(b)snap+='<br>🌡 市場溫度 <b>'+b.label+'</b>（上漲 '+b.adv+'／下跌 '+b.dec+' 家）';
 if(f)snap+='<br>💧 '+esc(String(f.headline||'').split('（')[0]);
 h+='<div class="hint"><b>📌 今日一眼看懂</b><br>'+snap+'</div>';
 var ev=evList().slice(0,5);
 h+='<div class="hint" data-a="sub" data-v="cal" style="border-left-color:#f9a825">🗓 <b>'+weekLabel()+'重點</b><br>'+(ev.length?ev.map(function(e){return(e.days<0?'✓ ':e.days<=1?'⚠️ ':'• ')+e.md+(e.wd?'（'+e.wd+'）':'')+' '+esc(e.title)+'　<span class="s2">'+whenTxt(e.days)+(e.est?'・預估':'')+'</span>';}).join('<br>'):'這一週沒有重要事件')+'<br><span class="s2">點開看影響說明 ›</span></div>';
 var nd=m&&m.ndc,cy=m&&m.cycle;
 if(nd||cy)h+='<div class="hint" data-a="sub" data-v="cyc" style="border-left-color:#2a9d62">🌡 <b>景氣循環</b>　'+(nd?esc(nd.light)+'（'+nd.score+' 分）':'')+(nd&&cy?'・':'')+(cy?esc(cy.phase):'')+'　<span class="s2">點開看 ›</span></div>';
 h+='<div class="hint" data-a="sub" data-v="bt" style="border-left-color:#7e57c2">📊 <b>訊號回測</b>　這些訊號過去準不準？<span class="s2">　點開看 ›</span></div>';
 var cc=DATA.C,K=DATA.K,sy=function(v){return(v>=0?'+':'')+f2(v,1)+'億';};
 if(cc&&cc.date&&cc.mkt)h+='<div class="hint" data-a="sub" data-v="chip" style="border-left-color:#7e57c2">🏦 <b>三大法人</b>（'+esc(cc.date.slice(5))+'）外資 <span class="'+cl(cc.mkt['外資'])+'">'+sy(cc.mkt['外資'])+'</span>　投信 <span class="'+cl(cc.mkt['投信'])+'">'+sy(cc.mkt['投信'])+'</span>　<span class="s2">點開看 ›</span></div>';
 if(K&&K.bad)h+='<div class="hint" data-a="sub" data-v="hl" style="border-left-color:#d9434b">❌ <b>資料狀態</b>　'+K.bad+' 項來源失敗、'+K.warn+' 項需注意　<span class="s2">點開看 ›</span></div>';
 h+=seg(SUBS,ST.sub,'sub');
 if(ST.sub=='flow')return h+vFlow();
 if(ST.sub=='pick')return h+vPick();
 h+='<div class="intro">'+INTRO[ST.sub]+'</div>';
 var L=(d[ST.sub]||{}).stocks||[];
 if(!L.length)return h+empty('🌤 目前沒有符合條件的標的');
 return h+L.map(function(x){var sub=ST.sub=='gain'?'成交量 '+lots(x.q)+' 張':ST.sub=='act'?'成交值約 '+f2(x.tn,1)+' 億':(x.b||(x.w&&x.w[0])||'');return twRow(x.code,x,sub);}).join('');
}
function pickCard(x,i){var q=qtw(x.code),p=q?q[1]:x.p,c=q?q[0]:x.c,cg=q&&q[2]!=null?q[2]:x.cg,g=TAGS[x.t]||TAGS.none;
 return'<div class="card" data-a="open" data-k="tw:'+esc(x.code)+'" style="--c:'+g.c+'"><div class="top2"><div><span class="rank">'+(i+1)+'</span><b style="font-size:17px">'+esc(x.n)+'</b><span class="cd">'+esc(x.code)+(x.i?' · '+esc(x.i):'')+'</span></div><div class="rr"><div class="px '+cl(p)+'">'+f2(c)+'</div><div class="pc '+cl(p)+'">'+chgTxt(p,cg)+'</div></div></div>'+
 '<div style="margin-top:8px"><span class="pill">'+g.e+' '+g.t+'</span>　<span class="s2">技術面評分 <b>'+(x.sc||'—')+'</b> / 100</span></div><div class="meter" style="margin:8px 0 4px"><i class="'+(x.sc>=20?'on':'')+'"></i><i class="'+(x.sc>=40?'on':'')+'"></i><i class="'+(x.sc>=60?'on':'')+'"></i><i class="'+(x.sc>=80?'on':'')+'"></i><i class="'+(x.sc>=95?'on':'')+'"></i></div>'+
 '<ul>'+(x.w||[]).slice(0,3).map(function(t){return'<li>'+esc(t)+'</li>';}).join('')+'</ul>'+(x.b?'<div class="buy">💡 '+esc(x.b)+(x.s?'<br>技術價位參考：'+f2(x.s,1):'')+'</div>':'')+'<div class="s2" style="margin-top:8px">⚠️ 風險：技術訊號可能失效，需自設停損並確認基本面與消息面。點進去看走勢圖。</div></div>';}
function vPick(){var d=DATA.D,p=d.pick||{},L=p.stocks||[];
 return'<div class="intro">依<b>技術面綜合評分</b>（訊號強度、6 項檢查、量能、RSI 位置、近期漲幅是否過熱、流動性）排出分數最高的 5 檔個股（不含 ETF，同產業最多 2 檔），候選共 '+(p.total||0)+' 檔。<b>這是技術面的排序，不是買賣推薦</b>，也不保證上漲。</div>'+(L.length?L.map(pickCard).join(''):empty('🌤 今日沒有符合條件的標的'));}
function evCard(e){var col=e.mk=='tw'?'#3b6fe0':e.mk=='us'?'#7e57c2':'#ef6c00';return'<div class="card evt'+(e.days<0?' dim':'')+'" style="--c:'+col+'"><div class="ed"><b>'+e.md+'</b><small>'+(e.wd?'週'+e.wd:'')+'</small></div><div style="flex:1"><div class="top2"><b>'+esc(e.title)+'</b><span class="s2">'+whenTxt(e.days)+(e.est?'・預估':'')+'</span></div><div class="es">'+esc(e.tip)+'</div></div></div>';}
function vCal(){var V=DATA.V;if(!V)return empty('尚無行事曆資料<br>請重新執行一次 Actions');
 var L=evList(),r=wk(),h='<div class="intro"><b>🗓 '+weekLabel()+'重點</b>：台股結算日、美股三巫日／FOMC／非農、追蹤個股的財報日。只列這一週；標示「預估」的日期以官方公告為準。</div>';
 h+=L.length?L.map(evCard).join(''):empty('這一週沒有重要事件');
 var R=(V.latest||[]).filter(function(x){var d=mdDays(x.t);return d!=null&&inWeek(d);});
 if(R.length)h+='<div class="intro"><b>📢 本週官方公布（美國重要數據）</b>　與市場預期的差距才是影響股市的關鍵。</div>'+R.map(function(r){return'<div class="card" style="--c:#7e57c2"><div class="s2">'+esc(r.src)+' · '+esc(r.t)+'</div><a class="nt" href="'+esc(/^https?:/.test(r.link)?r.link:'#')+'" target="_blank" rel="noopener">'+esc(r.title)+'</a>'+(r.tip?'<div class="imp"><b>📊 怎麼影響股市</b>'+esc(r.tip)+'</div>':'')+'</div>';}).join('');
 var E=((V.er||{}).res||[]).filter(function(x){return inWeek(dleft(x.d));});
 if(E.length)h+='<div class="intro"><b>🏢 本週財報／法說結果</b>　「兩日反應」＝公布前一天收盤到公布後一天收盤的漲跌。</div>'+E.map(function(r){var rx=r.rx;return'<div class="card" style="--c:'+(rx==null?'#9e9e9e':rx>=0?'#d9434b':'#2a9d62')+'"><div class="top2"><b>'+esc(r.n)+' <span class="cd">'+esc(r.sym)+'</span></b><span class="s2">'+r.d.slice(5).replace('-','/')+'</span></div><div class="fm" style="font-size:13px">EPS 實際 <b>'+f2(r.act)+'</b> vs 預期 '+f2(r.est)+'・兩日反應 '+(rx==null?'—':cpc(rx))+'</div>'+(r.note?'<div class="imp"><b>📊 解讀</b>'+esc(r.note)+'</div>':'')+'</div>';}).join('');
 h+='<div class="fcard"><details><summary>經濟數據速查：看什麼、怎麼影響股市</summary><ul style="margin-top:8px">'+(V.ind||[]).map(function(t){return'<li style="padding-left:0"><b>'+esc(t[0])+'</b>（'+esc(t[1])+'）<br>'+esc(t[2])+'</li>';}).join('')+'</ul></details></div>';
 return h;}
function vCyc(){var m=DATA.M||{},b=(DATA.D||{}).breadth,nd=m.ndc,cy=m.cycle,h='<div class="intro">景氣循環位置會影響哪些族群比較容易表現。以下結合官方景氣燈號、加權指數價格推估與市場寬度，只是背景參考。</div>';
 var LIGHTS=[['藍燈','9～16','低迷','#3b6fe0'],['黃藍燈','17～22','轉向觀察','#4fc3f7'],['綠燈','23～31','穩定','#2a9d62'],['黃紅燈','32～37','轉向觀察','#ffb300'],['紅燈','38～45','熱絡／過熱','#d9434b']];
 h+='<div class="fcard"><b>🚦 台灣景氣對策信號（國發會）</b>';
 if(nd){var cur=nd.light;h+='<div style="margin-top:8px"><span class="big">'+esc(nd.light)+'</span>　綜合判斷分數 <b>'+nd.score+'</b>'+(nd.prev!=null?'（上期 '+nd.prev+'）':'')+'<div class="s2">資料期：'+esc(nd.date)+'</div></div>';}
 else h+='<div class="es">暫時無法自動取得最新燈號（官方開放資料連線失敗）。請到 <a href="https://index.ndc.gov.tw/n/zh_tw/lightscore" target="_blank" rel="noopener" style="color:var(--acc)">國發會景氣指標查詢系統</a> 查看。</div>';
 h+='<div class="light">'+LIGHTS.map(function(l){return'<div style="background:'+l[3]+';opacity:'+(nd&&nd.light==l[0]?1:.45)+'"><b>'+l[0]+'</b><small>'+l[1]+' 分</small></div>';}).join('')+'</div><div class="s2" style="line-height:1.6">燈號每月由國發會公布，屬同時／落後性質：紅燈代表景氣熱絡但要留意過熱與政策緊縮；藍燈代表低迷，歷史上常接近景氣落底，但不代表立刻反轉。</div></div>';
 if(cy)h+='<div class="fcard"><b>🧭 加權指數價格推估：'+esc(cy.phase)+'</b><div class="es">指數 '+ln(cy.last)+'，季線約 '+ln(cy.ma60)+'、半年線約 '+ln(cy.ma120)+'。依指數與季線、半年線的相對位置與季線方向推估，屬價格面推測，不是官方景氣指標。</div></div>';
 if(b){h+='<div class="fcard"><b>🌡 市場溫度計：'+b.label+'（'+b.temp+'）</b><div class="thermo"><i style="width:'+b.temp+'%"></i></div><div class="fm">站上月線 '+b.a20+'%・站上季線 '+b.a60+'%・上漲 '+b.adv+' 家／下跌 '+b.dec+' 家・接近 52 週高 '+b.hi+' 家／低 '+b.lo+' 家（樣本 '+b.n+' 檔個股）<br>偏熱代表多數個股站上均線、漲多後需留意回檔；偏冷代表多數股票弱勢，跌深後才有機會反彈。</div></div>';}
 var PH=[['復甦期','景氣落底回升、利率偏低，股價通常先於基本面上漲。','金融、營建資產、半導體與電子零組件（庫存回補）、景氣循環股','基本面尚未全面好轉，震盪較多'],
  ['擴張期','景氣與企業獲利同步成長。','半導體、電子、AI 供應鏈、航運、鋼鐵與原物料','評價墊高、追高風險上升'],
  ['趨緩期','成長放緩，通膨與利率壓力浮現。','防禦型：食品、電信、公用事業、高殖利率股','景氣循環股與高本益比股容易回檔'],
  ['衰退／築底期','獲利下滑、市場悲觀，常見殺低與急彈。','防禦型、現金流穩定、醫療與公用事業','趨勢尚未翻轉前反彈可能失敗，宜保守']];
 h+='<div class="intro"><b>🔄 景氣四階段與常見領漲族群</b>（一般性歷史規律，不保證重現）</div>'+PH.map(function(p){var on=cy&&cy.phase==p[0];return'<div class="fcard" style="'+(on?'border:2px solid var(--acc)':'')+'"><b>'+(on?'📍 ':'')+p[0]+'</b>'+(on?'<span class="pill" style="--c:var(--acc)">目前推估</span>':'')+'<div class="es">'+p[1]+'<br><b>常見領漲：</b>'+p[2]+'<br><b>注意：</b>'+p[3]+'</div></div>';}).join('');
 return h;}
function flowRow(r,mx){var up=r.d>=0;return'<div class="fcard"><div class="fh"><span>'+esc(r.ind)+'</span><span class="'+cl(r.d)+'">'+(up?'+':'')+f2(r.d)+' pp</span></div><div class="bar"><i class="'+(up?'bi':'bo')+'" style="width:'+Math.max(4,Math.abs(r.d)/mx*100).toFixed(0)+'%"></i></div>'+
 '<div class="fm">成交值 '+r.tn+' 億（占比 '+r.share+'%，近5日均 '+r.avg+'%）・量能 '+f2(r.ratio)+'x・加權漲跌 '+cpc(r.pct)+'<br>主力：'+(r.top||[]).map(function(s){return'<a data-a="open" data-k="tw:'+esc(s.code)+'">'+esc(s.name)+' '+sg(s.pct)+'</a>';}).join(' ')+'</div></div>';}
function btVerdict(s,b){if(!s||s.n<30)return'樣本太少（不到 30 次），參考性低';
 if(s.ex20>=1&&s.w20>=b.w20+3)return'歷史上，20 日表現相對基準較佳';if(s.ex20<=-1||s.w20<=b.w20-3)return'歷史上，20 日表現不如基準';return'與整體市場差異不大，沒有明顯優勢';}
function vBt(){var B=DATA.B;if(!B)return empty('回測資料尚未產生<br>請到 GitHub Actions 執行一次 weekly-backtest');
 var p=B[ST.btp||'all']||B.all,b=p&&p.base;if(!b)return empty('回測資料不完整');
 var h='<div class="hint"><b>📊 訊號回測</b>（'+esc(B.updated||'')+'，近 '+(B.years||'?')+' 年、'+(B.stocks||'?')+' 檔成交值前段的上市櫃股票）<br>基準＝任選一檔流動性足夠的股票、任一天買進：20 日平均 <b>'+f2(b.a20)+'%</b>、勝率 <b>'+f2(b.w20,0)+'%</b>。</div>'+
 '<div class="cps"><button class="cp'+((ST.btp||'all')=='all'?' on':'')+'" data-a="btp" data-v="all">全期間</button><button class="cp'+(ST.btp=='y1'?' on':'')+'" data-a="btp" data-v="y1">最近 1 年</button></div>';
 ['breakout','prep','dip','near'].forEach(function(k){var s=p.tags&&p.tags[k],g=TAGS[k];
  h+='<div class="card" style="--c:'+g.c+'"><div class="top2"><span class="pill" style="margin:0">'+g.e+' '+g.t+'</span><span class="s2">'+(s?'共 '+s.n+' 次':'無資料')+'</span></div>'+
  (s?'<div class="grid" style="margin-top:10px"><div><small>5 日平均／勝率</small><b>'+cpc(s.a5)+'・'+f2(s.w5,0)+'%</b></div><div><small>20 日平均／勝率</small><b>'+cpc(s.a20)+'・'+f2(s.w20,0)+'%</b></div><div><small>20 日相對基準</small><b>'+cpc(s.ex20)+'</b></div><div><small>最差 10% 情況（20 日）</small><b>'+cpc(s.p10)+'</b></div></div>':'')+
  '<div class="imp"><b>結論</b>'+esc(btVerdict(s,b))+'</div></div>';});
 return h+'<div class="fcard"><details open><summary>怎麼看這份回測、有什麼限制</summary><ul style="margin-top:8px"><li style="padding-left:0">只統計「訊號剛出現那一天」買進、持有 5／20 個交易日的收盤報酬，不是預測。</li><li style="padding-left:0">'+(B.cost?'已扣除手續費與證交稅約 '+B.cost+'%（未計滑價）':'未計手續費、證交稅與滑價')+'；只含目前仍上市的股票（有存活者偏差，結果會偏樂觀）。</li><li style="padding-left:0">期間內若整體大盤上漲，所有股票都會看起來不錯，所以要看「相對基準」。</li><li style="padding-left:0">樣本少、或只來自一段行情，結論都不穩定；過去表現不代表未來。</li></ul></details></div>';}
function vFlow(){var f=DATA.D&&DATA.D.flow;if(!f)return empty('資金流向資料尚未產生<br>（需要累積足夠的成交資料，請重新執行一次 Actions）');
 var mx=Math.max.apply(null,f.inflow.concat(f.outflow).map(function(x){return Math.abs(x.d);}))||1,nm=function(L){return L.slice(0,3).map(function(r){return esc(r.ind);}).join('<br>');};
 return'<div class="intro">以各產業「今日成交值占全市場比重」對比「近 5 日平均占比」，增加＝資金流入、減少＝資金流出（pp＝百分點）。僅含上市櫃個股，不含 ETF。</div>'+
 '<div class="hint"><b>💧 '+esc(f.headline||'')+'</b></div><div class="flw"><div class="fo">流出<br>'+nm(f.outflow)+'</div><div class="ar">➜</div><div class="fi">流入<br>'+nm(f.inflow)+'</div></div>'+
 '<div class="intro"><b>🔺 資金流入族群</b></div>'+f.inflow.map(function(r){return flowRow(r,mx);}).join('')+'<div class="intro"><b>🔻 資金流出族群</b></div>'+f.outflow.map(function(r){return flowRow(r,mx);}).join('')+
 '<div class="fcard"><details><summary>全部族群排行（占比變化）</summary><ul style="margin-top:8px">'+f.rows.map(function(r){return'<li style="padding-left:0">'+esc(r.ind)+'　<span class="'+cl(r.d)+'">'+(r.d>=0?'+':'')+f2(r.d)+' pp</span>　'+cpc(r.pct)+'</li>';}).join('').replace(/<li style="padding-left:0">/g,'<li style="padding-left:0;list-style:none">')+'</ul></details></div>';}

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
var IXS=['^DJI','^GSPC','^SOX','^IXIC','^KS11','^N225'];
function vUS(){var m=DATA.M,h=qbanner();
 if(m&&m.items.length){h+='<div class="intro" style="margin-bottom:0">點指數卡片：看它追蹤什麼、走勢圖與技術面解讀</div><div class="strip">'+IXS.map(mkItem).filter(Boolean).map(function(x){return'<div class="mc" data-a="open" data-k="ix:'+esc(x.sym)+'"><small>'+x.e+' '+esc(x.name)+' ⓘ</small><b>'+ln(x.c)+'</b><span class="'+cl(x.p)+'" style="font-size:12px;font-weight:600">'+chgTxt(x.p,x.ch,x.c>1000?0:2)+'</span>'+spark(x.sp,x.p>=0)+'</div>';}).join('')+'</div>';
 if(m.hint&&m.hint.length)h+='<div class="hint">'+esc(m.hint[0])+'</div>';}
 var ev=evList().filter(function(e){return e.mk!='tw'&&e.days<=14;}).slice(0,3);
 if(ev.length)h+='<div class="hint" data-a="sub" data-v="cal" style="border-left-color:#7e57c2">🗓 <b>美股近期事件</b><br>'+ev.map(function(e){return'• '+e.md+' '+esc(e.title)+'　<span class="s2">'+whenTxt(e.days)+'</span>';}).join('<br>')+'</div>';
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
function filt(items){return items.map(function(x,i){x._i=i;return x;});}
function dirBadge(d){d=d||'中性';return'<span class="badge '+(d=='偏多'?'b-up':d=='偏空'?'b-dn':'b-mid')+'">'+(d=='中性'?'影響中性':'對股市'+d)+'</span>';}
function dirColor(d){return d=='偏多'?'#d9434b':d=='偏空'?'#2a9d62':'#8a93a3';}
function proCon(x){return(x.pro||x.con)?'<div class="pcw">'+(x.pro?'<div class="pro"><b>👍 利多面</b>'+esc(x.pro)+'</div>':'')+(x.con?'<div class="con"><b>👎 利空面／風險</b>'+esc(x.con)+'</div>':'')+'</div>':'';}
function impBox(sec,why){return(sec||why)?'<div class="imp"><b>📊 對股市的影響</b>'+(sec?'可能影響：'+esc(sec)+'<br>':'')+esc(why||'')+'</div>':'';}
function twNews(N){if(!N||!N.items.length)return empty('尚無新聞資料');
 var L=filt(N.items);
 return'<div class="hint"><b>📰 台灣／總經 重點 '+N.items.length+' 則'+(N.mode=='ai'?'（AI 分析）':'（規則式推測）')+'</b><br>'+(N.summary||[]).map(esc).join('<br>')+'</div>'+
 '<div class="cnt">依重要程度排序（★ 越多越重要）；依標題推測，可能判斷錯誤，點標題看原文。共 '+L.length+' 則</div>'+
 (L.map(function(x){var lk=/^https?:/.test(x.link)?x.link:'#';
 return'<div class="card" style="--c:'+dirColor(x.dir)+'"><div class="top2"><div class="s2">'+esc(x.cat)+' · '+esc(x.src||'')+' · '+esc(x.t)+(x.n>1?' · '+x.n+' 家報導':'')+'</div>'+dirBadge(x.dir)+'</div><span class="stars">'+stars(x.imp)+'</span><a class="nt" href="'+esc(lk)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a>'+impBox(x.sectors,x.why)+proCon(x)+'</div>';}).join('')||empty('這個分類目前沒有新聞'));}
function zh(t){return t?'<div class="zh'+(ST.mask?' mk':'')+'" data-a="reveal">'+esc(t)+'</div>':'';}
function enNews(E){if(!E||!E.items.length)return empty('尚無英文新聞資料');
 var L=filt(E.items),h='';
 if(E.brief&&E.brief.length)h+='<div class="hint"><b>🌐 今日國際重點 '+E.items.length+' 則（對股市）</b><br>'+E.brief.map(esc).join('<br>')+'</div>';
 else h+='<div class="hint"><b>🌐 國際英文新聞 重點 '+E.items.length+' 則</b><br>每則都有「對股市的影響」與利弊（規則式推測）。要自動中文翻譯與單字，請設定 ANTHROPIC_API_KEY；沒設定可點每則的「🌐 翻譯」。</div>';
 h+='<div class="cps"><button class="cp'+(ST.mask?' on':'')+'" data-a="mask">🙈 學習模式：遮住中文'+(ST.mask?'（已開）':'')+'</button></div>';
 return h+'<div class="cnt">依重要程度排序（★ 越多越重要）・共 '+L.length+' 則・開學習模式後點模糊的中文看答案</div>'+(L.map(function(x){var lk=/^https?:/.test(x.link)?x.link:'#',gt='https://translate.google.com/?sl=en&tl=zh-TW&op=translate&text='+encodeURIComponent(x.title+'\n'+(x.sum||''));
 var vo=(x.vo&&x.vo.length)?'<div>'+x.vo.map(function(v){return'<span class="vo"><b>'+esc(v.w)+'</b> <span class="'+(ST.mask?'zh mk':'')+'" data-a="reveal" style="background:none;padding:0;margin:0">'+esc(v.zh)+'</span></span>';}).join('')+'</div>':'';
 return'<div class="card" style="--c:'+dirColor(x.dir)+'"><div class="top2"><div class="s2">'+esc(x.cat||'其他')+' · '+esc(x.src)+' · '+esc(x.t)+(x.n>1?' · '+x.n+' 家報導':'')+'</div>'+dirBadge(x.dir)+'</div><span class="stars">'+stars(x.imp)+'</span><div class="et">'+esc(x.title)+'</div>'+zh(x.zt)+impBox(x.sec,x.im)+proCon(x)+
 '<details><summary>原文摘要・中文・單字</summary>'+(x.sum?'<div class="es">'+esc(x.sum)+'</div>':'')+zh(x.zs)+vo+'</details>'+
 '<div class="tools"><button data-a="speak" data-i="'+x._i+'">🔊 朗讀</button><a href="'+esc(gt)+'" target="_blank" rel="noopener">🌐 翻譯</a><a href="'+esc(lk)+'" target="_blank" rel="noopener">📄 原文</a></div></div>';}).join('')||empty('這個分類目前沒有新聞'));}
/* ---------- 自選 ---------- */
function vMy(){return qbanner()+'<div id="rl">'+empty('載入中…')+'</div>';}
function drawMy(){load('S','U').then(function(){var el=$('rl');if(!el)return;var ks=wl(),h='';
 if(!ks.length){el.innerHTML=empty('還沒有自選<br>在標的詳細頁按「☆ 加自選」就會出現在這裡');return;}
 ks.forEach(function(k){var p=k.split(':'),id=p.slice(1).join(':');if(p[0]=='tw'){var x=DATA.S&&DATA.S.s[id];if(x){var q0=qtw(id),hc=hdCalc(k,q0?q0[0]:x.c,x.s);h+=twRow(id,x,hc?'損益 '+(hc.pl>=0?'+':'')+Math.round(hc.pl).toLocaleString()+'（'+sg(hc.pct)+'）':(x.b||''));}}else{var u=DATA.U&&DATA.U.items.filter(function(y){return y.sym==id;})[0];if(u)h+=usRow(u);}});
 el.innerHTML='<div class="cnt">共 '+ks.length+' 檔自選</div>'+(h||empty('找不到自選資料'))+'<div class="hint"><b>🔔 自選股提醒（Discord／Telegram）</b><br>每次完整分析後，若自選股出現新訊號、單日漲跌逾 5%、跌破技術價位，會推播通知。把自選清單複製後，貼到 GitHub 專案最外層的 <b>watchlist.txt</b>；要設到價提醒可在代號後加 &gt;價格 或 &lt;價格（例如 2330 &gt;1100 &lt;950）。<br><button class="cp" data-a="cpw" style="margin-top:8px">複製自選清單</button></div>';ani();});}

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
 if(p[0]=='tw')load('S','H','B').then(function(){showTW(id);});else if(p[0]=='ix')load('M').then(function(){showIX(id);});else load('U').then(function(){showUS(id);});}
function closeDetail(){ST.open=false;$('dt').className='sheet';ST.cur=null;if(ST.tab=='my')drawMy();}
function starBtn(k){return'<button data-a="tog" data-k="'+esc(k)+'">'+(has(k)?'★ 已自選':'☆ 加自選')+'</button>';}
function info(list){return'<div class="grid">'+list.map(function(x){return'<div><small>'+x[0]+'</small><b>'+x[1]+'</b></div>';}).join('')+'</div>';}
function btLine(t){var B=DATA.B,s=B&&B.all&&B.all.tags&&B.all.tags[t],b=B&&B.all&&B.all.base;if(!s||!b||s.n<30)return'';return'<div class="s2" style="margin-top:10px;line-height:1.6">📊 歷史回測（近 '+(B.years||'?')+' 年，'+(B.stocks||'?')+' 檔'+(B.cost?'，已扣手續費與稅':'')+'）：這類訊號出現後 20 日平均 '+sg(s.a20)+'、上漲機率 '+f2(s.w20,0)+'%（'+s.n+' 次）；一般交易日平均 '+sg(b.a20)+'。僅為過去統計，不代表未來。</div>';}
function signal(x){var g=TAGS[x.t]||TAGS.none,ck=x.ck||'',n=0,i,h='',N=ck.length;for(i=0;i<N;i++)if(ck[i]=='1')n++;
 h+='<div class="box2" style="--c:'+g.c+'"><h3>技術面解讀</h3><span class="pill">'+g.e+' '+g.t+'</span>';
 if(x.b)h+='<div class="buy">💡 <b>觀察重點</b>　'+esc(x.b)+(x.s?'<br>技術價位參考：'+f2(x.s,1):'')+'</div>';
 if(x.w&&x.w.length)h+='<h3 style="margin-top:12px">為什麼是這個狀態？</h3><ul>'+x.w.map(function(i){return'<li>'+esc(i)+'</li>';}).join('')+'</ul>';
 if(N>=5){var r=n/N,lab=r>=.8?'技術面偏強':r>=.5?'中性偏多':r>0?'中性偏弱':'技術面偏弱';
  h+='<h3 style="margin-top:12px">'+N+' 項技術檢查：'+n+' / '+N+'（'+lab+'）</h3><div class="meter">'+ck.split('').map(function(c,j){return'<i class="'+(j<n?'on':'')+'"></i>';}).join('')+'</div><div class="ck">'+(x.ckl||CKL).slice(0,N).map(function(t,j){return'<div><span>'+(ck[j]=='1'?'✅':'⬜')+'</span><span>'+t+'</span></div>';}).join('')+'</div>';}
 else h+='<div class="s2" style="margin-top:8px">上市（櫃）時間較短，資料不足，無法完整計算技術指標。</div>';
 h+=(x.sym?'':btLine(x.t));
 return h+'</div>';}
function chartBox(){return'<div class="box2"><h3>走勢圖（收盤）</h3><div id="ch"></div><div class="rng">'+[[22,'1個月'],[66,'3個月'],[100,'近100日']].map(function(r){return'<button class="cp'+(ST.rng==r[0]?' on':'')+'" data-a="rng" data-v="'+r[0]+'">'+r[1]+'</button>';}).join('')+'</div><div class="lgd"><i style="background:#d9434b"></i>收盤<i style="background:#f9a825"></i>MA20<i style="background:#3b6fe0"></i>MA60<i style="background:#ef6c00"></i>技術價位</div></div>';}
function sheet(title,key,html){$('dt').innerHTML='<div class="sb"><button data-a="back">←</button><span class="st">'+esc(title)+'</span>'+(key?starBtn(key):'')+'</div><div class="sc">'+html+'</div>';$('dt').scrollTop=0;drawChart();}
function twHead(code){var x=DATA.S&&DATA.S.s[code];if(!x)return'';var q=qtw(code),price=q?q[0]:x.c,pct=q?q[1]:x.p;return'<span class="big '+cl(pct)+'">'+f2(price)+'</span><span class="bp '+cl(pct)+'">'+chgTxt(pct,q&&q[2]!=null?q[2]:x.cg)+'</span>';}
function showTW(code){var S=DATA.S,x=S&&S.s[code];if(!x){sheet('找不到','tw:'+code,empty('找不到這檔標的'));return;}
 var H=DATA.H,q=qtw(code),c=H&&H.s&&H.s[code]?H.s[code].slice():null,d=H&&H.d?H.d.slice():null,price=q?q[0]:x.c,pct=q?q[1]:x.p;
 if(q&&c&&d&&DATA.Q.tw_d>(DATA.D.date||'')){c.push(q[0]);d.push(DATA.Q.tw_d.slice(5));}
 ST.cur={c:c,d:d,lv:x.s?[{v:x.s,t:'技術價位',c:'#ef6c00'}]:[]};
 ST.curKey=code;sheet(x.n+' '+code,'tw:'+code,'<div id="dp">'+twHead(code)+'</div><div class="s2">'+[x.e?'ETF':'',x.i,x.x].filter(Boolean).join('・')+(q?'・報價 '+esc(DATA.Q.upd):'')+'</div>'+
 chartBox()+signal(x)+holdBox('tw:'+code,price,x.s)+'<div class="box2"><h3>個股資訊</h3>'+info([['52週高／低',f2(x.h)+' / '+f2(x.l)],['距52週高',x.h?sg((price/x.h-1)*100):'—'],['近5日',sg(x.g5)],['近20日',sg(x.g20)],['成交量',x.q!=null?lots(x.q)+' 張':'—'],['成交值',x.tn!=null?f2(x.tn)+' 億':'—'],['本益比',x.e?'—':f2(x.pe,1)],['殖利率',x.y!=null?f2(x.y)+'%':'—'],['股價淨值比',x.e?'—':f2(x.pb)],['RSI(14)',f2(x.r,1)],['量比',x.v!=null?x.v+'x':'—'],['月線／季線',f2(x.a)+' / '+f2(x.z)]].concat(x.fi!=null?[['外資買賣超',lots(x.fi)+' 張'],['投信買賣超',lots(x.it)+' 張'],['三大法人合計',lots(x.tt)+' 張']]:[]))+
 '<div class="lk" style="margin-top:12px"><a href="https://tw.stock.yahoo.com/quote/'+code+(x.x=='上櫃'?'.TWO':'.TW')+'" target="_blank" rel="noopener">Yahoo 股市</a><a href="https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID='+code+'" target="_blank" rel="noopener">Goodinfo</a></div></div><div class="s2" style="margin-top:12px;line-height:1.6">以上為技術面整理，不構成投資建議；技術指標以最近一次收盤分析為準。本益比等官方資料若欄位缺漏會顯示「—」。</div>');}
function erBox(u){var e=u.er;if(!e||(!e.next&&!e.last))return'';var h='<div class="box2"><h3>財報／法說</h3>';
 if(e.next)h+='<div class="es" style="margin:0">下次公布約 <b>'+String(e.next).slice(5).replace('-','/')+'</b>（日期為估計，以公司公告為準）</div>';
 if(e.last){var r=e.last;h+='<div class="fm" style="font-size:13px;margin-top:8px">最近一次 '+String(r.d||'').slice(5).replace('-','/')+'：EPS 實際 <b>'+f2(r.act)+'</b> vs 預期 '+f2(r.est)+'（驚喜 '+(r.sur==null?'—':(r.sur>=0?'+':'')+r.sur+'%')+'）・兩日反應 '+(r.rx==null?'—':cpc(r.rx))+'</div>'+(r.note?'<div class="imp"><b>📊 解讀</b>'+esc(r.note)+(r.tw?'<br>台灣相關：'+esc(r.tw):'')+'</div>':'');}
 return h+'</div>';}
function showUS(sym){var U=DATA.U,u=U&&U.items.filter(function(y){return y.sym==sym;})[0];if(!u){sheet('找不到','us:'+sym,empty('找不到這檔標的'));return;}
 var q=qus(sym),p=q?q[1]:(u.p||0),price=q?q[0]:u.c;
 ST.cur={c:u.hist,d:U.dates,lv:u.s?[{v:u.s,t:'技術價位',c:'#ef6c00'}]:[]};
 sheet(u.n+' '+u.sym,'us:'+sym,'<div><span class="big '+cl(p)+'">'+f2(price)+'</span><span class="bp '+cl(p)+'">'+chgTxt(p,q&&q[2]!=null?q[2]:u.cg)+'</span></div><div class="s2">美元・'+esc(u.cat)+(q?'・報價 '+esc(DATA.Q.upd):'')+'</div>'+
 chartBox()+signal(u)+holdBox('us:'+sym,price,u.s)+erBox(u)+'<div class="box2"><h3>基本資訊</h3>'+info([['市值',big(u.cap)],['類別',esc(u.cat)],['52週高／低',f2(u.h)+' / '+f2(u.l)],['距52週高',u.h?sg((price/u.h-1)*100):'—'],['近5日',sg(u.g5)],['近20日',sg(u.g20)],['RSI(14)',f2(u.r,1)],['月線／季線',f2(u.a)+' / '+f2(u.z)]])+
 '<div class="lk" style="margin-top:12px"><a href="https://finance.yahoo.com/quote/'+encodeURIComponent(sym)+'" target="_blank" rel="noopener">Yahoo Finance</a></div></div><div class="s2" style="margin-top:12px;line-height:1.6">技術指標以最近一次收盤分析為準；以上為技術面整理，不構成投資建議。</div>');}
function showIX(sym){var M=DATA.M,x=mkItem(sym);if(!x){sheet('找不到',null,empty('找不到這個指標'));return;}
 ST.cur={c:x.hist,d:x.dates||M.dates,lv:[]};var y=sym=='^TNX';
 sheet(x.name,null,'<div><span class="big '+cl(x.p)+'">'+ln(x.c)+'</span><span class="bp '+cl(x.p)+'">'+chgTxt(x.p,x.ch,x.c>1000?0:y?3:2)+'</span></div><div class="s2">'+esc(x.sym)+'・資料日 '+esc(x.d)+(qix(sym)?'・報價 '+esc(DATA.Q.upd):'')+'</div>'+
 '<div class="box2"><h3>📖 這是在追蹤什麼？</h3><div class="es" style="margin-top:0">'+esc(x.about)+'</div><h3 style="margin-top:12px">🔍 怎麼看</h3><div class="es" style="margin-top:0">'+esc(x.watch)+'</div><h3 style="margin-top:12px">🇹🇼 與台股的關係</h3><div class="es" style="margin-top:0">'+esc(x.tw)+'</div></div>'+
 chartBox()+signal(x)+'<div class="box2"><h3>統計</h3>'+info([['52週高／低',f2(x.h)+' / '+f2(x.l)],['距52週高',x.h?sg((x.c/x.h-1)*100):'—'],['近5日',sg(x.g5)],['近20日',sg(x.g20)],['RSI(14)',f2(x.r,1)],['月線／季線',f2(x.a)+' / '+f2(x.z)]])+'</div><div class="s2" style="margin-top:12px;line-height:1.6">指數技術解讀以價格與均線、MACD、RSI 計算（不含成交量檢查），僅供參考，不構成投資建議。</div>');}
/* ---------- 主流程 ---------- */
function countUp(){[].forEach.call(document.querySelectorAll('[data-n]'),function(e){var n=+e.dataset.n,t0=Date.now();if(!n||!window.requestAnimationFrame)return;(function f(){var r=Math.min(1,(Date.now()-t0)/700);e.textContent=Math.round(n*(1-Math.pow(1-r,3)));if(r<1)requestAnimationFrame(f);})();});}
function render(){
 [].forEach.call(document.querySelectorAll('#nav button'),function(b){b.className=b.dataset.v==ST.tab?'on':'';});
 var v=$('view'),t=ST.tab;$('stale').innerHTML=(t=='home'||t=='tw')?staleHtml():'';
 try{
 if(t=='home'){v.innerHTML=vHome();countUp();}
 else if(t=='tw'){v.innerHTML=vTW();drawTW();}
 else if(t=='us'){v.innerHTML=vUS();drawUS();}
 else if(t=='news'){v.innerHTML=vNews();drawNews();}
 else{v.innerHTML=vMy();drawMy();}
} catch(e){showErr(e);}
 ani();
}
var FEAT={'tab:home':'今日','tab:tw':'台股','tab:us':'美股','tab:news':'新聞','tab:my':'自選','sub:pick':'精選 5 檔','sub:flow':'資金流向','sub:dip':'超跌','sub:gain':'漲幅榜','sub:act':'成交值榜','sub:cal':'本週重點','sub:cyc':'景氣循環','sub:bt':'訊號回測','sub:chip':'三大法人','sub:hl':'資料狀態','open:tw':'台股個股詳細頁','open:us':'美股個股詳細頁','open:ix':'指數詳細頁','nsub:en':'國際英文新聞','mask':'學習模式','speak':'英文朗讀','cpw':'複製自選清單'};
function useGet(){try{return JSON.parse(localStorage.getItem('use')||'{}');}catch(e){return{};}}
function useCount(a,d){var k=(a=='tab'||a=='sub'||a=='nsub')?a+':'+d.v:a=='open'?'open:'+String(d.k||'').split(':')[0]:a;if(!FEAT[k])return;try{var u=useGet();u[k]=(u[k]||0)+1;u._t=u._t||Date.now();localStorage.setItem('use',JSON.stringify(u));}catch(e){}}
function useHtml(){var u=useGet(),days=u._t?Math.max(1,Math.round((Date.now()-u._t)/864e5)):0,keys=Object.keys(FEAT).sort(function(x,y){return(u[y]||0)-(u[x]||0);});
 return'<div class="fcard"><div class="fh"><span>📈 功能使用統計</span><small>只存在你的手機'+(days?'・統計 '+days+' 天':'')+'</small></div><div class="fm">用一兩週後看看哪些功能從沒用過，再決定要不要刪掉，讓畫面更簡單。<br>'+keys.map(function(k){var n=u[k]||0;return(n?'• ':'<span style="opacity:.55">○ ')+FEAT[k]+'：'+(n?n+' 次':'尚未使用')+(n?'':'</span>');}).join('<br>')+'</div></div>';}
function act(a,d){useCount(a,d);
 if(a=='tab'){ST.tab=d.v;if(ST.open)history.back();ST.q='';window.scrollTo(0,0);render();}
 else if(a=='sub'){ST.tab='home';ST.sub=d.v;window.scrollTo(0,0);render();}
 else if(a=='flt'){ST.flt=d.v;render();}
 else if(a=='cat'){ST.cat=d.v;drawUS();}
 else if(a=='nsub'){ST.nsub=d.v;ST.ncat='全部';ST.nimp='全部';render();}
 else if(a=='ncat'){ST.ncat=d.v;drawNews();}
 else if(a=='ccat'){ccat=d.v;render();}
 else if(a=='nimp'){ST.nimp=d.v;drawNews();}
 else if(a=='mask'){ST.mask=!ST.mask;drawNews();}
 else if(a=='reveal'){if(d.el)d.el.className=d.el.className.replace(' mk','');}
 else if(a=='speak'){var x=DATA.E&&DATA.E.items[+d.i];if(x&&window.speechSynthesis){speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(x.title+'. '+(x.sum||''));u.lang='en-US';u.rate=.9;speechSynthesis.speak(u);}}
 else if(a=='open'){openDetail(d.k);}
 else if(a=='back'){if(ST.open){try{history.back();}catch(e){closeDetail();}}}
 else if(a=='rng'){ST.rng=+d.v;[].forEach.call(document.querySelectorAll('.rng .cp'),function(b){b.className='cp'+(+b.dataset.v==ST.rng?' on':'');});drawChart();}
 else if(a=='tog'){var w=wl(),i=w.indexOf(d.k);if(i<0)w.push(d.k);else w.splice(i,1);setwl(w);[].forEach.call(document.querySelectorAll('[data-a="tog"]'),function(b){if(b.dataset.k==d.k)b.textContent=has(d.k)?'★ 已自選':'☆ 加自選';});if(ST.tab=='my'&&!ST.open)drawMy();}
 else if(a=='reload'){location.reload();}
 else if(a=='btp'){ST.btp=d.v;render();}
 else if(a=='spt'){var off=false;try{off=localStorage.getItem('nosplash')==='1';localStorage.setItem('nosplash',off?'0':'1');}catch(e){}spLabel();}
 else if(a=='cpw'){var txt=wl().map(function(k){return k.split(':').slice(1).join(':');}).join('\n');if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){d.el.textContent='已複製 ✓';},function(){if(window.prompt)prompt('請複製下列內容',txt);});}else if(window.prompt)prompt('請複製下列內容',txt);}
 else if(a=='dis'){$('dis').style.display='flex';}
 else if(a=='ok'){try{localStorage.setItem('ack1','1');}catch(e){}$('dis').style.display='none';}
 saveSt();
}
document.addEventListener('click',function(e){var t=e.target.closest('[data-a]');if(!t)return;if(t.tagName=='A'&&t.href)return;var d={};for(var k in t.dataset)d[k]=t.dataset[k];d.el=t;act(t.dataset.a,d);});
document.addEventListener('input',function(e){var i=e.target.id;if(i=='hd_c'||i=='hd_q'){var k=e.target.dataset.k,H=hd(),o=H[k]||{};o[i=='hd_c'?'c':'q']=parseFloat(e.target.value)||0;H[k]=o;try{localStorage.setItem('hd',JSON.stringify(H));}catch(x){}var el=$('hd_pl');if(el)el.innerHTML=hdHtml(k,+el.dataset.p,+el.dataset.s||0);return;}
 if(i!='q')return;ST.q=e.target.value;if(ST.tab=='tw')drawTW();else if(ST.tab=='us')drawUS();});
window.addEventListener('popstate',function(){if(ST.open)closeDetail();});
try{if(localStorage.getItem('ack1'))$('dis').style.display='none';}catch(e){}
/* ---------- 線上人數（第三方免費計數服務 Abacus：每位使用者每分鐘計 1 次，取近兩分鐘的最大值） ---------- */
var PRES={last:0,LOW:10,HIGH:30};
function presNs(){var s=location.hostname+'/'+(location.pathname.split('/')[1]||''),h=5381,i;for(i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return'twscr'+h.toString(36);}
function presShow(n){var e=$('pres');if(!e)return;if(n==null){e.innerHTML='<i></i><b>—</b> 人在線';e.title='線上人數暫時無法取得';return;}
 var c=n<PRES.LOW?'g':n<PRES.HIGH?'y':'r',t=n<PRES.LOW?'使用人數少，連線順暢':n<PRES.HIGH?'使用人數中等':'使用人數多，更新可能較慢';e.innerHTML='<i class="'+c+'"></i><b>'+n+'</b> 人在線';e.title=t+'（綠＜'+PRES.LOW+'、黃＜'+PRES.HIGH+'、紅≥'+PRES.HIGH+'）';}
function presBeat(){if(document.hidden)return;var m=Math.floor(Date.now()/60000),b='https://abacus.jasoncameron.dev/',ns=presNs(),J2=function(r){return r.ok?r.json():{value:0};},z=function(){return{value:0};};
 var lm=0;try{lm=+localStorage.getItem('plh')||0;}catch(e){}
 var cur=(lm===m||PRES.last===m)?fetch(b+'get/'+ns+'/m'+m).then(J2).catch(z):fetch(b+'hit/'+ns+'/m'+m).then(J2);
 if(lm!==m&&PRES.last!==m){try{localStorage.setItem('plh',String(m));}catch(e){}}PRES.last=m;
 Promise.all([cur,fetch(b+'get/'+ns+'/m'+(m-1)).then(J2).catch(z)]).then(function(v){presShow(Math.max(1,v[0].value||0,v[1].value||0));}).catch(function(){presShow(null);});}
function staleHtml(){var d=DATA.D;if(!d)return'';var n=new Date(Date.now()+8*3600000),w=n.getUTCDay(),m=n.getUTCHours()*60+n.getUTCMinutes(),td=n.toISOString().slice(0,10);
 if(w>=1&&w<=5&&m>=16*60&&d.date<td)return'<div class="stale">⚠️ 目前顯示 '+esc(d.date)+' 收盤資料，今日（'+td+'）收盤分析尚未完成。通常 14:30～18:00 會更新；若今日休市可忽略。</div>';
 if(w>=1&&w<=5&&m>=9*60&&m<14*60&&d.date<td)return'<div class="stale">🕘 盤中：個股訊號與榜單為 '+esc(d.date)+' 收盤資料，股價為準即時／延遲報價。</div>';return'';}
function showErr(e){var el=$('toast');if(!el){return;}el.style.display='block';el.innerHTML='⚠️ 畫面發生錯誤（'+esc(e&&e.message||e)+'）　<a data-a="reload" style="color:#90caf9;text-decoration:underline">重新載入</a>';}
/*SPLASH-JS-START*/
var SP={t0:Date.now(),n:0,done:false};
function spClose(){if(SP.done)return;SP.done=true;var e=$('splash');if(!e)return;e.className='out';try{sessionStorage.setItem('sp1','1');}catch(x){}setTimeout(function(){if(e.parentNode)e.parentNode.removeChild(e);},650);}
function spStep(k,ok){var b=$('sp_'+k);if(!b||b.dataset.d)return;b.dataset.d='1';b.className=ok?'ok':'bad';b.textContent=ok?'[ OK ]':'[FAIL]';SP.n++;var r=$('spBar');if(r)r.style.width=Math.round(SP.n/3*100)+'%';}
function spFinish(){setTimeout(spClose,Math.max(0,1900-(Date.now()-SP.t0)));}
function spInit(){var e=$('splash');if(!e)return;var skip=false;try{skip=localStorage.getItem('nosplash')==='1'||sessionStorage.getItem('sp1')==='1'||(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);}catch(x){}
 if(skip){SP.done=true;if(e.parentNode)e.parentNode.removeChild(e);return;}e.addEventListener('click',spClose);setTimeout(spClose,4500);}
function spLabel(){var t=$('spt');if(!t)return;var off=false;try{off=localStorage.getItem('nosplash')==='1';}catch(x){}t.textContent=off?'開啟啟動動畫':'關閉啟動動畫';}
/*SPLASH-JS-END*/
function refreshLive(){
 var b=$('qbn');if(b)b.innerHTML=qbInner();
 var w=$('twii');if(w)w.innerHTML=twiiHtml();
 if(ST.open&&ST.curKey&&$('dp'))$('dp').innerHTML=twHead(ST.curKey);
 [].forEach.call(document.querySelectorAll('.row[data-code]'),function(r){var k=r.dataset.k||'';if(k.indexOf('tw:')!=0)return;var q=qtw(r.dataset.code),px=r.querySelector('.px'),pc=r.querySelector('.pc');if(!q||!px||!pc)return;px.textContent=f2(q[0]);px.className='px '+cl(q[1]);pc.className='pc '+cl(q[1]);pc.textContent=chgTxt(q[1],q[2]);});}
function inHours(){var d=new Date(Date.now()+8*3600000),w=d.getUTCDay(),m=d.getUTCHours()*60+d.getUTCMinutes();return w>=1&&w<=5&&m>=535&&m<=820;}
function pollLive(){if(document.hidden||!inHours())return;loadL().then(refreshLive);}
window.addEventListener('error',function(e){showErr(e.error||e.message);});
window.addEventListener('unhandledrejection',function(e){showErr(e.reason||'未知錯誤');});
spInit();spLabel();
restore();render();
['D','M','V'].forEach(function(k){load(k).then(function(d){spStep(k,!!d);});});
Promise.all([load('D'),load('M'),load('V'),loadQ(),load('K'),load('C'),load('B')]).then(function(){spFinish();var d=DATA.D;$('meta').textContent=d?'資料日 '+d.date+'　更新 '+d.updated:'尚無資料'+(DATA._e&&DATA._e.D?'（data.json '+DATA._e.D+'）':'，請先到 Actions 手動執行一次');
 var items=['^SOX','^IXIC','^DJI'].map(function(s){return mkItem(s);}).filter(Boolean);
 if(items.length)$('mk').textContent='🌎 '+items.map(function(x){return({'^SOX':'費半','^IXIC':'那指','^DJI':'道瓊'})[x.sym]+' '+(x.p>=0?'+':'')+f2(x.p)+'%';}).join('　');
 render();pollLive();});
setInterval(pollLive,20000);
presBeat();setInterval(presBeat,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden){presBeat();pollLive();}});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
window.__app={act:act,render:render,ST:ST,DATA:DATA,presShow:presShow,staleHtml:staleHtml,presBeat:presBeat,evList:evList};
})();
