FROM alpine:3.21
WORKDIR /var/www/html/4get

RUN apk update && apk upgrade
RUN apk add php apache2-ssl php84-fileinfo php84-openssl php84-iconv php84-common php84-dom php84-sodium php84-curl curl php84-pecl-apcu php84-apache2 imagemagick php84-pecl-imagick php84-mbstring imagemagick-webp imagemagick-jpeg

COPY . .

RUN chmod 777 /var/www/html/4get/icons

EXPOSE 223
EXPOSE 444

ENV FOURGET_PROTO=http

ENTRYPOINT  ["./docker/docker-entrypoint.sh"]
CMD ["start"]
