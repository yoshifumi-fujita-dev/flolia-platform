package infrastructure

import (
	"fmt"
	"os"

	"github.com/go-resty/resty/v2"
)

// SupabaseClient はSupabase REST APIクライアント
type SupabaseClient struct {
	client  *resty.Client
	baseURL string
}

// NewSupabaseClient はSupabaseクライアントを作成する
func NewSupabaseClient() (*SupabaseClient, error) {
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if url == "" || key == "" {
		return nil, fmt.Errorf("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set")
	}

	client := resty.New().
		SetBaseURL(url).
		SetHeader("apikey", key).
		SetHeader("Authorization", "Bearer "+key).
		SetHeader("Content-Type", "application/json")

	return &SupabaseClient{client: client, baseURL: url}, nil
}

func (s *SupabaseClient) Client() *resty.Client {
	return s.client
}
