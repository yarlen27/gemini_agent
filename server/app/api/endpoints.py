from fastapi import APIRouter
from ..core.models import AgentRequest, AgentResponse

router = APIRouter()

@router.post("/v1/github/execute", response_model=AgentResponse)
async def execute_github_step(request: AgentRequest):
    # TODO: Implement agent logic
    # For now, just return a dummy response
    return AgentResponse(conversation_id=request.conversation_id or "new_conversation", action="finish", message="Received your request!")
