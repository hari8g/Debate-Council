from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o"
    llm_connect_timeout: float = 45.0
    llm_read_timeout: float = 180.0
    llm_max_retries: int = 4
    instagram_username: str = ""
    instagram_session: str = ""
    use_mock_pipeline: bool = False
    instagram_enrich_posts: int = 10
    instagram_max_comments_per_post: int = 30
    instagram_max_likers_per_post: int = 24
    instagram_feed_page_size: int = 50
    instagram_max_feed_pages: int = 120
    instagram_max_feed_pages_all: int = 500
    projection_horizons_days: str = "30,90,180,365"
    projection_confidence_tau: float = 90.0
    monte_carlo_simulations: int = 10000

    @field_validator("monte_carlo_simulations")
    @classmethod
    def clamp_monte_carlo(cls, value: int) -> int:
        return max(10000, min(value, 25000))

    @field_validator("llm_api_key")
    @classmethod
    def strip_llm_api_key(cls, value: str) -> str:
        return (value or "").strip()

    @field_validator("llm_max_retries")
    @classmethod
    def clamp_llm_max_retries(cls, value: int) -> int:
        if value < 0:
            return 4
        return min(value, 10)


settings = Settings()
