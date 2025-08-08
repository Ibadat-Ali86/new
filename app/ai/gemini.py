from typing import Optional
import google.generativeai as genai
from flask import current_app


def get_gemini_client() -> Optional[genai.GenerativeModel]:
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-pro")