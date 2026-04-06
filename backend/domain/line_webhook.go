package domain

import "time"

// LineEvent はLINE Webhookのイベント
type LineEvent struct {
	Type    string        `json:"type"`
	Source  LineSource    `json:"source"`
	Message *LineMessage  `json:"message,omitempty"`
}

// LineSource はイベントの発信元
type LineSource struct {
	Type   string `json:"type"`
	UserID string `json:"userId"`
}

// LineMessage はLINEメッセージ
type LineMessage struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Text      string `json:"text,omitempty"`
	PackageID string `json:"packageId,omitempty"`
	StickerID string `json:"stickerId,omitempty"`
	Title     string `json:"title,omitempty"`
	Address   string `json:"address,omitempty"`
	FileName  string `json:"fileName,omitempty"`
}

// LineProfile はLINEユーザーのプロフィール
type LineProfile struct {
	DisplayName    string `json:"displayName"`
	PictureURL     string `json:"pictureUrl"`
}

// LineInquiry はLINEお問い合わせスレッド
type LineInquiry struct {
	ID            string    `json:"id"`
	LineUserID    string    `json:"line_user_id"`
	DisplayName   string    `json:"display_name"`
	ProfileImageURL string  `json:"profile_image_url"`
	MemberID      string    `json:"member_id"`
	Status        string    `json:"status"`
	LastMessageAt time.Time `json:"last_message_at"`
}
