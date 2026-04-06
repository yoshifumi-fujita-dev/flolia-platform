package repository

import "github.com/flolia/flolia-project/backend/domain"

// ReminderRepository は予約リマインダーのインターフェース
type ReminderRepository interface {
	FetchTomorrowBookings() ([]*domain.Booking, error)
	SendReminderEmail(booking *domain.Booking, dateFormatted, timeFormatted string) error
	SendReminderLine(lineUserID string, booking *domain.Booking, dateFormatted, timeFormatted string) error
}

// LineNotificationRepository はLINE通知のインターフェース
type LineNotificationRepository interface {
	FetchActiveTemplates(triggerIDs []string) ([]*domain.LineTemplate, error)
	FetchMembersForBirthday() ([]*domain.MemberForNotification, error)
	FetchMembersForAnniversary() ([]*domain.MemberForNotification, error)
	FetchPausedMembers() ([]*domain.MemberForNotification, error)
	HasNotificationSentToday(memberID, templateID string) (bool, error)
	SendLineMessage(lineUserID string, message string) error
	LogNotification(memberID, templateID, triggerID string, conditions map[string]interface{}, rewardName string, rewardValidDays int) error
}

// AnalyticsRepository はアナリティクス集計のインターフェース
type AnalyticsRepository interface {
	AggregateDailyAnalytics(targetDate string) error
}

// PaymentRetryRepository は決済リトライのインターフェース
type PaymentRetryRepository interface {
	FetchPendingRetries() ([]*domain.PaymentRetry, error)
	RetryInvoicePayment(stripeInvoiceID string) error
	MarkRetrySucceeded(retryID string, retryCount int) error
	MarkRetryFailed(retryID string, retryCount int, errMsg string) error
	ScheduleNextRetry(retryID string, retryCount int, nextRetryAt string, errMsg string) error
	UpdateMemberStatus(memberID string, status string) error
	SendPaymentFailedLine(lineUserID string, memberName string, isFinal bool) error
}

// StripeSyncRepository はStripe同期のインターフェース
type StripeSyncRepository interface {
	FetchRecentStripePayments(since int64) ([]StripePaymentIntent, error)
	FetchRecentStripeInvoices(since int64) ([]StripeInvoice, error)
	FindPaymentByIntentID(intentID string) (string, string, error) // id, status
	FindPaymentByInvoiceID(invoiceID string) (string, error)       // id
	UpdatePaymentStatus(id string) error
	CreatePaymentFromIntent(p StripePaymentIntent, memberID string) error
	CreatePaymentFromInvoice(inv StripeInvoice, memberID string) error
	FindMemberByStripeCustomer(customerID string) (string, error)
}

// StripePaymentIntent はStripe PaymentIntentの簡略型
type StripePaymentIntent struct {
	ID                 string
	Amount             int64
	Status             string
	CustomerID         string
	PaymentMethodTypes []string
	Description        string
	Created            int64
	Metadata           map[string]string
	LatestChargeID     string
}

// StripeInvoice はStripe Invoiceの簡略型
type StripeInvoice struct {
	ID              string
	AmountPaid      int64
	Status          string
	CustomerID      string
	PaymentIntentID string
	Description     string
	Created         int64
}

// ReminderUsecase は予約リマインダーのユースケースインターフェース
type ReminderUsecase interface {
	Run() (*domain.ReminderResult, error)
}

// LineNotificationUsecase はLINE通知のユースケースインターフェース
type LineNotificationUsecase interface {
	Run() (*domain.LineNotificationResult, error)
}

// AnalyticsUsecase はアナリティクス集計のユースケースインターフェース
type AnalyticsUsecase interface {
	Run() (*domain.AnalyticsResult, error)
}

// PaymentRetryUsecase は決済リトライのユースケースインターフェース
type PaymentRetryUsecase interface {
	Run() (*domain.PaymentRetryResult, error)
}

// StripeSyncUsecase はStripe同期のユースケースインターフェース
type StripeSyncUsecase interface {
	Run() (*domain.StripeSyncResult, error)
}
