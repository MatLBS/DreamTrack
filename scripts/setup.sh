#!/bin/bash
set -e

if [ ! -f .env ]; then
  echo "→ Creating .env from .env.example..."
  cp .env.example .env
  echo "  Edit .env and fill in the required values before continuing."
fi

echo "→ Installing dependencies..."
npm install

echo "→ Pushing schema to database..."
npm run db:migrate

echo "→ Seeding database with initial data..."
npm run seed:users

echo "✓ Setup complete. Run 'npm run dev' to start."
