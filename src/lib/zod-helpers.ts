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
      console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      console.error("Data being validated:", JSON.stringify(data, null, 2));
      return createError(error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(", "));
    }
    return createError("Validation failed");
  }
};

