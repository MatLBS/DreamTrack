FROM python:3.12-slim

WORKDIR /app

# Install uv (fast Python package installer)
RUN pip install --no-cache-dir uv

# Copy dependency files AND source code (needed for local package build)
COPY pyproject.toml uv.lock README.md ./
COPY src ./src

# Install dependencies (will build local package)
RUN uv sync --frozen --no-dev

# Persistent Chroma storage directory (mounted as a volume in docker-compose)
RUN mkdir -p /app/.chroma-data

# Expose port
EXPOSE 8008

# Run server
CMD ["uv", "run", "python", "-m", "ai_watch", "serve", "--host", "0.0.0.0", "--port", "8008"]
