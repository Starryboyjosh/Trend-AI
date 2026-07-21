.PHONY: validate demo test-demo graphify install dev test lint format

validate:
	python scripts/validate_package.py

test-demo:
	cd demo && pytest -q

demo:
	cd demo && uvicorn app:app --reload

install:
	npm install --legacy-peer-deps
	.venv/bin/pip install -r starter/backend/requirements.txt

dev:
	npm run dev

test:
	npm run web:test
	PYTHONPATH=starter/backend .venv/bin/pytest starter/backend/tests

lint:
	npm run web:typecheck
	npm run web:lint

format:
	npx prettier --write "starter/web/**/*.{ts,tsx,css,json}"
	.venv/bin/ruff format starter/backend/

graphify:
	@echo "Run /graphify . from a supported coding assistant after installing graphifyy"

