package httpapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

const (
	ErrorCodeInvalidRequest      = "INVALID_REQUEST"
	ErrorCodeUnauthorized        = "UNAUTHORIZED"
	ErrorCodeNotFound            = "NOT_FOUND"
	ErrorCodeConflict            = "CONFLICT"
	ErrorCodeInternal            = "INTERNAL_ERROR"
	ErrorCodeUpstreamUnavailable = "UPSTREAM_UNAVAILABLE"
)

type ErrorResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	ErrorCode string `json:"error_code"`
}

func NewErrorResponse(code, message string) ErrorResponse {
	return ErrorResponse{
		Success:   false,
		Error:     message,
		ErrorCode: code,
	}
}

func WriteError(c echo.Context, status int, code, message string) error {
	return c.JSON(status, NewErrorResponse(code, message))
}

func WriteBadRequest(c echo.Context, code, message string) error {
	if code == "" {
		code = ErrorCodeInvalidRequest
	}
	return WriteError(c, http.StatusBadRequest, code, message)
}
