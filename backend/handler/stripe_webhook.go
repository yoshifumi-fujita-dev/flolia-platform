package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
	"github.com/labstack/echo/v4"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

type StripeWebhookHandler struct {
	usecase repository.StripeWebhookUsecase
}

func NewStripeWebhookHandler(usecase repository.StripeWebhookUsecase) *StripeWebhookHandler {
	return &StripeWebhookHandler{usecase: usecase}
}

// Handle はStripe Webhookイベントを処理する
func (h *StripeWebhookHandler) Handle(c echo.Context) error {
	bodyBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Failed to read body"})
	}

	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		log.Println("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured")
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Webhook secret not configured"})
	}

	sig := c.Request().Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(bodyBytes, sig, webhookSecret)
	if err != nil {
		log.Printf("[Stripe Webhook] Signature verification failed: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid signature"})
	}

	var handleErr error
	switch event.Type {
	case "payment_intent.succeeded":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal payment_intent: %v", err)
			break
		}
		handleErr = h.usecase.HandlePaymentIntentSucceeded(domain.StripePaymentIntentEvent{
			ID:             pi.ID,
			Amount:         pi.Amount,
			Status:         string(pi.Status),
			MemberID:       pi.Metadata["member_id"],
			LatestChargeID: piLatestChargeID(&pi),
		})

	case "payment_intent.payment_failed":
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal payment_intent: %v", err)
			break
		}
		lastErr := ""
		if pi.LastPaymentError != nil {
			lastErr = pi.LastPaymentError.Msg
		}
		handleErr = h.usecase.HandlePaymentIntentFailed(domain.StripePaymentIntentEvent{
			ID:               pi.ID,
			Amount:           pi.Amount,
			Status:           string(pi.Status),
			MemberID:         pi.Metadata["member_id"],
			LatestChargeID:   piLatestChargeID(&pi),
			LastPaymentError: lastErr,
		})

	case "customer.subscription.created":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal subscription: %v", err)
			break
		}
		handleErr = h.usecase.HandleSubscriptionCreated(domain.StripeSubscriptionEvent{
			ID:       sub.ID,
			Status:   string(sub.Status),
			MemberID: sub.Metadata["member_id"],
		})

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal subscription: %v", err)
			break
		}
		handleErr = h.usecase.HandleSubscriptionUpdated(domain.StripeSubscriptionEvent{
			ID:       sub.ID,
			Status:   string(sub.Status),
			MemberID: sub.Metadata["member_id"],
		})

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal subscription: %v", err)
			break
		}
		handleErr = h.usecase.HandleSubscriptionDeleted(domain.StripeSubscriptionEvent{
			ID:       sub.ID,
			Status:   string(sub.Status),
			MemberID: sub.Metadata["member_id"],
		})

	case "invoice.payment_succeeded":
		var inv stripe.Invoice
		if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal invoice: %v", err)
			break
		}
		handleErr = h.usecase.HandleInvoicePaymentSucceeded(domain.StripeInvoiceEvent{
			ID:              inv.ID,
			SubscriptionID:  invSubscriptionID(&inv),
			PaymentIntentID: invPaymentIntentID(&inv),
			ChargeID:        invChargeID(&inv),
			AmountPaid:      inv.AmountPaid,
		})

	case "invoice.payment_failed":
		var inv stripe.Invoice
		if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal invoice: %v", err)
			break
		}
		lastFinalErr := ""
		if inv.LastFinalizationError != nil {
			lastFinalErr = inv.LastFinalizationError.Msg
		}
		handleErr = h.usecase.HandleInvoicePaymentFailed(domain.StripeInvoiceEvent{
			ID:                    inv.ID,
			SubscriptionID:        invSubscriptionID(&inv),
			PaymentIntentID:       invPaymentIntentID(&inv),
			ChargeID:              invChargeID(&inv),
			AmountDue:             inv.AmountDue,
			LastFinalizationError: lastFinalErr,
		})

	case "charge.refunded":
		var ch stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &ch); err != nil {
			log.Printf("[Stripe Webhook] Failed to unmarshal charge: %v", err)
			break
		}
		refunds := make([]domain.StripeRefund, 0)
		if ch.Refunds != nil {
			for _, r := range ch.Refunds.Data {
				refunds = append(refunds, domain.StripeRefund{
					ID:     r.ID,
					Amount: r.Amount,
				})
			}
		}
		piID := ""
		if ch.PaymentIntent != nil {
			piID = ch.PaymentIntent.ID
		}
		handleErr = h.usecase.HandleChargeRefunded(domain.StripeChargeRefundedEvent{
			ID:              ch.ID,
			PaymentIntentID: piID,
			Refunds:         refunds,
		})

	default:
		log.Printf("[Stripe Webhook] Unhandled event type: %s", event.Type)
	}

	if handleErr != nil {
		log.Printf("[Stripe Webhook] Error handling %s: %v", event.Type, handleErr)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Webhook processing failed"})
	}

	return c.JSON(http.StatusOK, map[string]bool{"received": true})
}

// piLatestChargeID はPaymentIntentからlatestChargeIDを取得する
func piLatestChargeID(pi *stripe.PaymentIntent) string {
	if pi.LatestCharge != nil {
		return pi.LatestCharge.ID
	}
	return ""
}

// invSubscriptionID はInvoiceのParentからSubscriptionIDを取得する
func invSubscriptionID(inv *stripe.Invoice) string {
	if inv.Parent != nil && inv.Parent.SubscriptionDetails != nil && inv.Parent.SubscriptionDetails.Subscription != nil {
		return inv.Parent.SubscriptionDetails.Subscription.ID
	}
	return ""
}

// invPaymentIntentID はInvoiceのPaymentsリストからPaymentIntentIDを取得する
func invPaymentIntentID(inv *stripe.Invoice) string {
	if inv.Payments == nil {
		return ""
	}
	for _, p := range inv.Payments.Data {
		if p.Payment != nil && p.Payment.PaymentIntent != nil {
			return p.Payment.PaymentIntent.ID
		}
	}
	return ""
}

// invChargeID はInvoiceのPaymentsリストからChargeIDを取得する
func invChargeID(inv *stripe.Invoice) string {
	if inv.Payments == nil {
		return ""
	}
	for _, p := range inv.Payments.Data {
		if p.Payment != nil && p.Payment.Charge != nil {
			return p.Payment.Charge.ID
		}
	}
	return ""
}
