import { z } from "zod";

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export const createResult = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

export const createError = <T = never>(error: string): Result<T> => ({
  success: false,
  error,
});

export const validateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Result<T> => {
  try {
    const validated = schema.parse(data);
    return createResult(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createError(error.errors.map((e) => e.message).join(", "));
    }
    return createError("Validation failed");
  }
};

