package infrastructure

import (
	"fmt"
	"math"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// CheckinRepositoryImpl は入退館リポジトリの実装
type CheckinRepositoryImpl struct {
	supabase *SupabaseClient
}

// NewCheckinRepository は CheckinRepository を生成する
func NewCheckinRepository(supabase *SupabaseClient) *CheckinRepositoryImpl {
	return &CheckinRepositoryImpl{supabase: supabase}
}

// FindMember は会員IDで会員情報を取得する
func (r *CheckinRepositoryImpl) FindMember(memberID string) (*domain.MemberForCheckin, error) {
	var rows []struct {
		ID        string `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Status    string `json:"status"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"id":     "eq." + memberID,
			"select": "id,first_name,last_name,status",
			"limit":  "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil {
		return nil, fmt.Errorf("find member: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("find member: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}
	row := rows[0]
	return &domain.MemberForCheckin{
		ID:        row.ID,
		FirstName: row.FirstName,
		LastName:  row.LastName,
		Status:    row.Status,
	}, nil
}

// FindActiveAttendance は現在入館中の attendance_log ID を返す。未入館時は空文字列。
func (r *CheckinRepositoryImpl) FindActiveAttendance(memberID string) (string, error) {
	var rows []struct {
		ID string `json:"id"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"member_id":    "eq." + memberID,
			"check_out_at": "is.null",
			"select":       "id",
			"limit":        "1",
			"order":        "check_in_at.desc",
		}).
		SetResult(&rows).
		Get("/rest/v1/attendance_logs")
	if err != nil {
		return "", fmt.Errorf("find active attendance: %w", err)
	}
	if resp.IsError() {
		return "", fmt.Errorf("find active attendance: %s", resp.String())
	}
	if len(rows) == 0 {
		return "", nil
	}
	return rows[0].ID, nil
}

// InsertAttendance は入館記録を作成し結果を返す
func (r *CheckinRepositoryImpl) InsertAttendance(memberID, storeID string) (*domain.CheckinResult, error) {
	checkInAt := time.Now().UTC().Format(time.RFC3339)

	body := map[string]interface{}{
		"member_id":   memberID,
		"check_in_at": checkInAt,
	}
	if storeID != "" {
		body["store_id"] = storeID
	}

	var rows []struct {
		ID        string `json:"id"`
		CheckInAt string `json:"check_in_at"`
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=representation").
		SetResult(&rows).
		Post("/rest/v1/attendance_logs")
	if err != nil {
		return nil, fmt.Errorf("insert attendance: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("insert attendance: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("insert attendance: no row returned")
	}
	return &domain.CheckinResult{
		AttendanceID: rows[0].ID,
		CheckInAt:    rows[0].CheckInAt,
	}, nil
}

// UpdateCheckout は入館記録に退館時刻と滞在時間を記録する
func (r *CheckinRepositoryImpl) UpdateCheckout(attendanceID string) (*domain.CheckoutResult, error) {
	// 入館時刻を取得
	var rows []struct {
		CheckInAt string `json:"check_in_at"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"id":     "eq." + attendanceID,
			"select": "check_in_at",
			"limit":  "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/attendance_logs")
	if err != nil {
		return nil, fmt.Errorf("fetch check_in_at: %w", err)
	}
	if resp.IsError() || len(rows) == 0 {
		return nil, fmt.Errorf("fetch check_in_at: not found")
	}

	checkInAt, err := time.Parse(time.RFC3339, rows[0].CheckInAt)
	if err != nil {
		// パース失敗時は滞在時間0で継続
		checkInAt = time.Now().UTC()
	}

	checkOutAt := time.Now().UTC()
	durationMinutes := int(math.Round(checkOutAt.Sub(checkInAt).Minutes()))

	updateBody := map[string]interface{}{
		"check_out_at":     checkOutAt.Format(time.RFC3339),
		"duration_minutes": durationMinutes,
	}
	resp, err = r.supabase.Client().R().
		SetQueryParam("id", "eq."+attendanceID).
		SetBody(updateBody).
		SetHeader("Prefer", "return=minimal").
		Patch("/rest/v1/attendance_logs")
	if err != nil {
		return nil, fmt.Errorf("update checkout: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("update checkout: %s", resp.String())
	}

	return &domain.CheckoutResult{DurationMinutes: durationMinutes}, nil
}

// SendCheckinNotification はLINE入館通知を送信する
func (r *CheckinRepositoryImpl) SendCheckinNotification(memberID, storeID string) error {
	// LINE user_id を取得
	var rows []struct {
		LineUserID string `json:"line_user_id"`
		FirstName  string `json:"first_name"`
		LastName   string `json:"last_name"`
	}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"id":     "eq." + memberID,
			"select": "line_user_id,first_name,last_name",
			"limit":  "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil || resp.IsError() || len(rows) == 0 {
		return nil // LINE未連携はスキップ
	}

	lineUserID := rows[0].LineUserID
	if lineUserID == "" {
		return nil // LINE未連携
	}

	name := rows[0].LastName + " " + rows[0].FirstName
	message := fmt.Sprintf("✅ %sさんの入館を記録しました。\nご利用ありがとうございます！", name)
	return sendLineMessage(lineUserID, []map[string]interface{}{
		{"type": "text", "text": message},
	})
}

var _ repository.CheckinRepository = (*CheckinRepositoryImpl)(nil)
