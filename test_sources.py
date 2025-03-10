import httpx
import asyncio
import json
from typing import Optional
from rich import print

async def get_news_sources(query: str) -> Optional[dict]:
    """
    Call the sources endpoint and return the results
    """
    url = "http://localhost:8002/sources"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url,
                json={"question": query},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            print(f"[red]Error making request:[/red] {str(e)}")
            return None
        except Exception as e:
            print(f"[red]Unexpected error:[/red] {str(e)}")
            return None

def display_sources(data: dict) -> None:
    """
    Pretty print the news sources
    """
    if not data or 'answer' not in data or 'sources' not in data['answer']:
        print("[red]No valid sources found in response[/red]")
        return

    sources = data['answer']['sources']
    print("\n[bold blue]News Sources:[/bold blue]")
    
    for idx, source in enumerate(sources, 1):
        print(f"\n[bold green]{idx}. {source['name']}[/bold green]")
        print(f"   Description: {source['description']}")
        print(f"   URL: [link]{source['url']}[/link]")

async def main():
    query = input("Enter your news source query (or press Enter for general sources): ").strip()
    if not query:
        query = "Show me general news sources"
    
    print(f"\n[yellow]Fetching sources for query:[/yellow] {query}")
    result = await get_news_sources(query)
    
    if result:
        display_sources(result)
    else:
        print("[red]Failed to get sources[/red]")

if __name__ == "__main__":
    asyncio.run(main()) 