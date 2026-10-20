"""台股每日技術面選股：產生手機可安裝的網頁(docs/) + 選用 Discord/Telegram 通知
網頁含三個分頁：突破偏多、超跌止跌、查詢自選（可查任一檔個股目前的訊號狀態）"""
import os, json, zlib, struct, datetime as dt
import numpy as np, pandas as pd, requests, yfinance as yf

TOP_N = 15
MIN_AVG_VOL = 500_000   # 5日均量 >= 500張
MIN_PRICE = 10
TZ = dt.timezone(dt.timedelta(hours=8))

def get_universe():
    u = {}
    try:
        for x in requests.get("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", timeout=30).json():
            c = x["Code"]
            if len(c) == 4 and c.isdigit() and not c.startswith("0"):
                u[c + ".TW"] = x["Name"]
    except Exception as e:
        print("上市清單失敗", e)
    try:
        for x in requests.get("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes", timeout=30).json():
            c = x["SecuritiesCompanyCode"]
            if len(c) == 4 and c.isdigit() and not c.startswith("0"):
                u[c + ".TWO"] = x["CompanyName"]
    except Exception as e:
        print("上櫃清單失敗", e)
    return u

def rsi(c, n=14):
    d = c.diff()
    up = d.clip(lower=0).ewm(alpha=1/n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1/n, adjust=False).mean()
    return 100 - 100 / (1 + up / dn.replace(0, np.nan))

def evaluate(df):
    """計算單一股票的指標與訊號狀態。
    tag: breakout突破偏多 / prep準備突破 / dip跌深止跌 / near接近低檔支撐 / weak弱勢 / none無訊號"""
    df = df.dropna(subset=["Close", "Volume"])
    if len(df) < 70:
        return None
    c, v = df["Close"], df["Volume"]
    ma5, ma20, ma60 = c.rolling(5).mean(), c.rolling(20).mean(), c.rolling(60).mean()
    macd = c.ewm(span=12, adjust=False).mean() - c.ewm(span=26, adjust=False).mean()
    hist = macd - macd.ewm(span=9, adjust=False).mean()
    r = rsi(c)
    last = c.iloc[-1]
    hi20 = c.iloc[-21:-1].max()
    lo60, lo10 = c.iloc[-60:].min(), c.iloc[-10:].min()
    dd = (last / c.iloc[-120:].max() - 1) * 100
    vol_ratio = v.iloc[-1] / v.iloc[-21:-1].mean()
    liquid = v.iloc[-5:].mean() >= MIN_AVG_VOL and last >= MIN_PRICE
    trend = last > ma20.iloc[-1] > ma60.iloc[-1] and ma20.iloc[-1] > ma20.iloc[-6]
    breakout = (liquid and trend and last > hi20 and vol_ratio >= 1.5
                and hist.iloc[-1] > 0 and hist.iloc[-1] > hist.iloc[-2] and 55 <= r.iloc[-1] <= 80)
    prep = (liquid and trend and hi20 * 0.97 <= last <= hi20
            and hist.iloc[-1] > 0 and 50 <= r.iloc[-1] <= 72)
    dip = (liquid and len(df) >= 120 and dd <= -30 and r.iloc[-6:-1].min() <= 30
           and r.iloc[-1] > r.iloc[-2] and last > ma5.iloc[-1] and last > c.iloc[-6:].min())
    near = liquid and last <= lo60 * 1.05 and r.iloc[-1] <= 40
    weak = last < ma20.iloc[-1] < ma60.iloc[-1] and ma20.iloc[-1] < ma20.iloc[-6]
    tag = ("breakout" if breakout else "prep" if prep else "dip" if dip
           else "near" if near else "weak" if weak else "none")
    stop = {"breakout": ma20.iloc[-1], "prep": ma20.iloc[-1], "dip": lo10,
            "near": lo60 * 0.97}.get(tag, 0)
    f = lambda x, n=2: round(float(x), n)
    L, R, M20, M60, H20, L60 = f(last), f(r.iloc[-1], 1), f(ma20.iloc[-1]), f(ma60.iloc[-1]), f(hi20), f(lo60)
    why, buy = [], ""
    if tag == "breakout":
        why = [f"收盤 {L} 突破近20日高點 {H20}",
               f"成交量是20日均量的 {vol_ratio:.1f} 倍，量增確認突破",
               f"收盤 {L} > 月線 {M20} > 季線 {M60}，多頭排列且月線上彎",
               "MACD 柱狀體為正且持續擴大，動能轉強",
               f"RSI {R} 偏強但未過熱（55～80）"]
        buy = f"剛突破，追高風險較大；回測 {M20}～{H20} 附近較穩健"
    elif tag == "prep":
        why = [f"收盤 {L} > 月線 {M20} > 季線 {M60}，多頭排列且月線上彎",
               f"收盤距20日高點 {H20} 僅差 {(hi20 / last - 1) * 100:.1f}%，即將挑戰突破",
               "MACD 柱狀體為正，動能偏多",
               f"RSI {R}，位於偏強區（50～72）"]
        buy = f"收盤放量站上 {H20} 才算確認突破"
    elif tag == "dip":
        why = [f"股價自半年高點下跌 {f(dd, 1)}%，已跌深",
               f"近5日 RSI 曾低於30（超賣），目前回升至 {R}",
               "收盤站回5日線，且高於近6日低點，出現初步止跌跡象",
               "風險：跌深原因不明，請自行確認基本面與消息面"]
        buy = f"站穩 {f(lo10)} 之上可分批觀察，跌破視為止跌失敗"
    elif tag == "near":
        why = [f"股價 {L} 距近60日低點 {L60} 僅 {(last / lo60 - 1) * 100:.1f}%",
               f"RSI {R} 偏低（40以下）",
               "尚未出現止跌訊號（未站回5日線或RSI未回升），建議先觀望"]
        buy = f"在 {L60} 附近觀察是否出現止跌，跌破 {f(stop, 1)} 代表支撐失效"
    elif tag == "weak":
        why = ["股價低於月線與季線，且月線持續下彎", "空頭排列，目前沒有任何買進訊號"]
    return dict(tag=tag, close=L, pct=f((last / c.iloc[-2] - 1) * 100), vol_ratio=f(vol_ratio, 1),
                rsi=R, dd=f(dd, 1), hi20=H20, lo60=L60, lo10=f(lo10), ma20=M20, ma60=M60,
                stop=f(stop, 1), thin=0 if liquid else 1, why=why, buy=buy)

