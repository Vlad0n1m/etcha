.PHONY: help build up down logs restart db-push db-migrate shell clean ssl-init ssl-renew

# Default env file
ENV_FILE ?= .env.docker

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Docker Compose commands
build: ## Build Docker images
	docker compose --env-file $(ENV_FILE) build

up: ## Start all services (postgres, app, nginx)
	docker compose --env-file $(ENV_FILE) up -d postgres app nginx

up-all: ## Start all services including certbot renewal
	docker compose --env-file $(ENV_FILE) --profile ssl up -d

down: ## Stop all services
	docker compose --env-file $(ENV_FILE) --profile ssl down

down-v: ## Stop all services and remove volumes
	docker compose --env-file $(ENV_FILE) --profile ssl down -v

logs: ## Show logs (follow mode)
	docker compose --env-file $(ENV_FILE) logs -f

logs-app: ## Show app logs (follow mode)
	docker compose --env-file $(ENV_FILE) logs -f app

logs-nginx: ## Show nginx logs (follow mode)
	docker compose --env-file $(ENV_FILE) logs -f nginx

restart: ## Restart all services
	docker compose --env-file $(ENV_FILE) restart

restart-app: ## Restart app service only
	docker compose --env-file $(ENV_FILE) restart app

restart-nginx: ## Restart nginx service only
	docker compose --env-file $(ENV_FILE) restart nginx

# Database commands
db-push: ## Push schema to database (for development)
	docker compose --env-file $(ENV_FILE) exec app npx prisma@6 db push

db-migrate: ## Run database migrations
	docker compose --env-file $(ENV_FILE) --profile migrate run --rm migrate

db-studio: ## Open Prisma Studio
	@echo "Opening Prisma Studio on http://localhost:5555"
	DATABASE_URL="postgresql://$$(grep POSTGRES_USER $(ENV_FILE) | cut -d= -f2):$$(grep POSTGRES_PASSWORD $(ENV_FILE) | cut -d= -f2)@localhost:$$(grep POSTGRES_PORT $(ENV_FILE) | cut -d= -f2)/$$(grep POSTGRES_DB $(ENV_FILE) | cut -d= -f2)" npx prisma@6 studio

# Shell access
shell: ## Access app container shell
	docker compose --env-file $(ENV_FILE) exec app sh

shell-db: ## Access PostgreSQL shell
	docker compose --env-file $(ENV_FILE) exec postgres psql -U $$(grep POSTGRES_USER $(ENV_FILE) | cut -d= -f2) -d $$(grep POSTGRES_DB $(ENV_FILE) | cut -d= -f2)

shell-nginx: ## Access nginx container shell
	docker compose --env-file $(ENV_FILE) exec nginx sh

# Status
ps: ## Show running containers
	docker compose --env-file $(ENV_FILE) --profile ssl ps

# Cleanup
clean: ## Remove all containers, images, and volumes
	docker compose --env-file $(ENV_FILE) --profile ssl down -v --rmi all

# SSL / Let's Encrypt
ssl-init: ## Initialize SSL certificates (run once on new server)
	@echo "Initializing SSL certificates for etcha.app..."
	./scripts/init-ssl.sh

ssl-renew: ## Manually renew SSL certificates
	docker compose --env-file $(ENV_FILE) run --rm certbot renew
	docker compose --env-file $(ENV_FILE) restart nginx

ssl-status: ## Check SSL certificate status
	docker compose --env-file $(ENV_FILE) run --rm certbot certificates

# Development
dev: ## Start in development mode (local node, docker postgres)
	docker compose --env-file $(ENV_FILE) up -d postgres
	@echo "PostgreSQL started. Run 'npm run dev' to start the app."

# Production
prod: build ## Build and start in production mode with SSL
	docker compose --env-file $(ENV_FILE) up -d postgres app nginx
	@echo "Application started at https://etcha.app"

prod-local: build ## Build and start in production mode (local, no SSL)
	docker compose --env-file $(ENV_FILE) up -d postgres app
	@echo "Application started at http://localhost:3000"

# Nginx config
nginx-test: ## Test nginx configuration
	docker compose --env-file $(ENV_FILE) exec nginx nginx -t

nginx-reload: ## Reload nginx configuration
	docker compose --env-file $(ENV_FILE) exec nginx nginx -s reload
