package infrastructure

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	stripe "github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/paymentintent"
	"github.com/stripe/stripe-go/v82/paymentmethod"
)

// SettlementRepositoryImpl は決済処理の実装
type SettlementRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewSettlementRepository(supabase *SupabaseClient) *SettlementRepositoryImpl {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	return &SettlementRepositoryImpl{supabase: supabase}
}

// supabase REST API のレスポンス型
type productPurchaseRow struct {
	ID           string     `json:"id"`
	MemberID     string     `json:"member_id"`
	StoreID      string     `json:"store_id"`
	ProductName  string     `json:"product_name"`
	ProductPrice int        `json:"product_price"`
	Quantity     int        `json:"quantity"`
	TotalAmount  int        `json:"total_amount"`
	PurchasedAt  time.Time  `json:"purchased_at"`
	Members      memberRow  `json:"members"`
	Stores       storeRow   `json:"stores"`
}

type memberRow struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Email            string `json:"email"`
	StripeCustomerID string `json:"stripe_customer_id"`
}

type storeRow struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// FetchUnsettledPurchases は未決済の購入を取得する
func (r *SettlementRepositoryImpl) FetchUnsettledPurchases(settlementMonth string) ([]*domain.ProductPurchase, error) {
	var rows []productPurchaseRow
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"status":           "eq.unsettled",
			"settlement_month": "eq." + settlementMonth,
			"order":            "member_id.asc,purchased_at.asc",
			"select":           "id,member_id,store_id,product_name,product_price,quantity,total_amount,purchased_at,members(id,name,email,stripe_customer_id),stores(id,name)",
		}).
		SetResult(&rows).
		Get("/rest/v1/product_purchases")
	if err != nil {
		return nil, fmt.Errorf("fetch unsettled purchases: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("fetch unsettled purchases: %s", resp.String())
	}

	purchases := make([]*domain.ProductPurchase, 0, len(rows))
	for _, row := range rows {
		p := &domain.ProductPurchase{
			ID:           row.ID,
			MemberID:     row.MemberID,
			StoreID:      row.StoreID,
			ProductName:  row.ProductName,
			ProductPrice: row.ProductPrice,
			Quantity:     row.Quantity,
			TotalAmount:  row.TotalAmount,
			PurchasedAt:  row.PurchasedAt,
			Member: &domain.Member{
				ID:               row.Members.ID,
				Name:             row.Members.Name,
				Email:            row.Members.Email,
				StripeCustomerID: row.Members.StripeCustomerID,
			},
			Store: &domain.Store{
				ID:   row.Stores.ID,
				Name: row.Stores.Name,
			},
		}
		purchases = append(purchases, p)
	}
	return purchases, nil
}

// GetPaymentMethods はStripe顧客のカード一覧を取得する
func (r *SettlementRepositoryImpl) GetPaymentMethods(stripeCustomerID string) ([]domain.PaymentMethod, error) {
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(stripeCustomerID),
		Type:     stripe.String("card"),
	}
	iter := paymentmethod.List(params)

	var methods []domain.PaymentMethod
	for iter.Next() {
		pm := iter.PaymentMethod()
		last4 := ""
		if pm.Card != nil {
			last4 = pm.Card.Last4
		}
		methods = append(methods, domain.PaymentMethod{
			ID:        pm.ID,
			CardLast4: last4,
		})
	}
	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("list payment methods: %w", err)
	}
	return methods, nil
}

// ChargeCustomer はStripeで決済を実行し、PaymentIntent IDを返す
func (r *SettlementRepositoryImpl) ChargeCustomer(params domain.ChargeParams) (string, error) {
	piParams := &stripe.PaymentIntentParams{
		Amount:        stripe.Int64(int64(params.Amount)),
		Currency:      stripe.String("jpy"),
		Customer:      stripe.String(params.CustomerID),
		PaymentMethod: stripe.String(params.PaymentMethodID),
		Confirm:       stripe.Bool(true),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled:         stripe.Bool(true),
			AllowRedirects:  stripe.String("never"),
		},
		Description: stripe.String(params.Description),
	}
	piParams.AddMetadata("type", "product_purchase_settlement")
	piParams.AddMetadata("settlement_month", params.SettlementMonth)
	piParams.AddMetadata("member_id", params.MemberID)
	piParams.AddMetadata("purchase_count", fmt.Sprintf("%d", params.PurchaseCount))

	pi, err := paymentintent.New(piParams)
	if err != nil {
		return "", fmt.Errorf("create payment intent: %w", err)
	}
	if pi.Status != stripe.PaymentIntentStatusSucceeded {
		return "", fmt.Errorf("payment intent status: %s", pi.Status)
	}
	chargeID := ""
	if pi.LatestCharge != nil {
		chargeID = pi.LatestCharge.ID
	}
	// Return "paymentIntentID|chargeID" for the caller
	return pi.ID + "|" + chargeID, nil
}

