# Scan Marketplace App — MVP Starter

Een werkbare starter voor een marketplace-app waarin gebruikers producten scannen, een winkelwagen opbouwen, de goedkoopste combinatie van aangesloten verkopers berekenen, in één checkout betalen en pakketten volgen.

Deze repository bevat:

- `mobile/` — Expo React Native app met login, scanner, winkelwagen, beste-deal scherm en pakketoverzicht.
- `backend/` — FastAPI backend met mock auth, productcatalogus, seller offers, optimalisatie-engine, mock marketplace-checkout en tracking endpoints.
- `database/schema.sql` — PostgreSQL schema voor een echte productie-achtige implementatie.
- `docs/marketplace-flow.md` — betaal-, order- en suborder-flow voor model 2.

> Let op: betalingen zijn in deze MVP nog mock/sandbox. Voeg Stripe Connect of Adyen pas toe nadat de basisflow lokaal klopt.

## Snel starten

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open daarna:

```text
http://localhost:8000/docs
```

### Mobiele app

```bash
cd mobile
npm install
npx expo start
```

Maak in `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Gebruik je een fysieke telefoon, vervang `localhost` door het lokale IP-adres van je computer, bijvoorbeeld:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.25:8000
```

## Testbarcodes

Je kunt scannen of handmatig invoeren:

| Product | Barcode |
|---|---|
| MintFresh Tandpasta 75ml | `8710000000011` |
| DailyCare Shampoo 300ml | `8710000000028` |
| CleanHome Wasmiddel 1L | `8710000000035` |
| SoftRoll Toiletpapier 8 rollen | `8710000000042` |
| BrightSmile Mondwater 500ml | `8710000000059` |

## Wat werkt al?

- Registreren/inloggen met mock auth.
- Barcode scannen of handmatig invoeren.
- Productherkenning via EAN/GTIN.
- Winkelwagen met aantallen.
- Optimalisatie over meerdere verkopers inclusief verzendkosten en gratis-verzending-drempels.
- Mock checkout met één betaling en meerdere suborders.
- Automatisch pakketoverzicht voor orders.
- Handmatig trackingcodes toevoegen.
- Strak, simpel app-design met kaarten en één accentkleur.

## Productierijp maken

Vervang deze onderdelen voordat je live gaat:

1. Mock auth → Supabase Auth, Firebase Auth, Auth0 of eigen OAuth/JWT.
2. In-memory data → PostgreSQL met het schema in `database/schema.sql`.
3. Mock checkout → Stripe Connect of Adyen for Platforms.
4. Mock tracking → PostNL/DHL/DPD carrier APIs.
5. Mock offers → seller portal, productfeeds of retailer API's.
6. Seller onboarding → KYC/KYB via PSP + eigen juridische checks.

## Aanbevolen volgende stap

Begin met 3 aangesloten verkopers en 100–500 exacte EAN-producten. Test of gebruikers de scan → goedkoopste combinatie → checkout → pakketoverzicht flow begrijpen en vertrouwen.
