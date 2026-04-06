package domain

// ReservationRequest は予約作成リクエスト
type ReservationRequest struct {
	Name        string
	Email       string
	Phone       string
	BookingType string // "trial" | "tour"
	BookingDate string // YYYY-MM-DD
	TimeSlotID  string
	StoreID     string // オプション
	Notes       string // オプション
}

// TimeSlot は予約可能な時間枠
type TimeSlot struct {
	ID          string
	DayOfWeek   int
	StartTime   string
	EndTime     string
	MaxCapacity int
	IsActive    bool
	SlotType    string // "trial" | "tour" | "both"
}

// Reservation は作成された予約
type Reservation struct {
	ID          string `json:"id"`
	QRToken     string `json:"qr_token"`
	Name        string `json:"name"`
	BookingType string `json:"booking_type"`
	BookingDate string `json:"booking_date"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
}
