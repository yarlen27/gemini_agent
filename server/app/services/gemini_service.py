import google.generativeai as genai
from ..core.config import settings

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-pro') # Or other model as configured

    async def generate_response(self, history: list) -> str:
        # The history should be in the format expected by Gemini API
        # e.g., [{"role": "user", "parts": "..."}, {"role": "model", "parts": "..."}]
        response = await self.model.generate_content_async(history)
        return response.text

gemini_service = GeminiService()
