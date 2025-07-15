import google.generativeai as genai
from ..core.config import settings

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-pro') # Or other model as configured

gemini_service = GeminiService()
