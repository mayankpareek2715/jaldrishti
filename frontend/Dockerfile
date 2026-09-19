# ── Stage 1: build the React app ────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .
# Point the proxy to the backend service name in Docker network
RUN npm run build

# ── Stage 2: serve with nginx ────────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx config and copy our built files
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config: serve React SPA + proxy /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
