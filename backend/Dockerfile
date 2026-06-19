FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install production dependencies (including dev for building)
RUN npm ci --production

# Copy source code
COPY src ./src

# Expose default port (will be overridden if needed)
EXPOSE 5000

# Use non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Command to start the server (dynamic port logic is inside src/index.js)
CMD ["node", "src/index.js"]
