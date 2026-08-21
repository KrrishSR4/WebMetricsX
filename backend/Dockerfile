# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

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

# Install ca-certificates and tzdata for TLS and timezone support
RUN apk add --no-cache ca-certificates tzdata

# Create non-root app user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/bin/webmetricsx-backend /app/webmetricsx-backend

USER appuser

EXPOSE 8080

ENTRYPOINT ["/app/webmetricsx-backend"]
