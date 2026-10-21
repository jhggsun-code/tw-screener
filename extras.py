"""美股指標、世界新聞分析、通知（由 screener.py 匯入）"""
import os, re, json, email.utils, urllib.parse, datetime as dt
import xml.etree.ElementTree as ET
from collections import Counter
import requests, yfinance as yf

TZ = dt.timezone(dt.timedelta(hours=8))

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


# ---------- 通知（選用：Discord / Telegram，有設定哪個就發哪個）----------
def build_text(up, dip, date, mk):
    lines = [f"📈 台股技術面訊號整理（{date} 收盤）", mk_line(mk), ""] if mk_line(mk) else [f"📈 台股技術面訊號整理（{date} 收盤）", ""]
    lines.append(f"【突破偏多】共 {up[1]} 檔" + ("" if up[0] else "，今日無"))
    lines += [f"{h['code']} {h['name']} {h['close']} ({h['pct']:+.1f}%) 量比{h['vol_ratio']}x" for h in up[0][:10]]
    lines += ["", f"【超跌止跌】共 {dip[1]} 檔" + ("" if dip[0] else "，今日無")]
    lines += [f"{h['code']} {h['name']} {h['close']} 距高點{h['dd']}%" for h in dip[0][:10]]
    repo = os.getenv("GITHUB_REPOSITORY", "")
    if "/" in repo:
        o, r = repo.split("/"); lines += ["", f"完整頁面：https://{o}.github.io/{r}/"]
    lines.append("⚠️ 個人研究用資料整理，非投資建議、非買賣推薦，不保證獲利，請自行判斷並承擔風險")
    return "\n".join(lines)

def notify(up, dip, date, mk):
    text = build_text(up, dip, date, mk)
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

