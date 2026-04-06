package domain

import "time"

// ---- Reminder ----

// Booking は予約リマインダー用の予約情報
type Booking struct {
	ID          string
	Name        string
	Email       string
	BookingType string
	BookingDate string
	QRToken     string
	StartTime   string
	EndTime     string
	LineUserID  string
}

// ReminderResult は予約リマインダーの結果
type ReminderResult struct {
	Sent   int `json:"sent"`
	Failed int `json:"failed"`
}

// ---- LINE Notifications ----

// MemberForNotification はLINE通知対象会員
type MemberForNotification struct {
	ID        string
	FirstName string
	LastName  string
	LineUserID string
	BirthDate  *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
	Status     string
}

// LineTemplate はLINE通知テンプレート
type LineTemplate struct {
	ID              string
	TriggerID       string
	MessageTemplate string
	RewardName      string
	RewardValidDays int
	Conditions      map[string]interface{}
}

// LineNotificationResult はLINE通知の結果
type LineNotificationResult struct {
	Birthday    int `json:"birthday"`
	Anniversary int `json:"anniversary"`
	Paused      int `json:"paused"`
}

// ---- Analytics ----

// AnalyticsResult はアナリティクス集計の結果
type AnalyticsResult struct {
	Aggregated bool   `json:"aggregated"`
	TargetDate string `json:"target_date"`
}

// ---- Payment Retry ----

// PaymentRetry は決済リトライ対象
type PaymentRetry struct {
	ID                   string
	MemberID             string
	StripeInvoiceID      string
	StripeSubscriptionID string
	Amount               int
	RetryCount           int
	MaxRetries           int
	MemberName           string
	MemberEmail          string
	MemberLineUserID     string
}

// PaymentRetryResult は決済リトライの結果
type PaymentRetryResult struct {
	Processed   int `json:"processed"`
	Succeeded   int `json:"succeeded"`
	Failed      int `json:"failed"`
	Rescheduled int `json:"rescheduled"`
}

// ---- Stripe Sync ----

// StripeSyncResult はStripe同期の結果
type StripeSyncResult struct {
	Synced  int `json:"synced"`
	Created int `json:"created"`
	Updated int `json:"updated"`
	Errors  int `json:"errors"`
}

// ---- Daily Tasks ----

// DailyTaskResult は日次タスク全体の結果
type DailyTaskResult struct {
	Reminders         ReminderResult         `json:"reminders"`
	LineNotifications LineNotificationResult `json:"line_notifications"`
	Analytics         AnalyticsResult        `json:"analytics"`
	PaymentRetries    PaymentRetryResult     `json:"payment_retries"`
	StripeSync        StripeSyncResult       `json:"stripe_sync"`
}
