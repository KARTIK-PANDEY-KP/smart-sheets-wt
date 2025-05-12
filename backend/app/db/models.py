from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .base import Base

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    title = Column(String, nullable=True)
    model = Column(String, nullable=False)
    chat_metadata = Column(JSON, nullable=True)

    # Relationship to messages
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    ts = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    role = Column(String, nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    tool_name = Column(String, nullable=True)
    tool_args = Column(JSON, nullable=True)
    partial_json = Column(JSON, nullable=True)

    # Relationship to chat
    chat = relationship("Chat", back_populates="messages") 