package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// 1. Fetch Environment Variables (Injected by your GitHub Action)
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	if passFile := os.Getenv("DB_PASSWORD_FILE"); passFile != "" {
		if b, err := os.ReadFile(passFile); err == nil {
			dbPass = strings.TrimSpace(string(b))
		}
	}
	dbName := os.Getenv("DB_NAME")

	// 2. Build Connection String (DSN)
	// sslmode=disable is used here because we are on a Private VPC.
	// In a full Prod move, we'd use Cloud SQL Auth Proxy for TLS.
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		url.QueryEscape(dbUser), url.QueryEscape(dbPass), dbHost, dbPort, dbName)

	// 3. Create a Connection Pool
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		log.Fatalf("Unable to parse connection string: %v", err)
	}

	// Performance tuning for Fintech: maintain a few idle connections
	config.MaxConns = 10
	config.MinConns = 2

	dbPool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v", err)
	}
	defer dbPool.Close()

	// 4. Test the Connection (Retry logic for cold starts)
	for i := 0; i < 5; i++ {
		err = dbPool.Ping(context.Background())
		if err == nil {
			log.Println("Successfully connected to Sarraf Database!")
			break
		}
		log.Printf("Waiting for database... attempt %d\n", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Could not connect to DB after retries: %v", err)
	}

	// 5. Define HTTP Routes.
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		err := dbPool.Ping(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintf(w, "Database Unreachable")
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Sarraf API is healthy")
	})

	// 6. Start the Server
	port := "8080"
	log.Printf("Sarraf Backend starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

// This is a simple Go backend for the Sarraf Fintech Interchange project.
