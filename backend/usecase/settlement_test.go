package usecase_test

import (
	"errors"
	"testing"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock ---

type MockSettlementRepository struct {
	mock.Mock
}

func (m *MockSettlementRepository) FetchUnsettledPurchases(month string) ([]*domain.ProductPurchase, error) {
	args := m.Called(month)
	return args.Get(0).([]*domain.ProductPurchase), args.Error(1)
}

func (m *MockSettlementRepository) GetPaymentMethods(customerID string) ([]domain.PaymentMethod, error) {
	args := m.Called(customerID)
	return args.Get(0).([]domain.PaymentMethod), args.Error(1)
}

func (m *MockSettlementRepository) ChargeCustomer(params domain.ChargeParams) (string, error) {
	args := m.Called(params)
	return args.String(0), args.Error(1)
}

func (m *MockSettlementRepository) UpdatePurchasesSettled(ids []string, piID, chargeID string) error {
	args := m.Called(ids, piID, chargeID)
	return args.Error(0)
}

func (m *MockSettlementRepository) SendStatementEmail(params domain.StatementEmailParams) error {
	args := m.Called(params)
	return args.Error(0)
}

// --- Helpers ---

func newPurchase(id, memberID string, amount int, member *domain.Member) *domain.ProductPurchase {
	return &domain.ProductPurchase{
		ID:           id,
		MemberID:     memberID,
		ProductName:  "プロテイン",
		ProductPrice: amount,
		Quantity:     1,
		TotalAmount:  amount,
		PurchasedAt:  time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC),
		Member:       member,
		Store:        &domain.Store{ID: "store1", Name: "渋谷店"},
	}
}

func newMember(id, name, email, stripeID string) *domain.Member {
	return &domain.Member{
		ID:               id,
		Name:             name,
		Email:            email,
		StripeCustomerID: stripeID,
	}
}

// --- Tests ---

func TestSettlement_NoUnsettledPurchases(t *testing.T) {
	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return([]*domain.ProductPurchase{}, nil)

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	assert.NoError(t, err)
	assert.Equal(t, 0, result.Members.Processed)
	assert.Equal(t, 0, result.TotalAmount)
	repo.AssertExpectations(t)
}

func TestSettlement_SkipsIfNoStripeCustomerID(t *testing.T) {
	member := newMember("m1", "山田 花子", "hanako@example.com", "") // StripeID なし
	purchases := []*domain.ProductPurchase{newPurchase("p1", "m1", 1000, member)}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Members.Processed)
	assert.Equal(t, 1, result.Members.Skipped)
	assert.Equal(t, 0, result.Members.Succeeded)
	assert.Equal(t, 1, len(result.Errors))
	assert.Equal(t, "Stripe顧客IDがありません", result.Errors[0].Error)
	repo.AssertExpectations(t)
}

func TestSettlement_DryRun_SkipsActualCharge(t *testing.T) {
	member := newMember("m1", "山田 花子", "hanako@example.com", "cus_123")
	purchases := []*domain.ProductPurchase{newPurchase("p1", "m1", 2000, member)}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)
	// dry_run なので ChargeCustomer は呼ばれない

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", true)

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Members.Processed)
	assert.Equal(t, 1, result.Members.Succeeded)
	assert.Equal(t, 2000, result.TotalAmount)
	assert.True(t, result.DryRun)
	repo.AssertNotCalled(t, "ChargeCustomer")
	repo.AssertExpectations(t)
}

func TestSettlement_FailsIfNoPaymentMethod(t *testing.T) {
	member := newMember("m1", "山田 花子", "hanako@example.com", "cus_123")
	purchases := []*domain.ProductPurchase{newPurchase("p1", "m1", 3000, member)}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)
	repo.On("GetPaymentMethods", "cus_123").Return([]domain.PaymentMethod{}, nil)

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Members.Failed)
	assert.Equal(t, "登録されたカードがありません", result.Errors[0].Error)
	repo.AssertExpectations(t)
}

func TestSettlement_SuccessfulCharge(t *testing.T) {
	member := newMember("m1", "山田 花子", "hanako@example.com", "cus_123")
	purchases := []*domain.ProductPurchase{
		newPurchase("p1", "m1", 1000, member),
		newPurchase("p2", "m1", 2000, member),
	}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)
	repo.On("GetPaymentMethods", "cus_123").Return([]domain.PaymentMethod{{ID: "pm_abc", CardLast4: "4242"}}, nil)
	repo.On("ChargeCustomer", mock.AnythingOfType("domain.ChargeParams")).Return("pi_xyz|ch_xyz", nil)
	repo.On("UpdatePurchasesSettled", []string{"p1", "p2"}, "pi_xyz", "ch_xyz").Return(nil)
	repo.On("SendStatementEmail", mock.AnythingOfType("domain.StatementEmailParams")).Return(nil)

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Members.Processed)
	assert.Equal(t, 1, result.Members.Succeeded)
	assert.Equal(t, 3000, result.TotalAmount)
	assert.Equal(t, 0, len(result.Errors))
	repo.AssertExpectations(t)
}

