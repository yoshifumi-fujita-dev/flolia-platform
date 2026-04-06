package repository

import "github.com/flolia/flolia-project/backend/domain"

// ReservationRepository は予約コンテキストのリポジトリインターフェース
type ReservationRepository interface {
	// FindTimeSlot は時間枠IDで時間枠情報を取得する
	FindTimeSlot(timeSlotID string) (*domain.TimeSlot, error)

	// InsertBooking はRPC経由で定員チェック付き予約を挿入する
	InsertBooking(req domain.ReservationRequest) (*domain.Reservation, error)

	// SendConfirmationEmail は予約確認メールを送信する（fire-and-forget）
	SendConfirmationEmail(booking *domain.Reservation, req domain.ReservationRequest, startTime, endTime string) error

	// SendAdminNotification は管理者通知メールを送信する（fire-and-forget）
	SendAdminNotification(booking *domain.Reservation, req domain.ReservationRequest, startTime, endTime string) error
}
