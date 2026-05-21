import { z } from 'zod';

export const tripSchema = z.object({
	title: z.string().min(1, 'Title is required').max(100),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
	message: "End date must be after start date",
	path: ["endDate"]
});

export const eventSchema = z.object({
	dayId: z.string().min(1),
	title: z.string().min(1, 'Title is required').max(100),
	time: z.string().optional().or(z.literal('')),
	description: z.string().optional().or(z.literal('')),
	location: z.object({
		address: z.string().min(1, 'Address is required')
	}).optional()
});

export const locationSchema = z.object({
	eventId: z.string().min(1),
	address: z.string().min(1, 'Address is required')
});

export const attachmentSchema = z.object({
	eventId: z.string().min(1),
	fileName: z.string().min(1),
	mimeType: z.string().min(1)
});
