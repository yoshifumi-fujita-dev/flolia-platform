package usecase

import (
	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// HealthUsecase はヘルスチェックのビジネスロジック
type HealthUsecase struct {
	repo repository.HealthRepository
}

func NewHealthUsecase(repo repository.HealthRepository) *HealthUsecase {
	return &HealthUsecase{repo: repo}
}

func (u *HealthUsecase) Check() (*domain.HealthStatus, error) {
	return u.repo.Check()
}
