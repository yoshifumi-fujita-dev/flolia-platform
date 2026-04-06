package infrastructure

import (
	"fmt"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type StripeWebhookRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewStripeWebhookRepository(supabase *SupabaseClient) *StripeWebhookRepositoryImpl {
	return &StripeWebhookRepositoryImpl{supabase: supabase}
}

func (r *StripeWebhookRepositoryImpl) InsertPayment(p domain.PaymentRecord) error {
	body := map[string]interface{}{
		"member_id":      p.MemberID,
		"payment_type":   p.PaymentType,
		"amount":         p.Amount,
		"payment_date":   p.PaymentDate,
		"payment_method": p.PaymentMethod,
		"status":         p.Status,
		"description":    p.Description,
	}
	if p.StripePaymentIntentID != "" {
		body["stripe_payment_intent_id"] = p.StripePaymentIntentID
	}
	if p.StripeInvoiceID != "" {
		body["stripe_invoice_id"] = p.StripeInvoiceID
	}
	if p.StripeChargeID != "" {
		body["stripe_charge_id"] = p.StripeChargeID
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/payments")
	if err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("insert payment: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) UpdateMemberStatus(memberID string, status string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+memberID).
		SetBody(map[string]interface{}{"status": status}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("update member status: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update member status: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) UpdateMemberSubscription(memberID string, subscriptionID string, status string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+memberID).
		SetBody(map[string]interface{}{
			"stripe_subscription_id": subscriptionID,
			"status":                 status,
			"membership_type":        "monthly",
		}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("update member subscription: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update member subscription: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) FindMemberBySubscriptionID(subscriptionID string) (*domain.MemberForWebhook, error) {
	var rows []struct {
		ID         string `json:"id"`
		LastName   string `json:"last_name"`
		FirstName  string `json:"first_name"`
		Email      string `json:"email"`
		LineUserID string `json:"line_user_id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_subscription_id": "eq." + subscriptionID,
			"select":                 "id,last_name,first_name,email,line_user_id",
			"limit":                  "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil {
		return nil, fmt.Errorf("find member by subscription: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find member by subscription: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &domain.MemberForWebhook{
		ID:         rows[0].ID,
		LastName:   rows[0].LastName,
		FirstName:  rows[0].FirstName,
		Email:      rows[0].Email,
		LineUserID: rows[0].LineUserID,
	}, nil
}

func (r *StripeWebhookRepositoryImpl) CancelMemberSubscription(memberID string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+memberID).
		SetBody(map[string]interface{}{
			"status":                 "canceled",
			"stripe_subscription_id": nil,
		}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("cancel member subscription: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("cancel member subscription: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) FindPendingRetryByInvoiceID(invoiceID string) (string, error) {
	var rows []struct {
		ID string `json:"id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_invoice_id": "eq." + invoiceID,
			"status":            "eq.pending",
			"select":            "id",
			"limit":             "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/payment_retries")
	if err != nil {
		return "", fmt.Errorf("find pending retry: %w", err)
	}
	if resp.IsError() {
		return "", fmt.Errorf("find pending retry: %s", resp.String())
	}
	if len(rows) == 0 {
		return "", nil
	}
	return rows[0].ID, nil
}

func (r *StripeWebhookRepositoryImpl) InsertPaymentRetry(memberID, invoiceID, subscriptionID string, amount int64, nextRetryAt string, errMsg string) error {
	resp, err := r.supabase.Client().R().
		SetBody(map[string]interface{}{
			"member_id":              memberID,
			"stripe_invoice_id":      invoiceID,
			"stripe_subscription_id": subscriptionID,
			"amount":                 amount,
			"retry_count":            0,
			"max_retries":            3,
			"next_retry_at":          nextRetryAt,
			"status":                 "pending",
			"error_message":          errMsg,
		}).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/payment_retries")
	if err != nil {
		return fmt.Errorf("insert payment retry: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("insert payment retry: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) FindRefundByStripeID(stripeRefundID string) (*domain.ExistingRefund, error) {
	var rows []struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_refund_id": "eq." + stripeRefundID,
			"select":           "id,status",
			"limit":            "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/refunds")
	if err != nil {
		return nil, fmt.Errorf("find refund by stripe id: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find refund by stripe id: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &domain.ExistingRefund{ID: rows[0].ID, Status: rows[0].Status}, nil
}

func (r *StripeWebhookRepositoryImpl) FindRefundByPaymentID(paymentID string) (string, error) {
	var rows []struct {
		ID string `json:"id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"payment_id": "eq." + paymentID,
			"select":     "id",
			"limit":      "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/refunds")
	if err != nil {
		return "", fmt.Errorf("find refund by payment id: %w", err)
	}
	if resp.IsError() {
		return "", fmt.Errorf("find refund by payment id: %s", resp.String())
	}
	if len(rows) == 0 {
		return "", nil
	}
	return rows[0].ID, nil
}

func (r *StripeWebhookRepositoryImpl) UpdateRefundStatus(refundID string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+refundID).
		SetBody(map[string]interface{}{"status": "processed", "processed_at": now}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/refunds")
	if err != nil {
		return fmt.Errorf("update refund status: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update refund status: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) InsertRefund(ref domain.RefundRecord) error {
	resp, err := r.supabase.Client().R().
		SetBody(map[string]interface{}{
			"payment_id":                ref.PaymentID,
			"member_id":                 nullableString(ref.MemberID),
			"store_id":                  nullableString(ref.StoreID),
			"requested_amount":          ref.RequestedAmount,
			"refund_amount":             ref.RefundAmount,
			"fee_amount":                ref.FeeAmount,
			"fee_bearer":                ref.FeeBearer,
			"reason_type":               ref.ReasonType,
			"status":                    ref.Status,
			"processed_at":              ref.ProcessedAt,
			"stripe_refund_id":          ref.StripeRefundID,
			"stripe_payment_intent_id":  nullableString(ref.StripePaymentIntentID),
			"stripe_charge_id":          ref.StripeChargeID,
		}).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/refunds")
	if err != nil {
		return fmt.Errorf("insert refund: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("insert refund: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) FindPaymentByChargeID(chargeID string) (*domain.ExistingPayment, error) {
	var rows []struct {
		ID       string `json:"id"`
		MemberID string `json:"member_id"`
		StoreID  string `json:"store_id"`
		Amount   int64  `json:"amount"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_charge_id": "eq." + chargeID,
			"select":           "id,member_id,store_id,amount",
			"limit":            "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/payments")
	if err != nil {
		return nil, fmt.Errorf("find payment by charge id: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find payment by charge id: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &domain.ExistingPayment{
		ID:       rows[0].ID,
		MemberID: rows[0].MemberID,
		StoreID:  rows[0].StoreID,
		Amount:   rows[0].Amount,
	}, nil
}

func (r *StripeWebhookRepositoryImpl) UpdatePaymentRefundStatus(paymentID string, status string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+paymentID).
		SetBody(map[string]interface{}{"status": status}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/payments")
	if err != nil {
		return fmt.Errorf("update payment refund status: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update payment refund status: %s", resp.String())
	}
	return nil
}

func (r *StripeWebhookRepositoryImpl) SendPaymentFailedLine(lineUserID string, memberName string) error {
	return sendLineMessage(lineUserID, []map[string]interface{}{
		{
			"type":    "flex",
			"altText": "決済に関するお知らせ",
			"contents": map[string]interface{}{
				"type": "bubble",
				"header": map[string]interface{}{
					"type": "box", "layout": "vertical",
					"contents":        []interface{}{map[string]interface{}{"type": "text", "text": "⚠️ 決済に関するお知らせ", "weight": "bold", "size": "md"}},
					"backgroundColor": "#fef2f2",
					"paddingAll":       "lg",
				},
				"body": map[string]interface{}{
					"type": "box", "layout": "vertical",
					"contents": []interface{}{
						map[string]interface{}{"type": "text", "text": memberName + "様", "weight": "bold", "size": "md"},
						map[string]interface{}{"type": "text", "text": "月額会費の決済ができませんでした。お手数ですが、お支払い方法をご確認ください。", "size": "sm", "color": "#666666", "wrap": true, "margin": "lg"},
					},
					"paddingAll": "lg",
				},
			},
		},
	})
}

var _ repository.StripeWebhookRepository = (*StripeWebhookRepositoryImpl)(nil)
