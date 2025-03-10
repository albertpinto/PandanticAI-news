"""
Universal Web Scraper API
-------------------------
A FastAPI application that scrapes websites to find relevant articles based on search queries.
"""

import datetime
import os
import json
import re
import urllib.parse
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Union
from urllib.parse import urlparse

# Third-party imports
import aiohttp
import httpx
import logfire
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, AnyHttpUrl
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.usage import Usage, UsageLimits
from rich.console import Console

# Load environment variables
load_dotenv()

# Configure logging
logfire.configure(send_to_logfire='if-token-present')
console = Console()

# Initialize FastAPI app
app = FastAPI(title="Universal Web Scraper API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#=============================================================================
# DATA MODELS
#=============================================================================

class Article(BaseModel):
    """Details of an article from a website."""
    title: str
    url: AnyHttpUrl
    summary: str = ""
    category: str = "Unknown"
    publish_date: Optional[datetime.date] = None
    image_url: Optional[AnyHttpUrl] = None
    authors: List[str] = []
    source_domain: str = ""

    class Config:
        schema_extra = {
            "example": {
                "title": "Tech stocks surge amid AI breakthroughs",
                "url": "https://www.example.com/2025/03/08/business/tech-stocks-ai-surge/index.html",
                "summary": "Major technology companies saw significant stock gains following announcements of new artificial intelligence capabilities.",
                "category": "BUSINESS",
                "publish_date": "2025-03-08",
                "image_url": "https://www.example.com/images/tech-stocks.jpg",
                "authors": ["Jane Smith", "John Doe"],
                "source_domain": "example.com"
            }
        }


class NoArticlesFound(BaseModel):
    """When no relevant articles are found."""
    reason: str


class SearchQuery(BaseModel):
    """Represents a structured search query."""
    keywords: List[str]
    category: Optional[str] = None
    date_from: Optional[datetime.date] = None
    date_to: Optional[datetime.date] = None


class SearchOptions(BaseModel):
    """Options for the search API."""
    method: str = "direct_scrape"  # direct_scrape, serper, or both


@dataclass
class Deps:
    """Dependencies needed by our agents."""
    web_page_text: str
    search_term: str
    target_url: str
    search_results: Optional[List[Dict[str, Any]]] = None
    domain_name: str = ""


#=============================================================================
# AI AGENT SETUP
#=============================================================================

# Main search agent to control the flow
search_agent = Agent[Deps, List[Article] | NoArticlesFound](
    model=GroqModel('llama-3.3-70b-versatile'),
    result_type=List[Article] | NoArticlesFound,  # type: ignore
    retries=3,
    system_prompt=(
        'You are a web scraping assistant that finds relevant articles based on search terms. '
        'When responding, always return a valid JSON array of Article objects or a NoArticlesFound object. '
        'Each Article must have at least a title and URL. Other fields are optional. '
        'Focus on quality over quantity - only include truly relevant results.'
    ),
    instrument=True,
)

# Extraction agent specifically for parsing HTML/text
extraction_agent = Agent(
    model=GroqModel('llama-3.3-70b-versatile'),
    result_type=list[Article],
    system_prompt=(
        'You are a web scraping assistant that extracts article information from HTML content. '
        'Always return a valid JSON array of Article objects. '
        'Each Article must contain: title, url, and optionally summary, category, publish_date, image_url, and authors. '
        'Ensure all extracted information is accurate and properly formatted.'
    ),
)

# Agent for processing Serper API results
serper_agent = Agent(
    model=GroqModel('llama-3.3-70b-versatile'),
    result_type=list[Article],
    system_prompt=(
        'You are a search results processor that converts Serper API results into Article objects. '
        'Always return a valid JSON array of Article objects. '
        'Only include results from the specified target domain. '
        'Ensure all data is properly formatted and validated.'
    ),
)

# Agent for domain-specific link analysis
link_analysis_agent = Agent(
    model=GroqModel('llama-3.3-70b-versatile'),
    result_type=list[str],
    system_prompt=(
        'You are a web structure analyzer that identifies important URLs on a website. '
        'Always return a valid JSON array of strings, where each string is a complete URL. '
        'Focus on finding search pages, content sections, and article links.'
    ),
)

# Agent for refining search queries
query_refine_agent = Agent(
    model=GroqModel('llama-3.3-70b-versatile'),
    result_type=SearchQuery,
    system_prompt=(
        'You are a search query optimizer that converts natural language queries into structured search terms. '
        'Always return a valid JSON object matching the SearchQuery structure. '
        'Extract key search terms and optional category and date range filters.'
    ),
)

#=============================================================================
# AGENT TOOLS - Functions that agents can call
#=============================================================================

@search_agent.tool
async def extract_articles_from_webpage(ctx: RunContext[Deps]) -> list[Article]:
    """Extract articles from the webpage text."""
    result = await extraction_agent.run(
        f"Extract articles from this webpage content that are relevant to the search query: '{ctx.deps.search_term}'. "
        f"The webpage is from {ctx.deps.domain_name}.\n\n{ctx.deps.web_page_text[:50000]}",  # Limit text to avoid token issues
        usage=ctx.usage
    )
    
    # Add the source domain to each article
    articles = result.data
    for article in articles:
        article.source_domain = ctx.deps.domain_name
        
        # Make sure URLs are absolute - convert AnyHttpUrl to str first
        if not str(article.url).startswith(('http://', 'https://')):
            base_url = ctx.deps.target_url.rstrip('/')
            article.url = f"{base_url}/{str(article.url).lstrip('/')}"
    
    logfire.info('found {article_count} articles from webpage', article_count=len(articles))
    return articles


@search_agent.tool
async def extract_articles_from_serper(ctx: RunContext[Deps]) -> list[Article]:
    """Extract articles from Serper search results."""
    if not ctx.deps.search_results:
        return []
    
    result = await serper_agent.run(
        f"Extract articles from these search results that are relevant to: '{ctx.deps.search_term}'. "
        f"Only include results from {ctx.deps.domain_name}.\n\n{json.dumps(ctx.deps.search_results, indent=2)}",
        usage=ctx.usage
    )
    
    # Add the source domain to each article
    articles = result.data
    for article in articles:
        article.source_domain = ctx.deps.domain_name
    
    logfire.info('found {article_count} articles from Serper', article_count=len(articles))
    return articles


@search_agent.tool
async def refine_search_query(ctx: RunContext[Deps]) -> SearchQuery:
    """Refine the user's search query into structured form."""
    result = await query_refine_agent.run(ctx.deps.search_term, usage=ctx.usage)
    logfire.info('refined search query: {query}', query=result.data)
    return result.data


@search_agent.tool
async def analyze_website_links(ctx: RunContext[Deps]) -> list[str]:
    """Analyze website structure and identify important links."""
    result = await link_analysis_agent.run(
        f"Analyze this HTML from {ctx.deps.domain_name} and identify important links for content discovery:\n\n"
        f"{ctx.deps.web_page_text[:30000]}",  # Limit text to avoid token issues
        usage=ctx.usage
    )
    logfire.info('found {link_count} important links', link_count=len(result.data))
    return result.data


@search_agent.result_validator
async def validate_results(
    ctx: RunContext[Deps], result: Union[List[Article], NoArticlesFound]
) -> Union[List[Article], NoArticlesFound]:
    """Validate that the articles are relevant to the search query."""
    if isinstance(result, NoArticlesFound):
        return result

    if not result:  # Empty list
        return NoArticlesFound(reason="No articles matched the search criteria")

    # Validate URLs are from the target domain
    valid_articles = []
    for article in result:
        article_domain = urlparse(str(article.url)).netloc  # Convert AnyHttpUrl to str
        if ctx.deps.domain_name in article_domain:
            valid_articles.append(article)
        else:
            logfire.warning(
                "Removed article from wrong domain: {url} (expected {expected})",
                url=article.url,
                expected=ctx.deps.domain_name
            )
    
    if not valid_articles:
        return NoArticlesFound(reason=f"No valid articles found from {ctx.deps.domain_name}")

    return valid_articles


#=============================================================================
# HELPER FUNCTIONS
#=============================================================================

# Usage limits to prevent excessive API calls
usage_limits = UsageLimits(request_limit=15)


async def fetch_homepage(url: str) -> str:
    """Fetch the homepage content of a website."""
    # Add validation for blocked domains
    blocked_domains = {'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com'}
    domain = extract_domain(url)
    if domain in blocked_domains:
        raise HTTPException(
            status_code=403,
            detail=f"Scraping {domain} is not supported due to authentication requirements"
        )

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to fetch {url}: {response.status}"
                    )
                html = await response.text()
                return html
                
        except aiohttp.ClientError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching {url}: {str(e)}"
            )


