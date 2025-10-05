import { z } from 'zod'

// Phone number validation (US format)
const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/

export const laundryBookingSchema = z.object({
  address: z.object({
    line1: z.string().min(5, 'Address must be at least 5 characters'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().length(2, 'State must be 2 characters'),
    zip: z.string()
      .length(5, 'ZIP code must be 5 digits')
      .regex(/^\d{5}$/, 'ZIP code must contain only numbers')
      .refine(
        (zip) => ['10026', '10027', '10030'].includes(zip),
        'We only serve ZIP codes: 10026, 10027, 10030'
      ),
  }),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format (e.g., 555-123-4567)')
    .transform((val) => val.replace(/\D/g, '')), // Strip non-digits
  pounds: z.number()
    .min(15, 'Minimum 15 lbs required')
    .max(100, 'Maximum 100 lbs per order'),
  specialInstructions: z.string()
    .max(500, 'Instructions must be under 500 characters')
    .optional(),
  date: z.string()
    .min(1, 'Pickup date is required')
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      'Date must be today or later'
    ),
  selectedSlot: z.object({
    partner_id: z.string(),
    slot_start: z.string(),
    slot_end: z.string(),
  }).nullable().refine((slot) => slot !== null, 'Please select a time slot'),
})

export const cleaningBookingSchema = z.object({
  address: z.object({
    line1: z.string().min(5, 'Address must be at least 5 characters'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().length(2, 'State must be 2 characters'),
    zip: z.string()
      .length(5, 'ZIP code must be 5 digits')
      .regex(/^\d{5}$/, 'ZIP code must contain only numbers')
      .refine(
        (zip) => ['10026', '10027', '10030'].includes(zip),
        'We only serve ZIP codes: 10026, 10027, 10030'
      ),
  }),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format (e.g., 555-123-4567)'),
  date: z.string()
    .min(1, 'Service date is required')
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      'Date must be today or later'
    ),
  selectedSlot: z.object({
    partner_id: z.string(),
    slot_start: z.string(),
    slot_end: z.string(),
  }).nullable().refine((slot) => slot !== null, 'Please select a time slot'),
  specialInstructions: z.string()
    .max(500, 'Instructions must be under 500 characters')
    .optional(),
})

export type LaundryBookingFormData = z.infer<typeof laundryBookingSchema>
export type CleaningBookingFormData = z.infer<typeof cleaningBookingSchema>
