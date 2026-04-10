package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type User struct {
	UserID     uuid.UUID       `json:"user_id" db:"user_id"`
	Username   string          `json:"username" db:"username"`
	FullName   string          `json:"full_name" db:"full_name"`
	BalanceSAR decimal.Decimal `json:"balance_sar" db:"balance_sar"`
	Currency   string          `json:"currency" db:"currency"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
}

type Merchant struct {
	MerchantID        uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	BusinessName      string          `json:"business_name" db:"business_name"`
	Category          string          `json:"category" db:"category"`
	InterchangeFeePct decimal.Decimal `json:"interchange_fee_pct" db:"interchange_fee_pct"`
}

type Transaction struct {
	TransactionID uuid.UUID       `json:"transaction_id" db:"transaction_id"`
	SenderID      uuid.UUID       `json:"sender_id" db:"sender_id"`
	ReceiverID    uuid.UUID       `json:"receiver_id" db:"receiver_id"`
	MerchantID    *uuid.UUID      `json:"merchant_id,omitempty" db:"merchant_id"`
	Amount        decimal.Decimal `json:"amount" db:"amount"`
	FeeAmount     decimal.Decimal `json:"fee_amount" db:"fee_amount"`
	Status        string          `json:"status" db:"status"`
	RRN           string          `json:"rrn" db:"rrn"`
	Description   string          `json:"description" db:"description"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
}
