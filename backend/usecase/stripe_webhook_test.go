package usecase_test

import (
	"testing"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockStripeWebhookRepository struct {
	mock.Mock
}

func (m *MockStripeWebhookRepository) InsertPayment(p domain.PaymentRecord) error {
	return m.Called(p).Error(0)
}

func (m *MockStripeWebhookRepository) UpdateMemberStatus(memberID string, status string) error {
	return m.Called(memberID, status).Error(0)
}

func (m *MockStripeWebhookRepository) UpdateMemberSubscription(memberID string, subscriptionID string, status string) error {
	return m.Called(memberID, subscriptionID, status).Error(0)
}

func (m *MockStripeWebhookRepository) FindMemberBySubscriptionID(subscriptionID string) (*domain.MemberForWebhook, error) {
	args := m.Called(subscriptionID)
	v := args.Get(0)
	if v == nil {
		return nil, args.Error(1)
	}
	return v.(*domain.MemberForWebhook), args.Error(1)
}

func (m *MockStripeWebhookRepository) CancelMemberSubscription(memberID string) error {
	return m.Called(memberID).Error(0)
}

func (m *MockStripeWebhookRepository) FindPendingRetryByInvoiceID(invoiceID string) (string, error) {
	args := m.Called(invoiceID)
	return args.String(0), args.Error(1)
}

func (m *MockStripeWebhookRepository) InsertPaymentRetry(memberID, invoiceID, subscriptionID string, amount int64, nextRetryAt string, errMsg string) error {
	return m.Called(memberID, invoiceID, subscriptionID, amount, nextRetryAt, errMsg).Error(0)
}

func (m *MockStripeWebhookRepository) FindRefundByStripeID(stripeRefundID string) (*domain.ExistingRefund, error) {
	args := m.Called(stripeRefundID)
	v := args.Get(0)
	if v == nil {
		return nil, args.Error(1)
	}
	return v.(*domain.ExistingRefund), args.Error(1)
}

func (m *MockStripeWebhookRepository) FindRefundByPaymentID(paymentID string) (string, error) {
	args := m.Called(paymentID)
	return args.String(0), args.Error(1)
}

func (m *MockStripeWebhookRepository) UpdateRefundStatus(refundID string) error {
	return m.Called(refundID).Error(0)
}

func (m *MockStripeWebhookRepository) InsertRefund(r domain.RefundRecord) error {
	return m.Called(r).Error(0)
}

func (m *MockStripeWebhookRepository) FindPaymentByChargeID(chargeID string) (*domain.ExistingPayment, error) {
	args := m.Called(chargeID)
	v := args.Get(0)
	if v == nil {
		return nil, args.Error(1)
	}
	return v.(*domain.ExistingPayment), args.Error(1)
}

func (m *MockStripeWebhookRepository) UpdatePaymentRefundStatus(paymentID string, status string) error {
	return m.Called(paymentID, status).Error(0)
}

func (m *MockStripeWebhookRepository) SendPaymentFailedLine(lineUserID string, memberName string) error {
	return m.Called(lineUserID, memberName).Error(0)
}

// --- Tests ---

func TestStripeWebhook_PaymentIntentSucceeded(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("InsertPayment", mock.MatchedBy(func(p domain.PaymentRecord) bool {
		return p.MemberID == "m1" && p.Status == "completed" && p.PaymentType == "trial_fee"
	})).Return(nil)
	repo.On("UpdateMemberStatus", "m1", "active").Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandlePaymentIntentSucceeded(domain.StripePaymentIntentEvent{
		ID:       "pi_001",
		Amount:   5000,
		MemberID: "m1",
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_PaymentIntentSucceeded_NoMemberID(t *testing.T) {
	repo := new(MockStripeWebhookRepository)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandlePaymentIntentSucceeded(domain.StripePaymentIntentEvent{
		ID:     "pi_001",
		Amount: 5000,
	})

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "InsertPayment")
}

func TestStripeWebhook_PaymentIntentFailed(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("InsertPayment", mock.MatchedBy(func(p domain.PaymentRecord) bool {
		return p.MemberID == "m1" && p.Status == "pending" && p.PaymentType == "other"
	})).Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandlePaymentIntentFailed(domain.StripePaymentIntentEvent{
		ID:               "pi_001",
		Amount:           5000,
		MemberID:         "m1",
		LastPaymentError: "card declined",
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_SubscriptionCreated(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("UpdateMemberSubscription", "m1", "sub_001", "active").Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleSubscriptionCreated(domain.StripeSubscriptionEvent{
		ID:       "sub_001",
		Status:   "active",
		MemberID: "m1",
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_SubscriptionUpdated_MemberNotFound(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("FindMemberBySubscriptionID", "sub_001").Return(nil, nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleSubscriptionUpdated(domain.StripeSubscriptionEvent{
		ID:     "sub_001",
		Status: "active",
	})

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "UpdateMemberStatus")
}

func TestStripeWebhook_SubscriptionUpdated_StatusMapping(t *testing.T) {
	cases := []struct {
		stripeStatus string
		memberStatus string
	}{
		{"active", "active"},
		{"past_due", "active"},
		{"unpaid", "paused"},
		{"canceled", "canceled"},
		{"paused", "paused"},
	}

	for _, tc := range cases {
		t.Run(tc.stripeStatus, func(t *testing.T) {
			repo := new(MockStripeWebhookRepository)
			repo.On("FindMemberBySubscriptionID", "sub_001").Return(&domain.MemberForWebhook{ID: "m1"}, nil)
			repo.On("UpdateMemberStatus", "m1", tc.memberStatus).Return(nil)

			uc := usecase.NewStripeWebhookUsecase(repo)
			err := uc.HandleSubscriptionUpdated(domain.StripeSubscriptionEvent{
				ID:     "sub_001",
				Status: tc.stripeStatus,
			})

			assert.NoError(t, err)
			repo.AssertExpectations(t)
		})
	}
}

func TestStripeWebhook_SubscriptionDeleted(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("FindMemberBySubscriptionID", "sub_001").Return(&domain.MemberForWebhook{ID: "m1"}, nil)
	repo.On("CancelMemberSubscription", "m1").Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleSubscriptionDeleted(domain.StripeSubscriptionEvent{ID: "sub_001"})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_InvoicePaymentSucceeded(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("FindMemberBySubscriptionID", "sub_001").Return(&domain.MemberForWebhook{ID: "m1"}, nil)
	repo.On("InsertPayment", mock.MatchedBy(func(p domain.PaymentRecord) bool {
		return p.MemberID == "m1" && p.PaymentType == "monthly_fee" && p.Status == "completed"
	})).Return(nil)
	repo.On("UpdateMemberStatus", "m1", "active").Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleInvoicePaymentSucceeded(domain.StripeInvoiceEvent{
		ID:             "inv_001",
		SubscriptionID: "sub_001",
		AmountPaid:     3000,
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_InvoicePaymentFailed_CreatesRetryAndSendsLine(t *testing.T) {
	member := &domain.MemberForWebhook{ID: "m1", LastName: "山田", FirstName: "花子", LineUserID: "U_001"}

	repo := new(MockStripeWebhookRepository)
	repo.On("FindMemberBySubscriptionID", "sub_001").Return(member, nil)
	repo.On("InsertPayment", mock.MatchedBy(func(p domain.PaymentRecord) bool {
		return p.MemberID == "m1" && p.PaymentType == "monthly_fee" && p.Status == "pending"
	})).Return(nil)
	repo.On("FindPendingRetryByInvoiceID", "inv_001").Return("", nil)
	repo.On("InsertPaymentRetry", "m1", "inv_001", "sub_001", int64(3000), mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(nil)
	repo.On("SendPaymentFailedLine", "U_001", "山田 花子").Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleInvoicePaymentFailed(domain.StripeInvoiceEvent{
		ID:             "inv_001",
		SubscriptionID: "sub_001",
		AmountDue:      3000,
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_InvoicePaymentFailed_SkipsRetryIfExists(t *testing.T) {
	member := &domain.MemberForWebhook{ID: "m1", LastName: "田中", FirstName: "太郎"}

	repo := new(MockStripeWebhookRepository)
	repo.On("FindMemberBySubscriptionID", "sub_001").Return(member, nil)
	repo.On("InsertPayment", mock.Anything).Return(nil)
	repo.On("FindPendingRetryByInvoiceID", "inv_001").Return("retry_existing", nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleInvoicePaymentFailed(domain.StripeInvoiceEvent{
		ID:             "inv_001",
		SubscriptionID: "sub_001",
		AmountDue:      3000,
	})

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "InsertPaymentRetry")
	repo.AssertExpectations(t)
}

func TestStripeWebhook_ChargeRefunded_NewRefund(t *testing.T) {
	payment := &domain.ExistingPayment{ID: "pay_001", MemberID: "m1", Amount: 5000}

	repo := new(MockStripeWebhookRepository)
	repo.On("FindRefundByStripeID", "re_001").Return(nil, nil)
	repo.On("FindPaymentByChargeID", "ch_001").Return(payment, nil)
	repo.On("FindRefundByPaymentID", "pay_001").Return("", nil)
	repo.On("UpdatePaymentRefundStatus", "pay_001", "refunded").Return(nil)
	repo.On("InsertRefund", mock.MatchedBy(func(r domain.RefundRecord) bool {
		return r.PaymentID == "pay_001" && r.StripeRefundID == "re_001" && r.Status == "processed"
	})).Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleChargeRefunded(domain.StripeChargeRefundedEvent{
		ID: "ch_001",
		Refunds: []domain.StripeRefund{
			{ID: "re_001", Amount: 5000},
		},
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_ChargeRefunded_UpdatesExistingUnprocessedRefund(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("FindRefundByStripeID", "re_001").Return(&domain.ExistingRefund{ID: "ref_db_001", Status: "pending"}, nil)
	repo.On("UpdateRefundStatus", "ref_db_001").Return(nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleChargeRefunded(domain.StripeChargeRefundedEvent{
		ID: "ch_001",
		Refunds: []domain.StripeRefund{
			{ID: "re_001", Amount: 5000},
		},
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestStripeWebhook_ChargeRefunded_SkipsAlreadyProcessed(t *testing.T) {
	repo := new(MockStripeWebhookRepository)
	repo.On("FindRefundByStripeID", "re_001").Return(&domain.ExistingRefund{ID: "ref_db_001", Status: "processed"}, nil)

	uc := usecase.NewStripeWebhookUsecase(repo)
	err := uc.HandleChargeRefunded(domain.StripeChargeRefundedEvent{
		ID: "ch_001",
		Refunds: []domain.StripeRefund{
			{ID: "re_001", Amount: 5000},
		},
	})

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "UpdateRefundStatus")
	repo.AssertExpectations(t)
}
