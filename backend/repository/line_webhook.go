package repository

import "github.com/flolia/flolia-project/backend/domain"

// LineWebhookRepository はLINE Webhookのデータアクセスインターフェース
type LineWebhookRepository interface {
	FindMemberByLineUserID(lineUserID string) (*domain.Member, error)
	ClearMemberLineUserID(lineUserID string) error
	CloseInquiriesByLineUserID(lineUserID string) error
	GetOrCreateInquiry(lineUserID string) (*domain.LineInquiry, error)
	SaveIncomingMessage(inquiryID string, msg *domain.LineMessage) error
	FindMemberBookings(memberID string, fromDate string) ([]BookingSummary, error)
	SendLineTextMessage(lineUserID string, text string) error
	GetLineProfile(lineUserID string) (*domain.LineProfile, error)
}

// BookingSummary は予約一覧用の簡略型
type BookingSummary struct {
	BookingDate string
	BookingType string
	StartTime   string
}

// LineWebhookUsecase はLINE Webhookのユースケースインターフェース
type LineWebhookUsecase interface {
	HandleFollow(lineUserID string) error
	HandleUnfollow(lineUserID string) error
	HandleMessage(lineUserID string, msg *domain.LineMessage) error
}
