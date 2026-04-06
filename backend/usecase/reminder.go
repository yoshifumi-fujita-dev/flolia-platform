package usecase

import (
	"fmt"
	"log"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type ReminderUsecaseImpl struct {
	repo repository.ReminderRepository
}

func NewReminderUsecase(repo repository.ReminderRepository) *ReminderUsecaseImpl {
	return &ReminderUsecaseImpl{repo: repo}
}

func (u *ReminderUsecaseImpl) Run() (*domain.ReminderResult, error) {
	result := &domain.ReminderResult{}

	bookings, err := u.repo.FetchTomorrowBookings()
	if err != nil {
		return nil, fmt.Errorf("fetch bookings: %w", err)
	}
	if len(bookings) == 0 {
		return result, nil
	}

	for _, booking := range bookings {
		date, err := time.Parse("2006-01-02", booking.BookingDate)
		if err != nil {
			log.Printf("Invalid booking date %s: %v", booking.BookingDate, err)
			result.Failed++
			continue
		}
		dateFormatted := formatJapaneseDate(date)

		timeFormatted := ""
		if booking.StartTime != "" && booking.EndTime != "" {
			timeFormatted = booking.StartTime[:5] + "〜" + booking.EndTime[:5]
		}

		if err := u.repo.SendReminderEmail(booking, dateFormatted, timeFormatted); err != nil {
			log.Printf("Failed to send reminder email to %s: %v", booking.Email, err)
			result.Failed++
			continue
		}

		if booking.LineUserID != "" {
			if err := u.repo.SendReminderLine(booking.LineUserID, booking, dateFormatted, timeFormatted); err != nil {
				log.Printf("Failed to send LINE reminder to %s: %v", booking.LineUserID, err)
				// LINE失敗はメール成功済みなので致命的エラーにしない
			}
		}

		result.Sent++
	}

	return result, nil
}

func formatJapaneseDate(t time.Time) string {
	weekdays := []string{"日", "月", "火", "水", "木", "金", "土"}
	return fmt.Sprintf("%d年%d月%d日(%s)", t.Year(), t.Month(), t.Day(), weekdays[t.Weekday()])
}
