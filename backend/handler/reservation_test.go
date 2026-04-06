package handler_test

import (
	"errors"
	"net/http"
	"testing"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/handler"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockReservationUsecase struct {
	mock.Mock
}

func (m *MockReservationUsecase) Create(req domain.ReservationRequest) (*domain.Reservation, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Reservation), args.Error(1)
}

// --- テスト ---

func TestReservationHandler_Create_Success(t *testing.T) {
	uc := new(MockReservationUsecase)
	uc.On("Create", mock.MatchedBy(func(r domain.ReservationRequest) bool {
		return r.Name == "鈴木 太郎" && r.BookingType == "trial"
	})).Return(&domain.Reservation{
		ID:          "b_abc",
		QRToken:     "qr_xyz",
		BookingDate: "2026-04-20",
		StartTime:   "10:00",
		EndTime:     "11:00",
		BookingType: "trial",
	}, nil)

	h := handler.NewReservationHandler(uc)
	body := `{
		"name":"鈴木 太郎",
		"email":"taro@example.com",
		"phone":"09012345678",
		"booking_type":"trial",
		"booking_date":"2026-04-20",
		"time_slot_id":"ts_001"
	}`
	c, rec := newEchoContext(http.MethodPost, "/reservations", body)

	err := h.Create(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	resp := parseBody(t, rec)
	assert.Equal(t, true, resp["success"])
	booking := resp["booking"].(map[string]interface{})
	assert.Equal(t, "b_abc", booking["id"])
	assert.Equal(t, "qr_xyz", booking["qr_token"])
	assert.Equal(t, "trial", booking["booking_type"])
}

func TestReservationHandler_Create_ValidationError(t *testing.T) {
	uc := new(MockReservationUsecase)
	uc.On("Create", mock.Anything).
		Return(nil, errors.New("name, email, phone are required"))

	h := handler.NewReservationHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/reservations", `{}`)

	err := h.Create(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	resp := parseBody(t, rec)
	assert.Equal(t, false, resp["success"])
	assert.Equal(t, "INVALID_REQUEST", resp["error_code"])
}

func TestReservationHandler_Create_DuplicateBooking(t *testing.T) {
	uc := new(MockReservationUsecase)
	uc.On("Create", mock.Anything).
		Return(nil, errors.New("duplicate_booking"))

	h := handler.NewReservationHandler(uc)
	body := `{
		"name":"テスト",
		"email":"t@example.com",
		"phone":"09000000000",
		"booking_type":"trial",
		"booking_date":"2026-04-20",
		"time_slot_id":"ts_001"
	}`
	c, rec := newEchoContext(http.MethodPost, "/reservations", body)

	err := h.Create(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusConflict, rec.Code)

	resp := parseBody(t, rec)
	assert.Equal(t, "DUPLICATE_BOOKING", resp["error_code"])
}

func TestReservationHandler_Create_CapacityExceeded(t *testing.T) {
	uc := new(MockReservationUsecase)
	uc.On("Create", mock.Anything).
		Return(nil, errors.New("capacity_exceeded"))

	h := handler.NewReservationHandler(uc)
	body := `{
		"name":"テスト",
		"email":"t@example.com",
		"phone":"09000000000",
		"booking_type":"trial",
		"booking_date":"2026-04-20",
		"time_slot_id":"ts_001"
	}`
	c, rec := newEchoContext(http.MethodPost, "/reservations", body)

	err := h.Create(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusConflict, rec.Code)

	resp := parseBody(t, rec)
	assert.Equal(t, "CAPACITY_EXCEEDED", resp["error_code"])
}

func TestReservationHandler_Create_TimeSlotNotFound(t *testing.T) {
	uc := new(MockReservationUsecase)
	uc.On("Create", mock.Anything).
		Return(nil, errors.New("time slot not found: ts_999"))

	h := handler.NewReservationHandler(uc)
	body := `{
		"name":"テスト",
		"email":"t@example.com",
		"phone":"09000000000",
		"booking_type":"trial",
		"booking_date":"2026-04-20",
		"time_slot_id":"ts_999"
	}`
	c, rec := newEchoContext(http.MethodPost, "/reservations", body)

	err := h.Create(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	resp := parseBody(t, rec)
	assert.Equal(t, "TIME_SLOT_NOT_FOUND", resp["error_code"])
}
