package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
	"github.com/labstack/echo/v4"
)

type LineWebhookHandler struct {
	usecase repository.LineWebhookUsecase
}

func NewLineWebhookHandler(usecase repository.LineWebhookUsecase) *LineWebhookHandler {
	return &LineWebhookHandler{usecase: usecase}
}

type lineWebhookBody struct {
	Events []domain.LineEvent `json:"events"`
}

// Verify handles LINE Developer webhook verification (GET).
func (h *LineWebhookHandler) Verify(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// Handle processes incoming LINE Webhook events.
// Requests are authenticated via HMAC-SHA256 signature (X-Line-Signature header).
// Production settings intentionally omitted — see security note in README.
func (h *LineWebhookHandler) Handle(c echo.Context) error {
	bodyBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Failed to read body"})
	}

	// Verify HMAC-SHA256 signature before processing any events.
	signature := c.Request().Header.Get("X-Line-Signature")
	if !verifyLineSignature(bodyBytes, signature) {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid signature"})
	}

	var body lineWebhookBody
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
	}

	for _, event := range body.Events {
		lineUserID := event.Source.UserID
		if lineUserID == "" {
			continue
		}

		var handleErr error
		switch event.Type {
		case "follow":
			handleErr = h.usecase.HandleFollow(lineUserID)
		case "unfollow":
			handleErr = h.usecase.HandleUnfollow(lineUserID)
		case "message":
			if event.Message != nil {
				handleErr = h.usecase.HandleMessage(lineUserID, event.Message)
			}
		default:
			log.Printf("[LINE Webhook] Unhandled event type: %s", event.Type)
		}

		if handleErr != nil {
			log.Printf("[LINE Webhook] Error handling %s event: %v", event.Type, handleErr)
		}
	}

	// LINE platform requires HTTP 200 for all webhook deliveries.
	return c.JSON(http.StatusOK, map[string]bool{"success": true})
}

// verifyLineSignature validates the HMAC-SHA256 signature attached by LINE platform.
// Algorithm: HMAC-SHA256(LINE_CHANNEL_SECRET, raw_body) → base64 → compare with header.
// Production error handling and logging are intentionally omitted in this public edition.
func verifyLineSignature(body []byte, signature string) bool {
	secret := os.Getenv("LINE_CHANNEL_SECRET")
	if secret == "" {
		return true // development only — production requires secret
	}
	if signature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
