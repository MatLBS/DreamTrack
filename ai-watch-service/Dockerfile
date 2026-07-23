FROM python:3.12-slim

WORKDIR /app

# Install uv (fast Python package installer)
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy source code
COPY src ./src

# Expose port
EXPOSE 8008

# Run server
CMD ["uv", "run", "python", "-m", "ai_watch", "serve", "--host", "0.0.0.0", "--port", "8008"]