async def fetch_search_page(base_url: str, query: str) -> str:
    """Try to fetch search results from the website's own search functionality."""
    parsed_url = urlparse(base_url)
    domain = parsed_url.netloc
    scheme = parsed_url.scheme
    
    # Common search URL patterns
    search_patterns = [
        f"{scheme}://{domain}/search?q={urllib.parse.quote(query)}",
        f"{scheme}://{domain}/search?query={urllib.parse.quote(query)}",
        f"{scheme}://{domain}/search?s={urllib.parse.quote(query)}",
        f"{scheme}://{domain}/search?keyword={urllib.parse.quote(query)}",
        f"{scheme}://{domain}/search/{urllib.parse.quote(query)}",
        f"{scheme}://{domain}/?s={urllib.parse.quote(query)}"
    ]
    
    # Try each search pattern
    async with aiohttp.ClientSession() as session:
        for search_url in search_patterns:
            try:
                async with session.get(search_url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }) as response:
                    if response.status == 200:
                        html = await response.text()
                        # Check if this looks like a search results page
                        if len(html) > 1000 and (
                            f"{query}" in html.lower() or
                            "search results" in html.lower() or
                            "search result" in html.lower()
                        ):
                            logfire.info("Found search results at {url}", url=search_url)
                            return html
            except Exception:
                continue
    
    # If all search patterns fail, return empty string
    logfire.warning("No search page found for {domain}", domain=domain)
    return ""


