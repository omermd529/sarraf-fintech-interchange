package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	TransactionsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "sarraf_transactions_total",
		Help: "Total number of transactions processed",
	}, []string{"status"})

	PaymentLatency = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "sarraf_payment_latency_seconds",
		Help:    "Payment processing latency in seconds",
		Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5},
	})

	FeeCollected = promauto.NewCounter(prometheus.CounterOpts{
		Name: "sarraf_fee_collected_sar_total",
		Help: "Total interchange fees collected in SAR",
	})

	ActiveUsers = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "sarraf_active_requests",
		Help: "Number of active payment requests being processed",
	})

	HTTPRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "sarraf_http_requests_total",
		Help: "Total HTTP requests by method and path",
	}, []string{"method", "path", "status_code"})

	HTTPRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "sarraf_http_request_duration_seconds",
		Help:    "HTTP request duration in seconds",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "path"})
)
