from fastapi import FastAPI, Query as FastAPIQuery
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import Agent
from pydantic_ai.models.groq import GroqModel
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import httpx
import urllib.parse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryModel(BaseModel):
    question: str

class CoordinatorResponse(BaseModel):
    sources: list
    articles: list
    count: int
    domain: str

@app.get("/coordinate", response_model=CoordinatorResponse)
async def coordinate_sources(question: str = FastAPIQuery(...)):
    """
    Coordinates fetching sources and then searching those sources for articles
    """
    try:
        # First, get the news sources
        async with httpx.AsyncClient() as client:
            sources_response = await client.post(
                "http://localhost:8002/sources",
                json={"question": question},
                timeout=30.0
            )
            sources_response.raise_for_status()
            sources_data = sources_response.json()

        if not sources_data or 'answer' not in sources_data or 'sources' not in sources_data['answer']:
            return JSONResponse(
                status_code=400,
                content={"error": "No valid sources found"}
            )

        # Initialize articles list
        all_articles = []
        processed_domains = set()

        # For each source, call the web scraper
        async with httpx.AsyncClient() as client:
            for source in sources_data['answer']['sources']:
                try:
                    # Skip if we've already processed this domain
                    domain = urllib.parse.urlparse(source['url']).netloc
                    if domain in processed_domains:
                        continue
                    processed_domains.add(domain)

                    # Call web scraper for each source
                    scraper_response = await client.get(
                        "http://localhost:8000/search",
                        params={
                            "url": source['url'],
                            "query": question,
                            "method": "combined"
                        },
                        timeout=60.0
                    )
                    scraper_response.raise_for_status()
                    scraper_data = scraper_response.json()

                    if scraper_data.get('articles'):
                        all_articles.extend(scraper_data['articles'])

                except Exception as e:
                    print(f"Error processing source {source['url']}: {str(e)}")
                    continue

        # Return combined results
        return CoordinatorResponse(
            sources=sources_data['answer']['sources'],
            articles=all_articles,
            count=len(all_articles),
            domain="Multiple Sources"
        )

    except httpx.HTTPError as e:
        print(f"HTTP Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error fetching data: {str(e)}"}
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": "An unexpected error occurred"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("coordinator:app", host="0.0.0.0", port=8003, reload=True)