package infrastructure

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type LineNotificationRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewLineNotificationRepository(supabase *SupabaseClient) *LineNotificationRepositoryImpl {
	return &LineNotificationRepositoryImpl{supabase: supabase}
}

type lineTemplateRow struct {
	ID              string          `json:"id"`
	TriggerID       string          `json:"trigger_id"`
	MessageTemplate string          `json:"message_template"`
	RewardName      string          `json:"reward_name"`
	RewardValidDays int             `json:"reward_valid_days"`
	Conditions      json.RawMessage `json:"conditions"`
}

type memberNotifyRow struct {
	ID         string  `json:"id"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	LineUserID string  `json:"line_user_id"`
	BirthDate  *string `json:"birth_date"`
	CreatedAt  string  `json:"created_at"`
	UpdatedAt  string  `json:"updated_at"`
	Status     string  `json:"status"`
}

func (r *LineNotificationRepositoryImpl) FetchActiveTemplates(triggerIDs []string) ([]*domain.LineTemplate, error) {
	inFilter := "in.(" + strings.Join(triggerIDs, ",") + ")"
	var rows []lineTemplateRow
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"is_active":  "eq.true",
			"trigger_id": inFilter,
			"select":     "id,trigger_id,message_template,reward_name,reward_valid_days,conditions",
		}).
		SetResult(&rows).
		Get("/rest/v1/line_notification_templates")
	if err != nil {
		return nil, fmt.Errorf("fetch line templates: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("fetch line templates: %s", resp.String())
	}
	templates := make([]*domain.LineTemplate, 0, len(rows))
	for _, row := range rows {
		var cond map[string]interface{}
		_ = json.Unmarshal(row.Conditions, &cond)
		templates = append(templates, &domain.LineTemplate{
			ID:              row.ID,
			TriggerID:       row.TriggerID,
			MessageTemplate: row.MessageTemplate,
			RewardName:      row.RewardName,
			RewardValidDays: row.RewardValidDays,
			Conditions:      cond,
		})
	}
	return templates, nil
}

func (r *LineNotificationRepositoryImpl) fetchMembers(query map[string]string) ([]*domain.MemberForNotification, error) {
	var rows []memberNotifyRow
	resp, err := r.supabase.Client().R().
		SetQueryParams(query).
		SetResult(&rows).
		Get("/rest/v1/members")
	if err != nil {
		return nil, err
	}
	if resp.IsError() {
		return nil, fmt.Errorf("fetch members: %s", resp.String())
	}
	members := make([]*domain.MemberForNotification, 0, len(rows))
	for _, row := range rows {
		m := &domain.MemberForNotification{
			ID:         row.ID,
			FirstName:  row.FirstName,
			LastName:   row.LastName,
			LineUserID: row.LineUserID,
			Status:     row.Status,
		}
		if row.BirthDate != nil && *row.BirthDate != "" {
			t, err := time.Parse("2006-01-02", *row.BirthDate)
			if err == nil {
				m.BirthDate = &t
			}
		}
		if row.CreatedAt != "" {
			t, _ := time.Parse(time.RFC3339, row.CreatedAt)
			m.CreatedAt = t
		}
		if row.UpdatedAt != "" {
			t, _ := time.Parse(time.RFC3339, row.UpdatedAt)
			m.UpdatedAt = t
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *LineNotificationRepositoryImpl) FetchMembersForBirthday() ([]*domain.MemberForNotification, error) {
	return r.fetchMembers(map[string]string{
		"line_user_id": "not.is.null",
		"status":       "in.(active,trial)",
		"select":       "id,first_name,last_name,line_user_id,birth_date,created_at,updated_at,status",
	})
}

func (r *LineNotificationRepositoryImpl) FetchMembersForAnniversary() ([]*domain.MemberForNotification, error) {
	return r.fetchMembers(map[string]string{
		"line_user_id": "not.is.null",
		"status":       "in.(active,trial)",
		"select":       "id,first_name,last_name,line_user_id,birth_date,created_at,updated_at,status",
	})
}

func (r *LineNotificationRepositoryImpl) FetchPausedMembers() ([]*domain.MemberForNotification, error) {
	return r.fetchMembers(map[string]string{
		"line_user_id": "not.is.null",
		"status":       "eq.paused",
		"select":       "id,first_name,last_name,line_user_id,birth_date,created_at,updated_at,status",
	})
}

func (r *LineNotificationRepositoryImpl) HasNotificationSentToday(memberID, templateID string) (bool, error) {
	todayStr := time.Now().Format("2006-01-02")
	var rows []map[string]interface{}
	resp, err := r.supabase.Client().R().
		SetQueryParams(map[string]string{
			"member_id":   "eq." + memberID,
			"template_id": "eq." + templateID,
			"sent_at":     "gte." + todayStr,
			"select":      "id",
			"limit":       "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/line_notification_logs")
	if err != nil {
		return false, err
	}
	if resp.IsError() {
		return false, fmt.Errorf("check notification log: %s", resp.String())
	}
	return len(rows) > 0, nil
}

func (r *LineNotificationRepositoryImpl) SendLineMessage(lineUserID string, message string) error {
	return sendLineMessage(lineUserID, []map[string]interface{}{
		{"type": "text", "text": message},
	})
}

func (r *LineNotificationRepositoryImpl) LogNotification(memberID, templateID, triggerID string, conditions map[string]interface{}, rewardName string, rewardValidDays int) error {
	body := map[string]interface{}{
		"member_id":       memberID,
		"template_id":     templateID,
		"trigger_id":      triggerID,
		"condition_value": conditions,
		"reward_name":     rewardName,
	}
	if rewardValidDays > 0 {
		expiresAt := time.Now().Add(time.Duration(rewardValidDays) * 24 * time.Hour).Format(time.RFC3339)
		body["reward_expires_at"] = expiresAt
	}
	resp, err := r.supabase.Client().R().
		SetBody(body).
		SetHeader("Prefer", "return=minimal").
		Post("/rest/v1/line_notification_logs")
	if err != nil {
		return fmt.Errorf("log notification: %w", err)
	}
	if resp.IsError() {
		return fmt.Errorf("log notification: %s", resp.String())
	}
	return nil
}

var _ repository.LineNotificationRepository = (*LineNotificationRepositoryImpl)(nil)
