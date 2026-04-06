package handler_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/handler"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockMemberContractUsecase struct {
	mock.Mock
}

func (m *MockMemberContractUsecase) Pause(req domain.PauseRequest) (*domain.ContractResult, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContractResult), args.Error(1)
}

func (m *MockMemberContractUsecase) Resume(req domain.ResumeRequest) (*domain.ContractResult, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContractResult), args.Error(1)
}

func (m *MockMemberContractUsecase) Cancel(req domain.CancelRequest) (*domain.ContractResult, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContractResult), args.Error(1)
}

// --- ヘルパー ---

func newEchoContextWithMemberID(method, path, memberID, body string) (echo.Context, *httptest.ResponseRecorder) {
	c, rec := newEchoContext(method, path, body)
	c.SetParamNames("id")
	c.SetParamValues(memberID)
	return c, rec
}

func contractSuccessResult(memberID, status string) *domain.ContractResult {
	return &domain.ContractResult{
		MemberID:   memberID,
		Status:     status,
		MemberName: "山田 花子",
	}
}

// --- Pause テスト ---

func TestMemberContractHandler_Pause_Success(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Pause", domain.PauseRequest{MemberID: "m1"}).
		Return(contractSuccessResult("m1", "paused"), nil)

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m1/pause", "m1", `{}`)

	err := h.Pause(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, true, body["success"])
	assert.Equal(t, "paused", body["status"])
	assert.Equal(t, "m1", body["member_id"])
}

func TestMemberContractHandler_Pause_AlreadyPaused(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Pause", mock.Anything).
		Return(nil, errors.New("already paused"))

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m1/pause", "m1", `{}`)

	err := h.Pause(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusConflict, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "ALREADY_PAUSED", body["error_code"])
}

func TestMemberContractHandler_Pause_MemberNotFound(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Pause", mock.Anything).
		Return(nil, errors.New("member not found: m999"))

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m999/pause", "m999", `{}`)

	err := h.Pause(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "MEMBER_NOT_FOUND", body["error_code"])
}

// --- Resume テスト ---

func TestMemberContractHandler_Resume_Success(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Resume", domain.ResumeRequest{MemberID: "m1"}).
		Return(contractSuccessResult("m1", "active"), nil)

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m1/resume", "m1", ``)

	err := h.Resume(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "active", body["status"])
}

func TestMemberContractHandler_Resume_NotPaused(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Resume", mock.Anything).
		Return(nil, errors.New("not paused: current status is active"))

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m1/resume", "m1", ``)

	err := h.Resume(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "NOT_PAUSED", body["error_code"])
}

// --- Cancel テスト ---

func TestMemberContractHandler_Cancel_Success(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Cancel", domain.CancelRequest{MemberID: "m1", Reason: "引越し"}).
		Return(contractSuccessResult("m1", "canceled"), nil)

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m1/cancel", "m1", `{"reason":"引越し"}`)

	err := h.Cancel(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "canceled", body["status"])
}

func TestMemberContractHandler_Cancel_AlreadyCanceled(t *testing.T) {
	uc := new(MockMemberContractUsecase)
	uc.On("Cancel", mock.Anything).
		Return(nil, errors.New("already canceled"))

	h := handler.NewMemberContractHandler(uc)
	c, rec := newEchoContextWithMemberID(http.MethodPost, "/members/m1/cancel", "m1", `{}`)

	err := h.Cancel(c)
	assert.NoError(t, err)
	assert.Equal(t, http.StatusConflict, rec.Code)

	body := parseBody(t, rec)
	assert.Equal(t, "ALREADY_CANCELED", body["error_code"])
}
