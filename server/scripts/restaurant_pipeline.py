import requests
import json
import csv
import time

# GraphQL endpoint
URL = "https://pk.fd-api.com/rlp-service/query"

# Headers (must mimic browser)
HEADERS = {
    "x-fp-api-key": "volo",
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json;charset=UTF-8",
    "origin": "https://www.foodpanda.pk",
    "referer": "https://www.foodpanda.pk/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
}

# GraphQL query (minimal Vendor fields to avoid schema mismatch)
QUERY = """
query getOrganicListing($input: RLPInput!) {
    rlp(params: $input) {
        organic_listing {
            views {
                returned_count
                available_count
                items {
                    id
                    code
                    name
                    rating
                    review_number
                    address_line2
                    latitude
                    longitude
                    minimum_order_amount
                    minimum_delivery_fee
                    hero_listing_image
                    distance
                    url_key
                    characteristics {
                        cuisines {
                            id
                            name
                        }
                    }
                }
            }
        }
    }
}
"""

# Cities to scrape
CITIES = {
    "Lahore": (31.5203696, 74.3587473),
}

# CSV output
OUTPUT_FILE = "foodpanda_restaurants.csv"


def fetch_page(city, lat, lng, offset=0, limit=50):
    """Fetch one page of restaurants for a city"""
    variables = {
        "input": {
            "latitude": lat,
            "longitude": lng,
            "locale": "en_PK",
            "language_id": "1",
            "customer_id": "",
            "customer_type": "REGULAR",
            "expedition_type": "DELIVERY",
            "feature_flags": [
                {"name": "dynamic-pricing-indicator", "value": "Variant"}
            ],
            "joker_offers": {"single_discount": True},
            "subscription": {"status": "NON_ELIGIBLE", "has_benefits": False},
            "swimlanes": {"config": "Original"},
            "organic_listing": {
                "views": [
                    {
                        "limit": limit,
                        "offset": offset
                    }
                ]
            }
        }
    }

    payload = {"query": QUERY, "variables": variables}

    resp = requests.post(URL, headers=HEADERS, data=json.dumps(payload))
    print(f"Fetching {city} offset={offset} → Status {resp.status_code}")

    try:
        data = resp.json()
    except Exception:
        print("Not JSON:", resp.text[:500])
        return []

    if not data.get("data") or not data["data"].get("rlp"):
        print("⚠️ No 'rlp' field in response")
        return []

    views = data["data"]["rlp"]["organic_listing"]["views"]
    if not views:
        return []

    return views[0].get("items", [])


def scrape_city(city, lat, lng):
    """Scrape all restaurants for one city"""
    all_restaurants = []
    offset = 0
    limit = 50

    while True:
        items = fetch_page(city, lat, lng, offset, limit)
        if not items:
            break

        all_restaurants.extend(items)
        print(f"  → Collected {len(all_restaurants)} restaurants so far")

        if len(items) < limit:  # last page
            break

        offset += limit
        time.sleep(1)  # polite delay

    return all_restaurants


def save_to_csv(data, filename):
    """Save restaurant data to CSV"""
    if not data:
        print("⚠️ No data to save")
        return

    keys = [
        "id", "code", "name", "rating", "review_number",
        "address_line2", "latitude", "longitude",
        "minimum_order_amount", "minimum_delivery_fee",
        "hero_listing_image", "distance", "url_key"
    ]

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for r in data:
            row = {k: r.get(k, "") for k in keys}
            writer.writerow(row)

    print(f"✅ Saved {len(data)} rows to {filename}")


if __name__ == "__main__":
    all_data = []
    for city, (lat, lng) in CITIES.items():
        print(f"\n===== Scraping {city} =====")
        city_data = scrape_city(city, lat, lng)
        for r in city_data:
            r["city"] = city
        all_data.extend(city_data)

    save_to_csv(all_data, OUTPUT_FILE)
