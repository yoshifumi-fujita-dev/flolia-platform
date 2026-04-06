package main

import (
	"log"
	"net/http"
	"os"

	"github.com/flolia/flolia-project/backend/handler"
	"github.com/flolia/flolia-project/backend/infrastructure"
	appMiddleware "github.com/flolia/flolia-project/backend/middleware"
	"github.com/flolia/flolia-project/backend/usecase"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	if os.Getenv("ENV") != "production" {
		_ = godotenv.Load()
	}

	supabase, err := infrastructure.NewSupabaseClient()
	if err != nil {
		log.Fatalf("Failed to initialize Supabase client: %v", err)
	}

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	allowedOrigins := []string{
		"https://flolia.jp",
		"https://www.flolia.jp",
	}
	if os.Getenv("ENV") != "production" {
		allowedOrigins = append(allowedOrigins, "http://localhost:3000")
	}
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: allowedOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "Authorization", "X-Request-Id", "X-Tablet-Token", "X-Internal-Secret"},
	}))
	// X-Request-Id を受け取り・なければ生成してレスポンスヘッダーに付与
	e.Use(middleware.RequestIDWithConfig(middleware.RequestIDConfig{
		RequestIDHandler: func(c echo.Context, id string) {
			c.Request().Header.Set(echo.HeaderXRequestID, id)
			c.Response().Header().Set(echo.HeaderXRequestID, id)
		},
	}))

	// Health
	healthRepo := infrastructure.NewHealthRepository()
	healthUsecase := usecase.NewHealthUsecase(healthRepo)
	healthHandler := handler.NewHealthHandler(healthUsecase)

	// Archive
	archiveRepo := infrastructure.NewArchiveRepository(supabase)
	archiveUsecase := usecase.NewArchiveUsecase(archiveRepo)

	// Settlement
	settlementRepo := infrastructure.NewSettlementRepository(supabase)
	settlementUsecase := usecase.NewSettlementUsecase(settlementRepo)

	// Daily Reminder
	reminderRepo := infrastructure.NewReminderRepository(supabase)
	reminderUsecase := usecase.NewReminderUsecase(reminderRepo)

	// LINE Notifications
	lineNotifRepo := infrastructure.NewLineNotificationRepository(supabase)
	lineNotifUsecase := usecase.NewLineNotificationUsecase(lineNotifRepo)

	// Analytics
	analyticsRepo := infrastructure.NewAnalyticsRepository(supabase)
	analyticsUsecase := usecase.NewAnalyticsUsecase(analyticsRepo)

	// Payment Retry
	paymentRetryRepo := infrastructure.NewPaymentRetryRepository(supabase)
	paymentRetryUsecase := usecase.NewPaymentRetryUsecase(paymentRetryRepo)

	// Stripe Sync
	stripeSyncRepo := infrastructure.NewStripeSyncRepository(supabase)
	stripeSyncUsecase := usecase.NewStripeSyncUsecase(stripeSyncRepo)

	// LINE Webhook
	lineWebhookRepo := infrastructure.NewLineWebhookRepository(supabase)
	lineWebhookUsecase := usecase.NewLineWebhookUsecase(lineWebhookRepo)
	lineWebhookHandler := handler.NewLineWebhookHandler(lineWebhookUsecase)

	// Stripe Webhook
	stripeWebhookRepo := infrastructure.NewStripeWebhookRepository(supabase)
	stripeWebhookUsecase := usecase.NewStripeWebhookUsecase(stripeWebhookRepo)
	stripeWebhookHandler := handler.NewStripeWebhookHandler(stripeWebhookUsecase)

	// Checkin
	checkinRepo := infrastructure.NewCheckinRepository(supabase)
	checkinUsecase := usecase.NewCheckinUsecase(checkinRepo)
	checkinHandler := handler.NewCheckinHandler(checkinUsecase)
	tabletAuth := appMiddleware.TabletAuth(supabase)

	// Member Contract
	memberContractRepo := infrastructure.NewMemberContractRepository(supabase)
	memberContractUsecase := usecase.NewMemberContractUsecase(memberContractRepo)
	memberContractHandler := handler.NewMemberContractHandler(memberContractUsecase)

	// Reservation
	reservationRepo := infrastructure.NewReservationRepository(supabase)
	reservationUsecase := usecase.NewReservationUsecase(reservationRepo)
	reservationHandler := handler.NewReservationHandler(reservationUsecase)

	cronHandler := handler.NewCronHandler(
		archiveUsecase,
		settlementUsecase,
		reminderUsecase,
		lineNotifUsecase,
		analyticsUsecase,
		paymentRetryUsecase,
		stripeSyncUsecase,
	)

	// ルーティング
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"message": "FLOLIA Backend API"})
	})
	e.GET("/health", healthHandler.Check)

	// Checkin（入退館コンテキスト）
	e.POST("/checkins", checkinHandler.Checkin, tabletAuth)
	e.POST("/checkouts", checkinHandler.Checkout, tabletAuth)

	// Member Contract（会員契約コンテキスト）
	e.POST("/members/:id/pause", memberContractHandler.Pause, tabletAuth)
	e.POST("/members/:id/resume", memberContractHandler.Resume, tabletAuth)
	e.POST("/members/:id/cancel", memberContractHandler.Cancel, tabletAuth)

	// Reservation（予約コンテキスト）
	e.POST("/reservations", reservationHandler.Create)

	// LINE Webhook
	line := e.Group("/line")
	line.GET("/webhook", lineWebhookHandler.Verify)
	line.POST("/webhook", lineWebhookHandler.Handle)

	// Stripe Webhook
	e.POST("/stripe/webhook", stripeWebhookHandler.Handle)

	cron := e.Group("/cron")
	cron.GET("/archive-old-data", cronHandler.ArchiveOldData)
	cron.GET("/monthly-settlement", cronHandler.MonthlySettlement)
	cron.GET("/daily-reminder", cronHandler.DailyReminder)
	cron.GET("/daily-analytics", cronHandler.DailyAnalytics)
	cron.GET("/retry-payments", cronHandler.RetryPayments)
	cron.GET("/stripe-sync", cronHandler.StripeSync)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
