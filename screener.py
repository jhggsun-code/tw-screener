"""台股每日技術面選股：產生手機可安裝的網頁(docs/) + 選用 Discord/Telegram 通知
網頁含三個分頁：突破偏多、超跌止跌、查詢自選（可查任一檔個股目前的訊號狀態）"""
import os, re, json, zlib, struct, email.utils, urllib.parse, datetime as dt
import xml.etree.ElementTree as ET
from collections import Counter
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


MARKETS = [("^DJI", "道瓊工業", "🏭"), ("^GSPC", "S&P 500", "🇺🇸"), ("^IXIC", "那斯達克", "💻"),
           ("^SOX", "費城半導體", "🔌"), ("TSM", "台積電 ADR", "🇹🇼"), ("^VIX", "VIX 恐慌指數", "😨"),
           ("^TNX", "美10年期殖利率", "📊"), ("TWD=X", "美元/台幣", "💱"), ("^TWII", "台股加權", "📈")]

def get_market():
    """美股與重要指標（前一個美股交易日收盤）"""
    items = []
    try:
        d = yf.download([m[0] for m in MARKETS], period="2mo", group_by="ticker",
                        progress=False, threads=True, auto_adjust=False)
    except Exception as e:
        print("美股資料失敗", e); return dict(items=[], hint=[])
    for sym, name, emo in MARKETS:
        try:
            c = d[sym]["Close"].dropna()
            items.append(dict(sym=sym, name=name, e=emo, c=round(float(c.iloc[-1]), 2),
                              p=round(float((c.iloc[-1] / c.iloc[-2] - 1) * 100), 2),
                              ch=round(float(c.iloc[-1] - c.iloc[-2]), 3), d=str(c.index[-1].date()),
                              sp=[round(float(x), 2) for x in c.iloc[-20:]]))
        except Exception:
            continue
    g = {x["sym"]: x for x in items}
    hint = []
    sox, ndx, tsm, vix = g.get("^SOX"), g.get("^IXIC"), g.get("TSM"), g.get("^VIX")
    if sox and ndx:
        if sox["p"] >= 1.5 and ndx["p"] >= 1:
            hint.append("🔥 美股科技強勢，電子／半導體股開盤情緒偏多（參考）")
        elif sox["p"] <= -1.5 and ndx["p"] <= -1:
            hint.append("🧊 美股科技走弱，電子／半導體股開盤壓力偏大（參考）")
        else:
            hint.append("美股科技變動不大，台股以自身走勢為主")
    if tsm:
        hint.append(f"台積電 ADR {tsm['p']:+.1f}%，可參考今日台積電開盤方向")
    if vix and (vix["p"] >= 10 or vix["c"] >= 25):
        hint.append(f"😨 VIX {vix['c']}，避險情緒升高，操作宜保守")
    return dict(items=items, hint=hint)

def mk_line(mk):
    g = {x["sym"]: x for x in mk["items"]}
    names = [("^SOX", "費半"), ("^IXIC", "那指"), ("^DJI", "道瓊")]
    return "🌎 美股：" + "　".join(f"{n} {g[s]['p']:+.2f}%" for s, n in names if s in g) if g else ""


# ---------- 總經／世界新聞（只存標題與連結，點擊後到原網站閱讀）----------
UA = {"User-Agent": "Mozilla/5.0"}
NEWS_Q = [("總經／央行", "聯準會 OR 升息 OR 降息 OR 通膨 OR 非農 OR 央行"),
          ("貿易／政策", "關稅 OR 出口管制 OR 貿易戰 OR 制裁 OR 晶片法"),
          ("科技／AI", "輝達 OR 台積電 OR AI伺服器 OR 半導體 OR 蘋果"),
          ("能源／地緣", "原油 OR 油價 OR 中東 OR 烏克蘭 OR 台海"),
          ("台股／匯市", "台股 OR 新台幣 OR 外資 OR 美股")]

def get_news():
    now, seen, items = dt.datetime.now(dt.timezone.utc), set(), []
    for cat, q in NEWS_Q:
        url = ("https://news.google.com/rss/search?q=" + urllib.parse.quote(q + " when:1d")
               + "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant")
        try:
            root = ET.fromstring(requests.get(url, headers=UA, timeout=30).content)
        except Exception as e:
            print("新聞失敗", cat, e); continue
        n = 0
        for it in root.iter("item"):
            title, link = (it.findtext("title") or "").strip(), it.findtext("link") or ""
            src = it.findtext("source") or ""
            if src and title.endswith(" - " + src):
                title = title[:-len(src) - 3]
            try:
                t = email.utils.parsedate_to_datetime(it.findtext("pubDate"))
            except Exception:
                continue
            key = re.sub(r"\W", "", title)[:16]
            if not title or key in seen or (now - t).total_seconds() > 36 * 3600:
                continue
            seen.add(key); n += 1
            items.append(dict(cat=cat, title=title, link=link, src=src, ts=t.timestamp(),
                              t=t.astimezone(TZ).strftime("%m/%d %H:%M")))
            if n >= 6:
                break
    items.sort(key=lambda x: -x["ts"])
    return items[:24]

