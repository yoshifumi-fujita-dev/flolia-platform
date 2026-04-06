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

type MockReservationRepository struct {
	mock.Mock
}

func (m *MockReservationRepository) FindTimeSlot(timeSlotID string) (*domain.TimeSlot, error) {
	args := m.Called(timeSlotID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.TimeSlot), args.Error(1)
}

func (m *MockReservationRepository) InsertBooking(req domain.ReservationRequest) (*domain.Reservation, error) {
	args := m.Called(req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Reservation), args.Error(1)
}

func (m *MockReservationRepository) SendConfirmationEmail(booking *domain.Reservation, req domain.ReservationRequest, startTime, endTime string) error {
	return nil
}

func (m *MockReservationRepository) SendAdminNotification(booking *domain.Reservation, req domain.ReservationRequest, startTime, endTime string) error {
	return nil
}

// --- ヘルパー ---

func activeSlot(id string) *domain.TimeSlot {
	return &domain.TimeSlot{
		ID: id, DayOfWeek: 1,
		StartTime: "10:00:00", EndTime: "11:00:00",
		MaxCapacity: 2, IsActive: true, SlotType: "both",
	}
}

func trialOnlySlot(id string) *domain.TimeSlot {
	return &domain.TimeSlot{
		ID: id, SlotType: "trial", IsActive: true, MaxCapacity: 1,
	}
}

func validReq() domain.ReservationRequest {
	return domain.ReservationRequest{
		Name:        "山田花子",
		Email:       "hanako@example.com",
		Phone:       "09012345678",
		BookingType: "trial",
		BookingDate: "2026-04-10",
		TimeSlotID:  "slot1",
	}
}

// --- テスト ---

func TestReservation_Success(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	booking := &domain.Reservation{ID: "b1", QRToken: "qr1", Name: req.Name, BookingType: req.BookingType, BookingDate: req.BookingDate}

	repo.On("FindTimeSlot", "slot1").Return(activeSlot("slot1"), nil)
	repo.On("InsertBooking", req).Return(booking, nil)

	uc := usecase.NewReservationUsecase(repo)
	result, err := uc.Create(req)

	assert.NoError(t, err)
	assert.Equal(t, "b1", result.ID)
	assert.Equal(t, "10:00:00", result.StartTime)
	repo.AssertExpectations(t)
}

func TestReservation_MissingName_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	req.Name = ""

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "required")
	repo.AssertNotCalled(t, "FindTimeSlot")
}

func TestReservation_InvalidBookingType_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	req.BookingType = "invalid"

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "invalid booking_type")
}

func TestReservation_TimeSlotNotFound_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	repo.On("FindTimeSlot", "slot1").Return(nil, nil)

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "time slot not found")
	repo.AssertNotCalled(t, "InsertBooking")
}

func TestReservation_TimeSlotInactive_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	slot := activeSlot("slot1")
	slot.IsActive = false
	repo.On("FindTimeSlot", "slot1").Return(slot, nil)

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "time slot inactive")
	repo.AssertNotCalled(t, "InsertBooking")
}

func TestReservation_BookingTypeNotAllowed_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	req.BookingType = "tour"
	repo.On("FindTimeSlot", "slot1").Return(trialOnlySlot("slot1"), nil)

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "not allowed")
	repo.AssertNotCalled(t, "InsertBooking")
}

func TestReservation_CapacityExceeded_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	repo.On("FindTimeSlot", "slot1").Return(activeSlot("slot1"), nil)
	repo.On("InsertBooking", req).Return(nil, errors.New("capacity_exceeded"))

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "capacity_exceeded")
}

func TestReservation_DuplicateBooking_Error(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	repo.On("FindTimeSlot", "slot1").Return(activeSlot("slot1"), nil)
	repo.On("InsertBooking", req).Return(nil, errors.New("duplicate_booking"))

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "duplicate_booking")
}

func TestReservation_DBError_ReturnsError(t *testing.T) {
	repo := new(MockReservationRepository)
	req := validReq()
	repo.On("FindTimeSlot", "slot1").Return(activeSlot("slot1"), nil)
	repo.On("InsertBooking", req).Return(nil, errors.New("db error"))

	uc := usecase.NewReservationUsecase(repo)
	_, err := uc.Create(req)

	assert.ErrorContains(t, err, "db error")
}
