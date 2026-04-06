package handler

import (
	"net/http"
	"strings"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/httpapi"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/labstack/echo/v4"
)

// CheckinHandler は入退館HTTPハンドラー
type CheckinHandler struct {
	usecase usecase.CheckinUsecase
}

// NewCheckinHandler は CheckinHandler を生成する
func NewCheckinHandler(uc usecase.CheckinUsecase) *CheckinHandler {
	return &CheckinHandler{usecase: uc}
}

// Checkin は POST /checkins を処理する
func (h *CheckinHandler) Checkin(c echo.Context) error {
	var body struct {
		MemberID string `json:"member_id"`
		StoreID  string `json:"store_id"`
	}
	if err := c.Bind(&body); err != nil {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "invalid request body")
	}
	if body.MemberID == "" {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "member_id is required")
	}

	result, err := h.usecase.Checkin(domain.CheckinRequest{
		MemberID: body.MemberID,
		StoreID:  body.StoreID,
	})
	if err != nil {
		return checkinErrorResponse(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":       true,
		"attendance_id": result.AttendanceID,
		"check_in_at":   result.CheckInAt,
		"member_name":   result.MemberName,
		"skipped":       result.Skipped,
	})
}

// Checkout は POST /checkouts を処理する
func (h *CheckinHandler) Checkout(c echo.Context) error {
	var body struct {
		MemberID string `json:"member_id"`
	}
	if err := c.Bind(&body); err != nil {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "invalid request body")
	}
	if body.MemberID == "" {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "member_id is required")
	}

	result, err := h.usecase.Checkout(domain.CheckoutRequest{MemberID: body.MemberID})
	if err != nil {
		return checkoutErrorResponse(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":          true,
		"duration_minutes": result.DurationMinutes,
		"skipped":          result.Skipped,
	})
}

// checkinErrorResponse はCheckinエラーを適切なHTTPステータスに変換する
func checkinErrorResponse(c echo.Context, err error) error {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "member not found"):
		return httpapi.WriteError(c, http.StatusNotFound, "MEMBER_NOT_FOUND", "会員情報が見つかりません")
	case strings.Contains(msg, "cannot check in"):
		return httpapi.WriteBadRequest(c, "CHECKIN_NOT_ALLOWED", msg)
	default:
		return httpapi.WriteError(c, http.StatusInternalServerError, httpapi.ErrorCodeInternal, "入館処理に失敗しました")
	}
}

func checkoutErrorResponse(c echo.Context, err error) error {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "member not found"):
		return httpapi.WriteError(c, http.StatusNotFound, "MEMBER_NOT_FOUND", "会員情報が見つかりません")
	default:
		return httpapi.WriteError(c, http.StatusInternalServerError, httpapi.ErrorCodeInternal, "退館処理に失敗しました")
	}
}
