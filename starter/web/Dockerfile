FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspace definition
COPY package.json package-lock.json ./
COPY starter/web/package.json ./starter/web/

# Install dependencies using the monorepo lockfile
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Expose Next.js default port
EXPOSE 3000

CMD ["npm", "run", "web:dev"]
