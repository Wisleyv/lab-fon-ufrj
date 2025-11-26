#!/usr/bin/env python3
"""
Publication Data Cleanup Script
Parses publications.html and updates publication_references.json with clean, complete data.
"""

import json
import re
from pathlib import Path
from urllib.parse import urlparse
from bs4 import BeautifulSoup


def parse_html_publications(html_content):
    """Parse publications from HTML using BeautifulSoup."""
    soup = BeautifulSoup(html_content, 'html.parser')
    publications = []
    
    current_year = None
    current_type = None
    
    # Find all elements in body
    for element in soup.body.find_all(['h2', 'h3', 'p']):
        if element.name == 'h2':
            # Year header
            year_text = element.get_text().strip()
            if year_text.isdigit():
                current_year = year_text
        
        elif element.name == 'h3':
            # Publication type header
            current_type = element.get_text().strip()
        
        elif element.name == 'p' and current_year:
            # Publication entry
            # Extract all text and links
            text = element.get_text(separator=' ', strip=True)
            link = element.find('a')
            url = link['href'] if link else None
            
            # Parse the entry
            pub_data = parse_publication_entry(text, current_year, current_type, url)
            if pub_data:
                publications.append(pub_data)
    
    return publications


def parse_publication_entry(text, year, pub_type, url):
    """Parse a publication entry text into structured data."""
    
    # Determine publication type
    type_mapping = {
        'Artigos Científicos': 'article-journal',
        'Capítulos de Livros': 'chapter',
        'Monografia de Conclusão de Curso': 'undergraduate-thesis',
        'Tese de Doutorado': 'doctoral-thesis',
        'Dissertação de Mestrado': 'master-thesis',
        'Organização de Dossiê': 'special-issue'
    }
    
    pub_type_normalized = type_mapping.get(pub_type, 'article-journal')
    
    # Extract authors (before first period or before title)
    # Authors are separated by semicolons and are usually before the title
    authors_match = re.match(r'^([^.]+?)\.', text)
    authors_text = authors_match.group(1) if authors_match else ''
    authors = parse_authors(authors_text)
    
    # Extract title (after authors, usually plain text or before "In:")
    title_match = re.search(r'\.\s*([^.]+?)(?:\.\s*In:|[\.,])', text[len(authors_text):])
    title = title_match.group(1).strip() if title_match else ''
    
    # Extract subtitle (after colon in title)
    subtitle = ''
    if ':' in title:
        main, sub = title.split(':', 1)
        title = main.strip()
        subtitle = sub.strip()
    
    # Extract volume, issue, pages
    volume, issue, pages = extract_volume_issue_pages(text)
    
    # Extract journal/book name
    journal_name = extract_journal_name(text, pub_type_normalized)
    
    # Extract publisher/place for books/chapters
    publisher, place = extract_publisher_info(text)
    
    return {
        'year': year,
        'type': pub_type_normalized,
        'authors': authors,
        'title': title,
        'subtitle': subtitle,
        'journal': journal_name,
        'volume': volume,
        'issue': issue,
        'pages': pages,
        'publisher': publisher,
        'place': place,
        'url': url,
        'raw_text': text
    }


def parse_authors(authors_text):
    """Parse author names from text."""
    authors = []
    
    # Split by semicolon (primary separator)
    author_parts = re.split(r';', authors_text)
    
    for part in author_parts:
        part = part.strip()
        if not part:
            continue
        
        # Split family name and given names
        # Pattern: "FAMILY NAME, Given Names" or just "FAMILY NAME"
        if ',' in part:
            family, given = part.split(',', 1)
            authors.append({
                'family_name': family.strip(),
                'given_name': given.strip()
            })
        else:
            # No comma, treat whole as family name
            authors.append({
                'family_name': part.strip(),
                'given_name': ''
            })
    
    return authors


def extract_volume_issue_pages(text):
    """Extract volume, issue, and page numbers from text."""
    volume = None
    issue = None
    pages = None
    
    # Pattern: v. 23, n. 2  or  v. 38, p. 202258944–34
    vol_match = re.search(r'v\.\s*(\d+)', text)
    if vol_match:
        volume = vol_match.group(1)
    
    issue_match = re.search(r'n\.\s*(\d+)', text)
    if issue_match:
        issue = issue_match.group(1)
    
    pages_match = re.search(r'p\.\s*([\d\-–—]+)', text)
    if pages_match:
        pages = pages_match.group(1).replace('–', '-').replace('—', '-')
    
    return volume, issue, pages


