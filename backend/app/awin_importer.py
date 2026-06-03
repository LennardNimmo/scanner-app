from __future__ import annotations

import csv
import gzip
import hashlib
import io
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ImportSummary:
    source_id: str
    job_id: str
    status: str
    rows_read: int = 0
    rows_imported: int = 0
    rows_failed: int = 0
    error_message: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "job_id": self.job_id,
            "status": self.status,
            "rows_read": self.rows_read,
            "rows_imported": self.rows_imported,
            "rows_failed": self.rows_failed,
            "error_message": self.error_message,
        }


TRUTHY = {"1", "true", "yes", "y", "ja", "j", "op voorraad", "in_stock", "in stock", "available"}
FALSY = {"0", "false", "no", "n", "nee", "niet op voorraad", "out_of_stock", "out of stock", "unavailable"}


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text


def normalize_gtin(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    digits = re.sub(r"\D", "", text)
    if len(digits) in {8, 12, 13, 14}:
        return digits
    return None


def parse_money_to_cents(value: Any) -> int | None:
    text = clean_text(value)
    if not text:
        return None
    text = text.replace("€", "").replace("EUR", "").replace("eur", "").strip()
    text = text.replace(" ", "")

    # Handle Dutch/euro formats like 1.234,56 and simple formats like 1234.56.
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(",", ".")

    try:
        amount = Decimal(text)
    except (InvalidOperation, ValueError):
        return None
    return int((amount * 100).quantize(Decimal("1")))


def parse_int(value: Any) -> int | None:
    text = clean_text(value)
    if not text:
        return None
    match = re.search(r"-?\d+", text)
    if not match:
        return None
    try:
        return int(match.group(0))
    except ValueError:
        return None


def parse_float(value: Any) -> float | None:
    text = clean_text(value)
    if not text:
        return None
    text = text.replace("%", "").replace(",", ".").strip()
    try:
        return float(text)
    except ValueError:
        return None


def parse_stock_status(value: Any) -> tuple[str, str]:
    text = (clean_text(value) or "").lower()
    if text in TRUTHY:
        return "in_stock", "in_stock"
    if text in FALSY:
        return "out_of_stock", "out_of_stock"
    if "voorraad" in text and "niet" not in text:
        return "in_stock", "in_stock"
    if "out" in text or "niet" in text:
        return "out_of_stock", "out_of_stock"
    return "unknown", "unknown"


def parse_delivery_days(value: Any) -> tuple[int, int]:
    text = clean_text(value)
    if not text:
        return 1, 3
    nums = [int(n) for n in re.findall(r"\d+", text)]
    if not nums:
        return 1, 3
    if len(nums) == 1:
        return max(1, nums[0]), max(1, nums[0])
    return max(1, nums[0]), max(1, nums[1])


def row_hash(row: dict[str, Any]) -> str:
    parts = [f"{key}={row.get(key, '')}" for key in sorted(row.keys())]
    return hashlib.sha256("|".join(parts).encode("utf-8", errors="ignore")).hexdigest()


def decode_bytes(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def extract_feed_bytes(data: bytes, compression: str | None) -> bytes:
    compression = (compression or "auto").lower()

    if compression == "gzip" or (compression == "auto" and data[:2] == b"\x1f\x8b"):
        return gzip.decompress(data)

    if compression == "zip" or (compression == "auto" and data[:4] == b"PK\x03\x04"):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            names = [name for name in archive.namelist() if not name.endswith("/")]
            csv_names = [name for name in names if name.lower().endswith(".csv")]
            if not names:
                raise ValueError("ZIP feed bevat geen bestanden")
            name = csv_names[0] if csv_names else names[0]
            return archive.read(name)

    return data


def delimiter_from_config(value: str | None) -> str:
    value = value or ","
    value = value.replace("\\t", "\t")
    aliases = {"comma": ",", "semicolon": ";", "pipe": "|", "tab": "\t"}
    return aliases.get(value.lower(), value[0])


def get_first(row: dict[str, Any], *keys: str) -> Any:
    lower_map = {str(k).lower(): v for k, v in row.items()}
    for key in keys:
        if key in row and clean_text(row.get(key)) is not None:
            return row.get(key)
        lk = key.lower()
        if lk in lower_map and clean_text(lower_map.get(lk)) is not None:
            return lower_map.get(lk)
    return None


def download_feed(feed_url: str) -> bytes:
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        response = client.get(feed_url)
        response.raise_for_status()
        return response.content


def import_awin_source(database_url: str, source_id: str) -> ImportSummary:
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        source = conn.execute(
            """
            select s.*, m.name as merchant_name
            from affiliate_sources s
            join merchants m on m.id = s.merchant_id
            where s.id=%s and s.active=true
            """,
            (source_id,),
        ).fetchone()
        if not source:
            raise ValueError(f"Actieve affiliate source niet gevonden: {source_id}")

        job = conn.execute(
            """
            insert into import_jobs (source_id, status, started_at)
            values (%s, 'running', now())
            returning id
            """,
            (source_id,),
        ).fetchone()
        job_id = str(job["id"])
        conn.execute("update affiliate_sources set last_started_at=now() where id=%s", (source_id,))

        summary = ImportSummary(source_id=source_id, job_id=job_id, status="running")
        started_at = utcnow()

        try:
            feed_url = clean_text(source.get("feed_url"))
            if not feed_url:
                raise ValueError("affiliate_sources.feed_url ontbreekt")

            raw = download_feed(feed_url)
            extracted = extract_feed_bytes(raw, source.get("compression") or "auto")
            text = decode_bytes(extracted)
            delimiter = delimiter_from_config(source.get("delimiter"))

            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            if not reader.fieldnames:
                raise ValueError("Geen CSV headers gevonden in feed")

            delivery_cost_candidates: list[int] = []

            for raw_row in reader:
                summary.rows_read += 1
                try:
                    imported = upsert_awin_row(conn, source, raw_row)
                    if imported:
                        summary.rows_imported += 1
                        if imported.get("delivery_cost_cents") is not None:
                            delivery_cost_candidates.append(imported["delivery_cost_cents"])
                    else:
                        summary.rows_failed += 1
                except Exception:
                    # Keep importing other rows; import_jobs gives aggregate error counts.
                    summary.rows_failed += 1

            # If no shipping rule exists yet, seed one from the feed delivery_cost if available.
            seed_shipping_rule(conn, str(source["merchant_id"]), delivery_cost_candidates)

            # Offers from this source that did not appear in the latest feed are stale.
            conn.execute(
                """
                update affiliate_offers
                set active=false, updated_at=now()
                where source_id=%s and last_seen_at < %s
                """,
                (source_id, started_at),
            )

            summary.status = "success"
            conn.execute(
                """
                update import_jobs
                set status='success', finished_at=now(), rows_read=%s, rows_imported=%s, rows_failed=%s
                where id=%s
                """,
                (summary.rows_read, summary.rows_imported, summary.rows_failed, job_id),
            )
            conn.execute(
                """
                update affiliate_sources
                set last_success_at=now(), last_error_at=null, last_error_message=null,
                    rows_read=%s, rows_imported=%s, rows_failed=%s
                where id=%s
                """,
                (summary.rows_read, summary.rows_imported, summary.rows_failed, source_id),
            )
            return summary

        except Exception as exc:
            summary.status = "failed"
            summary.error_message = str(exc)
            conn.execute(
                """
                update import_jobs
                set status='failed', finished_at=now(), rows_read=%s, rows_imported=%s, rows_failed=%s, error_message=%s
                where id=%s
                """,
                (summary.rows_read, summary.rows_imported, summary.rows_failed, summary.error_message, job_id),
            )
            conn.execute(
                """
                update affiliate_sources
                set last_error_at=now(), last_error_message=%s,
                    rows_read=%s, rows_imported=%s, rows_failed=%s
                where id=%s
                """,
                (summary.error_message, summary.rows_read, summary.rows_imported, summary.rows_failed, source_id),
            )
            return summary


def upsert_awin_row(conn, source: dict[str, Any], row: dict[str, Any]) -> dict[str, Any] | None:
    gtin = normalize_gtin(get_first(row, "ean", "gtin", "barcode", "EAN", "GTIN"))
    if not gtin:
        return None

    price_cents = parse_money_to_cents(get_first(row, "search_price", "price", "sale_price", "product_price"))
    if price_cents is None:
        return None

    name = clean_text(get_first(row, "product_name", "name", "title")) or f"Product {gtin}"
    category = clean_text(get_first(row, "merchant_category", "category"))
    image_url = clean_text(get_first(row, "merchant_image_url", "image_url", "aw_image_url"))
    currency = clean_text(get_first(row, "currency")) or "EUR"
    merchant_sku = clean_text(get_first(row, "merchant_product_id", "aw_product_id", "sku", "product_id")) or gtin
    affiliate_url = clean_text(get_first(row, "aw_deep_link", "affiliate_url", "deeplink", "deep_link"))
    product_url = clean_text(get_first(row, "product_url", "merchant_deep_link", "aw_deep_link")) or affiliate_url
    if not affiliate_url:
        return None

    availability, stock_status = parse_stock_status(get_first(row, "in_stock", "availability", "stock_status"))
    stock_quantity = parse_int(get_first(row, "stock_quantity", "quantity"))
    delivery_cost_cents = parse_money_to_cents(get_first(row, "delivery_cost", "shipping_cost"))
    delivery_time_text = clean_text(get_first(row, "delivery_time", "shipping_time"))
    delivery_days_min, delivery_days_max = parse_delivery_days(delivery_time_text)
    savings_percent = parse_float(get_first(row, "savings_percent", "discount_percent"))
    saving_cents = parse_money_to_cents(get_first(row, "saving", "savings", "discount"))
    old_price_cents = price_cents + saving_cents if saving_cents and saving_cents > 0 else None

    product = conn.execute(
        """
        insert into products (gtin, name, brand, image_url, category)
        values (%s, %s, null, %s, %s)
        on conflict (gtin) do update
          set name=coalesce(excluded.name, products.name),
              image_url=coalesce(excluded.image_url, products.image_url),
              category=coalesce(excluded.category, products.category)
        returning id
        """,
        (gtin, name, image_url, category),
    ).fetchone()

    existing = conn.execute(
        """
        select id, price_cents, old_price_cents, availability, stock_status
        from affiliate_offers
        where merchant_id=%s and product_id=%s
        """,
        (source["merchant_id"], product["id"]),
    ).fetchone()

    hashed = row_hash(row)
    offer = conn.execute(
        """
        insert into affiliate_offers (
          merchant_id, product_id, source_id, gtin, merchant_sku, title,
          price_cents, old_price_cents, currency, availability, stock_status,
          stock_quantity, product_url, affiliate_url, image_url,
          delivery_cost_cents, delivery_time_text, delivery_days_min, delivery_days_max,
          savings_percent, saving_cents, source_row_hash,
          last_seen_at, price_updated_at, active
        ) values (
          %s, %s, %s, %s, %s, %s,
          %s, %s, %s, %s, %s,
          %s, %s, %s, %s,
          %s, %s, %s, %s,
          %s, %s, %s,
          now(), now(), true
        )
        on conflict (merchant_id, product_id) do update set
          source_id=excluded.source_id,
          gtin=excluded.gtin,
          merchant_sku=excluded.merchant_sku,
          title=excluded.title,
          old_price_cents=excluded.old_price_cents,
          currency=excluded.currency,
          availability=excluded.availability,
          stock_status=excluded.stock_status,
          stock_quantity=excluded.stock_quantity,
          product_url=excluded.product_url,
          affiliate_url=excluded.affiliate_url,
          image_url=coalesce(excluded.image_url, affiliate_offers.image_url),
          delivery_cost_cents=excluded.delivery_cost_cents,
          delivery_time_text=excluded.delivery_time_text,
          delivery_days_min=excluded.delivery_days_min,
          delivery_days_max=excluded.delivery_days_max,
          savings_percent=excluded.savings_percent,
          saving_cents=excluded.saving_cents,
          source_row_hash=excluded.source_row_hash,
          active=true,
          last_seen_at=now(),
          price_updated_at=case
            when affiliate_offers.price_cents is distinct from excluded.price_cents then now()
            else affiliate_offers.price_updated_at
          end,
          price_cents=excluded.price_cents,
          updated_at=now()
        returning id, delivery_cost_cents
        """,
        (
            source["merchant_id"], product["id"], source["id"], gtin, merchant_sku, name,
            price_cents, old_price_cents, currency, availability, stock_status,
            stock_quantity, product_url or affiliate_url, affiliate_url, image_url,
            delivery_cost_cents, delivery_time_text, delivery_days_min, delivery_days_max,
            savings_percent, saving_cents, hashed,
        ),
    ).fetchone()

    if existing and (
        existing["price_cents"] != price_cents
        or existing.get("old_price_cents") != old_price_cents
        or existing.get("availability") != availability
        or existing.get("stock_status") != stock_status
    ):
        conn.execute(
            """
            insert into offer_snapshots (offer_id, price_cents, old_price_cents, availability, stock_status)
            values (%s, %s, %s, %s, %s)
            """,
            (offer["id"], price_cents, old_price_cents, availability, stock_status),
        )

    return {"offer_id": offer["id"], "delivery_cost_cents": offer.get("delivery_cost_cents")}


def seed_shipping_rule(conn, merchant_id: str, delivery_costs: list[int]) -> None:
    existing = conn.execute(
        "select id from affiliate_shipping_rules where merchant_id=%s and country='NL' limit 1",
        (merchant_id,),
    ).fetchone()
    if existing:
        return
    costs = [cost for cost in delivery_costs if cost is not None and cost >= 0]
    base_shipping = min(costs) if costs else 495
    conn.execute(
        """
        insert into affiliate_shipping_rules (
          merchant_id, country, base_shipping_cents, free_shipping_threshold_cents,
          delivery_days_min, delivery_days_max, notes, last_checked_at
        ) values (%s, 'NL', %s, null, 1, 3, 'Automatisch aangemaakt op basis van Awin delivery_cost. Vul gratis-verzenddrempel handmatig aan.', now())
        """,
        (merchant_id, base_shipping),
    )


def import_all_active_awin_sources(database_url: str) -> list[dict[str, Any]]:
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        sources = conn.execute(
            """
            select id
            from affiliate_sources
            where active=true and lower(network)='awin'
            order by created_at
            """
        ).fetchall()
    return [import_awin_source(database_url, str(source["id"])).as_dict() for source in sources]