async def fetch_serper_results(query: str, domain: str) -> List[Dict[str, Any]]:
    """Fetch search results using Serper.dev API specifically for the target domain."""
    # Get API key from environment
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        logfire.warning("Serper API key not found. Skipping Serper search.")
        return []
    
    # Prepare the request to Serper API
    url = "https://google.serper.dev/search"
    
    # Add site-specific search to limit results to target domain
    site_specific_query = f"{query} site:{domain}"
    
    payload = {
        "q": site_specific_query,
        "gl": "us",  # Geolocation (US)
        "hl": "en",  # Language (English)
        "num": 10    # Number of results
    }
    
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                logfire.error(
                    "Serper API error: {status} {text}",
                    status=response.status_code,
                    text=response.text
                )
                return []
            
            result_data = response.json()
            
            # Extract organic results
            organic_results = result_data.get("organic", [])
            
            # Filter for domain results
            domain_results = [
                result for result in organic_results
                if domain in result.get("link", "").lower()
            ]
            
            return domain_results
            
    except Exception as e:
        logfire.error("Error fetching Serper results: {error}", error=str(e))
        return []


def extract_domain(url: str) -> str:
    """Extract the domain name from a URL."""
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    
    # Handle www prefix
    if domain.startswith('www.'):
        domain = domain[4:]
        
    return domain


def parse_date_from_text(text: str) -> Optional[datetime.date]:
    """Try to extract a date from text using various formats."""
    # Common date patterns
    patterns = [
        r'(\w+ \d{1,2}, \d{4})',             # March 8, 2025
        r'(\d{1,2} \w+ \d{4})',              # 8 March 2025
        r'(\d{4}-\d{1,2}-\d{1,2})',          # 2025-03-08
        r'(\d{1,2}/\d{1,2}/\d{4})',          # 3/8/2025
        r'(\d{1,2}-\d{1,2}-\d{4})',          # 3-8-2025
        r'Published (\w+ \d{1,2}, \d{4})',   # Published March 8, 2025
        r'Updated (\w+ \d{1,2}, \d{4})'      # Updated March 8, 2025
    ]
    
    for pattern in patterns:
        matches = re.search(pattern, text)
        if matches:
            date_str = matches.group(1)
            try:
                # Try different date formats
                for fmt in [
                    '%B %d, %Y',       # March 8, 2025
                    '%b %d, %Y',       # Mar 8, 2025
                    '%d %B %Y',        # 8 March 2025
                    '%d %b %Y',        # 8 Mar 2025
                    '%Y-%m-%d',        # 2025-03-08
                    '%m/%d/%Y',        # 3/8/2025
                    '%d/%m/%Y',        # 8/3/2025
                    '%m-%d-%Y',        # 3-8-2025
                    '%d-%m-%Y'         # 8-3-2025
                ]:
                    try:
                        return datetime.datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
            except Exception:
                continue
    
    return None