UP_W = re.compile(r"大漲|飆漲|創高|新高|亮眼|超預期|優於預期|上調|擴產|大單|利多|反彈|受惠|成長")
DN_W = re.compile(r"大跌|重挫|暴跌|衰退|下修|砍單|減產|不如預期|低於預期|裁員|利空|恐慌|危機|示警|下滑")
FLIP = re.compile(r"取消|暫緩|延後|放寬|解除|緩和|停火|休戰|降溫|落空|不降息|不升息|降低")
RULES = [  # (關鍵字, 固定方向或None, 可能影響族群, 傳導邏輯)
    (r"降息|寬鬆|降準|買債", "偏多", "成長股／科技股、營建", "資金成本下降，有利股市估值"),
    (r"升息|鷹派|縮表|殖利率(上升|攀升|走高|飆)|通膨(升溫|惡化|超預期)", "偏空", "成長股／科技股（銀行等金融股相對受惠）", "資金成本上升，壓抑股市估值"),
    (r"關稅|貿易戰|出口管制|禁令|制裁", "偏空", "電子／半導體／航運／傳產出口", "供應鏈成本與訂單不確定性上升"),
    (r"(油價|原油).{0,6}(上漲|飆|攀升|走高|大漲)", "偏空", "航空／運輸／塑化下游（石油相關族群相對受惠）", "成本上升、通膨壓力增加"),
    (r"(油價|原油).{0,6}(下跌|重挫|走低|大跌)", "偏多", "航空／運輸／塑化下游", "成本下降、通膨壓力減輕"),
    (r"中東|烏克蘭|俄羅斯|台海|戰爭|衝突|飛彈", "偏空", "航運、油價敏感族群；避險情緒升高", "地緣風險升高，通常拉大市場波動"),
    (r"輝達|AI|伺服器|資料中心|HBM|CoWoS|晶圓代工|半導體", None, "AI 供應鏈／半導體", "AI 與半導體消息會帶動相關供應鏈情緒"),
    (r"新台幣", None, "出口電子（升值不利）、壽險（升值有匯損）", "匯率變動影響出口業獲利與壽險帳面"),
    (r"非農|就業|CPI|PCE|GDP", None, "整體市場（利率預期）", "經濟數據會影響降息／升息預期"),
    (r"外資", None, "大型權值股", "外資買賣超影響大型股走勢"),
]
OPP = {"偏多": "偏空", "偏空": "偏多"}

def rule_analyze(it):
    t = it["title"]; it.update(dir="中性", sectors="", why="")
    for pat, d, sec, why in RULES:
        if re.search(pat, t):
            if d is None:
                u, w = len(UP_W.findall(t)), len(DN_W.findall(t))
                d = "偏多" if u > w else "偏空" if w > u else "中性"
            elif FLIP.search(t):
                d, why = OPP[d], why + "（標題含緩和／反向字眼，已反向判斷）"
            it.update(dir=d, sectors=sec, why=why); break
    return it

def ai_analyze(items):
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key or not items:
        return None
    lines = "\n".join(f"{i}. [{x['cat']}] {x['title']}（{x['src']}）" for i, x in enumerate(items))
    prompt = ("你是台股研究助理。以下是今日財經新聞標題（只有標題）。請只輸出 JSON，格式："
              '{"summary":["3~5句：今日整體對台股的可能影響重點"],'
              '"items":[{"i":編號,"dir":"偏多|偏空|中性","sectors":"可能受影響的產業或族群","why":"1~2句傳導邏輯與不確定性"}]}。'
              "規則：只根據標題推論，不要編造標題沒有的事實；不要推薦買賣個股；語氣保守，說明這是推測；繁體中文。\n\n" + lines)
    try:
        r = requests.post("https://api.anthropic.com/v1/messages", timeout=120,
                          headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                          json={"model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5"), "max_tokens": 4000,
                                "messages": [{"role": "user", "content": prompt}]})
        text = "".join(b.get("text", "") for b in r.json()["content"] if b.get("type") == "text")
        res = json.loads(text[text.index("{"): text.rindex("}") + 1])
        for o in res["items"]:
            if 0 <= o["i"] < len(items) and o["dir"] in ("偏多", "偏空", "中性"):
                items[o["i"]].update(dir=o["dir"], sectors=str(o.get("sectors", "")), why=str(o.get("why", "")))
        return [str(s) for s in res["summary"]]
    except Exception as e:
        print("AI 分析失敗，改用規則式", e); return None

