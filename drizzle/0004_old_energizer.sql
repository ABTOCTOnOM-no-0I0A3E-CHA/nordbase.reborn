CREATE TYPE "public"."contact_kind" AS ENUM('phone', 'telegram', 'whatsapp', 'max');--> statement-breakpoint
CREATE TYPE "public"."stay_kind" AS ENUM('house', 'camp');--> statement-breakpoint
CREATE TABLE "tour_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid,
	"request_id" uuid,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"guests" integer DEFAULT 1 NOT NULL,
	"status" "booking_status" DEFAULT 'hold' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"contact_kind" "contact_kind" DEFAULT 'phone' NOT NULL,
	"contact_value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contact_kind" "contact_kind" DEFAULT 'phone' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contact_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "min_guests" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "kind" "stay_kind" DEFAULT 'house' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "contact_kind" "contact_kind" DEFAULT 'phone' NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "contact_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tour_bookings_range_idx" ON "tour_bookings" USING btree ("date_from","date_to");