# Frontend

Ramazan İnanç Hair Art Studio’nun public rezervasyon, müşteri hesabı ve salon admin arayüzü.

## Komutlar

```powershell
npm run dev
npm run lint
npm run test
npm run test:e2e
npm run build
```

`VITE_API_URL` tanımlı değilse development API adresi `http://127.0.0.1:3000/api` kullanılır. Container derlemesinde `/api` aynı origin üzerinden Nginx’e yönlenir.

Playwright masaüstü/mobil Chromium’da ana rezervasyon kataloğu, müşteri telefon girişi, bağımsız admin girişi ve kritik responsive genişliklerde yatay taşmayı denetler.
