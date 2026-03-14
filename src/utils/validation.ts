import { Context } from 'hono'
import { ZodSchema, ZodError } from 'zod'
import { ResponseError } from './responseError'

export const validateBody = async <T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<T> => {
  try {
    const body = await c.req.json()
    return schema.parse(body)

  } catch (err) {
    if (err instanceof ZodError) {
      const errorMessages = err.errors.map(e => e.message).join(', ')
      throw new ResponseError(400, `Validation error: ${errorMessages}`)
    }

    throw new ResponseError(400, 'Invalid JSON payload')
  }
}