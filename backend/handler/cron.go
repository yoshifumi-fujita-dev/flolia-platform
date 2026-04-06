package handler

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/flolia/flolia-project/backend/repository"
	"github.com/labstack/echo/v4"
)

// CronHandler はCronジョブのHTTPハンドラー
type CronHandler struct {
	archiveUsecase          repository.ArchiveUsecase
	settlementUsecase       repository.SettlementUsecase
	reminderUsecase         repository.ReminderUsecase
	lineNotificationUsecase repository.LineNotificationUsecase
	analyticsUsecase        repository.AnalyticsUsecase
	paymentRetryUsecase     repository.PaymentRetryUsecase
	stripeSyncUsecase       repository.StripeSyncUsecase
}

func NewCronHandler(
	archiveUsecase repository.ArchiveUsecase,
	settlementUsecase repository.SettlementUsecase,
	reminderUsecase repository.ReminderUsecase,
	lineNotificationUsecase repository.LineNotificationUsecase,
	analyticsUsecase repository.AnalyticsUsecase,
	paymentRetryUsecase repository.PaymentRetryUsecase,
	stripeSyncUsecase repository.StripeSyncUsecase,
) *CronHandler {
	return &CronHandler{
		archiveUsecase:          archiveUsecase,
		settlementUsecase:       settlementUsecase,
		reminderUsecase:         reminderUsecase,
		lineNotificationUsecase: lineNotificationUsecase,
		analyticsUsecase:        analyticsUsecase,
		paymentRetryUsecase:     paymentRetryUsecase,
		stripeSyncUsecase:       stripeSyncUsecase,
	}
}

func authorizeCron(c echo.Context) bool {
	secret := os.Getenv("CRON_SECRET")
	return c.Request().Header.Get("Authorization") == "Bearer "+secret
}

func unauthorized(c echo.Context, name string) error {
	log.Printf("[%s] Unauthorized access attempt", name)
	return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
}

// ArchiveOldData は古いデータをアーカイブする
func (h *CronHandler) ArchiveOldData(c echo.Context) error {
	if !authorizeCron(c) {
		return unauthorized(c, "Archive Cron")
	}
	result, err := h.archiveUsecase.Run()
	if err != nil {
		log.Printf("[Archive Cron] Failed: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, result)
}

// MonthlySettlement は月末物販まとめ決済
func (h *CronHandler) MonthlySettlement(c echo.Context) error {
	if !authorizeCron(c) {
		return unauthorized(c, "Settlement Cron")
	}
	targetMonth := c.QueryParam("month")
	if targetMonth == "" {
		targetMonth = time.Now().Format("2006-01")
	}
	dryRun := c.QueryParam("dry_run") == "true"

	log.Printf("[Settlement Cron] Starting: month=%s dry_run=%v", targetMonth, dryRun)
	result, err := h.settlementUsecase.Run(targetMonth, dryRun)
	if err != nil {
		log.Printf("[Settlement Cron] Failed: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
	}
	log.Printf("[Settlement Cron] Completed: processed=%d succeeded=%d failed=%d total=¥%d",
		result.Members.Processed, result.Members.Succeeded, result.Members.Failed, result.TotalAmount)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "月末決済処理完了 (" + targetMonth + ")",
		"results": result,
	})
}

// DailyReminder は予約リマインダー＋LINE通知
func (h *CronHandler) DailyReminder(c echo.Context) error {
	if !authorizeCron(c) {
		return unauthorized(c, "Daily Reminder Cron")
	}
	log.Println("[Daily Reminder Cron] Starting")

	reminderResult, err := h.reminderUsecase.Run()
	if err != nil {
		log.Printf("[Daily Reminder Cron] Reminder error: %v", err)
	}

	lineResult, err := h.lineNotificationUsecase.Run()
	if err != nil {
		log.Printf("[Daily Reminder Cron] LINE notification error: %v", err)
	}

	log.Printf("[Daily Reminder Cron] Completed: reminders sent=%d failed=%d, line birthday=%d anniversary=%d paused=%d",
		reminderResult.Sent, reminderResult.Failed,
		lineResult.Birthday, lineResult.Anniversary, lineResult.Paused)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":            true,
		"reminders":          reminderResult,
		"line_notifications": lineResult,
	})
}

// DailyAnalytics はアナリティクス日次集計
func (h *CronHandler) DailyAnalytics(c echo.Context) error {
	if !authorizeCron(c) {
		return unauthorized(c, "Analytics Cron")
	}
	log.Println("[Analytics Cron] Starting")
	result, err := h.analyticsUsecase.Run()
	if err != nil {
		log.Printf("[Analytics Cron] Failed: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "result": result})
}

// RetryPayments は決済リトライ
func (h *CronHandler) RetryPayments(c echo.Context) error {
	if !authorizeCron(c) {
		return unauthorized(c, "Payment Retry Cron")
	}
	log.Println("[Payment Retry Cron] Starting")
	result, err := h.paymentRetryUsecase.Run()
	if err != nil {
		log.Printf("[Payment Retry Cron] Failed: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
	}
	log.Printf("[Payment Retry Cron] Completed: processed=%d succeeded=%d failed=%d rescheduled=%d",
		result.Processed, result.Succeeded, result.Failed, result.Rescheduled)
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "result": result})
}

// StripeSync はStripe決済同期
func (h *CronHandler) StripeSync(c echo.Context) error {
	if !authorizeCron(c) {
		return unauthorized(c, "Stripe Sync Cron")
	}
	log.Println("[Stripe Sync Cron] Starting")
	result, err := h.stripeSyncUsecase.Run()
	if err != nil {
		log.Printf("[Stripe Sync Cron] Failed: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"success": false, "error": err.Error()})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "result": result})
}
