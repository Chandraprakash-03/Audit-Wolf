import axios from 'axios';

// Define your model options
const MODEL_ROUTER = {
    light: "mistralai/mistral-7b-instruct:free",
    // medium: "qwen/qwen3-14b:free",
    // coder: "qwen/qwen-2.5-coder-32b-instruct:free",
    // long: "deepseek/deepseek-v3-base:free"
};

// Auto-router logic
function chooseModel(code) {
    const lineCount = code.split('\n').length;

    // if (lineCount < 100) return MODEL_ROUTER.light;
    // if (lineCount < 300) return MODEL_ROUTER.medium;
    // if (lineCount < 800) return MODEL_ROUTER.coder;

    return MODEL_ROUTER.light; // Huge contracts with multiple imports
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

        // Clean any markdown wrappers
        raw = raw.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

        // Try parsing as JSON
        let result;
        try {
            result = JSON.parse(raw);
        } catch (err) {
            console.error("❌ Failed to parse JSON from model:", err);
            console.log("AI reply:", raw);
            return { error: "Invalid AI response format", raw };
        }

        return { result };
    } catch (error) {
        console.error("🛑 API call failed:", error.message);
        return { error: error.message };
    }
};
