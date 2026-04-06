package usecase

import (
	"fmt"
	"log"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type StripeSyncUsecaseImpl struct {
	repo repository.StripeSyncRepository
}

func NewStripeSyncUsecase(repo repository.StripeSyncRepository) *StripeSyncUsecaseImpl {
	return &StripeSyncUsecaseImpl{repo: repo}
}

func (u *StripeSyncUsecaseImpl) Run() (*domain.StripeSyncResult, error) {
	result := &domain.StripeSyncResult{}
	since := time.Now().Add(-24 * time.Hour).Unix()

	// PaymentIntent の同期
	intents, err := u.repo.FetchRecentStripePayments(since)
	if err != nil {
		return nil, fmt.Errorf("fetch stripe payments: %w", err)
	}
	for _, pi := range intents {
		if pi.Status != "succeeded" {
			continue
		}
		result.Synced++

		existingID, existingStatus, err := u.repo.FindPaymentByIntentID(pi.ID)
		if err != nil {
			log.Printf("FindPaymentByIntentID %s error: %v", pi.ID, err)
			result.Errors++
			continue
		}

		if existingID != "" {
			if existingStatus != "completed" {
				if err := u.repo.UpdatePaymentStatus(existingID); err != nil {
					log.Printf("UpdatePaymentStatus %s error: %v", existingID, err)
					result.Errors++
				} else {
					result.Updated++
				}
			}
			continue
		}

		memberID, _ := u.repo.FindMemberByStripeCustomer(pi.CustomerID)
		if err := u.repo.CreatePaymentFromIntent(pi, memberID); err != nil {
			log.Printf("CreatePaymentFromIntent %s error: %v", pi.ID, err)
			result.Errors++
		} else {
			result.Created++
		}
	}

	// Invoice の同期
	invoices, err := u.repo.FetchRecentStripeInvoices(since)
	if err != nil {
		return nil, fmt.Errorf("fetch stripe invoices: %w", err)
	}
	for _, inv := range invoices {
		result.Synced++

		// PaymentIntentで既に同期済みかチェック
		if inv.PaymentIntentID != "" {
			existingID, _, err := u.repo.FindPaymentByIntentID(inv.PaymentIntentID)
			if err == nil && existingID != "" {
				continue
			}
		}

		existingID, err := u.repo.FindPaymentByInvoiceID(inv.ID)
		if err != nil {
			log.Printf("FindPaymentByInvoiceID %s error: %v", inv.ID, err)
			result.Errors++
			continue
		}
		if existingID != "" {
			continue
		}

		memberID, _ := u.repo.FindMemberByStripeCustomer(inv.CustomerID)
		if err := u.repo.CreatePaymentFromInvoice(inv, memberID); err != nil {
			log.Printf("CreatePaymentFromInvoice %s error: %v", inv.ID, err)
			result.Errors++
		} else {
			result.Created++
		}
	}

	log.Printf("Stripe sync completed: synced=%d created=%d updated=%d errors=%d", result.Synced, result.Created, result.Updated, result.Errors)
	return result, nil
}
