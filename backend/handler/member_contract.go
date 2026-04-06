package handler

import (
	"net/http"
	"strings"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/httpapi"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/labstack/echo/v4"
)

// MemberContractHandler は会員契約HTTPハンドラー
type MemberContractHandler struct {
	usecase usecase.MemberContractUsecase
}

// NewMemberContractHandler は MemberContractHandler を生成する
func NewMemberContractHandler(uc usecase.MemberContractUsecase) *MemberContractHandler {
	return &MemberContractHandler{usecase: uc}
}

// Pause は POST /members/:id/pause を処理する
func (h *MemberContractHandler) Pause(c echo.Context) error {
	memberID := c.Param("id")
	if memberID == "" {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "member_id is required")
	}

	var body struct {
		PausedUntil string `json:"paused_until"`
		Reason      string `json:"reason"`
	}
	if err := c.Bind(&body); err != nil {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "invalid request body")
	}

	result, err := h.usecase.Pause(domain.PauseRequest{
		MemberID:    memberID,
		PausedUntil: body.PausedUntil,
		Reason:      body.Reason,
	})
	if err != nil {
		return contractErrorResponse(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":     true,
		"member_id":   result.MemberID,
		"status":      result.Status,
		"member_name": result.MemberName,
	})
}

// Resume は POST /members/:id/resume を処理する
func (h *MemberContractHandler) Resume(c echo.Context) error {
	memberID := c.Param("id")
	if memberID == "" {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "member_id is required")
	}

	result, err := h.usecase.Resume(domain.ResumeRequest{MemberID: memberID})
	if err != nil {
		return contractErrorResponse(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":     true,
		"member_id":   result.MemberID,
		"status":      result.Status,
		"member_name": result.MemberName,
	})
}

// Cancel は POST /members/:id/cancel を処理する
func (h *MemberContractHandler) Cancel(c echo.Context) error {
	memberID := c.Param("id")
	if memberID == "" {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "member_id is required")
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := c.Bind(&body); err != nil {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "invalid request body")
	}

	result, err := h.usecase.Cancel(domain.CancelRequest{
		MemberID: memberID,
		Reason:   body.Reason,
	})
	if err != nil {
		return contractErrorResponse(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":     true,
		"member_id":   result.MemberID,
		"status":      result.Status,
		"member_name": result.MemberName,
	})
}

// contractErrorResponse は会員契約エラーを適切なHTTPステータスに変換する
func contractErrorResponse(c echo.Context, err error) error {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "member not found"):
		return httpapi.WriteError(c, http.StatusNotFound, "MEMBER_NOT_FOUND", "会員情報が見つかりません")
	case strings.Contains(msg, "already paused"):
		return httpapi.WriteError(c, http.StatusConflict, "ALREADY_PAUSED", "すでに休会中です")
	case strings.Contains(msg, "already canceled"):
		return httpapi.WriteError(c, http.StatusConflict, "ALREADY_CANCELED", "すでに退会済みです")
	case strings.Contains(msg, "not paused"):
		return httpapi.WriteBadRequest(c, "NOT_PAUSED", "休会中ではありません")
	case strings.Contains(msg, "invalid status"):
		return httpapi.WriteBadRequest(c, "INVALID_MEMBER_STATUS", msg)
	default:
		return httpapi.WriteError(c, http.StatusInternalServerError, httpapi.ErrorCodeInternal, "処理に失敗しました")
	}
}
