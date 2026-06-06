FROM rust:1-bookworm AS chef
RUN cargo install cargo-chef

FROM chef AS planner
WORKDIR /app
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
WORKDIR /app
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update -qq && apt-get install -y -qq ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/sorvx /app/sorvx
COPY config.toml /app/config.toml
RUN mkdir -p /app/data/cache /app/data/icons
EXPOSE 3001
CMD ["/app/sorvx", "--config", "/app/config.toml"]
