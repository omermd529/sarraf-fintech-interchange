# Stage 1 : Build the application
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . . 
RUN go mod init sarraf-backend && go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o main . 

# Stage 2 : Final Run Distroless for Security

FROM gcr.io/distroless/static-debian12
WORKDIR / 
COPY --from=builder /app/main /main

#Best pracrtice to run as non root user for security
USER nonroot:nonroot
EXPOSE 8080
CMD [ "/main" ]

