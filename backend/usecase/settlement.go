package usecase

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

// SettlementUsecaseImpl は月末決済ユースケースの実装
type SettlementUsecaseImpl struct {
	repo repository.SettlementRepository
}

func NewSettlementUsecase(repo repository.SettlementRepository) *SettlementUsecaseImpl {
	return &SettlementUsecaseImpl{repo: repo}
}

func (u *SettlementUsecaseImpl) Run(targetMonth string, dryRun bool) (*domain.SettlementResult, error) {
	result := &domain.SettlementResult{
		TargetMonth: targetMonth,
		DryRun:      dryRun,
		Errors:      []domain.SettlementError{},
	}

	purchases, err := u.repo.FetchUnsettledPurchases(targetMonth)
	if err != nil {
		return nil, fmt.Errorf("fetch purchases: %w", err)
	}

	// 会員ごとにグループ化
	settlements := groupByMember(purchases)

	now := time.Now()
	settledAt := fmt.Sprintf("%d年%d月%d日", now.Year(), now.Month(), now.Day())

	for _, ms := range settlements {
		result.Members.Processed++
		member := ms.Member

		if member.StripeCustomerID == "" {
			result.Members.Skipped++
			result.Errors = append(result.Errors, domain.SettlementError{
				MemberID:   member.ID,
				MemberName: member.Name,
				Error:      "Stripe顧客IDがありません",
			})
			continue
		}

		if dryRun {
			log.Printf("[DRY RUN] Would charge %s: ¥%d", member.Name, ms.TotalAmount)
			result.Members.Succeeded++
			result.TotalAmount += ms.TotalAmount
			continue
		}

		if err := u.processSettlement(ms, targetMonth, settledAt, result); err != nil {
			log.Printf("Settlement failed for %s: %v", member.Name, err)
		}
	}

	return result, nil
}

func (u *SettlementUsecaseImpl) processSettlement(ms *domain.MemberSettlement, targetMonth, settledAt string, result *domain.SettlementResult) error {
	member := ms.Member

	paymentMethods, err := u.repo.GetPaymentMethods(member.StripeCustomerID)
	if err != nil || len(paymentMethods) == 0 {
		errMsg := "登録されたカードがありません"
		if err != nil {
			errMsg = err.Error()
		}
		result.Members.Failed++
		result.Errors = append(result.Errors, domain.SettlementError{
			MemberID:   member.ID,
			MemberName: member.Name,
			Error:      errMsg,
		})
		return nil
	}

	pm := paymentMethods[0]
	purchaseIDs := make([]string, 0, len(ms.Purchases))
	for _, p := range ms.Purchases {
		purchaseIDs = append(purchaseIDs, p.ID)
	}

	chargeResult, err := u.repo.ChargeCustomer(domain.ChargeParams{
		CustomerID:      member.StripeCustomerID,
		PaymentMethodID: pm.ID,
		Amount:          ms.TotalAmount,
		SettlementMonth: targetMonth,
		MemberID:        member.ID,
		PurchaseCount:   len(ms.Purchases),
		Description:     fmt.Sprintf("物販まとめ決済 %s (%d件)", targetMonth, len(ms.Purchases)),
	})
	if err != nil {
		result.Members.Failed++
		result.Errors = append(result.Errors, domain.SettlementError{
			MemberID:   member.ID,
			MemberName: member.Name,
			Error:      err.Error(),
		})
		return nil
	}

	// chargeResult = "paymentIntentID|chargeID"
	parts := strings.SplitN(chargeResult, "|", 2)
	paymentIntentID := parts[0]
	chargeID := ""
	if len(parts) == 2 {
		chargeID = parts[1]
	}

	if err := u.repo.UpdatePurchasesSettled(purchaseIDs, paymentIntentID, chargeID); err != nil {
		log.Printf("Failed to update purchases for %s: %v", member.Name, err)
		// 決済は成功しているのでエラーは致命的にしない
	}

	// 明細メール送信
	items := make([]domain.PurchaseItem, 0, len(ms.Purchases))
	for _, p := range ms.Purchases {
		t := p.PurchasedAt
		items = append(items, domain.PurchaseItem{
			Date:        fmt.Sprintf("%d/%d", t.Month(), t.Day()),
			ProductName: p.ProductName,
			Quantity:    p.Quantity,
			Price:       p.ProductPrice,
			Amount:      p.TotalAmount,
		})
	}

	if err := u.repo.SendStatementEmail(domain.StatementEmailParams{
		To:          member.Email,
		Name:        member.Name,
		TargetMonth: targetMonth,
		Purchases:   items,
		TotalAmount: ms.TotalAmount,
		CardLast4:   pm.CardLast4,
		SettledAt:   settledAt,
	}); err != nil {
		log.Printf("Failed to send statement email to %s: %v", member.Email, err)
		// メール失敗は致命的エラーにしない
	}

	result.Members.Succeeded++
	result.TotalAmount += ms.TotalAmount
	log.Printf("Settlement succeeded for %s: ¥%d", member.Name, ms.TotalAmount)
	return nil
}

func groupByMember(purchases []*domain.ProductPurchase) []*domain.MemberSettlement {
	orderMap := make(map[string]int)
	settlements := make(map[string]*domain.MemberSettlement)

	for _, p := range purchases {
		id := p.MemberID
		if _, exists := settlements[id]; !exists {
			orderMap[id] = len(orderMap)
			settlements[id] = &domain.MemberSettlement{
				Member:    p.Member,
				Purchases: []*domain.ProductPurchase{},
			}
		}
		ms := settlements[id]
		ms.Purchases = append(ms.Purchases, p)
		ms.TotalAmount += p.TotalAmount
	}

	// 挿入順を保持
	result := make([]*domain.MemberSettlement, len(settlements))
	for id, ms := range settlements {
		result[orderMap[id]] = ms
	}
	return result
}
