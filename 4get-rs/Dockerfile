FROM rust:1.85-alpine AS builder
RUN apk add --no-cache musl-dev openssl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
COPY src ./src
RUN cargo build --release

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/4get /app/4get
COPY config.toml /app/config.toml
RUN mkdir -p /app/data/cache /app/data/icons
EXPOSE 3001
CMD ["/app/4get", "--config", "/app/config.toml"]
