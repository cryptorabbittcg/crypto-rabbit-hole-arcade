#!/bin/bash
# Run script for Ape In! backend

echo "🚀 Starting Ape In! Backend Server..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Initialize database
echo "📊 Initializing database..."
python -c "
import asyncio
from app.database import init_db
asyncio.run(init_db())
"

# Run the server
echo "✅ Starting FastAPI server..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

























