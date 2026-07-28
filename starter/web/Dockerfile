FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY starter/web/package.json ./starter/web/

RUN npm ci

COPY . .

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "web:dev"]
