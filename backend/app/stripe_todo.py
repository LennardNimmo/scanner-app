"""Stripe Connect integration placeholder.

Production replacement plan:

1. Create connected accounts for sellers during onboarding.
2. Save seller.payout_account_id = Stripe connected account id.
3. During checkout, create a PaymentIntent on the platform account.
4. Authorize first if vendor confirmation is required.
5. Capture when all suborders are accepted.
6. Create Transfers per suborder:

    stripe.Transfer.create(
        amount=seller_payout_cents,
        currency="eur",
        destination=seller.payout_account_id,
        transfer_group=order.id,
    )

7. Keep a local ledger for all charges, fees, transfers, refunds and chargebacks.

Do not trust only PSP exports as your application state.
"""
