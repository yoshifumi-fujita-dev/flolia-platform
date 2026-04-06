package usecase

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/flolia/flolia-project/backend/domain"
	"github.com/flolia/flolia-project/backend/repository"
)

type LineWebhookUsecaseImpl struct {
	repo repository.LineWebhookRepository
}

func NewLineWebhookUsecase(repo repository.LineWebhookRepository) *LineWebhookUsecaseImpl {
	return &LineWebhookUsecaseImpl{repo: repo}
}

// HandleFollow は友だち追加イベントを処理する
func (u *LineWebhookUsecaseImpl) HandleFollow(lineUserID string) error {
	log.Printf("[LINE] follow event: %s", lineUserID)

	member, err := u.repo.FindMemberByLineUserID(lineUserID)
	if err != nil {
		log.Printf("[LINE] FindMemberByLineUserID error: %v", err)
	}

	var msg string
	if member != nil {
		msg = fmt.Sprintf("%s様、FLOLIAのLINE公式アカウントを友だち追加いただきありがとうございます！\n\n予約のリマインダーやお知らせをお届けします。", member.Name)
	} else {
		msg = "FLOLIAのLINE公式アカウントを友だち追加いただきありがとうございます！\n\n会員登録がまだの方は、体験・見学のご予約をお待ちしております。\n\n既に会員の方は、マイページからLINE連携を行うと、予約のリマインダーをLINEでお届けします。"
	}

	return u.repo.SendLineTextMessage(lineUserID, msg)
}

// HandleUnfollow はブロック（友だち解除）イベントを処理する
func (u *LineWebhookUsecaseImpl) HandleUnfollow(lineUserID string) error {
	log.Printf("[LINE] unfollow event: %s", lineUserID)

	if err := u.repo.ClearMemberLineUserID(lineUserID); err != nil {
		log.Printf("[LINE] ClearMemberLineUserID error: %v", err)
	}
	if err := u.repo.CloseInquiriesByLineUserID(lineUserID); err != nil {
		log.Printf("[LINE] CloseInquiriesByLineUserID error: %v", err)
	}
	return nil
}

// HandleMessage はメッセージ受信イベントを処理する
func (u *LineWebhookUsecaseImpl) HandleMessage(lineUserID string, msg *domain.LineMessage) error {
	log.Printf("[LINE] message event: type=%s", msg.Type)

	inquiry, err := u.repo.GetOrCreateInquiry(lineUserID)
	if err != nil {
		return fmt.Errorf("get or create inquiry: %w", err)
	}

	if err := u.repo.SaveIncomingMessage(inquiry.ID, msg); err != nil {
		log.Printf("[LINE] SaveIncomingMessage error: %v", err)
	}

	// テキストメッセージのみコマンド応答
	if msg.Type != "text" {
		return nil
	}

	text := strings.ToLower(strings.TrimSpace(msg.Text))
	switch text {
	case "予約", "予約確認":
		return u.handleBookingCommand(lineUserID)
	case "ヘルプ", "help":
		return u.repo.SendLineTextMessage(lineUserID,
			"FLOLIAへようこそ！\n\n【使えるコマンド】\n・「予約」→ 今後の予約を確認\n・「ヘルプ」→ このメッセージを表示\n\nその他のお問い合わせは、お気軽にお返事ください。スタッフが対応いたします。",
		)
	}
	// その他は保存のみ（スタッフが管理画面から対応）
	return nil
}

func (u *LineWebhookUsecaseImpl) handleBookingCommand(lineUserID string) error {
	member, err := u.repo.FindMemberByLineUserID(lineUserID)
	if err != nil || member == nil {
		return u.repo.SendLineTextMessage(lineUserID, "会員情報が見つかりません。マイページからLINE連携を行ってください。")
	}

	today := time.Now().Format("2006-01-02")
	bookings, err := u.repo.FindMemberBookings(member.ID, today)
	if err != nil || len(bookings) == 0 {
		return u.repo.SendLineTextMessage(lineUserID, "現在、予約はありません。")
	}

	lines := make([]string, 0, len(bookings))
	for _, b := range bookings {
		typeLabel := "見学"
		if b.BookingType == "trial" {
			typeLabel = "体験"
		}
		timeStr := ""
		if len(b.StartTime) >= 5 {
			timeStr = b.StartTime[:5] + "〜 "
		}
		lines = append(lines, fmt.Sprintf("・%s %s(%s)", b.BookingDate, timeStr, typeLabel))
	}

	return u.repo.SendLineTextMessage(lineUserID,
		fmt.Sprintf("📅 %s様の今後の予約:\n\n%s", member.Name, strings.Join(lines, "\n")),
	)
}
