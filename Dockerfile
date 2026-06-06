FROM lwthiker/curl-impersonate:0.6.1-ff-alpine AS curl-impersonate

FROM alpine:3.21
WORKDIR /var/www/html/4get

RUN apk update && apk upgrade
RUN apk add php apache2-ssl php84-fileinfo php84-openssl php84-iconv php84-common php84-dom php84-sodium php84-curl curl php84-pecl-apcu php84-apache2 imagemagick php84-pecl-imagick php84-mbstring imagemagick-webp imagemagick-jpeg nss ca-certificates 

COPY --from=curl-impersonate /usr/local/bin /usr/local/bin
COPY --from=curl-impersonate /usr/local/lib /usr/local/lib

ENV LD_PRELOAD=/usr/local/lib/libcurl-impersonate-ff.so
ENV CURL_IMPERSONATE=ff117
ENV CURL_IMPERSONATE_HEADERS=no

COPY . .

RUN chmod 777 /var/www/html/4get/icons

EXPOSE 80
EXPOSE 443

ENV FOURGET_PROTO=http

ENTRYPOINT  ["./docker/docker-entrypoint.sh"]
CMD ["start"]
