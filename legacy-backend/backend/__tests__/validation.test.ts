import { projectSchema, eventSchema, mediaSchema, schoolSchema } from '../src/utils/schemas';

describe('Validation Schemas', () => {
    describe('projectSchema', () => {
        it('should validate a valid project', () => {
            const validProject = {
                title: 'Test Project',
                description: 'A test project',
                start_date: new Date().toISOString(),
                status: 'ongoing'
            };

            const result = projectSchema.safeParse(validProject);
            expect(result.success).toBe(true);
        });

        it('should reject project without title', () => {
            const invalidProject = {
                description: 'Missing title',
                start_date: new Date().toISOString()
            };

            const result = projectSchema.safeParse(invalidProject);
            expect(result.success).toBe(false);
        });

        it('should reject invalid status', () => {
            const invalidProject = {
                title: 'Test',
                start_date: new Date().toISOString(),
                status: 'invalid_status'
            };

            const result = projectSchema.safeParse(invalidProject);
            expect(result.success).toBe(false);
        });

        it('should reject invalid date format', () => {
            const invalidProject = {
                title: 'Test',
                start_date: 'not-a-date'
            };

            const result = projectSchema.safeParse(invalidProject);
            expect(result.success).toBe(false);
        });
    });

    describe('eventSchema', () => {
        it('should validate a valid event', () => {
            const validEvent = {
                title: 'Test Event',
                description: 'A test event',
                event_date: new Date().toISOString(),
                type: 'personal',
                location: 'Test Location'
            };

            const result = eventSchema.safeParse(validEvent);
            expect(result.success).toBe(true);
        });

        it('should reject event without title', () => {
            const invalidEvent = {
                event_date: new Date().toISOString()
            };

            const result = eventSchema.safeParse(invalidEvent);
            expect(result.success).toBe(false);
        });

        it('should reject invalid event type', () => {
            const invalidEvent = {
                title: 'Test',
                event_date: new Date().toISOString(),
                type: 'invalid_type'
            };

            const result = eventSchema.safeParse(invalidEvent);
            expect(result.success).toBe(false);
        });
    });

    describe('mediaSchema', () => {
        it('should validate valid media', () => {
            const validMedia = {
                event_id: 1,
                title: 'Test Media',
                media_type: 'image',
                media_url: 'https://example.com/image.jpg'
            };

            const result = mediaSchema.safeParse(validMedia);
            expect(result.success).toBe(true);
        });

        it('should reject invalid URL', () => {
            const invalidMedia = {
                event_id: 1,
                media_type: 'image',
                media_url: 'not-a-url'
            };

            const result = mediaSchema.safeParse(invalidMedia);
            expect(result.success).toBe(false);
        });

        it('should reject invalid media type', () => {
            const invalidMedia = {
                event_id: 1,
                media_type: 'audio',
                media_url: 'https://example.com/audio.mp3'
            };

            const result = mediaSchema.safeParse(invalidMedia);
            expect(result.success).toBe(false);
        });

        it('should reject negative event_id', () => {
            const invalidMedia = {
                event_id: -1,
                media_type: 'image',
                media_url: 'https://example.com/image.jpg'
            };

            const result = mediaSchema.safeParse(invalidMedia);
            expect(result.success).toBe(false);
        });
    });

    describe('schoolSchema', () => {
        it('should validate a valid school', () => {
            const validSchool = {
                name: 'Test School',
                location: 'Test City',
                education_system: 'Test System',
                description: 'A test school'
            };

            const result = schoolSchema.safeParse(validSchool);
            expect(result.success).toBe(true);
        });

        it('should reject school without name', () => {
            const invalidSchool = {
                location: 'Test City'
            };

            const result = schoolSchema.safeParse(invalidSchool);
            expect(result.success).toBe(false);
        });

        it('should accept school with minimal fields', () => {
            const minimalSchool = {
                name: 'Minimal School'
            };

            const result = schoolSchema.safeParse(minimalSchool);
            expect(result.success).toBe(true);
        });
    });
});
