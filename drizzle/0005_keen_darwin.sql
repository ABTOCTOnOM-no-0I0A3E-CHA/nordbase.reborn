CREATE TYPE "public"."tour_price_unit" AS ENUM('group', 'person');--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "notify_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tours" ADD COLUMN "price_unit" "tour_price_unit" DEFAULT 'group' NOT NULL;