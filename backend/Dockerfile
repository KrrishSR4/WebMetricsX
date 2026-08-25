# Build Stage
FROM golang:alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Copy dependency files
COPY go.mod go.sum* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build lightweight binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/bin/webmetricsx-backend \
    ./cmd/api

# Final Production Stage
FROM alpine:3.20

WORKDIR /app

# Install ca-certificates, tzdata, and curl for healthcheck
RUN apk add --no-cache ca-certificates tzdata curl

# Create non-root app user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/bin/webmetricsx-backend /app/webmetricsx-backend

USER appuser

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD curl -f http://localhost:8081/health || exit 1

ENTRYPOINT ["/app/webmetricsx-backend"]
