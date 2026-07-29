FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Create uploads directory for persistent user-uploaded content
RUN mkdir -p /app/public/uploads/avatars && \
    mkdir -p /app/public/uploads/icons

# Declare volume for persistent storage
VOLUME ["/app/public/uploads"]

EXPOSE 3000

CMD ["npm", "run", "start"]
