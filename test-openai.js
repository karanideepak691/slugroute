// require('dotenv').config({ path: '.env.local' });
const { OpenAI } = require("openai");

async function testOpenAI() {
    console.log("Checking OpenAI Key...");
    if (!process.env.OPENAI_API_KEY) {
        console.error("ERROR: OPENAI_API_KEY not found in environment.");
        return;
    }
    console.log("Key found (starts with):", process.env.OPENAI_API_KEY.substring(0, 5) + "...");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        console.log("Sending request to OpenAI...");
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: "Say hello." }],
            model: "gpt-3.5-turbo",
        });
        console.log("Success! Response:", completion.choices[0].message.content);
    } catch (error) {
        console.error("OpenAI Error:", error);
    }
}

testOpenAI();
