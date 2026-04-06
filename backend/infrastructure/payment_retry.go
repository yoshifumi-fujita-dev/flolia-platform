package infrastructure

import (
	"fmt"
	"os"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
	stripe "github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/invoice"
)

type PaymentRetryRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewPaymentRetryRepository(supabase *SupabaseClient) *PaymentRetryRepositoryImpl {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	return &PaymentRetryRepositoryImpl{supabase: supabase}
}

type paymentRetryRow struct {
	ID                   string          `json:"id"`
	MemberID             string          `json:"member_id"`
	StripeInvoiceID      string          `json:"stripe_invoice_id"`
	StripeSubscriptionID string          `json:"stripe_subscription_id"`
	Amount               int             `json:"amount"`
	RetryCount           int             `json:"retry_count"`
	MaxRetries           int             `json:"max_retries"`
	Members              retryMemberRow  `json:"members"`
}

type retryMemberRow struct {
	ID         string `json:"id"`
	LastName   string `json:"last_name"`
	FirstName  string `json:"first_name"`
	Email      string `json:"email"`
	LineUserID string `json:"line_user_id"`
}

func (r *PaymentRetryRepositoryImpl) FetchPendingRetries() ([]*domain.PaymentRetry, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	var rows []paymentRetryRow
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"status":        "eq.pending",
			"next_retry_at": "lte." + now,
			"order":         "next_retry_at.asc",
			"limit":         "50",
			"select":        "id,member_id,stripe_invoice_id,stripe_subscription_id,amount,retry_count,max_retries,members(id,last_name,first_name,email,line_user_id)",
		}).
		SetResult(&rows).
		Get("/rest/v1/payment_retries")
	if err != nil {
		return nil, fmt.Errorf("fetch payment retries: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("fetch payment retries: %s", resp.String())
	}
	retries := make([]*domain.PaymentRetry, 0, len(rows))
	for _, row := range rows {
		retries = append(retries, &domain.PaymentRetry{
			ID:                   row.ID,
			MemberID:             row.MemberID,
			StripeInvoiceID:      row.StripeInvoiceID,
			StripeSubscriptionID: row.StripeSubscriptionID,
			Amount:               row.Amount,
			RetryCount:           row.RetryCount,
			MaxRetries:           row.MaxRetries,
			MemberName:           row.Members.LastName + " " + row.Members.FirstName,
			MemberEmail:          row.Members.Email,
			MemberLineUserID:     row.Members.LineUserID,
		})
	}
	return retries, nil
}

func (r *PaymentRetryRepositoryImpl) RetryInvoicePayment(stripeInvoiceID string) error {
	_, err := invoice.Pay(stripeInvoiceID, nil)
	if err != nil {
		return fmt.Errorf("stripe invoice pay: %w", err)
	}
	return nil
}

func (r *PaymentRetryRepositoryImpl) MarkRetrySucceeded(retryID string, retryCount int) error {
	now := time.Now().UTC().Format(time.RFC3339)
	return r.updateRetry(retryID, map[string]interface{}{
		"status":        "success",
		"retry_count":   retryCount,
		"last_retry_at": now,
		"updated_at":    now,
	})
}

func (r *PaymentRetryRepositoryImpl) MarkRetryFailed(retryID string, retryCount int, errMsg string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	return r.updateRetry(retryID, map[string]interface{}{
		"status":        "failed",
		"retry_count":   retryCount,
		"last_retry_at": now,
		"error_message": errMsg,
		"updated_at":    now,
	})
}

func (r *PaymentRetryRepositoryImpl) ScheduleNextRetry(retryID string, retryCount int, nextRetryAt string, errMsg string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	return r.updateRetry(retryID, map[string]interface{}{
		"retry_count":   retryCount,
		"last_retry_at": now,
		"next_retry_at": nextRetryAt,
		"error_message": errMsg,
		"updated_at":    now,
	})
}

func (r *PaymentRetryRepositoryImpl) updateRetry(retryID string, body map[string]interface{}) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+retryID).
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/payment_retries")
	if err != nil {
		return fmt.Errorf("update payment retry: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update payment retry: %s", resp.String())
	}
	return nil
}

func (r *PaymentRetryRepositoryImpl) UpdateMemberStatus(memberID string, status string) error {
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

func (r *PaymentRetryRepositoryImpl) SendPaymentFailedLine(lineUserID string, memberName string, isFinal bool) error {
	var bodyText string
	if isFinal {
		bodyText = "月額会費の決済ができませんでした。お手数ですが、お支払い方法をご確認ください。"
	} else {
		bodyText = "月額会費の決済が失敗しました。後日再試行いたします。"
	}
	messages := []map[string]interface{}{
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
						map[string]interface{}{"type": "text", "text": bodyText, "size": "sm", "color": "#666666", "wrap": true, "margin": "lg"},
					},
					"paddingAll": "lg",
				},
			},
		},
	}
	return sendLineMessage(lineUserID, messages)
}

var _ repository.PaymentRetryRepository = (*PaymentRetryRepositoryImpl)(nil)
