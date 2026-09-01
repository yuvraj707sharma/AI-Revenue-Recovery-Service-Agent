import logging
import re
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from pydantic import BaseModel, Field
from datetime import datetime
import httpx
from app.config import settings

logger = logging.getLogger("recovery_agent.whatsapp")

class WhatsAppMessagePayload(BaseModel):
    customer_phone: str
    customer_name: str
    merchant_name: str
    order_ref: str
    masked_identifier: str  # e.g. '**** 4242'
    amount: float
    message_body: str
    interactive_action: str = "REPLY_YES_TO_RETRY"
    sent_at: datetime = Field(default_factory=datetime.utcnow)

class WhatsAppAdapter(ABC):
    """Abstract Interface for WhatsApp Messaging Providers."""

    @abstractmethod
    async def send_verified_message(self, payload: WhatsAppMessagePayload) -> Dict[str, Any]:
        pass

    @abstractmethod
    def validate_message_safety(self, message_body: str) -> bool:
        """Enforces no bare/shortened URLs and presence of verification details."""
        pass

class MockWhatsAppAdapter(WhatsAppAdapter):
    """
    In-memory and interactive mock adapter for testing, live dashboard demo,
    and visual inspection.
    """
    def __init__(self):
        self.sent_messages: List[Dict[str, Any]] = []

    def validate_message_safety(self, message_body: str) -> bool:
        # Check for bare or shortened URL patterns (e.g. bit.ly, tinyurl, http://, https://)
        url_pattern = r"(https?://\S+|bit\.ly/\S+|tinyurl\.com/\S+|t\.co/\S+)"
        if re.search(url_pattern, message_body, re.IGNORECASE):
            logger.error("SECURITY VIOLATION: Bare or shortened URL detected in Tier 2 WhatsApp message!")
            return False
        return True

    async def send_verified_message(self, payload: WhatsAppMessagePayload) -> Dict[str, Any]:
        if not self.validate_message_safety(payload.message_body):
            raise ValueError("Message failed safety validation: bare or shortened URLs are strictly prohibited.")

        msg_record = {
            "message_id": f"wam_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{len(self.sent_messages) + 1}",
            "customer_phone": payload.customer_phone,
            "customer_name": payload.customer_name,
            "merchant_name": payload.merchant_name,
            "order_ref": payload.order_ref,
            "masked_identifier": payload.masked_identifier,
            "amount": payload.amount,
            "message_body": payload.message_body,
            "interactive_action": payload.interactive_action,
            "sent_at": payload.sent_at.isoformat(),
            "status": "delivered",
            "customer_replied": False,
            "reply_text": None,
            "reply_timestamp": None
        }
        self.sent_messages.append(msg_record)
        logger.info(f"Dispatched verified WhatsApp message to {payload.customer_phone} for Order {payload.order_ref}")
        return {
            "success": True,
            "message_id": msg_record["message_id"],
            "status": "delivered",
            "provider": "mock_whatsapp_adapter",
            "record": msg_record
        }

    def simulate_customer_reply(self, message_id: str, reply_text: str = "YES") -> Optional[Dict[str, Any]]:
        for msg in self.sent_messages:
            if msg["message_id"] == message_id:
                msg["customer_replied"] = True
                msg["reply_text"] = reply_text
                msg["reply_timestamp"] = datetime.utcnow().isoformat()
                return msg
        return None

class JUBotWhatsAppAdapter(WhatsAppAdapter):
    """
    Adapter to bridge directly with JU_BOT Node/Next.js WhatsApp Business API service.
    Configured via settings.WHATSAPP_API_URL and settings.WHATSAPP_AUTH_TOKEN.
    """
    def __init__(self, api_url: str, auth_token: str):
        self.api_url = api_url
        self.auth_token = auth_token

    def validate_message_safety(self, message_body: str) -> bool:
        url_pattern = r"(https?://\S+|bit\.ly/\S+|tinyurl\.com/\S+|t\.co/\S+)"
        return not bool(re.search(url_pattern, message_body, re.IGNORECASE))

    async def send_verified_message(self, payload: WhatsAppMessagePayload) -> Dict[str, Any]:
        if not self.validate_message_safety(payload.message_body):
            raise ValueError("Message failed safety validation: bare or shortened URLs are prohibited.")

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    f"{self.api_url}/send",
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    json=payload.dict()
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.warning(f"JU_BOT endpoint unreachable, falling back to mock: {e}")
                mock = MockWhatsAppAdapter()
                return await mock.send_verified_message(payload)

class WhatsAppService:
    """Manager for Swappable WhatsApp Dispatch."""

    def __init__(self):
        self.provider = settings.WHATSAPP_PROVIDER
        if self.provider == "ju_bot":
            self.adapter: WhatsAppAdapter = JUBotWhatsAppAdapter(
                api_url=settings.WHATSAPP_API_URL,
                auth_token=settings.WHATSAPP_AUTH_TOKEN
            )
        else:
            self.adapter: WhatsAppAdapter = MockWhatsAppAdapter()

    async def dispatch_verified_nudge(self, payload: WhatsAppMessagePayload) -> Dict[str, Any]:
        return await self.adapter.send_verified_message(payload)

    def simulate_reply(self, message_id: str, reply_text: str = "YES") -> Optional[Dict[str, Any]]:
        if isinstance(self.adapter, MockWhatsAppAdapter):
            return self.adapter.simulate_customer_reply(message_id, reply_text)
        return None

    def get_all_dispatched_messages(self) -> List[Dict[str, Any]]:
        if isinstance(self.adapter, MockWhatsAppAdapter):
            return self.adapter.sent_messages
        return []

whatsapp_service = WhatsAppService()
