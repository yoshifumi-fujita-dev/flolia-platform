package repository

import "github.com/flolia/flolia-project/backend/domain"

// MemberContractRepository は会員契約処理のリポジトリインターフェース
type MemberContractRepository interface {
	// FindMemberForContract は会員IDで契約処理に必要な会員情報を取得する
	FindMemberForContract(memberID string) (*domain.MemberContract, error)

	// PauseMember は会員をpaused状態に更新する
	PauseMember(req domain.PauseRequest) error

	// PauseMemberPlan はmember_plansをpaused状態に更新する
	PauseMemberPlan(memberID, subscriptionID string) error

	// PauseStripeSubscription はStripeサブスクリプションを一時停止する（月額会員のみ）
	PauseStripeSubscription(subscriptionID string) error

	// ResumeMember は会員をactive状態に戻す
	ResumeMember(memberID string) error

	// ResumeMemberPlan はmember_plansをactive状態に戻す
	ResumeMemberPlan(memberID string) error

	// ResumeStripeSubscription はStripeサブスクリプションの一時停止を解除する（月額会員のみ）
	ResumeStripeSubscription(subscriptionID string) error

	// CancelMember は会員をcanceled状態に更新する
	CancelMember(req domain.CancelRequest) error

	// CancelMemberPlan はmember_plansをcanceled状態に更新する
	CancelMemberPlan(memberID, reason string) error

	// CancelStripeSubscription はStripeサブスクリプションをキャンセルする（月額会員のみ）
	CancelStripeSubscription(subscriptionID string) error
}
