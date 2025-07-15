import redis.asyncio as redis
from ..core.config import settings

class RedisService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL)

    async def close(self):
        await self.redis_client.close()

redis_service = RedisService()
