from .base import engine, Base
from .models import Chat, ChatMessage

def init_db():
    """Initialize the database by creating all tables."""
    Base.metadata.create_all(bind=engine)

def seed_db():
    """Seed the database with some initial data."""
    from sqlalchemy.orm import Session
    from .base import SessionLocal
    import json

    db = SessionLocal()
    try:
        # Create a sample chat
        chat = Chat(
            title="Sample Chat",
            model="gpt-4",
            chat_metadata=json.dumps({
                "temperature": 0.7,
                "system_prompt": "You are a helpful assistant."
            })
        )
        db.add(chat)
        db.flush()  # Get the chat ID

        # Add some sample messages
        messages = [
            ChatMessage(
                chat_id=chat.id,
                role="system",
                content="You are a helpful assistant."
            ),
            ChatMessage(
                chat_id=chat.id,
                role="user",
                content="Hello! How can you help me today?"
            ),
            ChatMessage(
                chat_id=chat.id,
                role="assistant",
                content="I'm here to help! I can assist you with various tasks, answer questions, or just chat. What would you like to do?"
            )
        ]
        db.add_all(messages)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("Seeding database with sample data...")
    seed_db()
    print("Done!") 