package infrastructure

import (
	"fmt"
)

// ArchiveRepositoryImpl はArchiveRepositoryの実装（Supabase REST API経由）
type ArchiveRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewArchiveRepository(supabase *SupabaseClient) *ArchiveRepositoryImpl {
	return &ArchiveRepositoryImpl{supabase: supabase}
}

type rpcArchivedResult struct {
	ArchivedCount int `json:"archived_count"`
}

type rpcDeletedResult struct {
	DeletedCount int `json:"deleted_count"`
}

func (r *ArchiveRepositoryImpl) ArchiveOldPageViews() (int, error) {
	var results []rpcArchivedResult
	resp, err := r.supabase.Client().R().
		SetResult(&results).
		Post("/rest/v1/rpc/archive_old_page_views")
	if err != nil {
		return 0, fmt.Errorf("archive_old_page_views failed: %w", err)
	}
	if resp.IsError() {
		return 0, fmt.Errorf("archive_old_page_views failed: %s", resp.String())
	}
	if len(results) == 0 {
		return 0, nil
	}
	return results[0].ArchivedCount, nil
}

func (r *ArchiveRepositoryImpl) ArchiveOldAnalyticsEvents() (int, error) {
	var results []rpcArchivedResult
	resp, err := r.supabase.Client().R().
		SetResult(&results).
		Post("/rest/v1/rpc/archive_old_analytics_events")
	if err != nil {
		return 0, fmt.Errorf("archive_old_analytics_events failed: %w", err)
	}
	if resp.IsError() {
		return 0, fmt.Errorf("archive_old_analytics_events failed: %s", resp.String())
	}
	if len(results) == 0 {
		return 0, nil
	}
	return results[0].ArchivedCount, nil
}

func (r *ArchiveRepositoryImpl) DeleteOldPayments() (int, error) {
	var results []rpcDeletedResult
	resp, err := r.supabase.Client().R().
		SetResult(&results).
		Post("/rest/v1/rpc/delete_old_payments")
	if err != nil {
		return 0, fmt.Errorf("delete_old_payments failed: %w", err)
	}
	if resp.IsError() {
		return 0, fmt.Errorf("delete_old_payments failed: %s", resp.String())
	}
	if len(results) == 0 {
		return 0, nil
	}
	return results[0].DeletedCount, nil
}
