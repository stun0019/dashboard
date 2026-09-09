# Bryce Strategy

單頁交易 Dashboard，使用左側 Sidebar 切換右側單一主 Panel。

## 功能

- Dashboard
- 板塊雷達
- AI
- Meme
- RWA
- 自選幣
- 倉位計算
- 下單紀錄
- BingX USDT-M WebSocket 即時 ticker
- localStorage 儲存自選幣與下單紀錄

## 目錄

```text
bryce-strategy-dashboard/
├─ index.html
├─ README.md
├─ css/
│  ├─ base.css
│  ├─ layout.css
│  ├─ components.css
│  └─ responsive.css
└─ js/
   ├─ app.js
   ├─ config/
   │  └─ sectors.js
   ├─ services/
   │  ├─ bingx.js
   │  └─ storage.js
   ├─ modules/
   │  ├─ market-store.js
   │  ├─ sector-engine.js
   │  ├─ risk-calculator.js
   │  └─ trade-records.js
   ├─ router/
   │  └─ router.js
   └─ views/
      ├─ dashboard.js
      ├─ sectors.js
      ├─ sector-detail.js
      ├─ watchlist.js
      ├─ calculator.js
      └─ records.js
```

## 使用

可直接開啟 `index.html`。

若瀏覽器對本機 WebSocket / JS 載入有限制，也可在專案根目錄啟動本機伺服器：

```bash
python -m http.server 8080
```

再開：

```text
http://localhost:8080
```

## BingX

目前只使用公開 USDT-M WebSocket 行情，不使用帳戶 API Key，也不提供自動下單。

WebSocket：

```text
wss://open-api-swap.bingx.com/swap-market
```

訂閱格式：

```json
{
  "id": "unique-id",
  "reqType": "sub",
  "dataType": "BTC-USDT@ticker"
}
```

伺服器 Ping 時回覆 Pong。

## 風控

預設：

- 本金：50 U
- 單筆風險：1%
- 槓桿：50 / 75 / 100 / 200 / 300 X

可在：

```text
js/config/sectors.js
```

修改。
