package usecase

import (
	"fmt"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type AnalyticsUsecaseImpl struct {
	repo repository.AnalyticsRepository
}

func NewAnalyticsUsecase(repo repository.AnalyticsRepository) *AnalyticsUsecaseImpl {
	return &AnalyticsUsecaseImpl{repo: repo}
}

func (u *AnalyticsUsecaseImpl) Run() (*domain.AnalyticsResult, error) {
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	if err := u.repo.AggregateDailyAnalytics(yesterday); err != nil {
		return nil, fmt.Errorf("aggregate analytics: %w", err)
	}

	return &domain.AnalyticsResult{
		Aggregated: true,
		TargetDate: yesterday,
	}, nil
}
