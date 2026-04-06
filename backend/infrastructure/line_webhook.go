package infrastructure

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type LineWebhookRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewLineWebhookRepository(supabase *SupabaseClient) *LineWebhookRepositoryImpl {
	return &LineWebhookRepositoryImpl{supabase: supabase}
}

func (r *LineWebhookRepositoryImpl) FindMemberByLineUserID(lineUserID string) (*domain.Member, error) {
	var rows []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"line_user_id": "eq." + lineUserID,
			"select":       "id,name",
			"limit":        "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil {
		return nil, fmt.Errorf("find member by line user: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find member by line user: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &domain.Member{ID: rows[0].ID, Name: rows[0].Name}, nil
}

func (r *LineWebhookRepositoryImpl) ClearMemberLineUserID(lineUserID string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParam("line_user_id", "eq."+lineUserID).
		SetBody(map[string]interface{}{"line_user_id": nil}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/members")
	if err != nil {
		return fmt.Errorf("clear member line user id: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("clear member line user id: %s", resp.String())
	}
	return nil
}

func (r *LineWebhookRepositoryImpl) CloseInquiriesByLineUserID(lineUserID string) error {
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"line_user_id": "eq." + lineUserID,
			"status":       "in.(open,in_progress)",
		}).
		SetBody(map[string]interface{}{"status": "closed"}).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/line_inquiries")
	if err != nil {
		return fmt.Errorf("close inquiries: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("close inquiries: %s", resp.String())
	}
	return nil
}

func (r *LineWebhookRepositoryImpl) GetOrCreateInquiry(lineUserID string) (*domain.LineInquiry, error) {
	// 既存のオープンなお問い合わせを検索
	var rows []struct {
		ID          string `json:"id"`
		LineUserID  string `json:"line_user_id"`
		MemberID    string `json:"member_id"`
		DisplayName string `json:"display_name"`
		Status      string `json:"status"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"line_user_id": "eq." + lineUserID,
			"status":       "in.(open,in_progress)",
			"order":        "created_at.desc",
			"limit":        "1",
			"select":       "id,line_user_id,member_id,display_name,status",
		}).
		SetResult(&rows).
		Get("/rest/v1/line_inquiries")
	if err != nil {
		return nil, fmt.Errorf("get inquiry: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("get inquiry: %s", resp.String())
	}

	now := time.Now().UTC().Format(time.RFC3339)

	if len(rows) > 0 {
		// 既存: last_message_at を更新
		r.supabase.Client().R().
			SetQueryParam("id", "eq."+rows[0].ID).
			SetBody(map[string]interface{}{"last_message_at": now}).
			SetHeader("Prefer", "return=minimal").
			Patch("/rest/v1/line_inquiries")
		return &domain.LineInquiry{ID: rows[0].ID, LineUserID: lineUserID}, nil
	}

	// 新規作成: プロフィールと会員情報を取得
	profile, _ := r.GetLineProfile(lineUserID)

	member, _ := r.FindMemberByLineUserID(lineUserID)
	memberID := ""
	if member != nil {
		memberID = member.ID
	}

	body := map[string]interface{}{
		"line_user_id":    lineUserID,
		"status":          "open",
		"last_message_at": now,
	}
	if profile != nil {
		body["display_name"] = profile.DisplayName
		body["profile_image_url"] = profile.PictureURL
	}
	if memberID != "" {
		body["member_id"] = memberID
	}

	var created []struct {
		ID string `json:"id"`
	}
	resp, err = r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=representation").
		SetResult(&created).
		Post("/rest/v1/line_inquiries")
	if err != nil {
		return nil, fmt.Errorf("create inquiry: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("create inquiry: %s", resp.String())
	}
	if len(created) == 0 {
		return nil, fmt.Errorf("create inquiry: no row returned")
	}
	return &domain.LineInquiry{ID: created[0].ID, LineUserID: lineUserID}, nil
}

func (r *LineWebhookRepositoryImpl) SaveIncomingMessage(inquiryID string, msg *domain.LineMessage) error {
	content := formatMessageContent(msg)
	body := map[string]interface{}{
		"inquiry_id":      inquiryID,
		"direction":       "incoming",
		"message_type":    msg.Type,
		"content":         content,
		"line_message_id": msg.ID,
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/line_messages")
	if err != nil {
		return fmt.Errorf("save message: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("save message: %s", resp.String())
	}
	return nil
}

func (r *LineWebhookRepositoryImpl) FindMemberBookings(memberID string, fromDate string) ([]repository.BookingSummary, error) {
	var rows []struct {
		BookingDate string `json:"booking_date"`
		BookingType string `json:"booking_type"`
		TimeSlot    struct {
			StartTime string `json:"start_time"`
		} `json:"time_slots"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"member_id":    "eq." + memberID,
			"status":       "eq.confirmed",
			"booking_date": "gte." + fromDate,
			"order":        "booking_date.asc",
			"limit":        "5",
			"select":       "booking_date,booking_type,time_slots(start_time)",
		}).
		SetResult(&rows).
		Get("/rest/v1/bookings")
	if err != nil {
		return nil, fmt.Errorf("find bookings: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find bookings: %s", resp.String())
	}
	summaries := make([]repository.BookingSummary, 0, len(rows))
	for _, row := range rows {
		summaries = append(summaries, repository.BookingSummary{
			BookingDate: row.BookingDate,
			BookingType: row.BookingType,
			StartTime:   row.TimeSlot.StartTime,
		})
	}
	return summaries, nil
}

func (r *LineWebhookRepositoryImpl) SendLineTextMessage(lineUserID string, text string) error {
	return sendLineMessage(lineUserID, []map[string]interface{}{
		{"type": "text", "text": text},
	})
}

func (r *LineWebhookRepositoryImpl) GetLineProfile(lineUserID string) (*domain.LineProfile, error) {
	token := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	if token == "" {
		return nil, nil
	}
	req, err := http.NewRequest("GET", "https://api.line.me/v2/bot/profile/"+lineUserID, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, nil
	}
	body, _ := io.ReadAll(resp.Body)
	var profile domain.LineProfile
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}

func formatMessageContent(msg *domain.LineMessage) string {
	switch msg.Type {
	case "text":
		return msg.Text
	case "image":
		return "[画像]"
	case "sticker":
		return fmt.Sprintf("[スタンプ: %s-%s]", msg.PackageID, msg.StickerID)
	case "location":
		return fmt.Sprintf("[位置情報: %s %s]", msg.Title, msg.Address)
	case "audio":
		return "[音声メッセージ]"
	case "video":
		return "[動画]"
	case "file":
		return fmt.Sprintf("[ファイル: %s]", msg.FileName)
	default:
		return fmt.Sprintf("[%s]", msg.Type)
	}
}

var _ repository.LineWebhookRepository = (*LineWebhookRepositoryImpl)(nil)