def scan():
    uni = get_universe()
    tickers, allst, last = list(uni), {}, None
    for i in range(0, len(tickers), 150):
        chunk = tickers[i:i+150]
        try:
            data = yf.download(chunk, period="9mo", group_by="ticker",
                               progress=False, threads=True, auto_adjust=True)
        except Exception as e:
            print("下載失敗", e); continue
        for t in chunk:
            try:
                d = data[t]
                day = d["Close"].dropna().index[-1].date()
                last = day if last is None or day > last else last
                res = evaluate(d)
            except Exception:
                continue
            if res:
                res.update(code=t.split(".")[0], name=uni[t]); allst[res["code"]] = res
    up = sorted([s for s in allst.values() if s["tag"] == "breakout"], key=lambda x: x["vol_ratio"], reverse=True)
    dip = sorted([s for s in allst.values() if s["tag"] == "dip"], key=lambda x: x["dd"])
    return (up[:TOP_N], len(up)), (dip[:TOP_N], len(dip)), allst, last

# ---------- 產生手機網頁 (PWA) ----------
def make_png(size, path):
    rows = []
    for y in range(size):
        row = bytearray([0]); fy = y / size
        for x in range(size):
            fx = x / size
            inside = 0.25 <= fy <= 0.72 and abs(fx - 0.5) <= (fy - 0.25) / 0.47 * 0.27
            row += bytes((255, 255, 255)) if inside else bytes((198, 40, 40))
        rows.append(bytes(row))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(png)

