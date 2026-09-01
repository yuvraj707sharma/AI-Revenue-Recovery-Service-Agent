import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Razorpay AI Revenue Recovery Agent"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_PREFIX: str = "/api"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # Razorpay Test Mode Credentials
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_AiRecoveryDemoKey")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "AiRecoverySecretDemoVal12345")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "webhook_secret_test_123")

    # Database Configuration (MySQL default with SQLite fallback support)
    # e.g., mysql+pymysql://root:password@localhost:3306/razorpay_recovery or sqlite+aiosqlite:///./recovery.db
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./recovery.db"
    )
    # Synchronous DB URL for migration/seed scripts
    DATABASE_URL_SYNC: str = os.getenv(
        "DATABASE_URL_SYNC",
        "sqlite:///./recovery.db"
    )

    # WhatsApp Service Configuration
    # Supported providers: "mock", "ju_bot", "cloud_api"
    WHATSAPP_PROVIDER: str = os.getenv("WHATSAPP_PROVIDER", "mock")
    WHATSAPP_API_URL: str = os.getenv("WHATSAPP_API_URL", "http://localhost:3001/api/whatsapp")
    WHATSAPP_AUTH_TOKEN: str = os.getenv("WHATSAPP_AUTH_TOKEN", "mock_token_123")
    MERCHANT_NAME: str = os.getenv("MERCHANT_NAME", "SaaSify Cloud Pro")

    # Execution Bounds Configuration
    MAX_RETRY_ATTEMPTS: int = 3
    MIN_COOLDOWN_HOURS: float = 4.0
    MAX_RECOVERY_WINDOW_DAYS: int = 7
    DEMO_SPEEDUP_MODE: bool = True  # Allows instant simulation of time windows for fast judge evaluation

    class Config:
        case_sensitive = True

settings = Settings()
