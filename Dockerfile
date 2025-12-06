FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Main container with PHP and Node.js
FROM alpine:3.21

WORKDIR /var/www/html/4get

# Install PHP, Apache, and Node.js
RUN apk update && apk upgrade && \
    apk add --no-cache \
    php apache2-ssl php84-fileinfo php84-openssl php84-iconv php84-common \
    php84-dom php84-sodium php84-curl curl php84-pecl-apcu php84-apache2 \
    imagemagick php84-pecl-imagick php84-mbstring imagemagick-webp imagemagick-jpeg \
    nodejs npm supervisor

# Copy PHP backend
COPY . .
RUN mkdir -p icons && chmod 777 icons && chmod +x docker/docker-entrypoint.sh && chmod +x docker/docker-entrypoint-unified.sh

# Copy Next.js frontend
COPY --from=frontend-builder /frontend/.next/standalone /app/frontend
COPY --from=frontend-builder /frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /frontend/public /app/frontend/public

# Create supervisor config
RUN mkdir -p /etc/supervisor.d
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 80 3000

ENV FOURGET_PROTO=http
ENV NODE_ENV=production
ENV PORT=3000
ENV PHP_BACKEND_URL=http://localhost:80

ENTRYPOINT ["./docker/docker-entrypoint-unified.sh"]
CMD ["start"]
