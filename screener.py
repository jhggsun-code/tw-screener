"""台股每日技術面選股：產生手機可安裝的網頁(docs/) + 選用 Telegram 通知"""
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

def analyze(df):
    df = df.dropna(subset=["Close", "Volume"])
    if len(df) < 70:
        return None
    c, v = df["Close"], df["Volume"]
    ma20, ma60 = c.rolling(20).mean(), c.rolling(60).mean()
    macd = c.ewm(span=12, adjust=False).mean() - c.ewm(span=26, adjust=False).mean()
    hist = macd - macd.ewm(span=9, adjust=False).mean()
    r = rsi(c)
    vol_ratio = v.iloc[-1] / v.iloc[-21:-1].mean()
    ok = (
        c.iloc[-1] >= MIN_PRICE
        and v.iloc[-5:].mean() >= MIN_AVG_VOL
        and c.iloc[-1] > ma20.iloc[-1] > ma60.iloc[-1]          # 多頭排列
        and ma20.iloc[-1] > ma20.iloc[-6]                        # 月線上彎
        and c.iloc[-1] > c.iloc[-21:-1].max()                    # 突破20日高
        and vol_ratio >= 1.5                                     # 量增
        and hist.iloc[-1] > 0 and hist.iloc[-1] > hist.iloc[-2]  # MACD 轉強
        and 55 <= r.iloc[-1] <= 80                               # RSI 強勢但未過熱
    )
    if not ok:
        return None
    return dict(close=round(float(c.iloc[-1]), 2), pct=round(float((c.iloc[-1]/c.iloc[-2]-1)*100), 2),
                vol_ratio=round(float(vol_ratio), 1), stop=round(float(ma20.iloc[-1]), 1))

def analyze_dip(df):
    """超跌止跌觀察：自高點大跌、RSI曾超賣、已出現初步止跌訊號"""
    df = df.dropna(subset=["Close", "Volume"])
    if len(df) < 120:
        return None
    c, v = df["Close"], df["Volume"]
    ma5 = c.rolling(5).mean()
    r = rsi(c)
    high = c.iloc[-120:].max()
    dd = (c.iloc[-1] / high - 1) * 100
    ok = (
        c.iloc[-1] >= MIN_PRICE
        and v.iloc[-5:].mean() >= MIN_AVG_VOL
        and dd <= -30                          # 距半年高點跌逾30%
        and r.iloc[-6:-1].min() <= 30          # 近5日曾進入超賣
        and r.iloc[-1] > r.iloc[-2]            # RSI 回升
        and c.iloc[-1] > ma5.iloc[-1]          # 站回5日線
        and c.iloc[-1] > c.iloc[-6:].min()     # 已離開近期低點
    )
    if not ok:
        return None
    return dict(close=round(float(c.iloc[-1]), 2), pct=round(float((c.iloc[-1]/c.iloc[-2]-1)*100), 2),
                dd=round(float(dd), 1), rsi=round(float(r.iloc[-1]), 1),
                stop=round(float(c.iloc[-10:].min()), 1))

def scan():
    uni = get_universe()
    tickers, hits, dips, last = list(uni), [], [], None
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
                res, dp = analyze(d), analyze_dip(d)
            except Exception:
                continue
            if res:
                res.update(code=t.split(".")[0], name=uni[t]); hits.append(res)
            if dp:
                dp.update(code=t.split(".")[0], name=uni[t]); dips.append(dp)
    hits.sort(key=lambda x: x["vol_ratio"], reverse=True)
    dips.sort(key=lambda x: x["dd"])
    return (hits[:TOP_N], len(hits)), (dips[:TOP_N], len(dips)), last

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
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#c62828"><link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png"><title>台股每日選股</title>
<style>
:root{--bg:#f5f5f5;--card:#fff;--tx:#111;--sub:#666}
@media(prefers-color-scheme:dark){:root{--bg:#121212;--card:#1e1e1e;--tx:#eee;--sub:#999}}
body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--tx)}
header{background:#c62828;color:#fff;padding:16px 16px 0}h1{margin:0;font-size:20px}
header p{margin:4px 0 10px;font-size:13px;opacity:.9}
.tabs{display:flex}.tabs button{flex:1;padding:10px;border:0;background:transparent;color:#fff;font-size:15px;opacity:.7;border-bottom:3px solid transparent}
.tabs button.on{opacity:1;border-bottom-color:#fff;font-weight:600}
.card{background:var(--card);margin:10px;padding:12px 14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center}
.n{font-size:17px;font-weight:600}.s{font-size:12px;color:var(--sub);margin-top:4px}
.p{text-align:right}.px{font-size:18px;font-weight:600}.up{color:#d32f2f}.dn{color:#2e7d32}
.empty,.foot{text-align:center;color:var(--sub);padding:20px;font-size:13px}
</style></head><body>
<header><h1>📈 台股每日選股</h1><p id="meta">載入中…</p>
<div class="tabs"><button id="t_up" class="on" onclick="sw('up')">突破偏多</button><button id="t_dip" onclick="sw('dip')">超跌止跌</button></div></header>
<div id="list"></div><div class="foot" id="foot"></div>
<script>
var D=null,tab='up';
var FOOT={up:'條件：多頭排列＋突破20日高＋量增1.5倍＋MACD轉強＋RSI 55~80',
dip:'條件：距半年高點跌逾30%＋RSI曾低於30且回升＋站回5日線。超跌股可能續跌、基本面也可能惡化，僅供觀察。'};
function sw(t){tab=t;render();}
function render(){
 if(!D)return;var o=D[tab];
 document.getElementById('t_up').className=tab=='up'?'on':'';document.getElementById('t_dip').className=tab=='dip'?'on':'';
 document.getElementById('meta').textContent='資料日 '+D.date+'｜符合 '+o.total+' 檔｜更新 '+D.updated;
 document.getElementById('foot').innerHTML=FOOT[tab]+'<br>使用前一交易日收盤資料。技術訊號僅供參考，非投資建議。';
 var l=document.getElementById('list');
 if(!o.stocks.length){l.innerHTML='<div class="empty">今日無符合條件的個股</div>';return;}
 l.innerHTML=o.stocks.map(function(s){var c=s.pct>=0?'up':'dn';
 var sub=tab=='up'?'量比 '+s.vol_ratio+'x｜停損參考 '+s.stop:'距高點 '+s.dd+'%｜RSI '+s.rsi+'｜停損參考 '+s.stop;
 return '<div class="card"><div><div class="n">'+s.code+' '+s.name+'</div><div class="s">'+sub+'</div></div>'+
 '<div class="p"><div class="px '+c+'">'+s.close.toFixed(2)+'</div><div class="s '+c+'">'+(s.pct>=0?'+':'')+s.pct.toFixed(2)+'%</div></div></div>';}).join('');
}
fetch('data.json?'+Date.now()).then(function(r){return r.json()}).then(function(d){D=d;render();})
.catch(function(){document.getElementById('meta').textContent='尚無資料，請稍後再試';});
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

def write_site(up, dip, date):
    os.makedirs("docs", exist_ok=True)
    data = {"date": str(date),
            "up": {"total": up[1], "stocks": up[0]}, "dip": {"total": dip[1], "stocks": dip[0]},
            "updated": dt.datetime.now(TZ).strftime("%m/%d %H:%M")}
    json.dump(data, open("docs/data.json", "w", encoding="utf-8"), ensure_ascii=False)
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
    up, dip, date = scan()
    date = date or dt.datetime.now(TZ).date()
    write_site(up, dip, date)
    notify(up, dip, date)
