package infrastructure

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type ReminderRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewReminderRepository(supabase *SupabaseClient) *ReminderRepositoryImpl {
	return &ReminderRepositoryImpl{supabase: supabase}
}

type bookingRow struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Email       string      `json:"email"`
	BookingType string      `json:"booking_type"`
	BookingDate string      `json:"booking_date"`
	QRToken     string      `json:"qr_token"`
	CreatedAt   string      `json:"created_at"`
	TimeSlot    timeSlotRow `json:"time_slots"`
	Member      memberLineRow `json:"members"`
}

type timeSlotRow struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

type memberLineRow struct {
	LineUserID string `json:"line_user_id"`
}

func (r *ReminderRepositoryImpl) FetchTomorrowBookings() ([]*domain.Booking, error) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	today := time.Now().Format("2006-01-02")

	var rows []bookingRow
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"booking_date": "eq." + tomorrow,
			"status":       "eq.confirmed",
			"created_at":   "lt." + today,
			"select":       "id,name,email,booking_type,booking_date,qr_token,created_at,time_slots(start_time,end_time),members(line_user_id)",
		}).
		SetResult(&rows).
		Get("/rest/v1/bookings")
	if err != nil {
		return nil, fmt.Errorf("fetch tomorrow bookings: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("fetch tomorrow bookings: %s", resp.String())
	}

	bookings := make([]*domain.Booking, 0, len(rows))
	for _, row := range rows {
		bookings = append(bookings, &domain.Booking{
			ID:          row.ID,
			Name:        row.Name,
			Email:       row.Email,
			BookingType: row.BookingType,
			BookingDate: row.BookingDate,
			QRToken:     row.QRToken,
			StartTime:   row.TimeSlot.StartTime,
			EndTime:     row.TimeSlot.EndTime,
			LineUserID:  row.Member.LineUserID,
		})
	}
	return bookings, nil
}

func (r *ReminderRepositoryImpl) SendReminderEmail(booking *domain.Booking, dateFormatted, timeFormatted string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}
	appURL := os.Getenv("NEXT_PUBLIC_APP_URL")
	typeLabel := "体験"
	if booking.BookingType != "trial" {
		typeLabel = "見学"
	}

	html := fmt.Sprintf(`
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
  <h3>【リマインダー】明日のご予約について</h3>
  <p>%s様</p>
  <p>明日のご予約をお知らせします。</p>
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>種別：</strong>%s</p>
    <p><strong>日時：</strong>%s %s</p>
  </div>
  <p>ご都合が悪くなった場合は、お早めにご連絡ください。</p>
  %s
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">FLOLIA Kickboxing Studio</p>
</div>`, booking.Name, typeLabel, dateFormatted, timeFormatted, qrSection(appURL, booking.QRToken))

	payload := map[string]interface{}{
		"from":    "FLOLIA <noreply@flolia.jp>",
		"to":      []string{booking.Email},
		"subject": fmt.Sprintf("【FLOLIA】明日のご予約リマインダー（%s）", dateFormatted),
		"html":    html,
	}
	return sendResendEmail(apiKey, payload)
}

func qrSection(appURL, qrToken string) string {
	if qrToken == "" || appURL == "" {
		return ""
	}
	return fmt.Sprintf(`<p><a href="%s/checkin?token=%s" style="color: #7c3aed;">入館QRコードはこちら</a></p>`, appURL, qrToken)
}

func (r *ReminderRepositoryImpl) SendReminderLine(lineUserID string, booking *domain.Booking, dateFormatted, timeFormatted string) error {
	typeLabel := "体験"
	if booking.BookingType != "trial" {
		typeLabel = "見学"
	}
	messages := []map[string]interface{}{
		{
			"type":    "flex",
			"altText": "明日のご予約リマインダー",
			"contents": map[string]interface{}{
				"type": "bubble",
				"header": map[string]interface{}{
					"type":   "box",
					"layout": "vertical",
					"contents": []map[string]interface{}{
						{"type": "text", "text": "🔔 リマインダー", "weight": "bold", "size": "lg"},
						{"type": "text", "text": "明日のご予約があります", "size": "sm", "color": "#666666", "margin": "sm"},
					},
					"backgroundColor": "#fff7ed",
					"paddingAll":       "lg",
				},
				"body": map[string]interface{}{
					"type":   "box",
					"layout": "vertical",
					"contents": []interface{}{
						map[string]interface{}{"type": "text", "text": booking.Name + "様", "weight": "bold", "size": "md"},
						map[string]interface{}{
							"type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm",
							"contents": []interface{}{
								map[string]interface{}{"type": "box", "layout": "horizontal", "contents": []interface{}{
									map[string]interface{}{"type": "text", "text": "種別", "color": "#666666", "size": "sm", "flex": 2},
									map[string]interface{}{"type": "text", "text": typeLabel, "size": "sm", "flex": 5},
								}},
								map[string]interface{}{"type": "box", "layout": "horizontal", "contents": []interface{}{
									map[string]interface{}{"type": "text", "text": "日時", "color": "#666666", "size": "sm", "flex": 2},
									map[string]interface{}{"type": "text", "text": dateFormatted + " " + timeFormatted, "size": "sm", "flex": 5, "weight": "bold"},
								}},
							},
						},
					},
					"paddingAll": "lg",
				},
				"footer": map[string]interface{}{
					"type": "box", "layout": "vertical",
					"contents": []interface{}{
						map[string]interface{}{"type": "text", "text": "※ご都合が悪くなった場合は、お早めにご連絡ください。", "size": "xs", "color": "#dc2626", "wrap": true, "align": "center"},
					},
					"paddingAll": "md",
				},
			},
		},
	}
	return sendLineMessage(lineUserID, messages)
}

// sendResendEmail はResend APIでメールを送信する共通関数
func sendResendEmail(apiKey string, payload interface{}) error {
	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal email: %w", err)
	}
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
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

// sendLineMessage はLINE Messaging APIでメッセージを送信する共通関数
func sendLineMessage(userID string, messages interface{}) error {
	token := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	if token == "" {
		return fmt.Errorf("LINE_CHANNEL_ACCESS_TOKEN is not set")
	}
	payload := map[string]interface{}{
		"to":       userID,
		"messages": messages,
	}
	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal line message: %w", err)
	}
	req, err := http.NewRequest("POST", "https://api.line.me/v2/bot/message/push", bytes.NewReader(jsonBytes))
	if err != nil {
		return fmt.Errorf("create line request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send line message: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("LINE API error: status %d", resp.StatusCode)
	}
	return nil
}

var _ repository.ReminderRepository = (*ReminderRepositoryImpl)(nil)
