from app.optimizer import optimize_cart


def test_optimizer_accounts_for_shipping():
    result = optimize_cart({
        "prod_toothpaste": 1,
        "prod_shampoo": 1,
        "prod_detergent": 1,
    })
    assert result["total_cents"] > result["products_cents"]
    assert result["selected_sellers_count"] >= 1
    assert result["shipping_cents"] >= 0


def test_optimizer_prefers_valid_stock():
    result = optimize_cart({"prod_toiletpaper": 1})
    assert result["total_cents"] > 0
    assert result["seller_lines"][0]["items"][0]["quantity"] == 1
