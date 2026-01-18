const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Access the `listModels` method if available, or try a raw fetch if SDK hides it?
        // SDK has genAI.getGenerativeModel... maybe generic?
        // Actually, checking documentation, it's not on genAI directly?
        // Wait, SDK doesn't expose listModels easily?
        // Let's try raw fetch.
        const key = process.env.GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
