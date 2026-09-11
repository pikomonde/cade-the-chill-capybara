package reward

import "github.com/gofiber/fiber/v2"

// RegisterRoutes sets up the reward endpoints.
func RegisterRoutes(router fiber.Router) {
	rewardGroup := router.Group("/rewards")

	// Placeholder endpoints
	rewardGroup.Get("/pending", getPendingRewards)
	rewardGroup.Get("/voucher", getVoucher)
}

func getPendingRewards(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Pending rewards placeholder"})
}

func getVoucher(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Voucher placeholder"})
}
