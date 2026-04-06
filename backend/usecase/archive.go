package usecase

import (
	"log"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// ArchiveUsecase はアーカイブ処理のビジネスロジック
type ArchiveUsecase struct {
	repo repository.ArchiveRepository
}

func NewArchiveUsecase(repo repository.ArchiveRepository) *ArchiveUsecase {
	return &ArchiveUsecase{repo: repo}
}

func (u *ArchiveUsecase) Run() (*domain.ArchiveResult, error) {
	log.Println("[Archive Cron] Starting archive job...")

	pageViewsArchived, err := u.repo.ArchiveOldPageViews()
	if err != nil {
		return nil, err
	}
	log.Printf("[Archive Cron] Archived %d page_views records", pageViewsArchived)

	eventsArchived, err := u.repo.ArchiveOldAnalyticsEvents()
	if err != nil {
		return nil, err
	}
	log.Printf("[Archive Cron] Archived %d analytics_events records", eventsArchived)

	paymentsDeleted, err := u.repo.DeleteOldPayments()
	if err != nil {
		return nil, err
	}
	log.Printf("[Archive Cron] Deleted %d old payments records", paymentsDeleted)

	result := &domain.ArchiveResult{
		Success:                 true,
		Timestamp:               time.Now().UTC(),
		PageViewsArchived:       pageViewsArchived,
		AnalyticsEventsArchived: eventsArchived,
		PaymentsDeleted:         paymentsDeleted,
		Message:                 "Archive job completed successfully",
	}

	log.Println("[Archive Cron] Archive job completed successfully")
	return result, nil
}
