import csv
import os
import time
import re
import json
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from datetime import datetime
import logging

# Set up logging with proper encoding
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('foodpanda_scraper.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

def setup_stealth_driver():
    """Setup Chrome WebDriver with stealth options"""
    options = uc.ChromeOptions()
    # Comment out headless for debugging
    # options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-web-security")
    options.add_argument("--allow-running-insecure-content")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--no-first-run")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-accelerated-2d-canvas")
    options.add_argument("--disable-background-timer-throttling")

    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    ]
    options.add_argument(f"user-agent={random.choice(user_agents)}")

    try:
        driver = uc.Chrome(options=options, use_subprocess=True)
        return driver
    except Exception as e:
        logging.error(f"Error initializing driver: {e}")
        try:
            driver = webdriver.Chrome(options=options)
            return driver
        except Exception as e2:
            logging.error(f"Failed to initialize Chrome driver: {e2}")
            raise

def auto_scroll(driver, pause_time=1):
    """Scroll down until the page is fully loaded"""
    last_height = driver.execute_script("return document.body.scrollHeight")
    scroll_attempts = 0
    max_attempts = 5
    
    while scroll_attempts < max_attempts:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(pause_time)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height
        scroll_attempts += 1

def extract_price(price_text):
    """Extract price from text, handling various formats"""
    if not price_text:
        return 0.0
    
    # Remove "from" text if present
    price_text = re.sub(r'from\s*', '', price_text, flags=re.IGNORECASE)
    
    # Find all price patterns in the text
    price_pattern = r'Rs\.\s*([\d,]+(?:\.\d{1,2})?)'
    prices = re.findall(price_pattern, price_text)
    
    if not prices:
        logging.warning(f"No price found in text: {price_text}")
        return 0.0
    
    # Clean and convert the first price found (current price)
    clean_text = prices[0].replace(",", "")
    
    try:
        return float(clean_text)
    except ValueError:
        logging.warning(f"Could not convert price text: {clean_text}")
        return 0.0

def extract_original_price(price_text):
    """Extract original price from text that might contain both current and original prices"""
    if not price_text:
        return 0.0
    
    # Remove "from" text if present
    price_text = re.sub(r'from\s*', '', price_text, flags=re.IGNORECASE)
    
    # Find all price patterns in the text
    price_pattern = r'Rs\.\s*([\d,]+(?:\.\d{1,2})?)'
    prices = re.findall(price_pattern, price_text)
    
    # If we have two prices, the second one is the original price
    if len(prices) >= 2:
        clean_text = prices[1].replace(",", "")
        try:
            return float(clean_text)
        except ValueError:
            logging.warning(f"Could not convert original price text: {clean_text}")
    
    # If only one price found, return it (no discount)
    if len(prices) == 1:
        clean_text = prices[0].replace(",", "")
        try:
            return float(clean_text)
        except ValueError:
            logging.warning(f"Could not convert price text: {clean_text}")
    
    return 0.0

def extract_categories(driver):
    """Extract menu categories from the navigation tabs"""
    categories = []
    try:
        # Try to find category tabs using various selectors
        category_selectors = [
            "[data-testid*='tab']",
            ".bds-c-tab",
            ".category-tab",
            ".menu-category",
            "[role='tab']"
        ]
        
        for selector in category_selectors:
            try:
                tabs = driver.find_elements(By.CSS_SELECTOR, selector)
                if tabs:
                    for tab in tabs:
                        try:
                            category_name = tab.text.strip()
                            if category_name and category_name not in categories:
                                # Clean up category name (remove count in parentheses)
                                if "(" in category_name and ")" in category_name:
                                    category_name = category_name.split("(")[0].strip()
                                categories.append(category_name)
                        except Exception as e:
                            logging.debug(f"Error extracting category name: {e}")
                    break
            except Exception as e:
                logging.debug(f"Selector {selector} failed: {e}")
                
    except Exception as e:
        logging.warning(f"Could not extract categories: {e}")
    
    # If no categories found, try a different approach
    if not categories:
        try:
            # Look for category sections directly
            category_sections = driver.find_elements(By.CSS_SELECTOR, "[data-testid*='category'], .dish-category-section")
            for i, section in enumerate(category_sections):
                try:
                    title = section.find_element(By.CSS_SELECTOR, "h2, h3, .category-title")
                    category_name = title.text.strip()
                    if category_name and category_name not in categories:
                        categories.append(category_name)
                except:
                    categories.append(f"Category {i+1}")
        except Exception as e:
            logging.debug(f"Alternative category extraction failed: {e}")
    
    return categories if categories else ["All Items"]

