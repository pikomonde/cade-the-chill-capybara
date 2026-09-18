package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"github.com/pikomonde/cade-the-chill-capybara/backend/internal/auth"
	"github.com/pikomonde/cade-the-chill-capybara/backend/internal/game"
	"github.com/pikomonde/cade-the-chill-capybara/backend/internal/leaderboard"
	"github.com/pikomonde/cade-the-chill-capybara/backend/internal/reward"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	app := fiber.New(fiber.Config{
		AppName:      "Cade the Chill Capybara API v1.0",
		ErrorHandler: errorHandler,
	})

	// ── Middleware ──────────────────────────────────────────────
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} — ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: os.Getenv("ALLOWED_ORIGINS"),
		AllowHeaders: "Origin, Content-Type, Authorization",
		AllowMethods: "GET, POST, OPTIONS",
	}))

	// ── Health check (for UptimeRobot & Render) ─────────────────
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "capybara": "chill 🦫"})
	})

	// ── Routes ──────────────────────────────────────────────────
	api := app.Group("/api/v1")

	auth.RegisterRoutes(api)
	game.RegisterRoutes(api)
	leaderboard.RegisterRoutes(api)
	reward.RegisterRoutes(api)

	// ── Start ────────────────────────────────────────────────────
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🦫 Cade API starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}
