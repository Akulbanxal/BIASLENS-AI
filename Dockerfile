FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci
RUN npm ci --prefix server
RUN npm ci --prefix client

# Build client
RUN npm run build --prefix client

# Expose backend port (also serves built frontend in production)
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start backend
CMD ["npm", "run", "start", "--prefix", "server"]
