package repository

import "github.com/flolia/flolia-project/backend/domain"

// StripeWebhookRepository はStripe Webhookのデータアクセスインターフェース
type StripeWebhookRepository interface {
	// payments
	InsertPayment(p domain.PaymentRecord) error
	// members
	UpdateMemberStatus(memberID string, status string) error
	UpdateMemberSubscription(memberID string, subscriptionID string, status string) error
	FindMemberBySubscriptionID(subscriptionID string) (*domain.MemberForWebhook, error)
	CancelMemberSubscription(memberID string) error
	// payment_retries
	FindPendingRetryByInvoiceID(invoiceID string) (string, error) // returns retry ID or ""
	InsertPaymentRetry(memberID, invoiceID, subscriptionID string, amount int64, nextRetryAt string, errMsg string) error
	// refunds
	FindRefundByStripeID(stripeRefundID string) (*domain.ExistingRefund, error)
	FindRefundByPaymentID(paymentID string) (string, error) // returns refund ID or ""
	UpdateRefundStatus(refundID string) error
	InsertRefund(r domain.RefundRecord) error
	FindPaymentByChargeID(chargeID string) (*domain.ExistingPayment, error)
	UpdatePaymentRefundStatus(paymentID string, status string) error
	// LINE
	SendPaymentFailedLine(lineUserID string, memberName string) error
}

// StripeWebhookUsecase はStripe Webhookのユースケースインターフェース
type StripeWebhookUsecase interface {
	HandlePaymentIntentSucceeded(e domain.StripePaymentIntentEvent) error
	HandlePaymentIntentFailed(e domain.StripePaymentIntentEvent) error
	HandleSubscriptionCreated(e domain.StripeSubscriptionEvent) error
	HandleSubscriptionUpdated(e domain.StripeSubscriptionEvent) error
	HandleSubscriptionDeleted(e domain.StripeSubscriptionEvent) error
	HandleInvoicePaymentSucceeded(e domain.StripeInvoiceEvent) error
	HandleInvoicePaymentFailed(e domain.StripeInvoiceEvent) error
	HandleChargeRefunded(e domain.StripeChargeRefundedEvent) error
}