INDEX = """<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#d32f2f"><link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png"><title>台股每日選股</title>
<style>
:root{--bg:#f3f4f8;--card:#fff;--tx:#1b1d23;--sub:#7a7f8c;--line:#e8eaf0}
@media(prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#1a1d24;--tx:#eceef3;--sub:#9096a3;--line:#2a2e38}}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--tx);padding-bottom:calc(84px + env(safe-area-inset-bottom))}
header{background:linear-gradient(135deg,#d32f2f,#ff7043);color:#fff;padding:calc(18px + env(safe-area-inset-top)) 18px 26px;border-radius:0 0 26px 26px}
h1{margin:0;font-size:22px}header p{margin:4px 0 14px;font-size:13px;opacity:.92}
.stats{display:flex;gap:10px}.stat{flex:1;background:rgba(255,255,255,.2);border-radius:14px;padding:10px 12px}
.stat b{font-size:24px;display:block}.stat span{font-size:12px;opacity:.95}
.intro{margin:16px 18px 4px;font-size:13px;color:var(--sub);line-height:1.5}
.card{background:var(--card);margin:12px 14px;padding:14px;border-radius:18px;box-shadow:0 2px 10px rgba(0,0,0,.06);border-left:6px solid var(--c)}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.nm{font-size:18px;font-weight:700}.cd{font-size:12px;color:var(--sub);margin-left:6px;font-weight:400}
.pill{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;color:var(--c);background:rgba(128,128,128,.14)}
.pr{text-align:right}.px{font-size:22px;font-weight:700}.pc{font-size:13px;font-weight:600}.u{color:#d32f2f}.d{color:#2e9e4f}
.buy{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(128,128,128,.1);font-size:13px;line-height:1.5}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.chips span{font-size:12px;padding:4px 10px;border-radius:99px;border:1px solid var(--line);color:var(--sub)}
.chips b{color:var(--tx)}
details{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}summary{font-size:14px;font-weight:600;cursor:pointer;list-style:none}
summary::before{content:"▸ "}details[open] summary::before{content:"▾ "}
ul{margin:8px 0 0;padding-left:0;list-style:none}li{font-size:13px;line-height:1.55;padding:4px 0 4px 22px;position:relative}li::before{content:"✔";position:absolute;left:0;color:var(--c)}
.warn{margin-top:8px;font-size:12px;color:#ef6c00}
.star{margin-top:10px;width:100%;padding:9px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--tx);font-size:14px}
#q{display:none;margin:14px;width:calc(100% - 28px);padding:13px 16px;font-size:16px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--tx)}
.empty{text-align:center;color:var(--sub);padding:40px 20px;font-size:14px}
.foot{margin:18px 18px 8px;font-size:12px;color:var(--sub);line-height:1.6}
nav{position:fixed;bottom:0;left:0;right:0;display:flex;background:var(--card);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom)}
nav button{flex:1;border:0;background:none;color:var(--sub);padding:10px 0 8px;font-size:12px}nav button span{display:block;font-size:22px}
nav button.on{color:#d32f2f;font-weight:700}
</style></head><body>
<header><h1>📈 台股每日選股</h1><p id="meta">載入中…</p>
<div class="stats"><div class="stat" onclick="sw('up')"><b id="n_up">-</b><span>🚀 突破偏多</span></div>
<div class="stat" onclick="sw('dip')"><b id="n_dip">-</b><span>🛟 超跌止跌</span></div></div></header>
<div class="intro" id="intro"></div>
<input id="q" type="search" placeholder="🔍 輸入代號或名稱，例如 2330 或 台積電" oninput="render()">
<div id="list"></div><div class="foot" id="foot"></div>
<nav><button id="t_up" onclick="sw('up')"><span>🚀</span>突破偏多</button><button id="t_dip" onclick="sw('dip')"><span>🛟</span>超跌止跌</button><button id="t_my" onclick="sw('my')"><span>🔍</span>查詢自選</button></nav>
<script>
var D=null,S=null,tab='up';
var TAGS={breakout:{t:'偏多買進訊號',e:'🚀',c:'#2e9e4f'},prep:{t:'準備突破',e:'⚡',c:'#f9a825'},dip:{t:'跌深止跌',e:'🛟',c:'#ef6c00'},near:{t:'接近低檔支撐',e:'📉',c:'#1976d2'},weak:{t:'弱勢下跌',e:'⛔',c:'#c62828'},none:{t:'無明確訊號',e:'➖',c:'#9e9e9e'}};
var INTRO={up:'已放量突破前高、均線多頭排列的股票，依量比排序。點「為什麼會入選」看原因。',
dip:'自高點大跌、RSI 曾超賣且開始回升的股票，依跌幅排序。跌深不代表會漲，請自行確認原因。',
my:'查任一檔股票目前的訊號狀態；點「加自選」存在這支手機，下次直接看。'};
function wl(){try{return JSON.parse(localStorage.getItem('wl')||'[]')}catch(e){return[]}}
function tog(c){var a=wl(),i=a.indexOf(c);if(i<0)a.push(c);else a.splice(i,1);try{localStorage.setItem('wl',JSON.stringify(a))}catch(e){}render();}
function sw(t){tab=t;window.scrollTo(0,0);if(t=='my'&&!S){fetch('stocks.json?'+Date.now()).then(function(r){return r.json()}).then(function(d){S=d;render();}).catch(function(){document.getElementById('list').innerHTML='<div class="empty">資料載入失敗</div>';});}render();}
function card(x){
 var g=TAGS[x.t]||TAGS.none,up=x.p>=0,on=wl().indexOf(x.code)>=0,w=x.w||[];
 return '<div class="card" style="--c:'+g.c+'"><div class="top"><div><div class="nm">'+x.n+'<span class="cd">'+x.code+'</span></div>'+
 '<span class="pill">'+g.e+' '+g.t+'</span></div><div class="pr"><div class="px '+(up?'u':'d')+'">'+x.c.toFixed(2)+'</div>'+
 '<div class="pc '+(up?'u':'d')+'">'+(up?'▲ ':'▼ ')+Math.abs(x.p).toFixed(2)+'%</div></div></div>'+
 (x.b?'<div class="buy">💡 <b>參考做法</b>　'+x.b+'</div>':'')+
 '<div class="chips">'+(x.s?'<span>停損參考 <b>'+x.s+'</b></span>':'')+(x.v?'<span>量比 <b>'+x.v+'x</b></span>':'')+'<span>RSI <b>'+x.r+'</b></span><span>距半年高 <b>'+x.d+'%</b></span></div>'+
 (w.length?'<details><summary>為什麼會是這個狀態？</summary><ul>'+w.map(function(i){return '<li>'+i+'</li>'}).join('')+'</ul></details>':'')+
 (x.k?'<div class="warn">⚠️ 近期成交量偏低，流動性風險較高</div>':'')+
 '<button class="star" data-c="'+x.code+'" onclick="tog(this.dataset.c)">'+(on?'★ 已加入自選（點此移除）':'☆ 加入自選')+'</button></div>';}
function render(){
 if(!D)return;var l=document.getElementById('list'),q=document.getElementById('q');
 ['up','dip','my'].forEach(function(t){document.getElementById('t_'+t).className=tab==t?'on':''});
 document.getElementById('intro').textContent=INTRO[tab];
 document.getElementById('foot').innerHTML='使用前一交易日收盤資料計算，非即時報價。技術訊號僅供參考，不保證上漲，非投資建議；「停損參考」只是技術價位，請依自身風險調整。';
 q.style.display=tab=='my'?'block':'none';
 if(tab=='my'){
  if(!S){l.innerHTML='<div class="empty">載入中…</div>';return;}
  var k=q.value.trim().toLowerCase(),codes;
  if(k){codes=Object.keys(S.s).filter(function(c){return c.indexOf(k)==0||S.s[c].n.toLowerCase().indexOf(k)>=0}).slice(0,20);}
  else{codes=wl().filter(function(c){return S.s[c]});}
  if(!codes.length){l.innerHTML='<div class="empty">'+(k?'找不到符合的股票':'輸入代號或名稱查詢<br>點「加入自選」就會存在這裡')+'</div>';return;}
  l.innerHTML=codes.map(function(c){return card(Object.assign({code:c},S.s[c]))}).join('');return;}
 var o=D[tab];
 l.innerHTML=o.stocks.length?o.stocks.map(card).join(''):'<div class="empty">🌤 今日沒有符合條件的個股</div>';
}
fetch('data.json?'+Date.now()).then(function(r){return r.json()}).then(function(d){D=d;
 document.getElementById('meta').textContent='資料日 '+d.date+'　更新 '+d.updated;
 document.getElementById('n_up').textContent=d.up.total;document.getElementById('n_dip').textContent=d.dip.total;render();})
.catch(function(){document.getElementById('meta').textContent='尚無資料，請先手動執行一次 Actions';});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
</script></body></html>"""

