package usecase

import (
	"fmt"
	"log"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// CheckinUsecase は入退館ユースケースのインターフェース
type CheckinUsecase interface {
	Checkin(req domain.CheckinRequest) (*domain.CheckinResult, error)
	Checkout(req domain.CheckoutRequest) (*domain.CheckoutResult, error)
}

// CheckinUsecaseImpl は入退館ユースケースの実装
type CheckinUsecaseImpl struct {
	repo repository.CheckinRepository
}

// NewCheckinUsecase は CheckinUsecase を生成する
func NewCheckinUsecase(repo repository.CheckinRepository) *CheckinUsecaseImpl {
	return &CheckinUsecaseImpl{repo: repo}
}

// Checkin は入館処理を行う
func (u *CheckinUsecaseImpl) Checkin(req domain.CheckinRequest) (*domain.CheckinResult, error) {
	// 会員情報を取得
	member, err := u.repo.FindMember(req.MemberID)
	if err != nil {
		return nil, fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil, fmt.Errorf("member not found: %s", req.MemberID)
	}

	// 会員ステータスチェック（active/trial のみ入館可）
	if member.Status != "active" && member.Status != "trial" {
		return nil, fmt.Errorf("member status is %q: cannot check in", member.Status)
	}

	// 二重入館チェック（冪等）
	activeID, err := u.repo.FindActiveAttendance(req.MemberID)
	if err != nil {
		return nil, fmt.Errorf("find active attendance: %w", err)
	}
	if activeID != "" {
		return &domain.CheckinResult{
			MemberName: member.LastName + " " + member.FirstName,
			Skipped:    true,
		}, nil
	}

	// 入館記録を作成
	result, err := u.repo.InsertAttendance(req.MemberID, req.StoreID)
	if err != nil {
		return nil, fmt.Errorf("insert attendance: %w", err)
	}
	result.MemberName = member.LastName + " " + member.FirstName

	// LINE通知（非同期・エラー無視）
	go func() {
		if err := u.repo.SendCheckinNotification(req.MemberID, req.StoreID); err != nil {
			log.Printf("[Checkin] LINE notification failed for member %s: %v", req.MemberID, err)
		}
	}()

	return result, nil
}

// Checkout は退館処理を行う
func (u *CheckinUsecaseImpl) Checkout(req domain.CheckoutRequest) (*domain.CheckoutResult, error) {
	// 入館中の記録を取得
	activeID, err := u.repo.FindActiveAttendance(req.MemberID)
	if err != nil {
		return nil, fmt.Errorf("find active attendance: %w", err)
	}

	// 入館記録がなければスキップ（冪等）
	if activeID == "" {
		return &domain.CheckoutResult{Skipped: true}, nil
	}

	// 退館記録を更新
	result, err := u.repo.UpdateCheckout(activeID)
	if err != nil {
		return nil, fmt.Errorf("update checkout: %w", err)
	}

	return result, nil
}

var _ CheckinUsecase = (*CheckinUsecaseImpl)(nil)
