package domain

// HealthStatus はシステムの稼働状態を表す
type HealthStatus struct {
	Status string `json:"status"`
}
