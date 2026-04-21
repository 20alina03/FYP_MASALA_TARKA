# Use Node.js 18 as base image
FROM node:18-alpine

WORKDIR /app

# Install dependencies for both frontend and backend
COPY package*.json ./
RUN npm ci

# Copy server files
COPY server ./server

# Install server dependencies
WORKDIR /app/server
RUN npm ci

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV MONGODB_URI=mongodb://mongo:27017/recipe-finder

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
