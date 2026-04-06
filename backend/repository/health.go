package repository

import "github.com/flolia/flolia-project/backend/domain"

// HealthRepository はDB疎通確認のインターフェース
type HealthRepository interface {
	Check() (*domain.HealthStatus, error)
}
