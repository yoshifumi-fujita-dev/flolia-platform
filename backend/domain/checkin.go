package domain

// CheckinRequest は入館リクエスト
type CheckinRequest struct {
	MemberID string
	StoreID  string
}

// CheckoutRequest は退館リクエスト
type CheckoutRequest struct {
	MemberID string
}

// MemberForCheckin は入退館処理に必要な会員情報
type MemberForCheckin struct {
	ID        string
	FirstName string
	LastName  string
	Status    string
}

// CheckinResult は入館処理結果
type CheckinResult struct {
	AttendanceID string `json:"attendance_id"`
	CheckInAt    string `json:"check_in_at"`
	MemberName   string `json:"member_name"`
	Skipped      bool   `json:"skipped,omitempty"`
}

// CheckoutResult は退館処理結果
type CheckoutResult struct {
	DurationMinutes int  `json:"duration_minutes"`
	Skipped         bool `json:"skipped,omitempty"`
}
