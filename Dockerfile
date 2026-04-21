FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy server folder
COPY server ./server

# Install server dependencies  
RUN cd server && npm ci && cd ..

# Set NODE_ENV
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start server
CMD ["node", "server/index.js"]
