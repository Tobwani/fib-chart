# Fib Chart

Eigener Chart im Browser mit Fibonacci-Retracement/-Extension, Messen, Trendlinien,
RSI, Layouts und Cloud-Sync – als Ersatz für die eingeschränkte Gratis-Version von TradingView.

- **Krypto:** Live-Daten von Binance (WebSocket, kein Key nötig)
- **Aktien/ETFs:** Twelve Data (eigener kostenloser API-Key, wird nur lokal gespeichert)
- **Sync:** Supabase (Login per E-Mail/Passwort, Registrierung geschlossen)
- **Charts:** [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (Apache 2.0)

Läuft komplett statisch über GitHub Pages. Der Supabase *Publishable Key* in `index.html` ist
öffentlich gedacht; der Zugriff ist über Row Level Security auf den eigenen Account beschränkt.

Privates Projekt, nur für den persönlichen Gebrauch.
