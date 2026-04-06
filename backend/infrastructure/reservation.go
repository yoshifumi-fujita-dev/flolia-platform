package infrastructure

import (
	"fmt"
	"os"
	"strings"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// ReservationRepositoryImpl は予約リポジトリの実装
type ReservationRepositoryImpl struct {
	supabase *SupabaseClient
}

// NewReservationRepository は ReservationRepository を生成する
func NewReservationRepository(supabase *SupabaseClient) *ReservationRepositoryImpl {
	return &ReservationRepositoryImpl{supabase: supabase}
}

// FindTimeSlot は時間枠IDで時間枠情報を取得する
func (r *ReservationRepositoryImpl) FindTimeSlot(timeSlotID string) (*domain.TimeSlot, error) {
	var rows []struct {
		ID          string `json:"id"`
		DayOfWeek   int    `json:"day_of_week"`
		StartTime   string `json:"start_time"`
		EndTime     string `json:"end_time"`
		MaxCapacity int    `json:"max_capacity"`
		IsActive    bool   `json:"is_active"`
		SlotType    string `json:"slot_type"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"id":     "eq." + timeSlotID,
			"select": "id,day_of_week,start_time,end_time,max_capacity,is_active,slot_type",
			"limit":  "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/time_slots")
	if err != nil {
		return nil, fmt.Errorf("find time slot: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find time slot: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	row := rows[0]
	return &domain.TimeSlot{
		ID:          row.ID,
		DayOfWeek:   row.DayOfWeek,
		StartTime:   row.StartTime,
		EndTime:     row.EndTime,
		MaxCapacity: row.MaxCapacity,
		IsActive:    row.IsActive,
		SlotType:    row.SlotType,
	}, nil
}

// InsertBooking はRPC経由で定員チェック付き予約を挿入する
func (r *ReservationRepositoryImpl) InsertBooking(req domain.ReservationRequest) (*domain.Reservation, error) {
	body := map[string]interface{}{
		"p_name":         req.Name,
		"p_email":        req.Email,
		"p_phone":        req.Phone,
		"p_booking_type": req.BookingType,
		"p_booking_date": req.BookingDate,
		"p_time_slot_id": req.TimeSlotID,
	}
	if req.StoreID != "" {
		body["p_store_id"] = req.StoreID
	}
	if req.Notes != "" {
		body["p_notes"] = req.Notes
	}

	var rows []struct {
		BookingID string `json:"booking_id"`
		QRToken   string `json:"qr_token"`
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetResult(&rows).
		Post("/rest/v1/rpc/insert_booking_if_available")
	if err != nil {
		return nil, fmt.Errorf("insert booking rpc: %w", err)
	}
	if resp.IsError() {
		body := resp.String()
		// RPCのRAISE EXCEPTIONメッセージを抽出して返す
		for _, errCode := range []string{"duplicate_booking", "capacity_exceeded", "time_slot_not_found", "time_slot_inactive", "booking_type_not_allowed"} {
			if strings.Contains(body, errCode) {
				return nil, fmt.Errorf("%s", errCode)
			}
		}
		return nil, fmt.Errorf("insert booking rpc: %s", body)
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("insert booking rpc: no row returned")
	}

	return &domain.Reservation{
		ID:          rows[0].BookingID,
		QRToken:     rows[0].QRToken,
		Name:        req.Name,
		BookingType: req.BookingType,
		BookingDate: req.BookingDate,
	}, nil
}

// SendConfirmationEmail は予約確認メールを送信する
func (r *ReservationRepositoryImpl) SendConfirmationEmail(booking *domain.Reservation, req domain.ReservationRequest, startTime, endTime string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}

	typeLabel := "体験レッスン"
	if req.BookingType == "tour" {
		typeLabel = "見学"
	}
	timeStr := startTime[:5] + " - " + endTime[:5]

	payload := map[string]interface{}{
		"from":    "FLOLIA <noreply@flolia.jp>",
		"to":      []string{req.Email},
		"subject": "【FLOLIA】" + typeLabel + "予約確認",
		"html": fmt.Sprintf(`<p>%s 様</p>
<p>この度はFLOLIAへ%sのお申し込みをいただきありがとうございます。<br>以下の内容で予約を承りました。</p>
<ul>
  <li>種別：%s</li>
  <li>日付：%s</li>
  <li>時間：%s</li>
</ul>
<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
<p>FLOLIA</p>`,
			req.Name, typeLabel, typeLabel, req.BookingDate, timeStr),
	}
	return sendResendEmail(apiKey, payload)
}

// SendAdminNotification は管理者への予約通知メールを送信する
func (r *ReservationRepositoryImpl) SendAdminNotification(booking *domain.Reservation, req domain.ReservationRequest, startTime, endTime string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@flolia.jp"
	}

	typeLabel := "体験レッスン"
	if req.BookingType == "tour" {
		typeLabel = "見学"
	}
	timeStr := startTime[:5] + " - " + endTime[:5]

	payload := map[string]interface{}{
		"from":    "FLOLIA <noreply@flolia.jp>",
		"to":      []string{adminEmail},
		"subject": "【FLOLIA】新規" + typeLabel + "予約",
		"html": fmt.Sprintf(`<p>新規%s予約が入りました。</p>
<ul>
  <li>氏名：%s</li>
  <li>メール：%s</li>
  <li>電話：%s</li>
  <li>種別：%s</li>
  <li>日付：%s</li>
  <li>時間：%s</li>
</ul>`,
			typeLabel, req.Name, req.Email, req.Phone, typeLabel, req.BookingDate, timeStr),
	}
	return sendResendEmail(apiKey, payload)
}

var _ repository.ReservationRepository = (*ReservationRepositoryImpl)(nil)
