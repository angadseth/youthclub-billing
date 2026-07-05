# YouthClub Billing

Invoice + records dashboard for YouthClub Securities Services (Jhunjhunu).
Static React app on GitHub Pages; data lives in a separate **private** repo
(`youthclub-data`) via the GitHub Contents API.

**Live:** https://angadseth.github.io/youthclub-billing/

## Features
- Pixel-matched A4 tax invoice with live preview, auto multi-page, dynamic columns
- Flexible tax (CGST+SGST / IGST / none), management fees, auto amount-in-words
- Clients, monthly register (paid/baaki + overdue), bulk billing, FY-wise invoice numbers
- Exports: Print, PDF, Share (WhatsApp/Gmail via Web Share), Excel (+GST summary), Word
- Dashboard with billing trend, client revenue, paid-vs-pending
- Light/dark mode; offline-first (localStorage queue, syncs when online)

## Dev
```bash
npm install
npm run dev      # local
npx vitest run   # domain tests (calc engine verified against a real invoice)
npm run build
```

## Data sync setup (one-time)
1. Create private repo `youthclub-data` (already done).
2. Create a **fine-grained PAT** scoped to only that repo, with Contents read/write.
3. App → Settings → GitHub sync → owner `angadseth`, repo `youthclub-data`, paste token → Connect.

Designed & built by Angad Jangir · IIT Madras.
