package leaderboard

import "github.com/gofiber/fiber/v2"

// RegisterRoutes sets up the leaderboard endpoints.
func RegisterRoutes(router fiber.Router) {
	lbGroup := router.Group("/leaderboard")

	// Placeholder endpoints
	lbGroup.Get("/herd", getHerdLeaderboard)
	lbGroup.Get("/global", getGlobalLeaderboard)
}

func getHerdLeaderboard(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Herd leaderboard placeholder"})
}

func getGlobalLeaderboard(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Global leaderboard placeholder"})
}
