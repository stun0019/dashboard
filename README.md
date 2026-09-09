# Bryce Strategy

主軸：交易快訊。

## UI 架構

頂部：

```text
☰  Bryce Strategy / 當前 Panel                         %
```

- `☰`：展開左側功能選單
- `%`：開啟右側倉位計算器

左側選單：

```text
交易快訊
賽道強弱
多空標的
下單紀錄
```

主內容一次只顯示一個 Panel。

## 功能

### 交易快訊

顯示：

- BTC / ETH / SOL 市場方向
- 最強 Top 3 賽道
- 最弱 Bottom 3 賽道
- 偏多觀察 Top 5
- 偏空觀察 Top 5

### 賽道強弱

依賽道成員的 24H 平均漲跌做排序：

- AI
- RWA
- Meme
- L1
- L2
- DeFi
- Perp
- DePIN
- Gaming
- BTC 生態

### 多空標的

目前最多各選 8 個：

- 偏多觀察
- 偏空觀察

此處為相對強弱篩選，不是自動交易訊號。

### 倉位計算器

由右上角 `%` 打開。

預設：

- 本金：50 U
- 單筆風險：1%
- 槓桿：50 / 75 / 100 / 200 / 300 X

### 下單紀錄

使用 localStorage。

可：

- 儲存
- 刪除
- 清空

## BingX

目前只串公開 USDT-M WebSocket：

```text
wss://open-api-swap.bingx.com/swap-market
```

不需要 API Key。

不會自動下單。

## 開啟方式

建議在 repo 根目錄：

```bash
python -m http.server 8080
```

然後開：

```text
http://localhost:8080
```

## Codex 注意

Codex 修改本專案時：

- 不要 commit
- 不要 push
- 不要建立 PR
- 不要自行部署 GitHub Pages
