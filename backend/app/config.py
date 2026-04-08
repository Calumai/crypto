from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    binance_api_key: str = ""
    binance_secret_key: str = ""
    use_testnet: bool = True
    database_url: str = "sqlite:///./trading.db"
    cors_origins: str = "http://localhost:3000"
    encryption_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
