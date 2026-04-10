package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/omerops/sarraf-backend/internal/service"
	"github.com/shopspring/decimal"
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

	// IAM Auth mode: no password needed, Cloud SQL Auth Proxy handles it
	iamAuth := os.Getenv("DB_IAM_AUTH") == "true"

	if !iamAuth {
		// Legacy: read password from file for non-IAM environments
		if passFile := os.Getenv("DB_PASSWORD_FILE"); passFile != "" {
			b, err := os.ReadFile(passFile)
			if err != nil {
				log.Fatalf("SECURITY: Failed to read DB secret from %s: %v", passFile, err)
			}
			dbPass = strings.TrimSpace(string(b))
		}
	}
	dbName := os.Getenv("DB_NAME")

	// 2. Build Connection String (DSN)
	var dsn string
	if iamAuth {
		// IAM Auth: connect via Cloud SQL Auth Proxy on localhost, no password
		// Strip .gserviceaccount.com suffix — Cloud SQL IAM requires the short form
		iamUser := strings.TrimSuffix(dbUser, ".gserviceaccount.com")
		dsn = fmt.Sprintf("postgres://%s@%s:%s/%s?sslmode=disable",
			url.QueryEscape(iamUser), dbHost, dbPort, dbName)
		log.Println("Using IAM Authentication via Cloud SQL Auth Proxy")
	} else {
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			url.QueryEscape(dbUser), url.QueryEscape(dbPass), dbHost, dbPort, dbName)
	}

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

	// 5. Initialize Services
	transferSvc := &service.TransferService{DB: dbPool}

	// 6. Define HTTP Routes.
	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		err := dbPool.Ping(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprintf(w, "Database Unreachable")
			return
		}
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Sarraf API is healthy")
	})

	mux.HandleFunc("/pay", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			UserID     string `json:"user_id"`
			MerchantID string `json:"merchant_id"`
			Amount     string `json:"amount"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		userID, err := uuid.Parse(req.UserID)
		if err != nil {
			http.Error(w, `{"error":"invalid user_id"}`, http.StatusBadRequest)
			return
		}
		merchantID, err := uuid.Parse(req.MerchantID)
		if err != nil {
			http.Error(w, `{"error":"invalid merchant_id"}`, http.StatusBadRequest)
			return
		}
		amount, err := decimal.NewFromString(req.Amount)
		if err != nil || amount.LessThanOrEqual(decimal.Zero) {
			http.Error(w, `{"error":"invalid amount"}`, http.StatusBadRequest)
			return
		}

		rrn, err := transferSvc.ProcessPayment(r.Context(), userID, merchantID, amount)
		if err != nil {
			log.Printf("Payment failed: %v", err)
			http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusUnprocessableEntity)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "COMPLETED",
			"rrn":    rrn,
		})
	})

	mux.HandleFunc("/balance", getBalanceHandler(dbPool))
	mux.HandleFunc("/transactions", getTransactionsHandler(dbPool))
	mux.HandleFunc("/merchants", getMerchantsHandler(dbPool))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("UP"))
	})

	// 7. Start the Server
	port := "8080"
	log.Printf("Sarraf Backend starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, corsMiddleware(mux)); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func getBalanceHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		var balance decimal.Decimal
		var fullName string

		err := pool.QueryRow(r.Context(),
			"SELECT full_name, balance_sar FROM users WHERE user_id = $1", userID).Scan(&fullName, &balance)
		if err != nil {
			http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"full_name":   fullName,
			"balance_sar": balance,
			"currency":    "SAR",
		})
	}
}

func getTransactionsHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")

		rows, err := pool.Query(r.Context(), `
			SELECT rrn, amount, fee_amount, status, created_at
			FROM transactions
			WHERE sender_id = $1 OR receiver_id = $1
			ORDER BY created_at DESC LIMIT 10`, userID)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var txs []map[string]interface{}
		for rows.Next() {
			var rrn, status string
			var amount, fee decimal.Decimal
			var createdAt time.Time
			rows.Scan(&rrn, &amount, &fee, &status, &createdAt)
			txs = append(txs, map[string]interface{}{
				"rrn":        rrn,
				"amount":     amount,
				"fee":        fee,
				"status":     status,
				"created_at": createdAt,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(txs)
	}
}

func getMerchantsHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(r.Context(), "SELECT merchant_id, business_name, category FROM merchants")
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var merchants []map[string]interface{}
		for rows.Next() {
			var id uuid.UUID
			var name, cat string
			rows.Scan(&id, &name, &cat)
			merchants = append(merchants, map[string]interface{}{
				"merchant_id":   id,
				"business_name": name,
				"category":      cat,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(merchants)
	}
}
