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

type MockReminderRepository struct {
	mock.Mock
}

func (m *MockReminderRepository) FetchTomorrowBookings() ([]*domain.Booking, error) {
	args := m.Called()
	return args.Get(0).([]*domain.Booking), args.Error(1)
}

func (m *MockReminderRepository) SendReminderEmail(booking *domain.Booking, dateFormatted, timeFormatted string) error {
	args := m.Called(booking, dateFormatted, timeFormatted)
	return args.Error(0)
}

func (m *MockReminderRepository) SendReminderLine(lineUserID string, booking *domain.Booking, dateFormatted, timeFormatted string) error {
	args := m.Called(lineUserID, booking, dateFormatted, timeFormatted)
	return args.Error(0)
}

// --- Helpers ---

func newBooking(id, bookingType, date, lineUserID string) *domain.Booking {
	return &domain.Booking{
		ID:          id,
		Name:        "山田 花子",
		Email:       "hanako@example.com",
		BookingType: bookingType,
		BookingDate: date,
		StartTime:   "10:00:00",
		EndTime:     "11:00:00",
		LineUserID:  lineUserID,
	}
}

// --- Tests ---

func TestReminder_NoBookings(t *testing.T) {
	repo := new(MockReminderRepository)
	repo.On("FetchTomorrowBookings").Return([]*domain.Booking{}, nil)

	uc := usecase.NewReminderUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 0, result.Sent)
	assert.Equal(t, 0, result.Failed)
	repo.AssertExpectations(t)
}

func TestReminder_SendsEmailAndLine(t *testing.T) {
	booking := newBooking("b1", "trial", "2026-04-05", "U_line_123")

	repo := new(MockReminderRepository)
	repo.On("FetchTomorrowBookings").Return([]*domain.Booking{booking}, nil)
	repo.On("SendReminderEmail", booking, "2026年4月5日(日)", "10:00〜11:00").Return(nil)
	repo.On("SendReminderLine", "U_line_123", booking, "2026年4月5日(日)", "10:00〜11:00").Return(nil)

	uc := usecase.NewReminderUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Sent)
	assert.Equal(t, 0, result.Failed)
	repo.AssertExpectations(t)
}

func TestReminder_SendsEmailOnly_WhenNoLineUserID(t *testing.T) {
	booking := newBooking("b1", "trial", "2026-04-05", "") // LINE なし

	repo := new(MockReminderRepository)
	repo.On("FetchTomorrowBookings").Return([]*domain.Booking{booking}, nil)
	repo.On("SendReminderEmail", booking, "2026年4月5日(日)", "10:00〜11:00").Return(nil)

	uc := usecase.NewReminderUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Sent)
	repo.AssertNotCalled(t, "SendReminderLine")
	repo.AssertExpectations(t)
}

func TestReminder_EmailFailure_CountsAsFailed(t *testing.T) {
	booking := newBooking("b1", "trial", "2026-04-05", "")

	repo := new(MockReminderRepository)
	repo.On("FetchTomorrowBookings").Return([]*domain.Booking{booking}, nil)
	repo.On("SendReminderEmail", booking, mock.Anything, mock.Anything).Return(errors.New("smtp error"))

	uc := usecase.NewReminderUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 0, result.Sent)
	assert.Equal(t, 1, result.Failed)
	repo.AssertExpectations(t)
}

func TestReminder_LineFailure_DoesNotAffectSentCount(t *testing.T) {
	booking := newBooking("b1", "trial", "2026-04-05", "U_line_123")

	repo := new(MockReminderRepository)
	repo.On("FetchTomorrowBookings").Return([]*domain.Booking{booking}, nil)
	repo.On("SendReminderEmail", booking, mock.Anything, mock.Anything).Return(nil)
	repo.On("SendReminderLine", "U_line_123", booking, mock.Anything, mock.Anything).Return(errors.New("line error"))

	uc := usecase.NewReminderUsecase(repo)
	result, err := uc.Run()

	// LINE失敗はメール成功済みなのでsentとしてカウント
	assert.NoError(t, err)
	assert.Equal(t, 1, result.Sent)
	assert.Equal(t, 0, result.Failed)
	repo.AssertExpectations(t)
}

func TestReminder_MultipleBookings(t *testing.T) {
	b1 := newBooking("b1", "trial", "2026-04-05", "U_001")
	b2 := newBooking("b2", "observation", "2026-04-05", "")
	b3 := newBooking("b3", "trial", "2026-04-05", "")

	repo := new(MockReminderRepository)
	repo.On("FetchTomorrowBookings").Return([]*domain.Booking{b1, b2, b3}, nil)
	repo.On("SendReminderEmail", b1, mock.Anything, mock.Anything).Return(nil)
	repo.On("SendReminderLine", "U_001", b1, mock.Anything, mock.Anything).Return(nil)
	repo.On("SendReminderEmail", b2, mock.Anything, mock.Anything).Return(nil)
	repo.On("SendReminderEmail", b3, mock.Anything, mock.Anything).Return(errors.New("failed"))

	uc := usecase.NewReminderUsecase(repo)
	result, err := uc.Run()

	assert.NoError(t, err)
	assert.Equal(t, 2, result.Sent)
	assert.Equal(t, 1, result.Failed)
	repo.AssertExpectations(t)
}
