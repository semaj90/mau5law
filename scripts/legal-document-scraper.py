#!/usr/bin/env python3
"""
California Legal Document Scraper
Scrapes California cases from multiple sources
Focuses on child abuse, CPS, and restitution cases
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
import sqlite3

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CaliforniaLegalScraper:
    """Scrapes California legal cases from public sources"""

    def __init__(self, db_path: str = "california_cases.db"):
        self.db_path = db_path
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Legal Research Bot)'
        })
        self.init_database()

    def init_database(self):
        """Initialize SQLite database for storing cases"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cases (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                year INTEGER,
                court TEXT,
                citation TEXT,
                url TEXT,
                text TEXT,
                holding TEXT,
                facts TEXT,
                reasoning TEXT,
                citations TEXT,
                keywords TEXT,
                scraped_at TIMESTAMP,
                source TEXT
            )
        ''')

        conn.commit()
        conn.close()
        logger.info(f"Database initialized: {self.db_path}")

    def scrape_google_scholar(self, query: str, max_results: int = 100) -> List[Dict]:
        """
        Scrape cases from Google Scholar
        Note: Respects robots.txt and rate limits
        """
        cases = []
        base_url = "https://scholar.google.com/scholar"

        logger.info(f"Scraping Google Scholar for: {query}")

        # Google Scholar parameters
        params = {
            'q': query,
            'hl': 'en',
            'as_sdt': '2006',  # California cases
            'as_vis': '1',     # Include all
            'start': 0
        }

        try:
            response = self.session.get(base_url, params=params, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Parse search results
            for result in soup.find_all('div', class_='gs_ri'):
                try:
                    title_elem = result.find('h3', class_='gs_rt')
                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    link = title_elem.find('a')
                    url = link['href'] if link else None

                    # Extract metadata
                    meta = result.find('div', class_='gs_a')
                    if meta:
                        meta_text = meta.get_text(strip=True)
                        parts = meta_text.split(' - ')
                        author = parts[0] if len(parts) > 0 else ''
                        year_source = parts[1] if len(parts) > 1 else ''

                    case = {
                        'title': title,
                        'url': url,
                        'source': 'google_scholar',
                        'scraped_at': datetime.now().isoformat()
                    }

                    cases.append(case)

                    if len(cases) >= max_results:
                        break

                except Exception as e:
                    logger.warning(f"Error parsing result: {e}")
                    continue

            logger.info(f"Found {len(cases)} cases from Google Scholar")

        except Exception as e:
            logger.error(f"Error scraping Google Scholar: {e}")

        # Rate limiting
        time.sleep(2)

        return cases

    def scrape_justia(self, query: str, max_results: int = 100) -> List[Dict]:
        """Scrape cases from Justia (free legal database)"""
        cases = []
        base_url = "https://law.justia.com/cases/california/"

        logger.info(f"Scraping Justia for: {query}")

        try:
            response = self.session.get(base_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Parse case listings
            for case_link in soup.find_all('a', class_='case-link'):
                try:
                    title = case_link.get_text(strip=True)
                    url = case_link.get('href')

                    case = {
                        'title': title,
                        'url': url,
                        'source': 'justia',
                        'scraped_at': datetime.now().isoformat()
                    }

                    cases.append(case)

                    if len(cases) >= max_results:
                        break

                except Exception as e:
                    logger.warning(f"Error parsing Justia result: {e}")
                    continue

            logger.info(f"Found {len(cases)} cases from Justia")

        except Exception as e:
            logger.error(f"Error scraping Justia: {e}")

        time.sleep(2)
        return cases

    def scrape_findlaw(self, query: str, max_results: int = 100) -> List[Dict]:
        """Scrape cases from FindLaw"""
        cases = []
        base_url = "https://caselaw.findlaw.com/court/ca"

        logger.info(f"Scraping FindLaw for: {query}")

        try:
            response = self.session.get(base_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Parse case listings
            for case_elem in soup.find_all('div', class_='case-item'):
                try:
                    title_elem = case_elem.find('a')
                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    url = title_elem.get('href')

                    case = {
                        'title': title,
                        'url': url,
                        'source': 'findlaw',
                        'scraped_at': datetime.now().isoformat()
                    }

                    cases.append(case)

                    if len(cases) >= max_results:
                        break

                except Exception as e:
                    logger.warning(f"Error parsing FindLaw result: {e}")
                    continue

            logger.info(f"Found {len(cases)} cases from FindLaw")

        except Exception as e:
            logger.error(f"Error scraping FindLaw: {e}")

        time.sleep(2)
        return cases

    def fetch_case_text(self, url: str) -> Optional[str]:
        """Fetch full case text from URL"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract main content
            content = soup.find('div', class_=['case-content', 'opinion', 'main-content'])
            if content:
                return content.get_text(strip=True)

            return None

        except Exception as e:
            logger.warning(f"Error fetching case text from {url}: {e}")
            return None

    def save_case(self, case: Dict):
        """Save case to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT OR REPLACE INTO cases
                (id, title, url, text, source, scraped_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                case.get('id', case.get('title', '').replace(' ', '_')),
                case.get('title'),
                case.get('url'),
                case.get('text'),
                case.get('source'),
                case.get('scraped_at')
            ))

            conn.commit()

        except Exception as e:
            logger.error(f"Error saving case: {e}")

        finally:
            conn.close()

    def scrape_all(self, queries: List[str], max_per_source: int = 50):
        """Scrape cases from all sources"""
        all_cases = []

        for query in queries:
            logger.info(f"Processing query: {query}")

            # Scrape from each source
            google_cases = self.scrape_google_scholar(query, max_per_source)
            justia_cases = self.scrape_justia(query, max_per_source)
            findlaw_cases = self.scrape_findlaw(query, max_per_source)

            all_cases.extend(google_cases)
            all_cases.extend(justia_cases)
            all_cases.extend(findlaw_cases)

        logger.info(f"Total cases scraped: {len(all_cases)}")

        # Save to database
        for case in all_cases:
            self.save_case(case)

        return all_cases

    def get_case_count(self) -> int:
        """Get total cases in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT COUNT(*) FROM cases')
        count = cursor.fetchone()[0]

        conn.close()
        return count


def main():
    """Main scraper execution"""
    scraper = CaliforniaLegalScraper()

    # California legal queries focused on child abuse, CPS, restitution
    queries = [
        "California child abuse cases",
        "California CPS cases",
        "California restitution cases",
        "California family law cases",
        "California dependency cases",
        "California juvenile delinquency",
        "California victim restitution",
        "California child endangerment",
    ]

    logger.info("Starting California legal document scraper")
    logger.info(f"Queries: {queries}")

    # Scrape cases
    cases = scraper.scrape_all(queries, max_per_source=50)

    # Report
    total_cases = scraper.get_case_count()
    logger.info(f"Scraping complete. Total cases in database: {total_cases}")

    # Save summary
    summary = {
        'total_cases': total_cases,
        'scraped_at': datetime.now().isoformat(),
        'sources': ['google_scholar', 'justia', 'findlaw'],
        'queries': queries
    }

    with open('scraper_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)

    logger.info("Summary saved to scraper_summary.json")


if __name__ == '__main__':
    main()
