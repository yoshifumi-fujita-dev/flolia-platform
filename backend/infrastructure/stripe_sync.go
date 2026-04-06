package infrastructure

import (
	"fmt"
	"os"
	"time"

	"github.com/flolia/flolia-project/backend/repository"
	stripe "github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/invoice"
	"github.com/stripe/stripe-go/v82/paymentintent"
)

type StripeSyncRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewStripeSyncRepository(supabase *SupabaseClient) *StripeSyncRepositoryImpl {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	return &StripeSyncRepositoryImpl{supabase: supabase}
}

func (r *StripeSyncRepositoryImpl) FetchRecentStripePayments(since int64) ([]repository.StripePaymentIntent, error) {
	params := &stripe.PaymentIntentListParams{}
	params.Created = stripe.Int64(since)
	params.Limit = stripe.Int64(100)

	iter := paymentintent.List(params)
	var results []repository.StripePaymentIntent
	for iter.Next() {
		pi := iter.PaymentIntent()
		meta := make(map[string]string)
		for k, v := range pi.Metadata {
			meta[k] = v
		}
		types := make([]string, 0, len(pi.PaymentMethodTypes))
		for _, t := range pi.PaymentMethodTypes {
			types = append(types, string(t))
		}
		chargeID := ""
		if pi.LatestCharge != nil {
			chargeID = pi.LatestCharge.ID
		}
		customerID := ""
		if pi.Customer != nil {
			customerID = pi.Customer.ID
		}
		results = append(results, repository.StripePaymentIntent{
			ID:                 pi.ID,
			Amount:             pi.Amount,
			Status:             string(pi.Status),
			CustomerID:         customerID,
			PaymentMethodTypes: types,
			Description:        pi.Description,
			Created:            pi.Created,
			Metadata:           meta,
			LatestChargeID:     chargeID,
		})
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("list payment intents: %w", err)
	}
	return results, nil
}

func (r *StripeSyncRepositoryImpl) FetchRecentStripeInvoices(since int64) ([]repository.StripeInvoice, error) {
	params := &stripe.InvoiceListParams{
		Status: stripe.String(string(stripe.InvoiceStatusPaid)),
	}
	params.Created = stripe.Int64(since)
	params.Limit = stripe.Int64(100)

	iter := invoice.List(params)
	var results []repository.StripeInvoice
	for iter.Next() {
		inv := iter.Invoice()
		// v82ではPaymentIntentフィールドはInvoicePaymentsから取得
		piID := extractInvoicePaymentIntentID(inv)
		customerID := ""
		if inv.Customer != nil {
			customerID = inv.Customer.ID
		}
		results = append(results, repository.StripeInvoice{
			ID:              inv.ID,
			AmountPaid:      inv.AmountPaid,
			Status:          string(inv.Status),
			CustomerID:      customerID,
			PaymentIntentID: piID,
			Description:     inv.Description,
			Created:         inv.Created,
		})
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("list invoices: %w", err)
	}
	return results, nil
}

func (r *StripeSyncRepositoryImpl) FindPaymentByIntentID(intentID string) (string, string, error) {
	var rows []struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_payment_intent_id": "eq." + intentID,
			"select":                   "id,status",
			"limit":                    "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/payments")
	if err != nil {
		return "", "", err
	}
	if resp.IsError() {
		return "", "", fmt.Errorf("find payment by intent: %s", resp.String())
	}
	if len(rows) == 0 {
		return "", "", nil
	}
	return rows[0].ID, rows[0].Status, nil
}

func (r *StripeSyncRepositoryImpl) FindPaymentByInvoiceID(invoiceID string) (string, error) {
	var rows []struct {
		ID string `json:"id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_invoice_id": "eq." + invoiceID,
			"select":            "id",
			"limit":             "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/payments")
	if err != nil {
		return "", err
	}
	if resp.IsError() {
		return "", fmt.Errorf("find payment by invoice: %s", resp.String())
	}
	if len(rows) == 0 {
		return "", nil
	}
	return rows[0].ID, nil
}

func (r *StripeSyncRepositoryImpl) UpdatePaymentStatus(id string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("id", "eq."+id).
		SetBody(map[string]interface{}{"status": "completed"}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/payments")
	if err != nil {
		return fmt.Errorf("update payment status: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update payment status: %s", resp.String())
	}
	return nil
}

func (r *StripeSyncRepositoryImpl) CreatePaymentFromIntent(p repository.StripePaymentIntent, memberID string) error {
	paymentType := determinePaymentType(p.Metadata)
	pmType := "card"
	if len(p.PaymentMethodTypes) > 0 {
		pmType = p.PaymentMethodTypes[0]
	}
	desc := p.Description
	if desc == "" {
		desc = "Stripe決済"
	}
	body := map[string]interface{}{
		"stripe_payment_intent_id": p.ID,
		"member_id":                nullableString(memberID),
		"amount":                   p.Amount,
		"status":                   "completed",
		"payment_type":             paymentType,
		"payment_method":           pmType,
		"payment_date":             epochToDate(p.Created),
		"description":              desc,
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/payments")
	if err != nil {
		return fmt.Errorf("create payment from intent: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("create payment from intent: %s", resp.String())
	}
	return nil
}

func (r *StripeSyncRepositoryImpl) CreatePaymentFromInvoice(inv repository.StripeInvoice, memberID string) error {
	desc := inv.Description
	if desc == "" {
		desc = "月会費"
	}
	body := map[string]interface{}{
		"stripe_invoice_id":        inv.ID,
		"stripe_payment_intent_id": nullableString(inv.PaymentIntentID),
		"member_id":                nullableString(memberID),
		"amount":                   inv.AmountPaid,
		"status":                   "completed",
		"payment_type":             "monthly_fee",
		"payment_method":           "card",
		"payment_date":             epochToDate(inv.Created),
		"description":              desc,
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/payments")
	if err != nil {
		return fmt.Errorf("create payment from invoice: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("create payment from invoice: %s", resp.String())
	}
	return nil
}

func (r *StripeSyncRepositoryImpl) FindMemberByStripeCustomer(customerID string) (string, error) {
	if customerID == "" {
		return "", nil
	}
	var rows []struct {
		ID string `json:"id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"stripe_customer_id": "eq." + customerID,
			"select":             "id",
			"limit":              "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil {
		return "", err
	}
	if resp.IsError() {
		return "", fmt.Errorf("find member by stripe customer: %s", resp.String())
	}
	if len(rows) == 0 {
		return "", nil
	}
	return rows[0].ID, nil
}

func determinePaymentType(metadata map[string]string) string {
	if metadata == nil {
		return "other"
	}
	if pt, ok := metadata["payment_type"]; ok && pt != "" {
		return pt
	}
	if t, ok := metadata["type"]; ok {
		if t == "trial" {
			return "trial_fee"
		}
		if t == "subscription" {
			return "monthly_fee"
		}
	}
	if _, ok := metadata["subscription_id"]; ok {
		return "monthly_fee"
	}
	return "other"
}

func epochToDate(epoch int64) string {
	return time.Unix(epoch, 0).UTC().Format("2006-01-02")
}

// extractInvoicePaymentIntentID はInvoiceのPaymentsリストからPaymentIntent IDを取得する
func extractInvoicePaymentIntentID(inv *stripe.Invoice) string {
	if inv.Payments == nil {
		return ""
	}
	for _, p := range inv.Payments.Data {
		if p.Payment != nil && p.Payment.PaymentIntent != nil {
			return p.Payment.PaymentIntent.ID
		}
	}
	return ""
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

var _ repository.StripeSyncRepository = (*StripeSyncRepositoryImpl)(nil)
