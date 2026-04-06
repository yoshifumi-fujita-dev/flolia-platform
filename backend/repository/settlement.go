package repository

import "github.com/flolia/flolia-project/backend/domain"

// SettlementRepository は月末決済処理のインターフェース
type SettlementRepository interface {
	FetchUnsettledPurchases(settlementMonth string) ([]*domain.ProductPurchase, error)
	GetPaymentMethods(stripeCustomerID string) ([]domain.PaymentMethod, error)
	ChargeCustomer(params domain.ChargeParams) (string, error) // returns paymentIntentID
	UpdatePurchasesSettled(purchaseIDs []string, paymentIntentID string, chargeID string) error
	SendStatementEmail(params domain.StatementEmailParams) error
}

// SettlementUsecase は月末決済ユースケースのインターフェース
type SettlementUsecase interface {
	Run(targetMonth string, dryRun bool) (*domain.SettlementResult, error)
}