MANIFEST = {"name": "台股每日選股", "short_name": "台股選股", "start_url": "./", "scope": "./",
            "display": "standalone", "background_color": "#c62828", "theme_color": "#c62828",
            "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
                      {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]}

SW = """self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).then(r=>{var c=r.clone();
caches.open('v1').then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request)));});"""

def pack(x):
    """壓縮成前端用格式：n名稱 t狀態 c收盤 p漲跌% r RSI d距高點% v量比 s停損 k量少 b做法 w入選原因"""
    o = dict(n=x["name"], t=x["tag"], c=x["close"], p=x["pct"], r=x["rsi"], d=x["dd"], v=x["vol_ratio"])
    for k, key in (("s", "stop"), ("k", "thin"), ("b", "buy"), ("w", "why")):
        if x[key]:
            o[k] = x[key]
    return o

def write_site(up, dip, allst, date):
    os.makedirs("docs", exist_ok=True)
    upd = dt.datetime.now(TZ).strftime("%m/%d %H:%M")
    top = lambda lst: [dict(code=x["code"], **pack(x)) for x in lst]
    data = {"date": str(date), "updated": upd,
            "up": {"total": up[1], "stocks": top(up[0])}, "dip": {"total": dip[1], "stocks": top(dip[0])}}
    json.dump(data, open("docs/data.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"date": str(date), "s": {c: pack(x) for c, x in allst.items()}},
              open("docs/stocks.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    open("docs/index.html", "w", encoding="utf-8").write(INDEX)
    json.dump(MANIFEST, open("docs/manifest.json", "w", encoding="utf-8"), ensure_ascii=False)
    open("docs/sw.js", "w").write(SW)
    make_png(192, "docs/icon-192.png"); make_png(512, "docs/icon-512.png")

# ---------- 通知（選用：Discord / Telegram，有設定哪個就發哪個）----------
def build_text(up, dip, date):
    lines = [f"📈 台股訊號（{date} 收盤）", ""]
    lines.append(f"【突破偏多】共 {up[1]} 檔" + ("" if up[0] else "，今日無"))
    lines += [f"{h['code']} {h['name']} {h['close']} ({h['pct']:+.1f}%) 量比{h['vol_ratio']}x" for h in up[0][:10]]
    lines += ["", f"【超跌止跌】共 {dip[1]} 檔" + ("" if dip[0] else "，今日無")]
    lines += [f"{h['code']} {h['name']} {h['close']} 距高點{h['dd']}%" for h in dip[0][:10]]
    repo = os.getenv("GITHUB_REPOSITORY", "")
    if "/" in repo:
        o, r = repo.split("/"); lines += ["", f"完整頁面：https://{o}.github.io/{r}/"]
    lines.append("⚠️ 技術訊號僅供參考，非投資建議")
    return "\n".join(lines)

def notify(up, dip, date):
    text = build_text(up, dip, date)
    sent = False
    dc = os.getenv("DISCORD_WEBHOOK_URL")
    if dc:
        r = requests.post(dc, json={"content": text[:1900]}, timeout=30)
        print("Discord", r.status_code); sent = True
    tg, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if tg and chat:
        r = requests.post(f"https://api.telegram.org/bot{tg}/sendMessage",
                          json={"chat_id": chat, "text": text}, timeout=30)
        print("Telegram", r.status_code); sent = True
    if not sent:
        print("未設定通知，略過")

if __name__ == "__main__":
    up, dip, allst, date = scan()
    date = date or dt.datetime.now(TZ).date()
    write_site(up, dip, allst, date)
    notify(up, dip, date)
