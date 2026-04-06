package usecase

import (
	"fmt"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// ReservationUsecase は予約ユースケースのインターフェース
type ReservationUsecase interface {
	Create(req domain.ReservationRequest) (*domain.Reservation, error)
}

// ReservationUsecaseImpl は予約ユースケースの実装
type ReservationUsecaseImpl struct {
	repo repository.ReservationRepository
}

// NewReservationUsecase は ReservationUsecase を生成する
func NewReservationUsecase(repo repository.ReservationRepository) *ReservationUsecaseImpl {
	return &ReservationUsecaseImpl{repo: repo}
}

// Create は定員チェック付きで予約を作成する
func (u *ReservationUsecaseImpl) Create(req domain.ReservationRequest) (*domain.Reservation, error) {
	// バリデーション
	if req.Name == "" || req.Email == "" || req.Phone == "" {
		return nil, fmt.Errorf("name, email, phone are required")
	}
	if req.BookingType != "trial" && req.BookingType != "tour" {
		return nil, fmt.Errorf("invalid booking_type: %s", req.BookingType)
	}
	if req.BookingDate == "" {
		return nil, fmt.Errorf("booking_date is required")
	}
	if req.TimeSlotID == "" {
		return nil, fmt.Errorf("time_slot_id is required")
	}

	// 時間枠情報を取得（レスポンス組み立て用）
	slot, err := u.repo.FindTimeSlot(req.TimeSlotID)
	if err != nil {
		return nil, fmt.Errorf("find time slot: %w", err)
	}
	if slot == nil {
		return nil, fmt.Errorf("time slot not found: %s", req.TimeSlotID)
	}
	if !slot.IsActive {
		return nil, fmt.Errorf("time slot inactive")
	}
	if slot.SlotType != "both" && slot.SlotType != req.BookingType {
		return nil, fmt.Errorf("booking type not allowed for this slot")
	}

	// RPC経由で定員チェック + 予約挿入（アトミック）
	booking, err := u.repo.InsertBooking(req)
	if err != nil {
		return nil, err // RPCエラーはそのまま返す（capacity_exceeded等を含む）
	}

	booking.StartTime = slot.StartTime
	booking.EndTime = slot.EndTime

	// メール通知（fire-and-forget）
	go func() {
		if err := u.repo.SendConfirmationEmail(booking, req, slot.StartTime, slot.EndTime); err != nil {
			// エラーログのみ、予約成功には影響しない
			_ = err
		}
	}()
	go func() {
		if err := u.repo.SendAdminNotification(booking, req, slot.StartTime, slot.EndTime); err != nil {
			_ = err
		}
	}()

	return booking, nil
}

var _ ReservationUsecase = (*ReservationUsecaseImpl)(nil)
