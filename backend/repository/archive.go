package repository

import "github.com/flolia/flolia-project/backend/domain"

// ArchiveRepository はアーカイブ処理のインターフェース
type ArchiveRepository interface {
	ArchiveOldPageViews() (int, error)
	ArchiveOldAnalyticsEvents() (int, error)
	DeleteOldPayments() (int, error)
}

// ArchiveUsecase はアーカイブユースケースのインターフェース
type ArchiveUsecase interface {
	Run() (*domain.ArchiveResult, error)
}
