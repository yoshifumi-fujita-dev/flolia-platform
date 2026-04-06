package domain

// MemberContract は会員契約処理に必要な会員情報
type MemberContract struct {
	ID                   string
	FirstName            string
	LastName             string
	Status               string
	MembershipType       string // "monthly" | "ticket" | etc.
	StripeSubscriptionID string
}

// PauseRequest は休会リクエスト
type PauseRequest struct {
	MemberID    string
	PausedUntil string // オプション（YYYY-MM-DD）
	Reason      string // オプション
}

// ResumeRequest は復会リクエスト
type ResumeRequest struct {
	MemberID string
}

// CancelRequest は退会リクエスト
type CancelRequest struct {
	MemberID string
	Reason   string // オプション
}

// ContractResult は契約変更処理の結果
type ContractResult struct {
	MemberID   string `json:"member_id"`
	Status     string `json:"status"`
	MemberName string `json:"member_name"`
}
