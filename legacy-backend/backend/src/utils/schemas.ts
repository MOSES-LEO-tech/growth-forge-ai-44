import { z } from 'zod';

export const projectSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid start date format",
    }),
    end_date: z.string().optional().nullable().refine((date) => !date || !isNaN(Date.parse(date)), {
        message: "Invalid end date format",
    }),
    status: z.enum(['pending', 'ongoing', 'complete']).optional(),
    skills: z.any().optional(),
});

export const eventSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    event_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid event date format",
    }),
    type: z.enum(['personal', 'school']).optional(),
    location: z.string().optional(),
});

export const mediaSchema = z.object({
    event_id: z.number().int().positive(),
    title: z.string().optional(),
    description: z.string().optional(),
    media_type: z.enum(['image', 'video']),
    media_url: z.string().url(),
});

export const schoolSchema = z.object({
    name: z.string().min(1, 'School name is required').max(255),
    location: z.string().optional(),
    education_system: z.string().max(100).optional(),
    description: z.string().optional(),
    logo_url: z.string().url().optional().nullable(),
});

