FROM node:18-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Install curl for healthchecks (small footprint)
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 4000

CMD ["npm", "run", "dev"]
