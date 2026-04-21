FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm ci

# Copy server directory
COPY server ./server

# Install server dependencies
WORKDIR /app/server
RUN npm ci

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start from app directory
WORKDIR /app

CMD ["node", "server/index.js"]
