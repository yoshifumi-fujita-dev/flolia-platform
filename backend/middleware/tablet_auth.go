package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/flolia/flolia-project/backend/httpapi"
	"github.com/flolia/flolia-project/backend/infrastructure"
	"github.com/labstack/echo/v4"
)

// TabletSession はタブレットセッション情報
type TabletSession struct {
	StaffID   string
	StaffName string
	StoreID   string
}

// TabletAuth はX-Tablet-TokenヘッダーでタブレットセッションをDBから検証するミドルウェア
func TabletAuth(supabase *infrastructure.SupabaseClient) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := c.Request().Header.Get("X-Tablet-Token")
			if token == "" {
				httpapi.LogAuthDenied(c, "TABLET_TOKEN_REQUIRED", "X-Tablet-Token header is missing")
				return httpapi.WriteError(c, http.StatusUnauthorized, "TABLET_TOKEN_REQUIRED", "X-Tablet-Token header is required")
			}

			session, err := validateTabletSession(supabase, token)
			if err != nil || session == nil {
				httpapi.LogAuthDenied(c, "INVALID_TABLET_SESSION", "invalid or expired tablet session")
				return httpapi.WriteError(c, http.StatusUnauthorized, "INVALID_TABLET_SESSION", "invalid or expired tablet session")
			}

			c.Set("tablet_session", session)
			return next(c)
		}
	}
}

// validateTabletSession はDBでタブレットセッションを検証する
func validateTabletSession(supabase *infrastructure.SupabaseClient, token string) (*TabletSession, error) {
	var rows []struct {
		StaffID   string `json:"staff_id"`
		StaffName string `json:"staff_name"`
		StoreID   string `json:"store_id"`
		ExpiresAt string `json:"expires_at"`
	}

	resp, err := supabase.Client().R().
		SetQueryParams(map[string]string{
			"token":      "eq." + token,
			"expires_at": "gt." + time.Now().UTC().Format(time.RFC3339),
			"select":     "staff_id,staff_name,store_id,expires_at",
			"limit":      "1",
		}).
		SetResult(&rows).
		Get("/rest/v1/tablet_sessions")
	if err != nil {
		return nil, fmt.Errorf("validate tablet session: %w", err)
	}
	if resp.IsError() {
		return nil, fmt.Errorf("validate tablet session: %s", resp.String())
	}
	if len(rows) == 0 {
		return nil, nil
	}

	return &TabletSession{
		StaffID:   rows[0].StaffID,
		StaffName: rows[0].StaffName,
		StoreID:   rows[0].StoreID,
	}, nil
}
