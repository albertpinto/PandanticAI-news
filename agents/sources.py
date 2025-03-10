from fastapi import FastAPI, Query as FastAPIQuery
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import Agent
from pydantic_ai.models.groq import GroqModel
from pydantic import BaseModel
from fastapi.responses import JSONResponse

app = FastAPI()
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryModel(BaseModel):  # Renamed to avoid collision
    question: str

class news_source(BaseModel):  # Renamed to avoid collision
    name: str
    description: str
    url: str 

class news_source_list(BaseModel):
    sources: list[news_source]
    
class SourcesResponse(BaseModel):
    answer: news_source_list

@app.get("/sources", response_model=SourcesResponse)
async def sources_endpoint(query: QueryModel = FastAPIQuery(...)):
    """
    Endpoint to process questions using the GroqModel.
    
    Returns:
        JSON response with list of news sources
    """
    try:
        with open('prompts/news_sources.md', 'r') as file:
            system_prompt = file.read()

        model = GroqModel('llama-3.3-70b-versatile')
        agent = Agent(
            model=model,
            system_prompt=system_prompt,
            result_type=list[news_source]
        )
        result = await agent.run(query.question)
        # Create news_source_list from the properly structured data
        sources_list = news_source_list(sources=result.data)
        return SourcesResponse(answer=sources_list)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"An error occurred: {str(e)}"}
        )

@app.post("/sources", response_model=SourcesResponse)
async def sources_post_endpoint(query: QueryModel):
    """
    Alternative POST endpoint that accepts a JSON body
    
    Args:
        query: QueryModel with question field
        
    Returns:
        JSON response with list of news sources
    """
    try:
        with open('prompts/news_sources.md', 'r') as file:
            system_prompt = file.read()

        model = GroqModel('llama-3.3-70b-versatile')
        agent = Agent(
            model=model,
            system_prompt=system_prompt,
            result_type=news_source_list  # Changed from list[news_source] to news_source_list
        )
        result = await agent.run(query.question)
        print(result.data)    
        # Handle the case where result might be a string or dict
        if isinstance(result.data, str):
            # Try to extract sources from the string response
            return JSONResponse(
                status_code=200,
                content={"answer": {"sources": []}}
            )
           
        return SourcesResponse(answer=result.data)
    except Exception as e:
        # Log the full error for debugging
        print(f"Error details: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate sources. Please try again."}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("sources:app", host="0.0.0.0", port=8002, reload=True)