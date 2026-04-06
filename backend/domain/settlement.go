package domain

import "time"

// ProductPurchase は未決済の購入レコード
type ProductPurchase struct {
	ID              string    `json:"id"`
	MemberID        string    `json:"member_id"`
	StoreID         string    `json:"store_id"`
	ProductName     string    `json:"product_name"`
	ProductPrice    int       `json:"product_price"`
	Quantity        int       `json:"quantity"`
	TotalAmount     int       `json:"total_amount"`
	PurchasedAt     time.Time `json:"purchased_at"`
	Member          *Member   `json:"members"`
	Store           *Store    `json:"stores"`
}

// Member は会員情報（決済用）
type Member struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Email            string `json:"email"`
	StripeCustomerID string `json:"stripe_customer_id"`
}

// Store は店舗情報
type Store struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// MemberSettlement は会員ごとの決済情報
type MemberSettlement struct {
	Member      *Member
	Purchases   []*ProductPurchase
	TotalAmount int
}

// SettlementResult は月末決済処理の結果
type SettlementResult struct {
	TargetMonth string          `json:"target_month"`
	DryRun      bool            `json:"dry_run"`
	Members     MemberStats     `json:"members"`
	TotalAmount int             `json:"total_amount"`
	Errors      []SettlementError `json:"errors"`
}

// MemberStats は会員ごとの処理統計
type MemberStats struct {
	Processed int `json:"processed"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
	Skipped   int `json:"skipped"`
}

// SettlementError は決済エラー情報
type SettlementError struct {
	MemberID   string `json:"member_id"`
	MemberName string `json:"member_name"`
	Error      string `json:"error"`
}

// PaymentMethod はStripeの支払い方法
type PaymentMethod struct {
	ID       string
	CardLast4 string
}

// ChargeParams はStripe決済のパラメータ
type ChargeParams struct {
	CustomerID      string
	PaymentMethodID string
	Amount          int
	SettlementMonth string
	MemberID        string
	PurchaseCount   int
	Description     string
}

// PurchaseItem はメール明細の1行
type PurchaseItem struct {
	Date        string
	ProductName string
	Quantity    int
	Price       int
	Amount      int
}

// StatementEmailParams はメール送信パラメータ
type StatementEmailParams struct {
	To              string
	Name            string
	TargetMonth     string
	Purchases       []PurchaseItem
	TotalAmount     int
	CardLast4       string
	SettledAt       string
}
