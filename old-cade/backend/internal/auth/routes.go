package auth

import "github.com/gofiber/fiber/v2"

// RegisterRoutes sets up the auth endpoints.
func RegisterRoutes(router fiber.Router) {
	authGroup := router.Group("/auth")

	// Placeholder endpoints
	authGroup.Post("/telegram", verifyTelegram)
	authGroup.Post("/web", verifyWeb)
}

func verifyTelegram(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Telegram auth placeholder"})
}

func verifyWeb(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Web auth placeholder"})
}
