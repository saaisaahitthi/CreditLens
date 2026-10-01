"""
llm_provider.py
Configurable LLM abstraction.
Provider and model are read from environment variables — never hard-coded.
"""
import os
from dotenv import load_dotenv

load_dotenv()

class LLMProvider:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "gemini").lower()

        if self.provider == "gemini":
            from google import genai
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise EnvironmentError("GEMINI_API_KEY is not set. Add it to your .env file.")
            self._client = genai.Client(api_key=api_key)
            self._model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
            self._generate = self._gemini_generate

        elif self.provider == "openai":
            import openai
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise EnvironmentError("OPENAI_API_KEY is not set. Add it to your .env file.")
            self._client = openai.OpenAI(api_key=api_key)
            self._model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            self._generate = self._openai_generate


        else:
            raise ValueError(f"Unknown LLM_PROVIDER: '{self.provider}'. Supported: 'gemini', 'openai'.")

    def _gemini_generate(self, prompt: str) -> str:
        import time
        for attempt in range(5):
            try:
                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents=prompt,
                )
                return response.text.strip()
            except Exception as e:
                if '503' in str(e) and attempt < 4:
                    print(f"LLM 503 Error. Retrying in {2**attempt}s...")
                    time.sleep(2**attempt)
                else:
                    raise e

    def _openai_generate(self, prompt: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()

    def generate(self, prompt: str) -> str:
        return self._generate(prompt)
