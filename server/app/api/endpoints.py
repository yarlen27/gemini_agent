from fastapi import APIRouter
from ..core.models import AgentRequest, AgentResponse
from ..services.redis_service import redis_service
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

    # TODO: Add Gemini logic here
    # For now, just return a dummy response and save history
    history.append({"role": "user", "parts": request.prompt.dict() if request.prompt else request.tool_response.dict()})
    await redis_service.save_conversation(conversation_id, history)

    return AgentResponse(conversation_id=conversation_id, action="finish", message="Received your request!")
