.PHONY: dev-up dev-down dev-reset db-migrate db-seed

dev-up:
	docker compose -f infra/docker-compose.yml up -d

dev-down:
	docker compose -f infra/docker-compose.yml down

dev-reset:
	docker compose -f infra/docker-compose.yml down -v
	docker compose -f infra/docker-compose.yml up -d

db-migrate:
	pnpm --filter @samay/database migrate

db-seed:
	pnpm --filter @samay/database seed

