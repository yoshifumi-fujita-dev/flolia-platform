package usecase

import (
	"fmt"
	"log"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type PaymentRetryUsecaseImpl struct {
	repo repository.PaymentRetryRepository
}

func NewPaymentRetryUsecase(repo repository.PaymentRetryRepository) *PaymentRetryUsecaseImpl {
	return &PaymentRetryUsecaseImpl{repo: repo}
}

func (u *PaymentRetryUsecaseImpl) Run() (*domain.PaymentRetryResult, error) {
	result := &domain.PaymentRetryResult{}

	retries, err := u.repo.FetchPendingRetries()
	if err != nil {
		return nil, fmt.Errorf("fetch pending retries: %w", err)
	}
	if len(retries) == 0 {
		return result, nil
	}

	for _, retry := range retries {
		result.Processed++
		newRetryCount := retry.RetryCount + 1

		if err := u.repo.RetryInvoicePayment(retry.StripeInvoiceID); err != nil {
			log.Printf("Payment retry failed for invoice %s: %v", retry.StripeInvoiceID, err)

			if newRetryCount >= retry.MaxRetries {
				// 最終失敗
				_ = u.repo.MarkRetryFailed(retry.ID, newRetryCount, err.Error())
				if retry.MemberID != "" {
					_ = u.repo.UpdateMemberStatus(retry.MemberID, "paused")
				}
				if retry.MemberLineUserID != "" {
					if lineErr := u.repo.SendPaymentFailedLine(retry.MemberLineUserID, retry.MemberName, true); lineErr != nil {
						log.Printf("Failed to send LINE payment failed notification: %v", lineErr)
					}
				}
				result.Failed++
			} else {
				nextRetryAt := nextRetryTime().Format(time.RFC3339)
				_ = u.repo.ScheduleNextRetry(retry.ID, newRetryCount, nextRetryAt, err.Error())
				result.Rescheduled++
			}
			continue
		}

		// 成功
		_ = u.repo.MarkRetrySucceeded(retry.ID, newRetryCount)
		if retry.MemberID != "" {
			_ = u.repo.UpdateMemberStatus(retry.MemberID, "active")
		}
		result.Succeeded++
		log.Printf("Payment retry succeeded for invoice %s", retry.StripeInvoiceID)
	}

	return result, nil
}

// nextRetryTime は翌日10:00 JST (= 01:00 UTC) を返す
func nextRetryTime() time.Time {
	now := time.Now().UTC()
	tomorrow := now.AddDate(0, 0, 1)
	return time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 1, 0, 0, 0, time.UTC)
}
