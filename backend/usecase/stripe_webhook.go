package usecase

import (
	"fmt"
	"log"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type StripeWebhookUsecaseImpl struct {
	repo repository.StripeWebhookRepository
}

func NewStripeWebhookUsecase(repo repository.StripeWebhookRepository) *StripeWebhookUsecaseImpl {
	return &StripeWebhookUsecaseImpl{repo: repo}
}

// HandlePaymentIntentSucceeded は単発決済成功を処理する
func (u *StripeWebhookUsecaseImpl) HandlePaymentIntentSucceeded(e domain.StripePaymentIntentEvent) error {
	log.Printf("[Stripe] payment_intent.succeeded: %s", e.ID)

	if e.MemberID == "" {
		log.Printf("[Stripe] No member_id in metadata, skipping")
		return nil
	}

	today := time.Now().UTC().Format("2006-01-02")
	if err := u.repo.InsertPayment(domain.PaymentRecord{
		MemberID:              e.MemberID,
		PaymentType:           "trial_fee",
		Amount:                e.Amount,
		PaymentDate:           today,
		PaymentMethod:         "card",
		Status:                "completed",
		Description:           fmt.Sprintf("Stripe PaymentIntent: %s", e.ID),
		StripePaymentIntentID: e.ID,
		StripeChargeID:        e.LatestChargeID,
	}); err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	if err := u.repo.UpdateMemberStatus(e.MemberID, "active"); err != nil {
		return fmt.Errorf("update member status: %w", err)
	}

	log.Printf("[Stripe] Member %s activated after payment", e.MemberID)
	return nil
}

// HandlePaymentIntentFailed は単発決済失敗を処理する
func (u *StripeWebhookUsecaseImpl) HandlePaymentIntentFailed(e domain.StripePaymentIntentEvent) error {
	log.Printf("[Stripe] payment_intent.payment_failed: %s", e.ID)

	if e.MemberID == "" {
		return nil
	}

	desc := "決済失敗: 不明なエラー"
	if e.LastPaymentError != "" {
		desc = fmt.Sprintf("決済失敗: %s", e.LastPaymentError)
	}

	today := time.Now().UTC().Format("2006-01-02")
	if err := u.repo.InsertPayment(domain.PaymentRecord{
		MemberID:              e.MemberID,
		PaymentType:           "other",
		Amount:                e.Amount,
		PaymentDate:           today,
		PaymentMethod:         "card",
		Status:                "pending",
		Description:           desc,
		StripePaymentIntentID: e.ID,
		StripeChargeID:        e.LatestChargeID,
	}); err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	log.Printf("[Stripe] Payment failed for member %s", e.MemberID)
	return nil
}

// HandleSubscriptionCreated はサブスクリプション作成を処理する
func (u *StripeWebhookUsecaseImpl) HandleSubscriptionCreated(e domain.StripeSubscriptionEvent) error {
	log.Printf("[Stripe] customer.subscription.created: %s", e.ID)

	if e.MemberID == "" {
		return nil
	}

	if err := u.repo.UpdateMemberSubscription(e.MemberID, e.ID, "active"); err != nil {
		return fmt.Errorf("update member subscription: %w", err)
	}

	log.Printf("[Stripe] Subscription %s linked to member %s", e.ID, e.MemberID)
	return nil
}

// HandleSubscriptionUpdated はサブスクリプション更新を処理する
func (u *StripeWebhookUsecaseImpl) HandleSubscriptionUpdated(e domain.StripeSubscriptionEvent) error {
	log.Printf("[Stripe] customer.subscription.updated: %s status=%s", e.ID, e.Status)

	member, err := u.repo.FindMemberBySubscriptionID(e.ID)
	if err != nil {
		return fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		log.Printf("[Stripe] No member found for subscription: %s", e.ID)
		return nil
	}

	memberStatus := subscriptionStatusToMemberStatus(e.Status)
	if err := u.repo.UpdateMemberStatus(member.ID, memberStatus); err != nil {
		return fmt.Errorf("update member status: %w", err)
	}

	log.Printf("[Stripe] Member %s status updated to %s", member.ID, memberStatus)
	return nil
}

// HandleSubscriptionDeleted はサブスクリプション削除（キャンセル完了）を処理する
func (u *StripeWebhookUsecaseImpl) HandleSubscriptionDeleted(e domain.StripeSubscriptionEvent) error {
	log.Printf("[Stripe] customer.subscription.deleted: %s", e.ID)

	member, err := u.repo.FindMemberBySubscriptionID(e.ID)
	if err != nil {
		return fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil
	}

	if err := u.repo.CancelMemberSubscription(member.ID); err != nil {
		return fmt.Errorf("cancel member subscription: %w", err)
	}

	log.Printf("[Stripe] Member %s canceled due to subscription deletion", member.ID)
	return nil
}

// HandleInvoicePaymentSucceeded は月額決済成功を処理する
func (u *StripeWebhookUsecaseImpl) HandleInvoicePaymentSucceeded(e domain.StripeInvoiceEvent) error {
	log.Printf("[Stripe] invoice.payment_succeeded: %s", e.ID)

	if e.SubscriptionID == "" {
		return nil
	}

	member, err := u.repo.FindMemberBySubscriptionID(e.SubscriptionID)
	if err != nil {
		return fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil
	}

	today := time.Now().UTC().Format("2006-01-02")
	if err := u.repo.InsertPayment(domain.PaymentRecord{
		MemberID:              member.ID,
		PaymentType:           "monthly_fee",
		Amount:                e.AmountPaid,
		PaymentDate:           today,
		PaymentMethod:         "card",
		Status:                "completed",
		Description:           fmt.Sprintf("月額会費 - Invoice: %s", e.ID),
		StripeInvoiceID:       e.ID,
		StripePaymentIntentID: e.PaymentIntentID,
		StripeChargeID:        e.ChargeID,
	}); err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	if err := u.repo.UpdateMemberStatus(member.ID, "active"); err != nil {
		return fmt.Errorf("update member status: %w", err)
	}

	log.Printf("[Stripe] Monthly payment recorded for member %s", member.ID)
	return nil
}

// HandleInvoicePaymentFailed は月額決済失敗を処理する
func (u *StripeWebhookUsecaseImpl) HandleInvoicePaymentFailed(e domain.StripeInvoiceEvent) error {
	log.Printf("[Stripe] invoice.payment_failed: %s", e.ID)

	if e.SubscriptionID == "" {
		return nil
	}

	member, err := u.repo.FindMemberBySubscriptionID(e.SubscriptionID)
	if err != nil {
		return fmt.Errorf("find member: %w", err)
	}
	if member == nil {
		return nil
	}

	today := time.Now().UTC().Format("2006-01-02")
	errMsg := e.LastFinalizationError
	if errMsg == "" {
		errMsg = "決済に失敗しました"
	}

	if err := u.repo.InsertPayment(domain.PaymentRecord{
		MemberID:              member.ID,
		PaymentType:           "monthly_fee",
		Amount:                e.AmountDue,
		PaymentDate:           today,
		PaymentMethod:         "card",
		Status:                "pending",
		Description:           fmt.Sprintf("月額会費決済失敗 - Invoice: %s", e.ID),
		StripeInvoiceID:       e.ID,
		StripePaymentIntentID: e.PaymentIntentID,
		StripeChargeID:        e.ChargeID,
	}); err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}

	// 既存リトライがなければ新規作成（翌日1:00 UTC = 10:00 JST）
	existingID, err := u.repo.FindPendingRetryByInvoiceID(e.ID)
	if err != nil {
		return fmt.Errorf("find pending retry: %w", err)
	}
	if existingID == "" {
		nextRetryAt := nextRetryTime().Format(time.RFC3339)
		if err := u.repo.InsertPaymentRetry(member.ID, e.ID, e.SubscriptionID, e.AmountDue, nextRetryAt, errMsg); err != nil {
			return fmt.Errorf("insert payment retry: %w", err)
		}
		log.Printf("[Stripe] Payment retry scheduled for member %s at %s", member.ID, nextRetryAt)
	}

	// LINE通知（連携済みの場合）
	if member.LineUserID != "" {
		memberName := member.LastName + " " + member.FirstName
		if err := u.repo.SendPaymentFailedLine(member.LineUserID, memberName); err != nil {
			log.Printf("[Stripe] Failed to send LINE notification: %v", err)
		}
	}

	log.Printf("[Stripe] Payment failed for member %s", member.ID)
	return nil
}

