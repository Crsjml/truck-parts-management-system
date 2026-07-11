import { z } from 'zod';

export const getPartsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  archived: z.enum(['true', 'false']).optional(),
  published: z.enum(['true', 'false']).optional(),
  brand: z.string().optional(),
  series: z.string().optional(),
  engineCode: z.string().optional(),
  page: z.string().regex(/^\d+$/, "Page must be a number").transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/, "Limit must be a number").transform(Number).optional().default('50')
});
