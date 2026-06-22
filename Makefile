# Tarlac Truck Pitstop Management System - Docker Helper Commands
# These aliases automatically enforce color-coding and cleaner layouts.

# Colors for terminal output
CYAN=\033[0;36m
GREEN=\033[0;32m
NC=\033[0m # No Color

.PHONY: help build up down logs lazy frontend-logs backend-logs

help:
	@echo "${CYAN}Tarlac Truck Pitstop - Docker Commands${NC}"
	@echo "  make build         - Build images with clean linear logs and enforced colors"
	@echo "  make up            - Start all containers in the background"
	@echo "  make down          - Stop and remove all containers"
	@echo "  make logs          - Tail streaming logs of all containers (Color-coded)"
	@echo "  make frontend-logs - Tail streaming logs for ONLY the frontend"
	@echo "  make backend-logs  - Tail streaming logs for ONLY the backend"
	@echo "  make lazy          - Open Lazydocker for the ultimate interactive dashboard"

# Optimized Builds: Uses linear output to prevent spinner-spam and enforces BuildKit colors
build:
	@echo "${GREEN}Building Docker Images...${NC}"
	BUILDKIT_COLORS="run=green:info=cyan:error=red:warn=yellow" docker-compose build --progress=plain --parallel

# Run cluster detached and open browser
up:
	@echo "${GREEN}Starting all containers in the background...${NC}"
	docker-compose --ansi always up -d
	@echo "\n${CYAN}================================================${NC}"
	@echo "${GREEN}🚀 Application is spinning up!${NC}"
	@echo "🔗 ${CYAN}Frontend:${NC} http://localhost:5173"
	@echo "🔗 ${CYAN}Backend API:${NC} http://localhost:5000"
	@echo "${CYAN}================================================${NC}\n"
	@echo "Opening browser in 3 seconds..."
	@sleep 3
	@open http://localhost:5173 2>/dev/null || echo "Started successfully!"

down:
	@echo "${GREEN}Stopping containers...${NC}"
	docker-compose down

# Color-coded interleved logs
logs:
	docker-compose --ansi always logs -f

frontend-logs:
	docker-compose --ansi always logs -f frontend

backend-logs:
	docker-compose --ansi always logs -f backend

# Interactive Terminal Dashboard
lazy:
	lazydocker
