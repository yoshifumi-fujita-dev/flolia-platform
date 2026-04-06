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

type MockMemberContractRepository struct {
	mock.Mock
}

func (m *MockMemberContractRepository) FindMemberForContract(memberID string) (*domain.MemberContract, error) {
	args := m.Called(memberID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.MemberContract), args.Error(1)
}

func (m *MockMemberContractRepository) PauseMember(req domain.PauseRequest) error {
	args := m.Called(req)
	return args.Error(0)
}

func (m *MockMemberContractRepository) PauseMemberPlan(memberID, subscriptionID string) error {
	args := m.Called(memberID, subscriptionID)
	return args.Error(0)
}

func (m *MockMemberContractRepository) PauseStripeSubscription(subscriptionID string) error {
	args := m.Called(subscriptionID)
	return args.Error(0)
}

func (m *MockMemberContractRepository) ResumeMember(memberID string) error {
	args := m.Called(memberID)
	return args.Error(0)
}

func (m *MockMemberContractRepository) ResumeMemberPlan(memberID string) error {
	args := m.Called(memberID)
	return args.Error(0)
}

func (m *MockMemberContractRepository) ResumeStripeSubscription(subscriptionID string) error {
	args := m.Called(subscriptionID)
	return args.Error(0)
}

func (m *MockMemberContractRepository) CancelMember(req domain.CancelRequest) error {
	args := m.Called(req)
	return args.Error(0)
}

func (m *MockMemberContractRepository) CancelMemberPlan(memberID, reason string) error {
	args := m.Called(memberID, reason)
	return args.Error(0)
}

func (m *MockMemberContractRepository) CancelStripeSubscription(subscriptionID string) error {
	args := m.Called(subscriptionID)
	return args.Error(0)
}

// --- ヘルパー ---

func monthlyMember(id, status string) *domain.MemberContract {
	return &domain.MemberContract{
		ID: id, FirstName: "花子", LastName: "山田",
		Status: status, MembershipType: "monthly",
		StripeSubscriptionID: "sub_001",
	}
}

func ticketMember(id, status string) *domain.MemberContract {
	return &domain.MemberContract{
		ID: id, FirstName: "太郎", LastName: "鈴木",
		Status: status, MembershipType: "ticket",
	}
}

// --- Pause テスト ---

func TestPause_MonthlyMember_Success(t *testing.T) {
	repo := new(MockMemberContractRepository)
	req := domain.PauseRequest{MemberID: "m1", Reason: "旅行"}
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "active"), nil)
	repo.On("PauseStripeSubscription", "sub_001").Return(nil)
	repo.On("PauseMember", req).Return(nil)
	repo.On("PauseMemberPlan", "m1", "sub_001").Return(nil)

	uc := usecase.NewMemberContractUsecase(repo)
	result, err := uc.Pause(req)

	assert.NoError(t, err)
	assert.Equal(t, "paused", result.Status)
	assert.Equal(t, "山田 花子", result.MemberName)
	repo.AssertExpectations(t)
}

func TestPause_TicketMember_NoStripe(t *testing.T) {
	repo := new(MockMemberContractRepository)
	req := domain.PauseRequest{MemberID: "m2"}
	repo.On("FindMemberForContract", "m2").Return(ticketMember("m2", "active"), nil)
	repo.On("PauseMember", req).Return(nil)
	// Stripe操作・PauseMemberPlanは呼ばれない（subscriptionIDが空）

	uc := usecase.NewMemberContractUsecase(repo)
	result, err := uc.Pause(req)

	assert.NoError(t, err)
	assert.Equal(t, "paused", result.Status)
	repo.AssertNotCalled(t, "PauseStripeSubscription")
	repo.AssertNotCalled(t, "PauseMemberPlan")
}

func TestPause_AlreadyPaused_Error(t *testing.T) {
	repo := new(MockMemberContractRepository)
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "paused"), nil)

	uc := usecase.NewMemberContractUsecase(repo)
	_, err := uc.Pause(domain.PauseRequest{MemberID: "m1"})

	assert.ErrorContains(t, err, "already paused")
	repo.AssertNotCalled(t, "PauseStripeSubscription")
}

func TestPause_AlreadyCanceled_Error(t *testing.T) {
	repo := new(MockMemberContractRepository)
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "canceled"), nil)

	uc := usecase.NewMemberContractUsecase(repo)
	_, err := uc.Pause(domain.PauseRequest{MemberID: "m1"})

	assert.ErrorContains(t, err, "already canceled")
}

