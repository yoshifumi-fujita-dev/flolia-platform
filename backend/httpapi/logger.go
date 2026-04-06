package httpapi

import (
	"fmt"
	"time"

	"github.com/labstack/echo/v4"
)

type LogLevel string

const (
	LogLevelInfo  LogLevel = "info"
	LogLevelWarn  LogLevel = "warn"
	LogLevelError LogLevel = "error"
)

type LogEntry struct {
	Time      string   `json:"time"`
	Level     LogLevel `json:"level"`
	RequestID string   `json:"request_id,omitempty"`
	Method    string   `json:"method,omitempty"`
	Path      string   `json:"path,omitempty"`
	Status    int      `json:"status,omitempty"`
	ErrorCode string   `json:"error_code,omitempty"`
	Message   string   `json:"message"`
	StaffID   string   `json:"staff_id,omitempty"`
}

func (e LogEntry) write() {
	fmt.Printf("[%s] %s %s %s %d %s %s\n",
		e.Level, e.Time[:19], e.Method, e.Path, e.Status, e.ErrorCode, e.Message)
}

// RequestID はEchoコンテキストからリクエストIDを取得する
func RequestID(c echo.Context) string {
	id := c.Request().Header.Get("X-Request-Id")
	if id == "" {
		id = c.Response().Header().Get("X-Request-Id")
	}
	return id
}

func LogAuthDenied(c echo.Context, errorCode, message string) {
	LogEntry{
		Time:      time.Now().UTC().Format(time.RFC3339),
		Level:     LogLevelWarn,
		RequestID: RequestID(c),
		Method:    c.Request().Method,
		Path:      c.Request().URL.Path,
		Status:    401,
		ErrorCode: errorCode,
		Message:   message,
	}.write()
}

func LogPermissionDenied(c echo.Context, errorCode, staffID, message string) {
	LogEntry{
		Time:      time.Now().UTC().Format(time.RFC3339),
		Level:     LogLevelWarn,
		RequestID: RequestID(c),
		Method:    c.Request().Method,
		Path:      c.Request().URL.Path,
		Status:    403,
		ErrorCode: errorCode,
		StaffID:   staffID,
		Message:   message,
	}.write()
}

func LogError(c echo.Context, errorCode, message string, err error) {
	detail := message
	if err != nil {
		detail = fmt.Sprintf("%s: %v", message, err)
	}
	LogEntry{
		Time:      time.Now().UTC().Format(time.RFC3339),
		Level:     LogLevelError,
		RequestID: RequestID(c),
		Method:    c.Request().Method,
		Path:      c.Request().URL.Path,
		Status:    500,
		ErrorCode: errorCode,
		Message:   detail,
	}.write()
}

// Production logging format is intentionally omitted in this public edition.