// HandleChargeRefunded は返金処理を行う
func (u *StripeWebhookUsecaseImpl) HandleChargeRefunded(e domain.StripeChargeRefundedEvent) error {
	log.Printf("[Stripe] charge.refunded: %s", e.ID)

	if len(e.Refunds) == 0 {
		return nil
	}

	for _, refund := range e.Refunds {
		// 既存の返金レコードを確認
		existing, err := u.repo.FindRefundByStripeID(refund.ID)
		if err != nil {
			return fmt.Errorf("find refund by stripe id: %w", err)
		}
		if existing != nil {
			if existing.Status != "processed" {
				if err := u.repo.UpdateRefundStatus(existing.ID); err != nil {
					return fmt.Errorf("update refund status: %w", err)
				}
			}
			continue
		}

		// 対応する決済レコードを検索
		payment, err := u.repo.FindPaymentByChargeID(e.ID)
		if err != nil {
			return fmt.Errorf("find payment by charge id: %w", err)
		}
		if payment == nil {
			continue
		}

		// 同じ決済IDの返金レコードが既にあるかチェック
		existingRefundID, err := u.repo.FindRefundByPaymentID(payment.ID)
		if err != nil {
			return fmt.Errorf("find refund by payment id: %w", err)
		}
		if existingRefundID != "" {
			continue
		}

		// 決済ステータスを更新
		paymentStatus := "partially_refunded"
		if refund.Amount >= payment.Amount {
			paymentStatus = "refunded"
		}
		if err := u.repo.UpdatePaymentRefundStatus(payment.ID, paymentStatus); err != nil {
			return fmt.Errorf("update payment refund status: %w", err)
		}

		// 返金レコードを挿入
		now := time.Now().UTC().Format(time.RFC3339)
		if err := u.repo.InsertRefund(domain.RefundRecord{
			PaymentID:             payment.ID,
			MemberID:              payment.MemberID,
			StoreID:               payment.StoreID,
			RequestedAmount:       refund.Amount,
			RefundAmount:          refund.Amount,
			FeeAmount:             0,
			FeeBearer:             "company",
			ReasonType:            "company",
			Status:                "processed",
			ProcessedAt:           now,
			StripeRefundID:        refund.ID,
			StripePaymentIntentID: e.PaymentIntentID,
			StripeChargeID:        e.ID,
		}); err != nil {
			return fmt.Errorf("insert refund: %w", err)
		}
	}

	return nil
}

// subscriptionStatusToMemberStatus はStripeのサブスクリプションステータスを会員ステータスに変換する
func subscriptionStatusToMemberStatus(status string) string {
	switch status {
	case "active", "past_due":
		return "active"
	case "unpaid", "paused":
		return "paused"
	case "canceled":
		return "canceled"
	default:
		return "active"
	}
}

