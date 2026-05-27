FROM rust:latest AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update -qq && apt-get install -y -qq ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/sorvx /app/sorvx
COPY config.toml /app/config.toml
RUN mkdir -p /app/data/cache /app/data/icons
EXPOSE 3001
CMD ["/app/sorvx", "--config", "/app/config.toml"]
