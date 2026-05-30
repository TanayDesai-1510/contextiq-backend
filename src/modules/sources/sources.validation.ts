import { z } from 'zod'

export const createSourceSchema = z.object({ 
    owner: z.string().min(1, "Owner is required"),
    repo: z.string().min(1, "Repo is required"),
    branch: z.string().default("main"),
})