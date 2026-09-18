package game

import "github.com/gofiber/fiber/v2"

// RegisterRoutes sets up the game endpoints.
func RegisterRoutes(router fiber.Router) {
	gameGroup := router.Group("/game")

	// Placeholder endpoints
	gameGroup.Post("/start", startGame)
	gameGroup.Post("/submit", submitGame)
}

func startGame(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Start game placeholder"})
}

func submitGame(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Submit game placeholder"})
}
