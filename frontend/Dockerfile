FROM node:20-alpine

WORKDIR /app

# 1. Copy ONLY package files first — Docker caches this layer.
#    npm ci only re-runs when package.json / package-lock.json changes.
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

# 2. Copy source (overridden at runtime by the volume mount in dev)
COPY frontend/ .

EXPOSE 5173

CMD ["npm", "run", "dev"]