#=============================================================================
# API ENDPOINTS
#=============================================================================

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint - API status check."""
    return {
        "status": "API is running",
        "message": "Use /search endpoint to search websites",
        "example": "/search?url=https://www.example.com&query=your search query"
    }


@app.get("/search", response_model=Dict[str, Union[List[Dict[str, Any]], str, int]])
async def search_articles(
    url: str = Query(..., description="Target website URL (e.g., https://www.example.com)"),
    query: str = Query(..., description="Search query string"),
    method: str = Query("combined", description="Search method: direct_scrape, serper, or combined")
):
    """
    Search for articles on a specified website based on the query.
    
    Args:
        url: The target website URL
        query: The search term
        method: Search method (direct_scrape, serper, or combined)
    """
    try:
        # Add validation for blocked domains
        blocked_domains = {'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com'}
        domain = extract_domain(url)
        if domain in blocked_domains:
            return JSONResponse(
                status_code=403,
                content={
                    "error": f"Scraping {domain} is not supported due to authentication requirements",
                    "articles": [],
                    "count": 0
                }
            )

        # Extract domain from URL
        logfire.info("Searching {domain} for '{query}'", domain=domain, query=query)
        
        # Initialize dependencies
        web_page_text = ""
        search_results = None
        
        # Step 1: Collect data based on the requested method
        if method in ["direct_scrape", "combined"]:
            try:
                # Try website's own search page first
                search_page_text = await fetch_search_page(url, query)
                
                # If search page doesn't yield good results, try homepage
                if not search_page_text or len(search_page_text) < 1000:
                    homepage_text = await fetch_homepage(url)
                    web_page_text = homepage_text
                else:
                    web_page_text = search_page_text
                    
            except Exception as e:
                logfire.error("Error fetching website: {error}", error=str(e))
                if method == "direct_scrape":
                    return JSONResponse(
                        status_code=500,
                        content={"error": f"Failed to fetch content from {url}: {str(e)}"}
                    )
        
        # Step 2: If using Serper, get search results from their API
        if method in ["serper", "combined"]:
            try:
                search_results = await fetch_serper_results(query, domain)
            except Exception as e:
                logfire.error("Error fetching Serper results: {error}", error=str(e))
                if method == "serper":
                    return JSONResponse(
                        status_code=500,
                        content={"error": f"Failed to fetch Serper results: {str(e)}"}
                    )
        
        # Step 3: Check if we have data to work with
        if not web_page_text and not search_results:
            return JSONResponse(
                status_code=500,
                content={"error": f"Failed to fetch content from both {domain} and Serper"}
            )
        
        # Step 4: Setup dependencies for the AI agent
        deps = Deps(
            web_page_text=web_page_text,
            search_term=query,
            target_url=url,
            search_results=search_results,
            domain_name=domain
        )
        
        usage: Usage = Usage()
        
        # Step 5: Run the search agent
        try:
            result = await search_agent.run(
                f"Find articles on {domain} related to: '{query}'",
                deps=deps,
                usage=usage,
                message_history=None,
                usage_limits=usage_limits,
            )
            
            # Step 6: Process and return results
            if isinstance(result.data, NoArticlesFound):
                return {"message": result.data.reason, "articles": [], "count": 0}
            
            # Convert AnyHttpUrl to string in the serialized output to avoid validation errors
            articles_list = []
            for article in result.data:
                article_dict = article.model_dump()
                
                # Convert URL fields to strings to avoid serialization issues
                if "url" in article_dict and article_dict["url"]:
                    article_dict["url"] = str(article_dict["url"])
                    
                if "image_url" in article_dict and article_dict["image_url"]:
                    article_dict["image_url"] = str(article_dict["image_url"])
                
                articles_list.append(article_dict)
            
            return {
                "articles": articles_list,
                "count": len(articles_list),
                "domain": domain
            }
        except Exception as agent_error:
            logfire.error("Agent error: {error}", error=str(agent_error))
            return JSONResponse(
                status_code=500,
                content={"error": f"Error processing search results: {str(agent_error)}"}
            )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logfire.error("Unexpected error: {error}", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/explore", response_model=Dict[str, Union[List[Dict[str, Any]], str]])
async def explore_website(
    url: str = Query(..., description="Target website URL to explore")
):
    """
    Explore a website and return basic information about its structure.
    
    Args:
        url: The target website URL
    """
    try:
        # Step 1: Fetch homepage
        html = await fetch_homepage(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        # Step 2: Extract domain
        domain = extract_domain(url)
        
        # Step 3: Extract links
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            # Normalize URL
            if href.startswith('/'):
                # Convert relative URL to absolute
                if url.endswith('/'):
                    href = url + href[1:]
                else:
                    href = url + href
            elif not href.startswith(('http://', 'https://')):
                # Handle other relative URLs
                if url.endswith('/'):
                    href = url + href
                else:
                    href = url + '/' + href
            
            # Only include links to the same domain
            if domain in extract_domain(href):
                link_text = a.get_text(strip=True)
                if link_text and len(link_text) < 100:  # Skip very long link texts
                    links.append({
                        "url": href,
                        "text": link_text
                    })
        
        # Step 4: Extract potential section titles
        sections = []
        for tag in soup.find_all(['h1', 'h2', 'h3']):
            text = tag.get_text(strip=True)
            if text and len(text) < 100:  # Skip very long titles
                sections.append(text)
        
        # Step 5: Try to find search form
        search_form = None
        for form in soup.find_all('form'):
            if 'search' in str(form).lower():
                search_inputs = [input_tag.get('name') for input_tag in form.find_all('input') if input_tag.get('name')]
                search_action = form.get('action', '')
                if search_action.startswith('/'):
                    # Convert relative URL to absolute
                    if url.endswith('/'):
                        search_action = url + search_action[1:]
                    else:
                        search_action = url + search_action
                search_form = {
                    "action": search_action,
                    "method": form.get('method', 'get'),
                    "inputs": search_inputs
                }
                break
        
        # Step 6: Return the website structure information
        return {
            "domain": domain,
            "title": soup.title.string if soup.title else "Unknown",
            "links_sample": links[:20],  # Limit to 20 links for brevity
            "sections_sample": sections[:20],  # Limit to 20 sections for brevity
            "search_form": search_form,
            "link_count": len(links)
        }
        
    except Exception as e:
        logfire.error("Error exploring website: {error}", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scrape", response_model=Dict[str, str])
async def scrape_and_return_raw(url: str = Query(..., description="URL to scrape")):
    """
    Scrape a specific URL and return the raw text.
    Useful for debugging and understanding the content structure.
    
    Args:
        url: The URL to scrape
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to fetch content: {response.status}"
                    )
                html = await response.text()
                
                # Parse HTML
                soup = BeautifulSoup(html, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                
                # Get text content
                text = soup.get_text(separator='\n', strip=True)
                
                # Return a preview of the text (first 10000 characters)
                return {"text": text[:10000], "length": len(text), "url": url}
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Background task for creating the cache directory
# Update to use the new FastAPI lifespan approach
@app.on_event("startup")
async def startup_event():
    # Create cache directory if it doesn't exist
    os.makedirs("cache", exist_ok=True)
    logfire.info("API started and cache directory created")

# Alternative modern approach using lifespan context manager
# This is the recommended approach in newer FastAPI versions
# Uncomment to use this instead of the @app.on_event decorator
'''
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create cache directory if it doesn't exist
    os.makedirs("cache", exist_ok=True)
    logfire.info("API started and cache directory created")
    yield
    # Shutdown: Clean up resources, close connections, etc.
    logfire.info("API shutting down")

# Then update app definition to:
# app = FastAPI(title="Universal Web Scraper API", lifespan=lifespan)
'''


#=============================================================================
# MAIN ENTRY POINT
#=============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)