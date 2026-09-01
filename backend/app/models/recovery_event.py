from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, SmallInteger, Numeric
from app.database import Base

class RecoveryEvent(Base):
    __tablename__ = "recovery_events"

    event_id = Column(String(36), primary_key=True, index=True)
    customer_ref = Column(String(50), nullable=True, index=True)
    detected_at = Column(DateTime, nullable=True)
    root_cause = Column(String(50), nullable=True, index=True)
    ground_truth_cause = Column(String(50), nullable=True, index=True)
    decision_reasoning = Column(Text, nullable=True)
    action_taken = Column(String(50), nullable=True)
    tier_used = Column(SmallInteger, nullable=True)
    idempotency_key = Column(String(80), nullable=True, index=True)
    bounded_by_rule = Column(String(100), nullable=True)
    outcome = Column(String(20), nullable=True, index=True)  # 'recovered', 'unrecovered', 'refused', 'pending_response', 'duplicate_blocked'
    amount_attempted = Column(Numeric(10, 2), nullable=True)
    amount_recovered = Column(Numeric(10, 2), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "event_id": self.event_id,
            "customer_ref": self.customer_ref,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "root_cause": self.root_cause,
            "ground_truth_cause": self.ground_truth_cause,
            "decision_reasoning": self.decision_reasoning,
            "action_taken": self.action_taken,
            "tier_used": int(self.tier_used) if self.tier_used is not None else None,
            "idempotency_key": self.idempotency_key,
            "bounded_by_rule": self.bounded_by_rule,
            "outcome": self.outcome,
            "amount_attempted": float(self.amount_attempted) if self.amount_attempted is not None else 0.0,
            "amount_recovered": float(self.amount_recovered) if self.amount_recovered is not None else 0.0,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