def extract_menu_items(driver, restaurant_code, restaurant_name, category_name):
    """Extract menu items from the current page view"""
    menu_data = []
    
    try:
        # Find menu items using multiple possible selectors
        selectors = [
            "[data-testid='menu-product']",
            ".product-tile",
            ".menu-item",
            ".dish-item",
            "[data-testid*='product']"
        ]
        
        menu_items = []
        for selector in selectors:
            try:
                found_items = driver.find_elements(By.CSS_SELECTOR, selector)
                if found_items:
                    menu_items = found_items
                    logging.info(f"Found {len(menu_items)} items with selector: {selector}")
                    break
            except Exception as e:
                logging.debug(f"Selector {selector} failed: {e}")
        
        if not menu_items:
            logging.warning("No menu items found with any selector")
            return menu_data
        
        for item in menu_items:
            try:
                # Get the HTML of the item for more robust parsing
                item_html = item.get_attribute("outerHTML")
                soup = BeautifulSoup(item_html, 'html.parser')
                
                # Extract name
                name = "Unknown"
                name_elem = soup.select_one("[data-testid='menu-product-name'], .product-name, .item-name, h3, h4")
                if name_elem:
                    name = name_elem.get_text(strip=True)
                
                # Extract description
                description = ""
                desc_elem = soup.select_one("[data-testid='menu-product-description'], .product-description, .item-description")
                if desc_elem:
                    description = desc_elem.get_text(strip=True)
                
                # Extract price
                price = 0.0
                price_elem = soup.select_one("[data-testid='menu-product-price'], .product-price, .item-price, .price")
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    price = extract_price(price_text)
                
                # Extract original price
                original_price = price  # Default to current price
                orig_price_elem = soup.select_one("[data-testid='menu-product-price-before-discount'], .original-price, .strike-through")
                if orig_price_elem:
                    orig_price_text = orig_price_elem.get_text(strip=True)
                    original_price = extract_original_price(orig_price_text)
                else:
                    # If no separate original price element, check if the price element contains both prices
                    if price_elem:
                        price_text = price_elem.get_text(strip=True)
                        original_price = extract_original_price(price_text)
                
                # Extract image URL
                image_url = ""
                img_elem = soup.select_one("img")
                if img_elem and img_elem.get("src"):
                    image_url = img_elem["src"]
                
                # Check if popular
                is_popular = "No"
                popular_indicators = [
                    "Popular",
                    "Bestseller",
                    "Best seller",
                    "🔥",
                    "★"
                ]
                
                item_text = soup.get_text()
                for indicator in popular_indicators:
                    if indicator in item_text:
                        is_popular = "Yes"
                        break
                
                menu_data.append({
                    "restaurant_code": restaurant_code,
                    "restaurant_name": restaurant_name,
                    "category": category_name,
                    "dish_name": name,
                    "description": description,
                    "price": price,
                    "original_price": original_price,
                    "image_url": image_url,
                    "is_popular": is_popular,
                    "scraped_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
            except Exception as e:
                logging.warning(f"Error extracting menu item: {e}")
    
    except Exception as e:
        logging.error(f"Error in extract_menu_items: {e}")
    
    return menu_data

def scrape_restaurant_menu(driver, restaurant_code, url_key, restaurant_name):
    """Scrape menu items from a restaurant page"""
    url = f"https://www.foodpanda.pk/restaurant/{restaurant_code}/{url_key}"
    all_menu_data = []
    
    try:
        logging.info(f"Navigating to {url}")
        driver.get(url)
        
        # Wait for page to load
        WebDriverWait(driver, 25).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "body"))
        )
        
        # Wait a bit more for dynamic content
        time.sleep(5)
        
        # Get all category names
        categories = extract_categories(driver)
        logging.info(f"Found {len(categories)} categories: {categories}")
        
        # Scroll to load all content
        auto_scroll(driver)
        
        # Try to extract from JSON first (more reliable)
        try:
            page_source = driver.page_source
            if "window.__PRELOADED_STATE__" in page_source:
                soup = BeautifulSoup(page_source, 'html.parser')
                scripts = soup.find_all("script")
                for script in scripts:
                    if script.string and "window.__PRELOADED_STATE__" in script.string:
                        json_text = script.string.split("window.__PRELOADED_STATE__ = ")[1].split(";")[0].strip()
                        menu_json = json.loads(json_text)
                        
                        # Extract menu data from JSON
                        vendor_data = menu_json.get("vendor", {}).get("menu", {}).get("items", {})
                        menu_data = []
                        for item_id, item in vendor_data.items():
                            menu_data.append({
                                "restaurant_code": restaurant_code,
                                "restaurant_name": restaurant_name,
                                "category": item.get("category_name", "Uncategorized"),
                                "dish_name": item.get("name", "Unknown"),
                                "description": item.get("description", ""),
                                "price": item.get("price", 0),
                                "original_price": item.get("price_before_discount", item.get("price", 0)),
                                "image_url": item.get("images", [{}])[0].get("image_url", ""),
                                "is_popular": "Yes" if item.get("is_popular", False) else "No",
                                "scraped_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            })
                        
                        logging.info(f"Extracted {len(menu_data)} items from JSON")
                        return menu_data
        except Exception as e:
            logging.warning(f"JSON extraction failed: {e}")
        
        # Fallback to HTML extraction
        menu_items = extract_menu_items(driver, restaurant_code, restaurant_name, "All Categories")
        all_menu_data.extend(menu_items)
        logging.info(f"Extracted {len(menu_items)} items from main page")
        
        # Try to click through categories if we found them
        for category in categories:
            try:
                # Skip if it's the default category
                if category == "All Categories" or category == "All Items":
                    continue
                    
                # Try to find and click the category tab
                category_xpath = f"//*[contains(text(), '{category}')]"
                category_elements = driver.find_elements(By.XPATH, category_xpath)
                
                if category_elements:
                    # Click using JavaScript to avoid interception issues
                    driver.execute_script("arguments[0].click();", category_elements[0])
                    
                    # Wait for content to load
                    time.sleep(3)
                    
                    # Extract items for this category
                    category_items = extract_menu_items(driver, restaurant_code, restaurant_name, category)
                    all_menu_data.extend(category_items)
                    logging.info(f"Extracted {len(category_items)} items from category: {category}")
                else:
                    logging.warning(f"Could not find category element: {category}")
                
            except Exception as e:
                logging.warning(f"Could not extract items for category {category}: {e}")
        
        logging.info(f"Total menu items extracted for {restaurant_name}: {len(all_menu_data)}")
        return all_menu_data

    except TimeoutException:
        logging.error(f"Timeout waiting for menu to load for {restaurant_name}")
        return []
    except Exception as e:
        logging.error(f"Error scraping {restaurant_name}: {e}")
        return []

def process_restaurant_with_retry(restaurant_data, max_retries=5):
    """
    Process a restaurant with retry logic if 0 menu items are found
    Creates a new session for each retry attempt
    """
    code = restaurant_data["code"]
    url_key = restaurant_data["url_key"]
    name = restaurant_data["name"]
    
    for attempt in range(max_retries):
        driver = None
        try:
            # Initialize a new driver for this attempt
            logging.info(f"Attempt {attempt + 1} for restaurant: {name}")
            driver = setup_stealth_driver()
            
            # Scrape menu
            menu_data = scrape_restaurant_menu(driver, code, url_key, name)
            
            # Check if we got menu items
            if len(menu_data) > 0:
                logging.info(f"SUCCESS: Got {len(menu_data)} menu items for {name} on attempt {attempt + 1}")
                return menu_data
            else:
                logging.warning(f"Got 0 menu items for {name} on attempt {attempt + 1}")
                if attempt < max_retries - 1:
                    # Wait before retrying with exponential backoff
                    wait_time = (2 ** attempt) * random.uniform(5, 10)
                    logging.info(f"Waiting {wait_time:.2f} seconds before retry...")
                    time.sleep(wait_time)
                
        except Exception as e:
            logging.error(f"Error on attempt {attempt + 1} for {name}: {e}")
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt) * random.uniform(5, 10)
                logging.info(f"Waiting {wait_time:.2f} seconds before retry...")
                time.sleep(wait_time)
        finally:
            # Always quit the driver to free resources
            if driver:
                try:
                    driver.quit()
                except:
                    pass
    
    # If we get here, all retries failed
    logging.error(f"FAILED: Could not get menu items for {name} after {max_retries} attempts")
    return []

def main():
    restaurants = []
    try:
        with open("foodpanda_restaurants.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                restaurants.append(row)
    except FileNotFoundError:
        logging.error("foodpanda_restaurants.csv not found")
        return

    # Limit to a few restaurants for testing
    test_mode = True
    if test_mode:
        restaurants = restaurants[:526]  # Increase to 3 for better testing
        logging.info(f"TEST MODE: Processing first {len(restaurants)} restaurants")

    all_menu_data = []
    successful_restaurants = 0
    failed_restaurants = 0

    for i, restaurant in enumerate(restaurants):
        logging.info(f"\nProcessing restaurant {i+1}/{len(restaurants)}: {restaurant['name']}")
        
        # Process restaurant with retry logic
        menu_data = process_restaurant_with_retry(restaurant, max_retries=5)
        
        if len(menu_data) > 0:
            all_menu_data.extend(menu_data)
            successful_restaurants += 1
            logging.info(f"✓ Restaurant {i+1} processed successfully")
        else:
            failed_restaurants += 1
            logging.error(f"✗ Failed to get menu for restaurant {i+1}: {restaurant['name']}")
        
        # Random delay between restaurants (only after successful processing)
        if len(menu_data) > 0:
            delay = random.uniform(8, 15)
            logging.info(f"Waiting {delay:.2f} seconds before next restaurant...")
            time.sleep(delay)

    # Log final statistics
    logging.info(f"\n=== SCRAPING SUMMARY ===")
    logging.info(f"Total restaurants processed: {len(restaurants)}")
    logging.info(f"Successful: {successful_restaurants}")
    logging.info(f"Failed: {failed_restaurants}")
    logging.info(f"Total menu items scraped: {len(all_menu_data)}")

    # Save menu data
    if all_menu_data:
        menu_filename = f"menu_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(menu_filename, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["restaurant_code", "restaurant_name", "category", "dish_name",
                          "description", "price", "original_price", "image_url", "is_popular", "scraped_date"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_menu_data)
        logging.info(f"Saved {len(all_menu_data)} menu items to {menu_filename}")
    else:
        logging.warning("No menu data scraped")
def main():
    restaurants = []
    try:
        with open("foodpanda_restaurants.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                restaurants.append(row)
    except FileNotFoundError:
        logging.error("foodpanda_restaurants.csv not found")
        return

    # --- Resume checkpoint ---
    start_index = 0
    try:
        with open("progress.txt", "r", encoding="utf-8") as f:
            start_index = int(f.read().strip())
            logging.info(f"Resuming from restaurant {start_index+1}/{len(restaurants)}")
    except FileNotFoundError:
        logging.info("No progress file found. Starting from beginning.")

    # --- CSV setup ---
    menu_filename = "menu_progress4.csv"
    fieldnames = [
        "restaurant_code", "restaurant_name", "category", "dish_name",
        "description", "price", "original_price", "image_url",
        "is_popular", "scraped_date"
    ]

    # Create CSV with header only if not exists
    if not os.path.exists(menu_filename):
        with open(menu_filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

    successful_restaurants = 0
    failed_restaurants = 0

    for i, restaurant in enumerate(restaurants[start_index:], start=start_index):
        logging.info(f"\nProcessing restaurant {i+1}/{len(restaurants)}: {restaurant['name']}")

        # Process restaurant with retry logic
        menu_data = process_restaurant_with_retry(restaurant, max_retries=5)

        if len(menu_data) > 0:
            # --- Save immediately (append mode) ---
            with open(menu_filename, "a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writerows(menu_data)

            successful_restaurants += 1
            logging.info(f"✓ Restaurant {i+1} processed successfully and saved")

            # Update checkpoint
            with open("progress.txt", "w", encoding="utf-8") as f:
                f.write(str(i))
        else:
            failed_restaurants += 1
            logging.error(f"✗ Failed to get menu for restaurant {i+1}: {restaurant['name']}")

        # Random delay between restaurants
        if len(menu_data) > 0:
            delay = random.uniform(8, 15)
            logging.info(f"Waiting {delay:.2f} seconds before next restaurant...")
            time.sleep(delay)

    # --- Final summary ---
    logging.info(f"\n=== SCRAPING SUMMARY ===")
    logging.info(f"Total restaurants in CSV: {len(restaurants)}")
    logging.info(f"Successful (this run): {successful_restaurants}")
    logging.info(f"Failed (this run): {failed_restaurants}")
    logging.info(f"Data saved incrementally in: {menu_filename}")
if __name__ == "__main__":
    main()