func TestSettlement_StripeError_MarkedAsFailed(t *testing.T) {
	member := newMember("m1", "山田 花子", "hanako@example.com", "cus_123")
	purchases := []*domain.ProductPurchase{newPurchase("p1", "m1", 5000, member)}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)
	repo.On("GetPaymentMethods", "cus_123").Return([]domain.PaymentMethod{{ID: "pm_abc", CardLast4: "4242"}}, nil)
	repo.On("ChargeCustomer", mock.AnythingOfType("domain.ChargeParams")).Return("", errors.New("Your card was declined"))

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Members.Failed)
	assert.Equal(t, "Your card was declined", result.Errors[0].Error)
	assert.Equal(t, 0, result.TotalAmount)
	repo.AssertExpectations(t)
}

func TestSettlement_MultipleMembers(t *testing.T) {
	m1 := newMember("m1", "山田 花子", "a@example.com", "cus_001")
	m2 := newMember("m2", "鈴木 太郎", "b@example.com", "cus_002")
	m3 := newMember("m3", "佐藤 次郎", "c@example.com", "") // StripeIDなし

	purchases := []*domain.ProductPurchase{
		newPurchase("p1", "m1", 1000, m1),
		newPurchase("p2", "m2", 2000, m2),
		newPurchase("p3", "m3", 500, m3),
	}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)
	repo.On("GetPaymentMethods", "cus_001").Return([]domain.PaymentMethod{{ID: "pm_1", CardLast4: "1111"}}, nil)
	repo.On("GetPaymentMethods", "cus_002").Return([]domain.PaymentMethod{{ID: "pm_2", CardLast4: "2222"}}, nil)
	repo.On("ChargeCustomer", mock.MatchedBy(func(p domain.ChargeParams) bool { return p.CustomerID == "cus_001" })).Return("pi_1|ch_1", nil)
	repo.On("ChargeCustomer", mock.MatchedBy(func(p domain.ChargeParams) bool { return p.CustomerID == "cus_002" })).Return("pi_2|ch_2", nil)
	repo.On("UpdatePurchasesSettled", []string{"p1"}, "pi_1", "ch_1").Return(nil)
	repo.On("UpdatePurchasesSettled", []string{"p2"}, "pi_2", "ch_2").Return(nil)
	repo.On("SendStatementEmail", mock.AnythingOfType("domain.StatementEmailParams")).Return(nil)

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	assert.NoError(t, err)
	assert.Equal(t, 3, result.Members.Processed)
	assert.Equal(t, 2, result.Members.Succeeded)
	assert.Equal(t, 1, result.Members.Skipped)
	assert.Equal(t, 3000, result.TotalAmount)
	repo.AssertExpectations(t)
}

func TestSettlement_EmailFailureDoesNotFailSettlement(t *testing.T) {
	member := newMember("m1", "山田 花子", "hanako@example.com", "cus_123")
	purchases := []*domain.ProductPurchase{newPurchase("p1", "m1", 1000, member)}

	repo := new(MockSettlementRepository)
	repo.On("FetchUnsettledPurchases", "2026-03").Return(purchases, nil)
	repo.On("GetPaymentMethods", "cus_123").Return([]domain.PaymentMethod{{ID: "pm_abc", CardLast4: "4242"}}, nil)
	repo.On("ChargeCustomer", mock.AnythingOfType("domain.ChargeParams")).Return("pi_xyz|ch_xyz", nil)
	repo.On("UpdatePurchasesSettled", []string{"p1"}, "pi_xyz", "ch_xyz").Return(nil)
	repo.On("SendStatementEmail", mock.AnythingOfType("domain.StatementEmailParams")).Return(errors.New("email error"))

	uc := usecase.NewSettlementUsecase(repo)
	result, err := uc.Run("2026-03", false)

	// メール失敗は致命的エラーにならない
	assert.NoError(t, err)
	assert.Equal(t, 1, result.Members.Succeeded)
	assert.Equal(t, 0, len(result.Errors))
	repo.AssertExpectations(t)
}
