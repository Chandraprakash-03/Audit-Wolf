import axios from 'axios';

const MODEL_ROUTER = {
    light: "meta-llama/llama-4-maverick:free",
    medium: "qwen/qwen3-14b:free",
    coder: "qwen/qwen-2.5-coder-32b-instruct:free",
    long: "deepseek/deepseek-v3-base:free"
};

function chooseModel(code) {
    const lineCount = code.split('\n').length;
    if (lineCount < 100) return MODEL_ROUTER.light;
    if (lineCount < 300) return MODEL_ROUTER.medium;
    if (lineCount < 800) return MODEL_ROUTER.coder;
    return MODEL_ROUTER.long;
}

export const callAI = async (code) => {
    const model = chooseModel(code);
    const prompt = `Audit the following Solidity contract and return a list of vulnerabilities with severity and line number:\n\n${code}
Respond ONLY with valid JSON in this format:
[
  {
    "severity": "critical | high | medium | low",
    "line": number,
    "issue": "Brief summary",
    "recommendation": "Mitigation steps"
  }
]
`;

    try {
        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model,
            messages: [{ role: "user", content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        let raw = res.data.choices[0].message.content;
        raw = raw.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

        try {
            return JSON.parse(raw);
        } catch (err) {
            console.error("Failed to parse JSON from model:", err);
            console.log("AI reply:", raw);
            throw new Error("Invalid AI response format");
        }
    } catch (error) {
        console.error("API call failed:", error.message);
        throw error;
    }
};
