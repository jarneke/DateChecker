import { z } from "zod";

export const itemSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    photo_url: z.string().url("Invalid photo URL").nullable().optional(),
    next_check_date: z.iso.date("Invalid date"),
    category_id: z.uuid("Invalid category ID"),
    slow_seller: z.boolean().default(false),
});

export const updateItemSchema = itemSchema.partial();