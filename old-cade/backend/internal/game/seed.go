package game

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// DailySeed returns a deterministic hex seed for a given game + UTC date.
// All players on the same UTC day get the same seed → same puzzle.
//
// Example:
//
//	DailySeed("sudoku", time.Now().UTC()) → "3a7f2c..."
func DailySeed(gameName string, date time.Time) string {
	// Normalize to start of UTC day
	y, m, d := date.UTC().Date()
	dateStr := fmt.Sprintf("%04d-%02d-%02d", y, int(m), d)

	h := sha256.New()
	h.Write([]byte(gameName + ":" + dateStr))
	return hex.EncodeToString(h.Sum(nil))
}

// CommitmentHash generates a commitment hash that proves the puzzle was
// fixed before the user started. Published to the client; stored server-side.
//
// commitment = SHA256(puzzleJSON + walletAddress + timestamp + serverSecret)
func CommitmentHash(puzzleJSON, walletAddress, serverSecret string, ts time.Time) string {
	raw := fmt.Sprintf("%s|%s|%d|%s", puzzleJSON, walletAddress, ts.Unix(), serverSecret)
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

// GameType represents a supported daily quest type
type GameType string

const (
	GameTebakAngka GameType = "tebak-angka"
	GameSudoku     GameType = "sudoku"
	GameFigrid     GameType = "figrid"
	GameKlotski    GameType = "klotski"
	GameSpellingBee GameType = "spelling-bee"
	Game2048       GameType = "2048"
	GameMemoryFlip GameType = "memory-flip"
)

// MVPGames returns games available in Phase 1
var MVPGames = []GameType{
	GameTebakAngka,
	GameSudoku,
	GameFigrid,
}

// ScoreRange defines min/max CADE Coin reward per game
type ScoreRange struct {
	MinCoins  int
	MaxCoins  int
	MinPoints int
	MaxPoints int
	BadgeEligible bool
}

var RewardConfig = map[GameType]ScoreRange{
	GameTebakAngka:  {1, 5, 10, 50, false},
	GameSudoku:      {5, 15, 50, 150, true},
	GameFigrid:      {5, 15, 50, 150, true},
	GameKlotski:     {5, 20, 50, 200, true},
	GameSpellingBee: {3, 10, 30, 100, true},
	Game2048:        {2, 10, 20, 100, false},
	GameMemoryFlip:  {2, 8, 20, 80, false},
}
