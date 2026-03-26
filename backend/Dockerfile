# Stage 1: Build the application
FROM golang:1.22-alpine AS builder

# Install git and ca-certificates (often needed for fetching private modules or SSL)
RUN apk add --no-cache git ca-certificates && update-ca-certificates

WORKDIR /app

# Layer caching: Copy and download dependencies first
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Optimization: Use -ldflags to shrink the binary and remove debug info
# This is a SAMA/NCA best practice to prevent reverse engineering
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o main .

# Stage 2: Final Run - Distroless for Security
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

# Copy the binary from the builder
COPY --from=builder /app/main /main

# Optional: Copy static assets or migration files if needed
# COPY --from=builder /app/migrations /migrations

# Distroless static-debian12:nonroot already has the USER defined, 
# but i am explicitly declaring it as it is good for documentation.
USER 65532:65532 

EXPOSE 8080

# Use the signal-friendly form of ENTRYPOINT
ENTRYPOINT ["/main"]