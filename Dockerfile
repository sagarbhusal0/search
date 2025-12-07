# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --only=production=false
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Production container with PHP + Node.js
FROM alpine:3.21

WORKDIR /var/www/html/4get

# Install PHP, Apache, and Node.js runtime
RUN apk update && apk upgrade && \
    apk add --no-cache \
    php apache2-ssl php84-fileinfo php84-openssl php84-iconv php84-common \
    php84-dom php84-sodium php84-curl curl php84-pecl-apcu php84-apache2 \
    imagemagick php84-pecl-imagick php84-mbstring imagemagick-webp imagemagick-jpeg \
    nodejs supervisor && \
    rm -rf /var/cache/apk/*

# Copy PHP backend
COPY . .
RUN mkdir -p icons && chmod 777 icons && \
    chmod +x docker/docker-entrypoint.sh && \
    chmod +x docker/docker-entrypoint-unified.sh

# Copy Next.js standalone build
COPY --from=frontend-builder /frontend/.next/standalone /app/frontend
COPY --from=frontend-builder /frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /frontend/public /app/frontend/public

# Setup supervisor
RUN mkdir -p /etc/supervisor.d
COPY docker/supervisord.conf /etc/supervisord.conf

# Only expose Next.js port - Coolify should route here
EXPOSE 3000

# Environment
ENV FOURGET_PROTO=http
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PHP_BACKEND_URL=http://127.0.0.1:80

ENTRYPOINT ["./docker/docker-entrypoint-unified.sh"]
CMD ["start"]