def extract_journal_name(text, pub_type):
    """Extract journal or book name."""
    # For articles, look for journal name (often after title, before volume)
    # Common patterns include text between angle brackets or after period
    
    # Try to find text that looks like a journal name
    # Usually capitalized words before ", v."
    match = re.search(r'([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^.,]*?)\s*,\s*v\.', text)
    if match:
        return match.group(1).strip()
    
    # Try alternate pattern: after em/title and before comma
    match = re.search(r'\.\s+([A-Z][^,]+?)\s*,?\s*$', text)
    if match:
        candidate = match.group(1).strip()
        # Filter out years and other noise
        if not re.match(r'^\d{4}', candidate):
            return candidate
    
    return None


def extract_publisher_info(text):
    """Extract publisher and place for books/chapters."""
    publisher = None
    place = None
    
    # Pattern: "Place: Publisher, Year"
    match = re.search(r'([^:.\(]+):\s*([^,]+),\s*(\d{4})', text)
    if match:
        place = match.group(1).strip()
        publisher = match.group(2).strip()
    
    return publisher, place


def load_json(filepath):
    """Load JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(filepath, data):
    """Save JSON file with pretty formatting."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def match_publications(html_pubs, json_refs):
    """Match HTML publications with JSON references."""
    matches = []
    
    for json_ref in json_refs:
        ref_id = json_ref['id']
        json_url = json_ref.get('access', {}).get('url', '')
        
        # Try to match by URL
        matched_html = None
        for html_pub in html_pubs:
            html_url = html_pub.get('url', '')
            
            if html_url and json_url:
                # Normalize URLs for comparison
                if normalize_url(html_url) == normalize_url(json_url):
                    matched_html = html_pub
                    break
        
        # If no URL match, try matching by title similarity or author overlap
        if not matched_html:
            matched_html = match_by_content(json_ref, html_pubs)
        
        matches.append({
            'ref_id': ref_id,
            'json_ref': json_ref,
            'html_pub': matched_html
        })
    
    return matches


def normalize_url(url):
    """Normalize URL for comparison."""
    # Remove query parameters and trailing slashes
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"


def match_by_content(json_ref, html_pubs):
    """Match by title/author similarity."""
    json_title = json_ref.get('title', '').lower()
    json_authors = [a.get('family_name', '').lower() for a in json_ref.get('authors', [])]
    
    for html_pub in html_pubs:
        html_title = html_pub.get('title', '').lower()
        html_authors = [a.get('family_name', '').lower() for a in html_pub.get('authors', [])]
        
        # Check title similarity
        if json_title and html_title:
            if json_title in html_title or html_title in json_title:
                # Check if at least one author matches
                if any(ja in html_authors for ja in json_authors):
                    return html_pub
    
    return None


def update_json_with_html_data(json_ref, html_pub):
    """Update JSON reference with data from HTML publication."""
    if not html_pub:
        return json_ref, []
    
    updates = []
    
    # Update date
    if html_pub.get('year'):
        if not json_ref.get('imprint'):
            json_ref['imprint'] = {}
        if json_ref['imprint'].get('date') in ['s.d.', None, '']:
            json_ref['imprint']['date'] = html_pub['year']
            updates.append(f"Set date to {html_pub['year']}")
    
    # Update title if current is single letter
    current_title = json_ref.get('title', '')
    if len(current_title) <= 2 and html_pub.get('title'):
        json_ref['title'] = html_pub['title']
        updates.append(f"Replaced title '{current_title}' with '{html_pub['title']}'")
    
    # Update journal name
    if html_pub.get('journal'):
        if not json_ref.get('container'):
            json_ref['container'] = {'type': 'journal'}
        if json_ref['container'].get('title') in ['Revista não identificada', None, '']:
            json_ref['container']['title'] = html_pub['journal']
            updates.append(f"Set journal to '{html_pub['journal']}'")
    
    # Update volume/issue
    if html_pub.get('volume') and not json_ref.get('container', {}).get('volume'):
        if not json_ref.get('container'):
            json_ref['container'] = {}
        json_ref['container']['volume'] = html_pub['volume']
        updates.append(f"Set volume to {html_pub['volume']}")
    
    if html_pub.get('issue') and not json_ref.get('container', {}).get('issue'):
        if not json_ref.get('container'):
            json_ref['container'] = {}
        json_ref['container']['issue'] = html_pub['issue']
        updates.append(f"Set issue to {html_pub['issue']}")
    
    # Update pages
    if html_pub.get('pages') and not json_ref.get('page_range'):
        json_ref['page_range'] = html_pub['pages']
        updates.append(f"Set pages to {html_pub['pages']}")
    
    # Update publisher/place for books/chapters
    if html_pub.get('publisher') or html_pub.get('place'):
        if json_ref['type'] in ['chapter', 'book', 'thesis', 'doctoral-thesis', 'master-thesis', 'undergraduate-thesis']:
            if not json_ref.get('imprint'):
                json_ref['imprint'] = {}
            
            if html_pub.get('publisher') and not json_ref['imprint'].get('publisher'):
                json_ref['imprint']['publisher'] = html_pub['publisher']
                updates.append(f"Set publisher to '{html_pub['publisher']}'")
            
            if html_pub.get('place') and not json_ref['imprint'].get('place'):
                json_ref['imprint']['place'] = html_pub['place']
                updates.append(f"Set place to '{html_pub['place']}'")
    
    # Expand author initials and add missing authors
    if html_pub.get('authors'):
        json_authors = json_ref.get('authors', [])
        html_authors = html_pub['authors']
        
        # Update existing authors with fuller names
        for json_author in json_authors:
            json_family = json_author.get('family_name', '').lower().strip()
            for html_author in html_authors:
                html_family = html_author.get('family_name', '').lower().strip()
                if json_family == html_family:
                    # Check if HTML has fuller given name
                    json_given = json_author.get('given_name', '').strip()
                    html_given = html_author.get('given_name', '').strip()
                    if len(html_given) > len(json_given):
                        json_author['given_name'] = html_given
                        updates.append(f"Updated author {json_family}: '{json_given}' → '{html_given}'")
        
        # Add missing authors
        json_family_names = [a.get('family_name', '').lower() for a in json_authors]
        for html_author in html_authors:
            html_family = html_author.get('family_name', '').lower()
            if html_family not in json_family_names:
                json_authors.append(html_author)
                updates.append(f"Added missing author: {html_author['family_name']}, {html_author['given_name']}")
        
        json_ref['authors'] = json_authors
    
    # Update publication type if more specific
    type_priority = {
        'undergraduate-thesis': 5,
        'master-thesis': 5,
        'doctoral-thesis': 5,
        'special-issue': 4,
        'chapter': 3,
        'article-journal': 2,
        'book': 1
    }
    
    html_type = html_pub.get('type')
    json_type = json_ref.get('type')
    
    if html_type and json_type:
        if type_priority.get(html_type, 0) > type_priority.get(json_type, 0):
            json_ref['type'] = html_type
            updates.append(f"Updated type: {json_type} → {html_type}")
    
    return json_ref, updates


