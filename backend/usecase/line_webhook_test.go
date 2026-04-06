package usecase_test

import (
	"errors"
	"testing"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockLineWebhookRepository struct {
	mock.Mock
}

func (m *MockLineWebhookRepository) FindMemberByLineUserID(lineUserID string) (*domain.Member, error) {
	args := m.Called(lineUserID)
	v := args.Get(0)
	if v == nil {
		return nil, args.Error(1)
	}
	return v.(*domain.Member), args.Error(1)
}

func (m *MockLineWebhookRepository) ClearMemberLineUserID(lineUserID string) error {
	return m.Called(lineUserID).Error(0)
}

func (m *MockLineWebhookRepository) CloseInquiriesByLineUserID(lineUserID string) error {
	return m.Called(lineUserID).Error(0)
}

func (m *MockLineWebhookRepository) GetOrCreateInquiry(lineUserID string) (*domain.LineInquiry, error) {
	args := m.Called(lineUserID)
	return args.Get(0).(*domain.LineInquiry), args.Error(1)
}

func (m *MockLineWebhookRepository) SaveIncomingMessage(inquiryID string, msg *domain.LineMessage) error {
	return m.Called(inquiryID, msg).Error(0)
}

func (m *MockLineWebhookRepository) FindMemberBookings(memberID string, fromDate string) ([]repository.BookingSummary, error) {
	args := m.Called(memberID, fromDate)
	return args.Get(0).([]repository.BookingSummary), args.Error(1)
}

func (m *MockLineWebhookRepository) SendLineTextMessage(lineUserID string, text string) error {
	return m.Called(lineUserID, text).Error(0)
}

func (m *MockLineWebhookRepository) GetLineProfile(lineUserID string) (*domain.LineProfile, error) {
	args := m.Called(lineUserID)
	v := args.Get(0)
	if v == nil {
		return nil, args.Error(1)
	}
	return v.(*domain.LineProfile), args.Error(1)
}

// --- Follow Tests ---

func TestLineWebhook_Follow_KnownMember(t *testing.T) {
	repo := new(MockLineWebhookRepository)
	repo.On("FindMemberByLineUserID", "U_001").Return(&domain.Member{ID: "m1", Name: "山田 花子"}, nil)
	repo.On("SendLineTextMessage", "U_001", mock.MatchedBy(func(s string) bool {
		return len(s) > 0 && contains(s, "山田 花子")
	})).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleFollow("U_001")

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestLineWebhook_Follow_UnknownUser(t *testing.T) {
	repo := new(MockLineWebhookRepository)
	repo.On("FindMemberByLineUserID", "U_new").Return(nil, nil)
	repo.On("SendLineTextMessage", "U_new", mock.MatchedBy(func(s string) bool {
		return contains(s, "会員登録")
	})).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleFollow("U_new")

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

// --- Unfollow Tests ---

func TestLineWebhook_Unfollow_ClearsDataAndClosesInquiries(t *testing.T) {
	repo := new(MockLineWebhookRepository)
	repo.On("ClearMemberLineUserID", "U_001").Return(nil)
	repo.On("CloseInquiriesByLineUserID", "U_001").Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleUnfollow("U_001")

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestLineWebhook_Unfollow_ContinuesEvenIfClearFails(t *testing.T) {
	repo := new(MockLineWebhookRepository)
	repo.On("ClearMemberLineUserID", "U_001").Return(errors.New("db error"))
	repo.On("CloseInquiriesByLineUserID", "U_001").Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleUnfollow("U_001")

	assert.NoError(t, err) // エラーは致命的にしない
	repo.AssertExpectations(t)
}

// --- Message Tests ---

func TestLineWebhook_Message_SavesAndNoReply_ForNonTextMessage(t *testing.T) {
	inquiry := &domain.LineInquiry{ID: "inq_1"}
	msg := &domain.LineMessage{ID: "msg_1", Type: "image"}

	repo := new(MockLineWebhookRepository)
	repo.On("GetOrCreateInquiry", "U_001").Return(inquiry, nil)
	repo.On("SaveIncomingMessage", "inq_1", msg).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleMessage("U_001", msg)

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "SendLineTextMessage")
	repo.AssertExpectations(t)
}

func TestLineWebhook_Message_HelpCommand(t *testing.T) {
	inquiry := &domain.LineInquiry{ID: "inq_1"}
	msg := &domain.LineMessage{ID: "msg_1", Type: "text", Text: "ヘルプ"}

	repo := new(MockLineWebhookRepository)
	repo.On("GetOrCreateInquiry", "U_001").Return(inquiry, nil)
	repo.On("SaveIncomingMessage", "inq_1", msg).Return(nil)
	repo.On("SendLineTextMessage", "U_001", mock.MatchedBy(func(s string) bool {
		return contains(s, "使えるコマンド")
	})).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleMessage("U_001", msg)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestLineWebhook_Message_BookingCommand_MemberNotFound(t *testing.T) {
	inquiry := &domain.LineInquiry{ID: "inq_1"}
	msg := &domain.LineMessage{ID: "msg_1", Type: "text", Text: "予約"}

	repo := new(MockLineWebhookRepository)
	repo.On("GetOrCreateInquiry", "U_001").Return(inquiry, nil)
	repo.On("SaveIncomingMessage", "inq_1", msg).Return(nil)
	repo.On("FindMemberByLineUserID", "U_001").Return(nil, nil)
	repo.On("SendLineTextMessage", "U_001", mock.MatchedBy(func(s string) bool {
		return contains(s, "会員情報が見つかりません")
	})).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleMessage("U_001", msg)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestLineWebhook_Message_BookingCommand_NoBookings(t *testing.T) {
	inquiry := &domain.LineInquiry{ID: "inq_1"}
	msg := &domain.LineMessage{ID: "msg_1", Type: "text", Text: "予約確認"}

	repo := new(MockLineWebhookRepository)
	repo.On("GetOrCreateInquiry", "U_001").Return(inquiry, nil)
	repo.On("SaveIncomingMessage", "inq_1", msg).Return(nil)
	repo.On("FindMemberByLineUserID", "U_001").Return(&domain.Member{ID: "m1", Name: "山田 花子"}, nil)
	repo.On("FindMemberBookings", "m1", mock.AnythingOfType("string")).Return([]repository.BookingSummary{}, nil)
	repo.On("SendLineTextMessage", "U_001", "現在、予約はありません。").Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleMessage("U_001", msg)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestLineWebhook_Message_BookingCommand_WithBookings(t *testing.T) {
	inquiry := &domain.LineInquiry{ID: "inq_1"}
	msg := &domain.LineMessage{ID: "msg_1", Type: "text", Text: "予約"}
	bookings := []repository.BookingSummary{
		{BookingDate: "2026-04-10", BookingType: "trial", StartTime: "10:00:00"},
		{BookingDate: "2026-04-17", BookingType: "observation", StartTime: "14:00:00"},
	}

	repo := new(MockLineWebhookRepository)
	repo.On("GetOrCreateInquiry", "U_001").Return(inquiry, nil)
	repo.On("SaveIncomingMessage", "inq_1", msg).Return(nil)
	repo.On("FindMemberByLineUserID", "U_001").Return(&domain.Member{ID: "m1", Name: "山田 花子"}, nil)
	repo.On("FindMemberBookings", "m1", mock.AnythingOfType("string")).Return(bookings, nil)
	repo.On("SendLineTextMessage", "U_001", mock.MatchedBy(func(s string) bool {
		return contains(s, "山田 花子") && contains(s, "2026-04-10") && contains(s, "体験")
	})).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleMessage("U_001", msg)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestLineWebhook_Message_OtherText_SavesOnly(t *testing.T) {
	inquiry := &domain.LineInquiry{ID: "inq_1"}
	msg := &domain.LineMessage{ID: "msg_1", Type: "text", Text: "よろしくお願いします"}

	repo := new(MockLineWebhookRepository)
	repo.On("GetOrCreateInquiry", "U_001").Return(inquiry, nil)
	repo.On("SaveIncomingMessage", "inq_1", msg).Return(nil)

	uc := usecase.NewLineWebhookUsecase(repo)
	err := uc.HandleMessage("U_001", msg)

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "SendLineTextMessage")
	repo.AssertExpectations(t)
}

// contains はテスト用ヘルパー（infrastructure.containsStrと別定義）
func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || func() bool {
		for i := 0; i <= len(s)-len(sub); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	}())
}
