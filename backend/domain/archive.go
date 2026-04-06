package domain

import "time"

// ArchiveResult はアーカイブ処理の結果を表す
type ArchiveResult struct {
	Success                 bool      `json:"success"`
	Timestamp               time.Time `json:"timestamp"`
	PageViewsArchived       int       `json:"page_views_archived"`
	AnalyticsEventsArchived int       `json:"analytics_events_archived"`
	PaymentsDeleted         int       `json:"payments_deleted"`
	Message                 string    `json:"message"`
}
