package handler

import (
	"net/http"
	"strings"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/httpapi"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/labstack/echo/v4"
)

// ReservationHandler は予約HTTPハンドラー
type ReservationHandler struct {
	usecase usecase.ReservationUsecase
}

// NewReservationHandler は ReservationHandler を生成する
func NewReservationHandler(uc usecase.ReservationUsecase) *ReservationHandler {
	return &ReservationHandler{usecase: uc}
}

// Create は POST /reservations を処理する
func (h *ReservationHandler) Create(c echo.Context) error {
	var body struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		BookingType string `json:"booking_type"`
		BookingDate string `json:"booking_date"`
		TimeSlotID  string `json:"time_slot_id"`
		StoreID     string `json:"store_id"`
		Notes       string `json:"notes"`
	}
	if err := c.Bind(&body); err != nil {
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, "invalid request body")
	}

	result, err := h.usecase.Create(domain.ReservationRequest{
		Name:        body.Name,
		Email:       body.Email,
		Phone:       body.Phone,
		BookingType: body.BookingType,
		BookingDate: body.BookingDate,
		TimeSlotID:  body.TimeSlotID,
		StoreID:     body.StoreID,
		Notes:       body.Notes,
	})
	if err != nil {
		return reservationErrorResponse(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"booking": map[string]interface{}{
			"id":           result.ID,
			"qr_token":     result.QRToken,
			"date":         result.BookingDate,
			"start_time":   result.StartTime,
			"end_time":     result.EndTime,
			"booking_type": result.BookingType,
		},
	})
}

// reservationErrorResponse は予約エラーを適切なHTTPステータスに変換する
func reservationErrorResponse(c echo.Context, err error) error {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "required") || strings.Contains(msg, "invalid booking_type"):
		return httpapi.WriteBadRequest(c, httpapi.ErrorCodeInvalidRequest, msg)
	case strings.Contains(msg, "time slot not found"):
		return httpapi.WriteBadRequest(c, "TIME_SLOT_NOT_FOUND", "指定された時間枠が見つかりません")
	case strings.Contains(msg, "time slot inactive"):
		return httpapi.WriteBadRequest(c, "TIME_SLOT_INACTIVE", "この時間枠は現在受付していません")
	case strings.Contains(msg, "not allowed"):
		return httpapi.WriteBadRequest(c, "BOOKING_TYPE_NOT_ALLOWED", "この時間枠では指定の予約種別は受け付けていません")
	case strings.Contains(msg, "duplicate_booking"):
		return httpapi.WriteError(c, http.StatusConflict, "DUPLICATE_BOOKING", "同日に既に予約済みです")
	case strings.Contains(msg, "capacity_exceeded"):
		return httpapi.WriteError(c, http.StatusConflict, "CAPACITY_EXCEEDED", "この時間枠は満席です")
	default:
		return httpapi.WriteError(c, http.StatusInternalServerError, httpapi.ErrorCodeInternal, "予約処理に失敗しました")
	}
}
