package domain

// StripePaymentIntentEvent は payment_intent イベントのデータ
type StripePaymentIntentEvent struct {
	ID              string
	Amount          int64
	Status          string
	CustomerID      string
	LatestChargeID  string
	MemberID        string // metadata.member_id
	LastPaymentError string
}

// StripeSubscriptionEvent は subscription イベントのデータ
type StripeSubscriptionEvent struct {
	ID       string
	Status   string
	MemberID string // metadata.member_id
}

// StripeInvoiceEvent は invoice イベントのデータ
type StripeInvoiceEvent struct {
	ID                    string
	SubscriptionID        string
	PaymentIntentID       string
	ChargeID              string
	AmountPaid            int64
	AmountDue             int64
	LastFinalizationError string
}

// StripeChargeRefundedEvent は charge.refunded イベントのデータ
type StripeChargeRefundedEvent struct {
	ID              string
	PaymentIntentID string
	Refunds         []StripeRefund
}

// StripeRefund は返金情報
type StripeRefund struct {
	ID     string
	Amount int64
}

// MemberForWebhook はWebhook処理用の会員情報
type MemberForWebhook struct {
	ID         string
	LastName   string
	FirstName  string
	Email      string
	LineUserID string
}

// PaymentRecord はpayments テーブルへの挿入データ
type PaymentRecord struct {
	MemberID             string
	PaymentType          string
	Amount               int64
	PaymentDate          string
	PaymentMethod        string
	Status               string
	Description          string
	StripePaymentIntentID string
	StripeInvoiceID      string
	StripeChargeID       string
}

// RefundRecord は refunds テーブルへの挿入データ
type RefundRecord struct {
	PaymentID             string
	MemberID              string
	StoreID               string
	RequestedAmount       int64
	RefundAmount          int64
	FeeAmount             int64
	FeeBearer             string
	ReasonType            string
	Status                string
	ProcessedAt           string
	StripeRefundID        string
	StripePaymentIntentID string
	StripeChargeID        string
}

// ExistingRefund は既存の返金レコード
type ExistingRefund struct {
	ID     string
	Status string
}

// ExistingPayment は既存の支払いレコード
type ExistingPayment struct {
	ID       string
	MemberID string
	StoreID  string
	Amount   int64
}