def analyze_news(items):
    items = [rule_analyze(x) for x in items]
    summ = ai_analyze(items)
    mode = "ai" if summ else "rule"
    if not summ:
        c = Counter(x["dir"] for x in items)
        summ = [f"{len(items)} 則新聞中：偏多 {c['偏多']} 則、偏空 {c['偏空']} 則、中性 {c['中性']} 則（僅依標題關鍵字推測）"]
        top = Counter((x["dir"], x["sectors"]) for x in items if x["dir"] != "中性" and x["sectors"]).most_common(3)
        summ += [f"{d}　{s}（{n} 則）" for (d, s), n in top]
    for x in items:
        x.pop("ts", None)
    return dict(mode=mode, summary=summ, items=items)

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
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#d32f2f"><link rel="manifest" href="manifest.json">
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
.mk{margin-top:12px;padding:8px 12px;border-radius:99px;background:rgba(255,255,255,.2);font-size:13px}
.hint{margin:14px;padding:12px 14px;border-radius:16px;background:var(--card);box-shadow:0 2px 10px rgba(0,0,0,.06);font-size:13px;line-height:1.7;border-left:6px solid #d32f2f}
.mg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 14px}
.mc{background:var(--card);border-radius:16px;padding:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.mt{display:flex;justify-content:space-between;font-size:13px;font-weight:600}.s2{font-size:11px;color:var(--sub);font-weight:400}
.mv{margin-top:6px;font-size:19px;font-weight:700}.mv small{display:block;font-size:12px;font-weight:600;margin-top:2px}
.sp{width:100%;height:34px;margin-top:6px}
.nt{display:block;margin-top:6px;font-size:15px;font-weight:600;line-height:1.5;color:var(--tx);text-decoration:none}
.legal{margin:-8px 0 0;padding:6px 18px 0;font-size:11px;color:var(--sub);text-align:center}
.dis{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99;padding:20px}
.box{background:var(--card);border-radius:20px;padding:20px;max-width:420px;max-height:90vh;overflow:auto}
.box h2{margin:0 0 10px;font-size:18px}.box li{padding-left:0}.box li::before{content:none}
.box ul{padding-left:18px;list-style:disc}.box button{width:100%;margin-top:14px;padding:12px;border:0;border-radius:12px;background:#d32f2f;color:#fff;font-size:16px}
.foot a{color:#d32f2f;text-decoration:underline}
</style></head><body>
<header><h1>📈 台股每日選股</h1><p id="meta">載入中…</p>
<div class="stats"><div class="stat" onclick="sw('up')"><b id="n_up">-</b><span>🚀 突破偏多</span></div>
<div class="stat" onclick="sw('dip')"><b id="n_dip">-</b><span>🛟 超跌止跌</span></div></div><div class="mk" id="mk" onclick="sw('mk')"></div></header>
<div class="legal">個人研究用資料整理・非投資建議・不收取任何費用</div>
<div class="intro" id="intro"></div>
<input id="q" type="search" placeholder="🔍 輸入代號或名稱，例如 2330 或 台積電" oninput="render()">
<div id="list"></div><div class="foot" id="foot"></div>
<nav><button id="t_up" onclick="sw('up')"><span>🚀</span>突破</button><button id="t_dip" onclick="sw('dip')"><span>🛟</span>超跌</button><button id="t_my" onclick="sw('my')"><span>🔍</span>查詢</button><button id="t_mk" onclick="sw('mk')"><span>🌎</span>美股</button><button id="t_nw" onclick="sw('nw')"><span>📰</span>新聞</button></nav>
<div class="dis" id="dis"><div class="box"><h2>⚠️ 使用前請先閱讀</h2><ul>
<li>本工具是<b>個人研究用</b>的技術指標與新聞整理，內容由程式自動計算，不是任何形式的投資建議或買賣推薦。</li>
<li>不保證獲利。股票投資有風險，請自行判斷並承擔全部風險。</li>
<li>本工具<b>完全免費</b>，不收取任何費用。請勿將內容用於收費、帶單或對外推薦個股。</li>
<li>資料為前一交易日收盤，可能有誤或延遲；新聞僅為標題與推測，請至原網站閱讀完整內容。</li></ul>
<button onclick="ok()">我了解並同意</button></div></div>
<script>
function showDis(){document.getElementById('dis').style.display='flex';}
function ok(){try{localStorage.setItem('ack1','1')}catch(e){}document.getElementById('dis').style.display='none';}
try{if(localStorage.getItem('ack1'))document.getElementById('dis').style.display='none';}catch(e){}
var D=null,S=null,M=null,N=null,tab='up';
var TAGS={breakout:{t:'