func TestPause_MemberNotFound_Error(t *testing.T) {
	repo := new(MockMemberContractRepository)
	repo.On("FindMemberForContract", "unknown").Return(nil, nil)

	uc := usecase.NewMemberContractUsecase(repo)
	_, err := uc.Pause(domain.PauseRequest{MemberID: "unknown"})

	assert.ErrorContains(t, err, "member not found")
}

func TestPause_StripeError_ReturnsError(t *testing.T) {
	repo := new(MockMemberContractRepository)
	req := domain.PauseRequest{MemberID: "m1"}
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "active"), nil)
	repo.On("PauseStripeSubscription", "sub_001").Return(errors.New("stripe error"))

	uc := usecase.NewMemberContractUsecase(repo)
	_, err := uc.Pause(req)

	assert.ErrorContains(t, err, "pause stripe subscription")
	repo.AssertNotCalled(t, "PauseMember")
}

// --- Resume テスト ---

func TestResume_MonthlyMember_Success(t *testing.T) {
	repo := new(MockMemberContractRepository)
	req := domain.ResumeRequest{MemberID: "m1"}
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "paused"), nil)
	repo.On("ResumeStripeSubscription", "sub_001").Return(nil)
	repo.On("ResumeMember", "m1").Return(nil)
	repo.On("ResumeMemberPlan", "m1").Return(nil)

	uc := usecase.NewMemberContractUsecase(repo)
	result, err := uc.Resume(req)

	assert.NoError(t, err)
	assert.Equal(t, "active", result.Status)
	repo.AssertExpectations(t)
}

func TestResume_TicketMember_NoStripe(t *testing.T) {
	repo := new(MockMemberContractRepository)
	req := domain.ResumeRequest{MemberID: "m2"}
	repo.On("FindMemberForContract", "m2").Return(ticketMember("m2", "paused"), nil)
	repo.On("ResumeMember", "m2").Return(nil)
	repo.On("ResumeMemberPlan", "m2").Return(nil)

	uc := usecase.NewMemberContractUsecase(repo)
	result, err := uc.Resume(req)

	assert.NoError(t, err)
	assert.Equal(t, "active", result.Status)
	repo.AssertNotCalled(t, "ResumeStripeSubscription")
}

func TestResume_NotPaused_Error(t *testing.T) {
	repo := new(MockMemberContractRepository)
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "active"), nil)

	uc := usecase.NewMemberContractUsecase(repo)
	_, err := uc.Resume(domain.ResumeRequest{MemberID: "m1"})

	assert.ErrorContains(t, err, "not paused")
}

// --- Cancel テスト ---

func TestCancel_MonthlyMember_Success(t *testing.T) {
	repo := new(MockMemberContractRepository)
	req := domain.CancelRequest{MemberID: "m1", Reason: "引越し"}
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "active"), nil)
	repo.On("CancelStripeSubscription", "sub_001").Return(nil)
	repo.On("CancelMember", req).Return(nil)
	repo.On("CancelMemberPlan", "m1", "引越し").Return(nil)

	uc := usecase.NewMemberContractUsecase(repo)
	result, err := uc.Cancel(req)

	assert.NoError(t, err)
	assert.Equal(t, "canceled", result.Status)
	repo.AssertExpectations(t)
}

func TestCancel_PausedMember_Success(t *testing.T) {
	// 休会中からでも退会できる
	repo := new(MockMemberContractRepository)
	req := domain.CancelRequest{MemberID: "m1"}
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "paused"), nil)
	repo.On("CancelStripeSubscription", "sub_001").Return(nil)
	repo.On("CancelMember", req).Return(nil)
	repo.On("CancelMemberPlan", "m1", "").Return(nil)

	uc := usecase.NewMemberContractUsecase(repo)
	result, err := uc.Cancel(req)

	assert.NoError(t, err)
	assert.Equal(t, "canceled", result.Status)
}

func TestCancel_AlreadyCanceled_Error(t *testing.T) {
	repo := new(MockMemberContractRepository)
	repo.On("FindMemberForContract", "m1").Return(monthlyMember("m1", "canceled"), nil)

	uc := usecase.NewMemberContractUsecase(repo)
	_, err := uc.Cancel(domain.CancelRequest{MemberID: "m1"})

	assert.ErrorContains(t, err, "already canceled")
}
