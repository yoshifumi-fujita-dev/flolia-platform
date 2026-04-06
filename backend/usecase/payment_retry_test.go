package usecase_test

import (
	"errors"
	"testing"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockPaymentRetryRepository struct {
	mock.Mock
}

func (m *MockPaymentRetryRepository) FetchPendingRetries() ([]*domain.PaymentRetry, error) {
	args := m.Called()
	return args.Get(0).([]*domain.PaymentRetry), args.Error(1)
}

func (m *MockPaymentRetryRepository) RetryInvoicePayment(invoiceID string) error {
	args := m.Called(invoiceID)
	return args.Error(0)
}

func (m *MockPaymentRetryRepository) MarkRetrySucceeded(retryID string, retryCount int) error {
	args := m.Called(retryID, retryCount)
	return args.Error(0)
}

func (m *MockPaymentRetryRepository) MarkRetryFailed(retryID string, retryCount int, errMsg string) error {
	args := m.Called(retryID, retryCount, errMsg)
	return args.Error(0)
}

func (m *MockPaymentRetryRepository) ScheduleNextRetry(retryID string, retryCount int, nextRetryAt string, errMsg string) error {
	args := m.Called(retryID, retryCount, nextRetryAt, errMsg)
	return args.Error(0)
}

func (m *MockPaymentRetryRepository) UpdateMemberStatus(memberID string, status string) error {
	args := m.Called(memberID, status)
	return args.Error(0)
}

func (m *MockPaymentRetryRepository) SendPaymentFailedLine(lineUserID string, memberName string, isFinal bool) error {
	args := m.Called(lineUserID, memberName, isFinal)
	return args.Error(0)
}

// --- Helpers ---

func newRetry(id, invoiceID, memberID, lineUserID string, retryCount, maxRetries int) *domain.PaymentRetry {
	return &domain.PaymentRetry{
		ID:               id,
		MemberID:         memberID,
		StripeInvoiceID:  invoiceID,
		RetryCount:       retryCount,
		MaxRetries:       maxRetries,
		MemberName:       "山田 花子",
		MemberEmail:      "hanako@example.com",
		MemberLineUserID: lineUserID,
	}
}

// --- Tests ---

func TestPaymentRetry_NoPendingRetries(t *testing.T) {
	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{}, nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 0, result.Processed)
	repo.AssertExpectations(t)
}

func TestPaymentRetry_SuccessfulRetry(t *testing.T) {
	retry := newRetry("r1", "inv_001", "m1", "", 0, 3)

	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{retry}, nil)
	repo.On("RetryInvoicePayment", "inv_001").Return(nil)
	repo.On("MarkRetrySucceeded", "r1", 1).Return(nil)
	repo.On("UpdateMemberStatus", "m1", "active").Return(nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Processed)
	assert.Equal(t, 1, result.Succeeded)
	assert.Equal(t, 0, result.Failed)
	assert.Equal(t, 0, result.Rescheduled)
	repo.AssertExpectations(t)
}

func TestPaymentRetry_FailAndReschedule_WhenBelowMaxRetries(t *testing.T) {
	retry := newRetry("r1", "inv_001", "m1", "", 1, 3) // retryCount=1, max=3

	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{retry}, nil)
	repo.On("RetryInvoicePayment", "inv_001").Return(errors.New("card declined"))
	repo.On("ScheduleNextRetry", "r1", 2, mock.AnythingOfType("string"), "card declined").Return(nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Processed)
	assert.Equal(t, 0, result.Succeeded)
	assert.Equal(t, 0, result.Failed)
	assert.Equal(t, 1, result.Rescheduled)
	repo.AssertNotCalled(t, "MarkRetryFailed")
	repo.AssertNotCalled(t, "UpdateMemberStatus")
	repo.AssertExpectations(t)
}

func TestPaymentRetry_FinalFailure_WhenAtMaxRetries(t *testing.T) {
	retry := newRetry("r1", "inv_001", "m1", "", 2, 3) // retryCount=2, max=3 → 次で最終

	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{retry}, nil)
	repo.On("RetryInvoicePayment", "inv_001").Return(errors.New("insufficient funds"))
	repo.On("MarkRetryFailed", "r1", 3, "insufficient funds").Return(nil)
	repo.On("UpdateMemberStatus", "m1", "paused").Return(nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Failed)
	assert.Equal(t, 0, result.Rescheduled)
	repo.AssertNotCalled(t, "ScheduleNextRetry")
	repo.AssertExpectations(t)
}

func TestPaymentRetry_FinalFailure_SendsLineNotification(t *testing.T) {
	retry := newRetry("r1", "inv_001", "m1", "U_line_123", 2, 3)

	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{retry}, nil)
	repo.On("RetryInvoicePayment", "inv_001").Return(errors.New("card error"))
	repo.On("MarkRetryFailed", "r1", 3, "card error").Return(nil)
	repo.On("UpdateMemberStatus", "m1", "paused").Return(nil)
	repo.On("SendPaymentFailedLine", "U_line_123", "山田 花子", true).Return(nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Failed)
	repo.AssertExpectations(t)
}

func TestPaymentRetry_NoLineNotification_WhenNoLineUserID(t *testing.T) {
	retry := newRetry("r1", "inv_001", "m1", "", 2, 3) // lineUserID なし

	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{retry}, nil)
	repo.On("RetryInvoicePayment", "inv_001").Return(errors.New("card error"))
	repo.On("MarkRetryFailed", "r1", 3, "card error").Return(nil)
	repo.On("UpdateMemberStatus", "m1", "paused").Return(nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	_, err := uc.Run()

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "SendPaymentFailedLine")
	repo.AssertExpectations(t)
}

func TestPaymentRetry_MultipleRetries_MixedResults(t *testing.T) {
	r1 := newRetry("r1", "inv_001", "m1", "", 0, 3) // 成功
	r2 := newRetry("r2", "inv_002", "m2", "", 1, 3) // 失敗→再スケジュール
	r3 := newRetry("r3", "inv_003", "m3", "", 2, 3) // 最終失敗

	repo := new(MockPaymentRetryRepository)
	repo.On("FetchPendingRetries").Return([]*domain.PaymentRetry{r1, r2, r3}, nil)

	repo.On("RetryInvoicePayment", "inv_001").Return(nil)
	repo.On("MarkRetrySucceeded", "r1", 1).Return(nil)
	repo.On("UpdateMemberStatus", "m1", "active").Return(nil)

	repo.On("RetryInvoicePayment", "inv_002").Return(errors.New("declined"))
	repo.On("ScheduleNextRetry", "r2", 2, mock.AnythingOfType("string"), "declined").Return(nil)

	repo.On("RetryInvoicePayment", "inv_003").Return(errors.New("declined"))
	repo.On("MarkRetryFailed", "r3", 3, "declined").Return(nil)
	repo.On("UpdateMemberStatus", "m3", "paused").Return(nil)

	uc := usecase.NewPaymentRetryUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 3, result.Processed)
	assert.Equal(t, 1, result.Succeeded)
	assert.Equal(t, 1, result.Rescheduled)
	assert.Equal(t, 1, result.Failed)
	repo.AssertExpectations(t)
}
