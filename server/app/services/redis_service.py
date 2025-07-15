import redis.asyncio as redis
import json
from ..core.config import settings

class RedisService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL)

    async def save_conversation(self, conversation_id: str, history: list, ttl: int = 3600):
        # history is a list of dicts, so we need to serialize it
        await self.redis_client.setex(f"conversation:{conversation_id}", ttl, json.dumps(history))

    async def close(self):
        await self.redis_client.close()

redis_service = RedisService()
