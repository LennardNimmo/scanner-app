# Marketplace checkout flow

Deze app gebruikt model 2: de gebruiker betaalt één keer in de app, waarna de bestelling wordt opgesplitst in suborders per aangesloten verkoper.

## Statusmodel

```text
cart_created
cart_optimized
payment_authorized
vendor_confirmation_pending
vendor_accepted
vendor_rejected
payment_captured
suborders_created
partially_shipped
shipped
delivered
refund_requested
refunded
cancelled
```

## Productieflow

1. Gebruiker scant producten.
2. Backend zoekt exacte EAN/GTIN matches.
3. Backend haalt actuele seller offers op.
4. Optimizer berekent goedkoopste combinatie inclusief verzendkosten.
5. App toont totaalprijs, suborders, aantal pakketten en verwachte levering.
6. Gebruiker betaalt in één checkout.
7. Payment provider autoriseert betaling.
8. Backend reserveert voorraad of vraagt verkopers om bevestiging.
9. Bij akkoord wordt betaling gecaptured.
10. Platform fee wordt ingehouden.
11. Verkopers krijgen payouts volgens payout policy.
12. Trackingcodes worden toegevoegd per suborder.
13. Pakketoverzicht toont alle zendingen.

## Stripe Connect mapping

Voor de eerste echte implementatie is `separate charges and transfers` logisch:

- één charge/payment op het platform;
- één interne order;
- meerdere suborders;
- per suborder één transfer naar de connected account van de verkoper;
- refunds en chargebacks worden centraal afgehandeld.

Belangrijk: houd een ledger bij. Reken niet alleen vanuit Stripe- of Adyen-exports.

## Adyen mapping

Adyen for Platforms kan split-instructies per betaling/capture/refund verwerken. Dit is sterk als je direct enterprise-grade split accounting, balance accounts en payout logic wilt.

## MVP-keuzes

- Exacte EAN matches, geen substituten.
- Alleen Nederland.
- Alleen aangesloten verkopers.
- Payout pas na `shipped` of na korte hold-periode.
- Handmatige verkoper-onboarding.
- Trackingcode door verkoper invoeren of later via API.
