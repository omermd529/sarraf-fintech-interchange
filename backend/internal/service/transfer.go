package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type TransferService struct {
	DB *pgxpool.Pool
}

func (s *TransferService) ProcessPayment(ctx context.Context, userID, merchantID uuid.UUID, amount decimal.Decimal) (string, error) {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	// 1. Lock & check user balance (prevent double-spending)
	var balance decimal.Decimal
	err = tx.QueryRow(ctx, "SELECT balance_sar FROM users WHERE user_id = $1 FOR UPDATE", userID).Scan(&balance)
	if err != nil {
		return "", fmt.Errorf("failed to fetch user: %v", err)
	}

	if balance.LessThan(amount) {
		return "", fmt.Errorf("insufficient balance")
	}

	// 2. Calculate interchange fee (1.00%)
	feePct := decimal.NewFromFloat(0.01)
	feeAmount := amount.Mul(feePct).Round(2)
	totalDeduction := amount.Add(feeAmount)

	// 3. Deduct from user
	_, err = tx.Exec(ctx, "UPDATE users SET balance_sar = balance_sar - $1, updated_at = NOW() WHERE user_id = $2", totalDeduction, userID)
	if err != nil {
		return "", fmt.Errorf("deduction failed: %v", err)
	}

	// 4. Record transaction with RRN
	rrn := uuid.New().String()[:12]
	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (sender_id, merchant_id, amount, fee_amount, status, rrn, description)
		VALUES ($1, $2, $3, $4, 'COMPLETED', $5, 'Payment to Merchant')`,
		userID, merchantID, amount, feeAmount, rrn)
	if err != nil {
		return "", fmt.Errorf("ledger entry failed: %v", err)
	}

	// 5. Commit the atomic unit
	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return rrn, nil
}
