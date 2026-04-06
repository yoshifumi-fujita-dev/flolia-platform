package usecase

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type LineNotificationUsecaseImpl struct {
	repo repository.LineNotificationRepository
}

func NewLineNotificationUsecase(repo repository.LineNotificationRepository) *LineNotificationUsecaseImpl {
	return &LineNotificationUsecaseImpl{repo: repo}
}

func (u *LineNotificationUsecaseImpl) Run() (*domain.LineNotificationResult, error) {
	result := &domain.LineNotificationResult{}
	now := time.Now()

	templates, err := u.repo.FetchActiveTemplates([]string{"birthday", "membership_anniversary", "paused_member_followup"})
	if err != nil {
		return nil, fmt.Errorf("fetch templates: %w", err)
	}
	if len(templates) == 0 {
		return result, nil
	}

	byTrigger := groupTemplates(templates)

	// 誕生日通知
	if tpls, ok := byTrigger["birthday"]; ok {
		members, err := u.repo.FetchMembersForBirthday()
		if err != nil {
			log.Printf("FetchMembersForBirthday error: %v", err)
		} else {
			for _, m := range members {
				if m.BirthDate == nil {
					continue
				}
				if m.BirthDate.Month() != now.Month() || m.BirthDate.Day() != now.Day() {
					continue
				}
				for _, tpl := range tpls {
					if sent := u.sendTemplateNotification(m, tpl, map[string]interface{}{}); sent {
						result.Birthday++
					}
				}
			}
		}
	}

	// 入会記念日通知
	if tpls, ok := byTrigger["membership_anniversary"]; ok {
		members, err := u.repo.FetchMembersForAnniversary()
		if err != nil {
			log.Printf("FetchMembersForAnniversary error: %v", err)
		} else {
			for _, m := range members {
				if m.CreatedAt.Month() != now.Month() || m.CreatedAt.Day() != now.Day() {
					continue
				}
				years := int(now.Sub(m.CreatedAt).Hours() / 24 / 365)
				if years < 1 {
					continue
				}
				for _, tpl := range tpls {
					if condYears, ok := tpl.Conditions["years"]; ok {
						if int(toFloat(condYears)) != years {
							continue
						}
					}
					if sent := u.sendTemplateNotification(m, tpl, map[string]interface{}{"years": years}); sent {
						result.Anniversary++
					}
				}
			}
		}
	}

	// 休会者フォロー通知
	if tpls, ok := byTrigger["paused_member_followup"]; ok {
		members, err := u.repo.FetchPausedMembers()
		if err != nil {
			log.Printf("FetchPausedMembers error: %v", err)
		} else {
			for _, m := range members {
				daysSincePaused := int(now.Sub(m.UpdatedAt).Hours() / 24)
				for _, tpl := range tpls {
					if condDays, ok := tpl.Conditions["days"]; ok {
						if int(toFloat(condDays)) != daysSincePaused {
							continue
						}
					}
					if sent := u.sendTemplateNotification(m, tpl, map[string]interface{}{}); sent {
						result.Paused++
					}
				}
			}
		}
	}

	return result, nil
}

func (u *LineNotificationUsecaseImpl) sendTemplateNotification(m *domain.MemberForNotification, tpl *domain.LineTemplate, vars map[string]interface{}) bool {
	sent, err := u.repo.HasNotificationSentToday(m.ID, tpl.ID)
	if err != nil {
		log.Printf("HasNotificationSentToday error: %v", err)
		return false
	}
	if sent {
		return false
	}

	memberName := m.LastName + " " + m.FirstName
	message := tpl.MessageTemplate
	message = strings.ReplaceAll(message, "{name}", memberName)
	if years, ok := vars["years"]; ok {
		message = strings.ReplaceAll(message, "{years}", fmt.Sprintf("%v", years))
	}
	message = strings.ReplaceAll(message, "{reward}", tpl.RewardName)

	if err := u.repo.SendLineMessage(m.LineUserID, message); err != nil {
		log.Printf("SendLineMessage error for %s: %v", m.LineUserID, err)
		return false
	}

	if err := u.repo.LogNotification(m.ID, tpl.ID, tpl.TriggerID, tpl.Conditions, tpl.RewardName, tpl.RewardValidDays); err != nil {
		log.Printf("LogNotification error: %v", err)
	}

	return true
}

func groupTemplates(templates []*domain.LineTemplate) map[string][]*domain.LineTemplate {
	result := make(map[string][]*domain.LineTemplate)
	for _, t := range templates {
		result[t.TriggerID] = append(result[t.TriggerID], t)
	}
	return result
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	}
	return 0
}
