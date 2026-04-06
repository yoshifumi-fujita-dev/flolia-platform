package infrastructure

import "github.com/flolia/flolia-project/backend/domain"

// HealthRepositoryImpl はHealthRepositoryの実装
type HealthRepositoryImpl struct{}

func NewHealthRepository() *HealthRepositoryImpl {
	return &HealthRepositoryImpl{}
}

func (r *HealthRepositoryImpl) Check() (*domain.HealthStatus, error) {
	return &domain.HealthStatus{Status: "ok"}, nil
}
