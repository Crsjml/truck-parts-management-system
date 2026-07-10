FROM node:20-alpine AS dev
WORKDIR /app
# 1. Copy ONLY package files first
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
# 2. Copy source
COPY frontend/ .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Build stage for production
FROM dev AS builder
RUN npm run build

# Production stage
FROM nginx:alpine AS prod
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
