import axios from 'axios'
import * as cheerio from 'cheerio'

export async function extractTextFromURL(url: string): Promise<{ text: string, title: string }> {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ContextIQ/1.0)'
        },
        timeout: 10000,
    })
    const $ = cheerio.load(response.data)

    $('script, style, nav, footer, header, iframe, noscript').remove()

    const title = $('title').text().trim() || url

    let text = ''
    const contentSelectors = ['article', 'main', '.content', '.post', '#content', 'body']

    for (const selector of contentSelectors) {
        const content = $(selector).text()
        if (content && content.trim().length > 200) {
            text = content
            break
        }
    }
    text = text.replace(/\s+/g, ' ').trim()
    return { text, title }
}