// UpdatePurchasesSettled は購入レコードを決済済みに更新する
func (r *SettlementRepositoryImpl) UpdatePurchasesSettled(purchaseIDs []string, paymentIntentID string, chargeID string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	body := map[string]interface{}{
		"status":                    "completed",
		"settled_at":                now,
		"stripe_payment_intent_id":  paymentIntentID,
		"stripe_charge_id":          chargeID,
	}

	// Build `id=in.(id1,id2,...)` filter
	inFilter := "in.(" + strings.Join(purchaseIDs, ",") + ")"

	resp, err := r.supabase.Client().R().
		SetQueryParam("id", inFilter).
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/product_purchases")
	if err != nil {
		return fmt.Errorf("update purchases settled: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("update purchases settled: %s", resp.String())
	}
	return nil
}

// SendStatementEmail はResend経由で明細メールを送信する
func (r *SettlementRepositoryImpl) SendStatementEmail(params domain.StatementEmailParams) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}

	parts := strings.SplitN(params.TargetMonth, "-", 2)
	monthDisplay := params.TargetMonth
	if len(parts) == 2 {
		year := parts[0]
		month := strings.TrimLeft(parts[1], "0")
		monthDisplay = fmt.Sprintf("%s年%s月", year, month)
	}

	htmlBody, err := buildStatementHTML(params, monthDisplay)
	if err != nil {
		return fmt.Errorf("build email html: %w", err)
	}

	payload := map[string]interface{}{
		"from":    "FLOLIA <noreply@flolia.jp>",
		"to":      []string{params.To},
		"subject": fmt.Sprintf("【FLOLIA】物販ご利用明細（%s分）", monthDisplay),
		"html":    htmlBody,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("create resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend API error: status %d", resp.StatusCode)
	}
	return nil
}

var statementTmpl = template.Must(template.New("statement").Parse(`
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
  <h3 style="color: #374151;">物販ご利用明細（{{.MonthDisplay}}分）</h3>
  <p>{{.Name}}様</p>
  <p>いつもFLOLIAをご利用いただき、誠にありがとうございます。<br>
  {{.MonthDisplay}}分の物販ご利用明細をお送りいたします。</p>
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h4 style="margin-top: 0; color: #7c3aed;">ご利用明細</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db;">日付</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db;">商品名</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #d1d5db;">数量</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #d1d5db;">単価</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #d1d5db;">小計</th>
        </tr>
      </thead>
      <tbody>
        {{range .Purchases}}
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{.Date}}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{.ProductName}}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">{{.Quantity}}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">¥{{.Price}}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">¥{{.Amount}}</td>
        </tr>
        {{end}}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #f5f3ff;">
          <td colspan="4" style="padding: 12px; text-align: right;">合計（税込）</td>
          <td style="padding: 12px; text-align: right; color: #7c3aed; font-size: 18px;">¥{{.TotalAmount}}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #374151;">
      <strong>お支払い方法：</strong>クレジットカード（末尾 {{.CardLast4}}）<br>
      <strong>決済日：</strong>{{.SettledAt}}
    </p>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">
    ご不明な点がございましたら、スタジオスタッフまでお気軽にお申し付けください。<br>
    FLOLIA Kickboxing Studio
  </p>
</div>
`))

type statementData struct {
	Name         string
	MonthDisplay string
	Purchases    []domain.PurchaseItem
	TotalAmount  int
	CardLast4    string
	SettledAt    string
}

func buildStatementHTML(params domain.StatementEmailParams, monthDisplay string) (string, error) {
	data := statementData{
		Name:         params.Name,
		MonthDisplay: monthDisplay,
		Purchases:    params.Purchases,
		TotalAmount:  params.TotalAmount,
		CardLast4:    params.CardLast4,
		SettledAt:    params.SettledAt,
	}
	var buf bytes.Buffer
	if err := statementTmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
