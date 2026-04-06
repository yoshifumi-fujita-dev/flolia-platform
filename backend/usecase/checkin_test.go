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

type MockCheckinRepository struct {
	mock.Mock
}

func (m *MockCheckinRepository) FindMember(memberID string) (*domain.MemberForCheckin, error) {
	args := m.Called(memberID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.MemberForCheckin), args.Error(1)
}

func (m *MockCheckinRepository) FindActiveAttendance(memberID string) (string, error) {
	args := m.Called(memberID)
	return args.String(0), args.Error(1)
}

func (m *MockCheckinRepository) InsertAttendance(memberID, storeID string) (*domain.CheckinResult, error) {
	args := m.Called(memberID, storeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CheckinResult), args.Error(1)
}

func (m *MockCheckinRepository) UpdateCheckout(attendanceID string) (*domain.CheckoutResult, error) {
	args := m.Called(attendanceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CheckoutResult), args.Error(1)
}

func (m *MockCheckinRepository) SendCheckinNotification(memberID, storeID string) error {
	args := m.Called(memberID, storeID)
	return args.Error(0)
}

// --- ヘルパー ---

func activeMember(id string) *domain.MemberForCheckin {
	return &domain.MemberForCheckin{
		ID:        id,
		FirstName: "花子",
		LastName:  "山田",
		Status:    "active",
	}
}

// --- Checkin テスト ---

func TestCheckin_Success(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindMember", "m1").Return(activeMember("m1"), nil)
	repo.On("FindActiveAttendance", "m1").Return("", nil)
	repo.On("InsertAttendance", "m1", "s1").Return(&domain.CheckinResult{
		AttendanceID: "a1",
		CheckInAt:    "2026-04-04T10:00:00Z",
	}, nil)
	repo.On("SendCheckinNotification", "m1", "s1").Return(nil)

	uc := usecase.NewCheckinUsecase(repo)
	result, err := uc.Checkin(domain.CheckinRequest{MemberID: "m1", StoreID: "s1"})

	assert.NoError(t, err)
	assert.False(t, result.Skipped)
	assert.Equal(t, "a1", result.AttendanceID)
	assert.Equal(t, "山田 花子", result.MemberName)
}

func TestCheckin_AlreadyCheckedIn_Skipped(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindMember", "m1").Return(activeMember("m1"), nil)
	repo.On("FindActiveAttendance", "m1").Return("a_existing", nil)

	uc := usecase.NewCheckinUsecase(repo)
	result, err := uc.Checkin(domain.CheckinRequest{MemberID: "m1", StoreID: "s1"})

	assert.NoError(t, err)
	assert.True(t, result.Skipped)
	repo.AssertNotCalled(t, "InsertAttendance")
}

func TestCheckin_PausedMember_ReturnsError(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindMember", "m1").Return(&domain.MemberForCheckin{
		ID: "m1", Status: "paused",
	}, nil)

	uc := usecase.NewCheckinUsecase(repo)
	_, err := uc.Checkin(domain.CheckinRequest{MemberID: "m1", StoreID: "s1"})

	assert.ErrorContains(t, err, "paused")
	repo.AssertNotCalled(t, "FindActiveAttendance")
	repo.AssertNotCalled(t, "InsertAttendance")
}

func TestCheckin_TrialMember_Allowed(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindMember", "m1").Return(&domain.MemberForCheckin{
		ID: "m1", FirstName: "太郎", LastName: "鈴木", Status: "trial",
	}, nil)
	repo.On("FindActiveAttendance", "m1").Return("", nil)
	repo.On("InsertAttendance", "m1", "s1").Return(&domain.CheckinResult{
		AttendanceID: "a2",
		CheckInAt:    "2026-04-04T11:00:00Z",
	}, nil)
	repo.On("SendCheckinNotification", "m1", "s1").Return(nil)

	uc := usecase.NewCheckinUsecase(repo)
	result, err := uc.Checkin(domain.CheckinRequest{MemberID: "m1", StoreID: "s1"})

	assert.NoError(t, err)
	assert.False(t, result.Skipped)
	assert.Equal(t, "鈴木 太郎", result.MemberName)
}

func TestCheckin_MemberNotFound_ReturnsError(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindMember", "unknown").Return(nil, nil)

	uc := usecase.NewCheckinUsecase(repo)
	_, err := uc.Checkin(domain.CheckinRequest{MemberID: "unknown", StoreID: "s1"})

	assert.ErrorContains(t, err, "member not found")
}

func TestCheckin_DBError_ReturnsError(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindMember", "m1").Return(nil, errors.New("db connection error"))

	uc := usecase.NewCheckinUsecase(repo)
	_, err := uc.Checkin(domain.CheckinRequest{MemberID: "m1", StoreID: "s1"})

	assert.ErrorContains(t, err, "find member")
}

// --- Checkout テスト ---

func TestCheckout_Success(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindActiveAttendance", "m1").Return("a1", nil)
	repo.On("UpdateCheckout", "a1").Return(&domain.CheckoutResult{DurationMinutes: 45}, nil)

	uc := usecase.NewCheckinUsecase(repo)
	result, err := uc.Checkout(domain.CheckoutRequest{MemberID: "m1"})

	assert.NoError(t, err)
	assert.False(t, result.Skipped)
	assert.Equal(t, 45, result.DurationMinutes)
}

func TestCheckout_NotCheckedIn_Skipped(t *testing.T) {
	repo := new(MockCheckinRepository)
	repo.On("FindActiveAttendance", "m1").Return("", nil)

	uc := usecase.NewCheckinUsecase(repo)
	result, err := uc.Checkout(domain.CheckoutRequest{MemberID: "m1"})

	assert.NoError(t, err)
	assert.True(t, result.Skipped)
	repo.AssertNotCalled(t, "UpdateCheckout")
}
