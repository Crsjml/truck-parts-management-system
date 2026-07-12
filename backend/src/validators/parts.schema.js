import { z } from 'zod';

export const getPartsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  archived: z.enum(['true', 'false']).optional(),
  published: z.enum(['true', 'false']).optional(),
  brand: z.string().optional(),
  series: z.string().optional(),
  engineCode: z.string().optional(),
  page: z.string().regex(/^\d+$/, "Page must be a number").default('1').transform(Number),
  limit: z.string().regex(/^\d+$/, "Limit must be a number").default('50').transform(Number)
});
