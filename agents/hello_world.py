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

@app.get("/ask")
async def ask_endpoint(question: str = FastAPIQuery(None)):
    """
    Endpoint to process questions using the GroqModel.
    
    Args:
        question: The question to be answered
        
    Returns:
        JSON response with the answer or error message
    """
    if not question:
        return JSONResponse(
            status_code=400,
            content={"error": "Question parameter is required"}
        )
    
    try:
        model = GroqModel('llama-3.3-70b-versatile')
        agent = Agent(model, system_prompt='Be concise, reply with one sentence.')
        # Use await with run() instead of run_sync()
        result = await agent.run(question)
        return {"answer": result.data}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"An error occurred: {str(e)}"}
        )

# Alternative implementation using POST with request body
@app.post("/ask")
async def ask_post_endpoint(query: QueryModel):
    """
    Alternative POST endpoint that accepts a JSON body
    
    Args:
        query: QueryModel with question field
        
    Returns:
        JSON response with the answer or error message
    """
    try:
        model = GroqModel('llama-3.3-70b-versatile')
        agent = Agent(model, system_prompt='Be concise, reply with one sentence.')
        # Use await with run() instead of run_sync()
        result = await agent.run(query.question)
        return {"answer": result.data}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"An error occurred: {str(e)}"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("hello_world:app", host="0.0.0.0", port=8002, reload=True)