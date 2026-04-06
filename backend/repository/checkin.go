package repository

import "github.com/flolia/flolia-project/backend/domain"

// CheckinRepository は入退館処理のリポジトリインターフェース
type CheckinRepository interface {
	// FindMember は会員IDで会員情報を取得する
	FindMember(memberID string) (*domain.MemberForCheckin, error)

	// FindActiveAttendance は現在入館中のattendance_log IDを返す。未入館時は空文字列。
	FindActiveAttendance(memberID string) (string, error)

	// InsertAttendance は入館記録を作成し結果を返す
	InsertAttendance(memberID, storeID string) (*domain.CheckinResult, error)

	// UpdateCheckout は入館記録に退館時刻と滞在時間を記録する
	UpdateCheckout(attendanceID string) (*domain.CheckoutResult, error)

	// SendCheckinNotification はLINE入館通知を送信する（fire-and-forget）
	SendCheckinNotification(memberID, storeID string) error
}

// インターフェース実装確認（コンパイル時チェック用）
// var _ CheckinRepository = (*infrastructure.CheckinRepositoryImpl)(nil)
