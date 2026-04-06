package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/handler"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockCheckinUsecase struct {
	mock.Mock
}

func (m *MockCheckinUsecase) Checkin(req domain.CheckinRequest) (*domain.CheckinResult, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CheckinResult), args.Error(1)
}

func (m *MockCheckinUsecase) Checkout(req domain.CheckoutRequest) (*domain.CheckoutResult, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CheckoutResult), args.Error(1)
}

// --- ヘルパー ---

func newEchoContext(method, path, body string) (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func parseBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]interface{} {
	t.Helper()
	var result map[string]interface{}
	err := json.Unmarshal(rec.Body.Bytes(), &result)
	assert.NoError(t, err)
	return result
}

// --- POST /checkins ---

func TestCheckinHandler_Checkin_Success(t *testing.T) {
	uc := new(MockCheckinUsecase)
	uc.On("Checkin", domain.CheckinRequest{MemberID: "m1", StoreID: "s1"}).
		Return(&domain.CheckinResult{
			AttendanceID: "a1",
			CheckInAt:    "2026-04-06T09:00:00Z",
			MemberName:   "山田 花子",
			Skipped:      false,
		}, nil)

	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkins", `{"member_id":"m1","store_id":"s1"}`)

	err := h.Checkin(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, true, body["success"])
	assert.Equal(t, "a1", body["attendance_id"])
	assert.Equal(t, "山田 花子", body["member_name"])
	assert.Equal(t, false, body["skipped"])
}

func TestCheckinHandler_Checkin_Skipped(t *testing.T) {
	uc := new(MockCheckinUsecase)
	uc.On("Checkin", domain.CheckinRequest{MemberID: "m1", StoreID: ""}).
		Return(&domain.CheckinResult{MemberName: "山田 花子", Skipped: true}, nil)

	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkins", `{"member_id":"m1"}`)

	err := h.Checkin(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, true, body["skipped"])
}

func TestCheckinHandler_Checkin_MissingMemberID(t *testing.T) {
	uc := new(MockCheckinUsecase)
	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkins", `{}`)

	err := h.Checkin(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, false, body["success"])
	assert.Equal(t, "INVALID_REQUEST", body["error_code"])
	uc.AssertNotCalled(t, "Checkin")
}

func TestCheckinHandler_Checkin_MemberNotFound(t *testing.T) {
	uc := new(MockCheckinUsecase)
	uc.On("Checkin", mock.Anything).Return(nil, &memberNotFoundError{})

	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkins", `{"member_id":"unknown"}`)

	err := h.Checkin(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "MEMBER_NOT_FOUND", body["error_code"])
}

func TestCheckinHandler_Checkin_NotAllowed(t *testing.T) {
	uc := new(MockCheckinUsecase)
	uc.On("Checkin", mock.Anything).Return(nil, &checkinNotAllowedError{})

	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkins", `{"member_id":"m1"}`)

	err := h.Checkin(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "CHECKIN_NOT_ALLOWED", body["error_code"])
}

// --- POST /checkouts ---

func TestCheckinHandler_Checkout_Success(t *testing.T) {
	uc := new(MockCheckinUsecase)
	uc.On("Checkout", domain.CheckoutRequest{MemberID: "m1"}).
		Return(&domain.CheckoutResult{DurationMinutes: 45, Skipped: false}, nil)

	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkouts", `{"member_id":"m1"}`)

	err := h.Checkout(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, true, body["success"])
	assert.Equal(t, float64(45), body["duration_minutes"])
	assert.Equal(t, false, body["skipped"])
}

func TestCheckinHandler_Checkout_Skipped(t *testing.T) {
	uc := new(MockCheckinUsecase)
	uc.On("Checkout", domain.CheckoutRequest{MemberID: "m1"}).
		Return(&domain.CheckoutResult{Skipped: true}, nil)

	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkouts", `{"member_id":"m1"}`)

	err := h.Checkout(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, true, body["skipped"])
}

func TestCheckinHandler_Checkout_MissingMemberID(t *testing.T) {
	uc := new(MockCheckinUsecase)
	h := handler.NewCheckinHandler(uc)
	c, rec := newEchoContext(http.MethodPost, "/checkouts", `{}`)

	err := h.Checkout(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "INVALID_REQUEST", body["error_code"])
	uc.AssertNotCalled(t, "Checkout")
}

// --- エラー型ヘルパー ---

type memberNotFoundError struct{}

func (e *memberNotFoundError) Error() string { return "member not found: unknown" }

type checkinNotAllowedError struct{}

func (e *checkinNotAllowedError) Error() string {
	return `member status is "paused": cannot check in`
}
