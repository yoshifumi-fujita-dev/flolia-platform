package infrastructure

import (
	"fmt"
	"strings"

	"github.com/flolia/flolia-project/backend/repository"
)

type AnalyticsRepositoryImpl struct {
	supabase *SupabaseClient
}

func NewAnalyticsRepository(supabase *SupabaseClient) *AnalyticsRepositoryImpl {
	return &AnalyticsRepositoryImpl{supabase: supabase}
}

func (r *AnalyticsRepositoryImpl) AggregateDailyAnalytics(targetDate string) error {
	resp, err := r.supabase.Client().R().
		SetBody(map[string]string{"target_date": targetDate}).
		Post("/rest/v1/rpc/aggregate_daily_analytics")
	if err != nil {
		return fmt.Errorf("aggregate_daily_analytics: %w", err)
	}
	if resp.IsError() {
		body := resp.String()
		// RPC関数が存在しない場合はスキップ
		if strings.Contains(body, "42883") || strings.Contains(body, "undefined") {
			return nil
		}
		return fmt.Errorf("aggregate_daily_analytics: %s", body)
	}
	return nil
}

var _ repository.AnalyticsRepository = (*AnalyticsRepositoryImpl)(nil)
