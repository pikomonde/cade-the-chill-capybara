package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"sort"
	"strings"
)

// VerifyTelegramInitData verifies Telegram Mini App initData HMAC.
// Returns the parsed values on success, or error if signature is invalid.
//
// Telegram docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
func VerifyTelegramInitData(initData string, botToken string) (map[string]string, error) {
	values, err := url.ParseQuery(initData)
	if err != nil {
		return nil, fmt.Errorf("parse initData: %w", err)
	}

	receivedHash := values.Get("hash")
	if receivedHash == "" {
		return nil, fmt.Errorf("missing hash in initData")
	}

	// Build data-check-string: all fields except hash, sorted alphabetically, joined with \n
	var parts []string
	for k, v := range values {
		if k == "hash" {
			continue
		}
		parts = append(parts, k+"="+v[0])
	}
	sort.Strings(parts)
	dataCheckString := strings.Join(parts, "\n")

	// Secret key = HMAC-SHA256("WebAppData", botToken)
	mac := hmac.New(sha256.New, []byte("WebAppData"))
	mac.Write([]byte(botToken))
	secretKey := mac.Sum(nil)

	// Expected hash = HMAC-SHA256(secretKey, dataCheckString)
	mac2 := hmac.New(sha256.New, secretKey)
	mac2.Write([]byte(dataCheckString))
	expectedHash := hex.EncodeToString(mac2.Sum(nil))

	if !hmac.Equal([]byte(expectedHash), []byte(receivedHash)) {
		return nil, fmt.Errorf("invalid Telegram initData signature")
	}

	// Return parsed values as a plain map
	result := make(map[string]string)
	for k, v := range values {
		result[k] = v[0]
	}
	return result, nil
}
