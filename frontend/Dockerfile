FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Install dependencies (package.json and lock file)
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY frontend/ .

# Expose the Vite dev server port
EXPOSE 5173

# Run the development server (hot reload)
CMD ["npm", "run", "dev"]
