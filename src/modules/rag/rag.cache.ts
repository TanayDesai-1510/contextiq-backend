import { redis } from '../../lib/redis'

function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const mgA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const mgB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dot / (mgA * mgB)
}

export async function checkSemanticCache(queryEmbedding: number[], workspaceId: string) {
    const keys = await redis.keys(`cache:${workspaceId}:*`)
    if (keys.length === 0) {
        return null
    }
    for (const key of keys) {
        const cached = await redis.get(key)
        if (!cached) continue
        const parsed = JSON.parse(cached)
        const similarity = cosineSimilarity(queryEmbedding, parsed.embedding)
        if (similarity > 0.95) {
            return { answer: parsed.answer, citations: parsed.citations }
        }
    }
    return null
}

export async function setSemanticCache(queryEmbedding: number[], workspaceId: string, answer: string, citations: any[]) {
    const key = `cache:${workspaceId}:${Date.now()}`
    await redis.set(key, JSON.stringify({
        embedding: queryEmbedding,
        answer,
        citations
    }), 'EX', 86400)
}