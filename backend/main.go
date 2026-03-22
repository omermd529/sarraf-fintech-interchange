package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

type Response struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Region  string `json:"region"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Health Check for GKE Liveness/Readiness probes
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(Response{Status: "UP", Message: "Sarraf Interchange Active", Region: "me-central1"})
	})

	// Mock Transaction Endpoint
	http.HandleFunc("/api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{
			Status:  "Secure",
			Message: "Workload Identity Verified",
			Region:  os.Getenv("GCP_REGION"),
		})
	})

	fmt.Printf("Sarraf Backend starting on port %s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}