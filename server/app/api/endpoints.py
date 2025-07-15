from fastapi import APIRouter
from ..core.models import AgentRequest, AgentResponse
from ..services.redis_service import redis_service
from ..services.gemini_service import gemini_service
import uuid

router = APIRouter()

@router.post("/v1/github/execute", response_model=AgentResponse)
async def execute_github_step(request: AgentRequest):
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        history = []
    else:
        history = await redis_service.get_conversation(conversation_id)

    # Add the current request to the history
    if request.prompt:
        history.append({"role": "user", "parts": request.prompt.dict()})
    elif request.tool_response:
        history.append({"role": "user", "parts": request.tool_response.dict()})

    # Get response from Gemini
    gemini_response_text = await gemini_service.generate_response(history)
    history.append({"role": "model", "parts": gemini_response_text})

    await redis_service.save_conversation(conversation_id, history)

    # For now, we'll just return a dummy response based on Gemini's text
    # In a real scenario, Gemini's response would be parsed to determine the next action
    return AgentResponse(conversation_id=conversation_id, action="finish", message=gemini_response_text)