def main():
    """Main cleanup process."""
    print("=" * 70)
    print("PUBLICATION DATA CLEANUP SCRIPT")
    print("=" * 70)
    print()
    
    # Paths
    base_dir = Path(__file__).parent.parent
    html_file = base_dir / 'docs' / 'publications.html'
    json_file = base_dir / 'public' / 'publication_references.json'
    backup_file = base_dir / 'public' / 'publication_references.backup.json'
    
    # Load HTML
    print(f"📄 Loading HTML from: {html_file}")
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Parse HTML
    print("🔍 Parsing publications from HTML...")
    html_pubs = parse_html_publications(html_content)
    print(f"✅ Extracted {len(html_pubs)} publications from HTML")
    print()
    
    # Load JSON
    print(f"📄 Loading JSON from: {json_file}")
    json_data = load_json(json_file)
    json_refs = json_data['references']
    print(f"✅ Loaded {len(json_refs)} references from JSON")
    print()
    
    # Backup original
    print(f"💾 Creating backup: {backup_file}")
    save_json(backup_file, json_data)
    print()
    
    # Match publications
    print("🔗 Matching HTML publications with JSON references...")
    matches = match_publications(html_pubs, json_refs)
    matched_count = sum(1 for m in matches if m['html_pub'] is not None)
    print(f"✅ Matched {matched_count}/{len(json_refs)} references")
    print()
    
    # Update JSON with HTML data
    print("📝 Updating JSON with HTML data...")
    print("-" * 70)
    
    total_updates = 0
    updated_refs = []
    
    for match in matches:
        ref_id = match['ref_id']
        json_ref = match['json_ref']
        html_pub = match['html_pub']
        
        updated_ref, updates = update_json_with_html_data(json_ref, html_pub)
        updated_refs.append(updated_ref)
        
        if updates:
            print(f"\n{ref_id}:")
            for update in updates:
                print(f"  • {update}")
            total_updates += len(updates)
    
    print()
    print("-" * 70)
    print(f"✅ Applied {total_updates} updates across {len([m for m in matches if m['html_pub']])} references")
    print()
    
    # Save updated JSON
    json_data['references'] = updated_refs
    print(f"💾 Saving updated JSON to: {json_file}")
    save_json(json_file, json_data)
    print()
    
    # Generate report
    print("=" * 70)
    print("CLEANUP SUMMARY")
    print("=" * 70)
    print(f"Total references: {len(json_refs)}")
    print(f"Matched with HTML: {matched_count}")
    print(f"Total updates applied: {total_updates}")
    print(f"Backup saved to: {backup_file}")
    print()
    print("✅ Cleanup complete!")
    print()


if __name__ == '__main__':
    main()
