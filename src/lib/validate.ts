import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from './errors'

export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction)=> {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            const messages = Object.values(result.error.flatten().fieldErrors).flat().join(', ')
            return next(new AppError(messages, 400))
        }
        req.body = result.data
        next()
    }
} 