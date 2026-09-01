import { z } from 'zod';

export const importApiSpecSchema = z.object({
  rawContent: z
    .string()
    .min(1, { message: 'Specification content is required' }),
});

export const linkEndpointSchema = z.object({
  endpointId: z
    .string()
    .min(1, { message: 'Endpoint ID is required' }),
});

export type ImportApiSpecInput = z.infer<typeof importApiSpecSchema>;
export type LinkEndpointInput = z.infer<typeof linkEndpointSchema>;
