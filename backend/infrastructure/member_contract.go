package infrastructure

import (
	"fmt"
	"os"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
	stripe "github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/subscription"
)

// MemberContractRepositoryImpl は会員契約リポジトリの実装
type MemberContractRepositoryImpl struct {
	supabase *SupabaseClient
}

// NewMemberContractRepository は MemberContractRepository を生成する
func NewMemberContractRepository(supabase *SupabaseClient) *MemberContractRepositoryImpl {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	return &MemberContractRepositoryImpl{supabase: supabase}
}

// FindMemberForContract は会員IDで契約処理に必要な会員情報を取得する
func (r *MemberContractRepositoryImpl) FindMemberForContract(memberID string) (*domain.MemberContract, error) {
	var rows []struct {
		ID                   string `json:"id"`
		FirstName            string `json:"first_name"`
		LastName             string `json:"last_name"`
		Status               string `json:"status"`
		MembershipType       string `json:"membership_type"`
		StripeSubscriptionID string `json:"stripe_subscription_id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"id":     "eq." + memberID,
			"select": "id,first_name,last_name,status,membership_type,stripe_subscription_id",
			"limit":  "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil {
		return nil, fmt.Errorf("find member for contract: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find member for contract: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	row := rows[0]
	return &domain.MemberContract{
		ID:                   row.ID,
		FirstName:            row.FirstName,
		LastName:             row.LastName,
		Status:               row.Status,
		MembershipType:       row.MembershipType,
		StripeSubscriptionID: row.StripeSubscriptionID,
	}, nil
}

// PauseMember は会員をpaused状態に更新する
func (r *MemberContractRepositoryImpl) PauseMember(req domain.PauseRequest) error {
	body := map[string]interface{}{
		"status":     "paused",
		"paused_at":  time.Now().UTC().Format(time.RFC3339),
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	}
	if req.PausedUntil != "" {
		body["paused_until"] = req.PausedUntil
	}
	if req.Reason != "" {
		body["pause_reason"] = req.Reason
	}
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+req.MemberID).
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("pause member: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("pause member: %s", resp.String())
	}
	return nil
}

// PauseMemberPlan はmember_plansをpaused状態に更新する
func (r *MemberContractRepositoryImpl) PauseMemberPlan(memberID, subscriptionID string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"member_id": "eq." + memberID,
			"status":    "eq.active",
		}).
		SetBody(map[string]interface{}{
			"status":     "paused",
			"updated_at": time.Now().UTC().Format(time.RFC3339),
		}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/member_plans")
	if err != nil {
		return fmt.Errorf("pause member plan: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("pause member plan: %s", resp.String())
	}
	return nil
}

// PauseStripeSubscription はStripeサブスクリプションを一時停止する
func (r *MemberContractRepositoryImpl) PauseStripeSubscription(subscriptionID string) error {
	behavior := string(stripe.SubscriptionPauseCollectionBehaviorVoid)
	_, err := subscription.Update(subscriptionID, &stripe.SubscriptionParams{
		PauseCollection: &stripe.SubscriptionPauseCollectionParams{
			Behavior: &behavior,
		},
	})
	if err != nil {
		return fmt.Errorf("pause stripe subscription: %w", err)
	}
	return nil
}

// ResumeMember は会員をactive状態に戻す
func (r *MemberContractRepositoryImpl) ResumeMember(memberID string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+memberID).
		SetBody(map[string]interface{}{
			"status":      "active",
			"paused_at":   nil,
			"paused_until": nil,
			"pause_reason": nil,
			"updated_at":  time.Now().UTC().Format(time.RFC3339),
		}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("resume member: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("resume member: %s", resp.String())
	}
	return nil
}

// ResumeMemberPlan はmember_plansをactive状態に戻す
func (r *MemberContractRepositoryImpl) ResumeMemberPlan(memberID string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"member_id": "eq." + memberID,
			"status":    "eq.paused",
		}).
		SetBody(map[string]interface{}{
			"status":     "active",
			"updated_at": time.Now().UTC().Format(time.RFC3339),
		}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/member_plans")
	if err != nil {
		return fmt.Errorf("resume member plan: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("resume member plan: %s", resp.String())
	}
	return nil
}

// ResumeStripeSubscription はStripeサブスクリプションの一時停止を解除する
func (r *MemberContractRepositoryImpl) ResumeStripeSubscription(subscriptionID string) error {
	_, err := subscription.Update(subscriptionID, &stripe.SubscriptionParams{
		PauseCollection: &stripe.SubscriptionPauseCollectionParams{},
	})
	if err != nil {
		return fmt.Errorf("resume stripe subscription: %w", err)
	}
	return nil
}

// CancelMember は会員をcanceled状態に更新する
func (r *MemberContractRepositoryImpl) CancelMember(req domain.CancelRequest) error {
	body := map[string]interface{}{
		"status":      "canceled",
		"canceled_at": time.Now().UTC().Format(time.RFC3339),
		"updated_at":  time.Now().UTC().Format(time.RFC3339),
	}
	if req.Reason != "" {
		body["cancel_reason"] = req.Reason
	}
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+req.MemberID).
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("cancel member: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("cancel member: %s", resp.String())
	}
	return nil
}

// CancelMemberPlan はmember_plansをcanceled状態に更新する
func (r *MemberContractRepositoryImpl) CancelMemberPlan(memberID, reason string) error {
	body := map[string]interface{}{
		"status":     "canceled",
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	}
	if reason != "" {
		body["cancel_reason"] = reason
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"member_id": "eq." + memberID,
			"status":    "neq.canceled",
		}).
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/member_plans")
	if err != nil {
		return fmt.Errorf("cancel member plan: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("cancel member plan: %s", resp.String())
	}
	return nil
}

// CancelStripeSubscription はStripeサブスクリプションをキャンセルする
func (r *MemberContractRepositoryImpl) CancelStripeSubscription(subscriptionID string) error {
	_, err := subscription.Cancel(subscriptionID, nil)
	if err != nil {
		return fmt.Errorf("cancel stripe subscription: %w", err)
	}
	return nil
}

var _ repository.MemberContractRepository = (*MemberContractRepositoryImpl)(nil)
