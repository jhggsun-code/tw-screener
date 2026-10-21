"""台股每日技術面選股：產生手機可安裝的網頁(docs/) + 選用 Discord/Telegram 通知
網頁含三個分頁：突破偏多、超跌止跌、查詢自選（可查任一檔個股目前的訊號狀態）"""
import os, json, zlib, struct, datetime as dt
import numpy as np, pandas as pd, requests, yfinance as yf
from extras import get_market, get_news, analyze_news, notify

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
        buy = f"剛突破，追高風險較大；可留意回測 {M20}～{H20} 附近的表現"
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
        buy = f"可留意是否站穩 {f(lo10)}，跌破視為止跌失敗"
    elif tag == "near":
        why = [f"股價 {L} 距近60日低點 {L60} 僅 {(last / lo60 - 1) * 100:.1f}%",
               f"RSI {R} 偏低（40以下）",
               "尚未出現止跌訊號（未站回5日線或RSI未回升）"]
        buy = f"可留意 {L60} 附近是否出現止跌，跌破 {f(stop, 1)} 代表支撐失效"
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

INDEX = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "page.html"), encoding="utf-8").read()  # 網頁版型（page.html）

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

def write_site(up, dip, allst, date, mk, nw):
    os.makedirs("docs", exist_ok=True)
    upd = dt.datetime.now(TZ).strftime("%m/%d %H:%M")
    top = lambda lst: [dict(code=x["code"], **pack(x)) for x in lst]
    data = {"date": str(date), "updated": upd,
            "up": {"total": up[1], "stocks": top(up[0])}, "dip": {"total": dip[1], "stocks": top(dip[0])}}
    json.dump(data, open("docs/data.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"date": str(date), "s": {c: pack(x) for c, x in allst.items()}},
              open("docs/stocks.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(dict(mk, updated=upd), open("docs/market.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(dict(nw, updated=upd), open("docs/news.json", "w", encoding="utf-8"), ensure_ascii=False)
    open("docs/index.html", "w", encoding="utf-8").write(INDEX)
    json.dump(MANIFEST, open("docs/manifest.json", "w", encoding="utf-8"), ensure_ascii=False)
    open("docs/sw.js", "w").write(SW)
    open("docs/robots.txt", "w").write("User-agent: *\nDisallow: /\n")
    make_png(192, "docs/icon-192.png"); make_png(512, "docs/icon-512.png")

if __name__ == "__main__":
    up, dip, allst, date = scan()
    date = date or dt.datetime.now(TZ).date()
    mk = get_market()
    nw = analyze_news(get_news())
    write_site(up, dip, allst, date, mk, nw)
    notify(up, dip, date, mk)
