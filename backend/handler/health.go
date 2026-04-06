package handler

import (
	"net/http"

	"github.com/flolia/flolia-project/backend/httpapi"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/labstack/echo/v4"
)

// HealthHandler はヘルスチェックのHTTPハンドラー
type HealthHandler struct {
	usecase *usecase.HealthUsecase
}

func NewHealthHandler(uc *usecase.HealthUsecase) *HealthHandler {
	return &HealthHandler{usecase: uc}
}

func (h *HealthHandler) Check(c echo.Context) error {
	status, err := h.usecase.Check()
	if err != nil {
		return httpapi.WriteError(c, http.StatusInternalServerError, httpapi.ErrorCodeInternal, "ヘルスチェックに失敗しました")
	}
	return c.JSON(http.StatusOK, status)
}
