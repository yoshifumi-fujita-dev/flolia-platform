package usecase

import (
	"fmt"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// MemberContractUsecase は会員契約ユースケースのインターフェース
type MemberContractUsecase interface {
	Pause(req domain.PauseRequest) (*domain.ContractResult, error)
	Resume(req domain.ResumeRequest) (*domain.ContractResult, error)
	Cancel(req domain.CancelRequest) (*domain.ContractResult, error)
}

// MemberContractUsecaseImpl は会員契約ユースケースの実装
type MemberContractUsecaseImpl struct {
	repo repository.MemberContractRepository
}

// NewMemberContractUsecase は MemberContractUsecase を生成する
func NewMemberContractUsecase(repo repository.MemberContractRepository) *MemberContractUsecaseImpl {
	return &MemberContractUsecaseImpl{repo: repo}
}

// Pause は会員を休会状態にする
func (u *MemberContractUsecaseImpl) Pause(req domain.PauseRequest) (*domain.ContractResult, error) {
	member, err := u.repo.FindMemberForContract(req.MemberID)
	if err != nil {
		return nil, fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil, fmt.Errorf("member not found: %s", req.MemberID)
	}

	switch member.Status {
	case "paused":
		return nil, fmt.Errorf("already paused")
	case "canceled":
		return nil, fmt.Errorf("already canceled")
	case "active", "trial":
		// 続行
	default:
		return nil, fmt.Errorf("invalid status for pause: %s", member.Status)
	}

	// Stripe一時停止（月額会員のみ）
	if member.StripeSubscriptionID != "" && member.MembershipType == "monthly" {
		if err := u.repo.PauseStripeSubscription(member.StripeSubscriptionID); err != nil {
			return nil, fmt.Errorf("pause stripe subscription: %w", err)
		}
	}

	// DB更新
	if err := u.repo.PauseMember(req); err != nil {
		return nil, fmt.Errorf("pause member: %w", err)
	}
	if member.StripeSubscriptionID != "" {
		if err := u.repo.PauseMemberPlan(req.MemberID, member.StripeSubscriptionID); err != nil {
			return nil, fmt.Errorf("pause member plan: %w", err)
		}
	}

	return &domain.ContractResult{
		MemberID:   member.ID,
		Status:     "paused",
		MemberName: member.LastName + " " + member.FirstName,
	}, nil
}

// Resume は会員を復会させる
func (u *MemberContractUsecaseImpl) Resume(req domain.ResumeRequest) (*domain.ContractResult, error) {
	member, err := u.repo.FindMemberForContract(req.MemberID)
	if err != nil {
		return nil, fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil, fmt.Errorf("member not found: %s", req.MemberID)
	}

	if member.Status != "paused" {
		return nil, fmt.Errorf("not paused: current status is %s", member.Status)
	}

	// Stripe再開（月額会員のみ）
	if member.StripeSubscriptionID != "" && member.MembershipType == "monthly" {
		if err := u.repo.ResumeStripeSubscription(member.StripeSubscriptionID); err != nil {
			return nil, fmt.Errorf("resume stripe subscription: %w", err)
		}
	}

	// DB更新
	if err := u.repo.ResumeMember(req.MemberID); err != nil {
		return nil, fmt.Errorf("resume member: %w", err)
	}
	if err := u.repo.ResumeMemberPlan(req.MemberID); err != nil {
		return nil, fmt.Errorf("resume member plan: %w", err)
	}

	return &domain.ContractResult{
		MemberID:   member.ID,
		Status:     "active",
		MemberName: member.LastName + " " + member.FirstName,
	}, nil
}

// Cancel は会員を退会させる
func (u *MemberContractUsecaseImpl) Cancel(req domain.CancelRequest) (*domain.ContractResult, error) {
	member, err := u.repo.FindMemberForContract(req.MemberID)
	if err != nil {
		return nil, fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil, fmt.Errorf("member not found: %s", req.MemberID)
	}

	if member.Status == "canceled" {
		return nil, fmt.Errorf("already canceled")
	}

	// Stripeキャンセル（月額会員のみ）
	if member.StripeSubscriptionID != "" && member.MembershipType == "monthly" {
		if err := u.repo.CancelStripeSubscription(member.StripeSubscriptionID); err != nil {
			return nil, fmt.Errorf("cancel stripe subscription: %w", err)
		}
	}

	// DB更新
	if err := u.repo.CancelMember(req); err != nil {
		return nil, fmt.Errorf("cancel member: %w", err)
	}
	if err := u.repo.CancelMemberPlan(req.MemberID, req.Reason); err != nil {
		return nil, fmt.Errorf("cancel member plan: %w", err)
	}

	return &domain.ContractResult{
		MemberID:   member.ID,
		Status:     "canceled",
		MemberName: member.LastName + " " + member.FirstName,
	}, nil
}

var _ MemberContractUsecase = (*MemberContractUsecaseImpl)(nil)
