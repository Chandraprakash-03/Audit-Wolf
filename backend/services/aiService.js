import axios from 'axios';

const MODEL_ROUTER = {
    light: "meta-llama/llama-4-maverick:free",
    medium: "meta-llama/llama-4-maverick:free",
    coder: "qwen/qwen-2.5-coder-32b-instruct:free",
    long: "deepseek/deepseek-v3-base:free"
};

export function chooseModel(code) {
    const lineCount = code.split('\n').length;
    if (lineCount < 100) return MODEL_ROUTER.light;
    if (lineCount < 300) return MODEL_ROUTER.medium;
    if (lineCount < 800) return MODEL_ROUTER.coder;
    return MODEL_ROUTER.long;
}

export const callAI = async (code) => {
    const model = chooseModel(code);
    const provider = {
        'sort': 'latency'
    }
    const prompt = `Analyze the following Solidity contract for both security vulnerabilities and gas optimization opportunities. Return a JSON object with two sections: vulnerabilities and gasOptimizations.

1. For vulnerabilities, provide a list of issues with severity, line number, issue description, and recommendation.
2. For gas optimizations, provide an estimated total gas usage for the contract (in gas units) and a list of optimization suggestions with line numbers, descriptions, and estimated gas savings.

Respond ONLY with valid JSON in this format:
{
    "vulnerabilities": [
        {
            "severity": "critical | high | medium | low",
            "line": number,
            "issue": "Brief summary",
            "recommendation": "Mitigation steps"
        }
    ],
    "gasOptimizations": {
        "estimatedGas": number,
        "suggestions": [
            {
                "line": number,
                "description": "Brief description of optimization",
                "estimatedSavings": number
            }
        ]
    }
}

Contract:
\`\`\`solidity
${code}
\`\`\`
`;

    try {
        const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model,
            provider,
            messages: [{ role: "user", content: prompt }],
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("AI response:", res);

        let raw = res.data.choices[0].message.content;
        raw = raw.replace(/```json|```/g, '').trim();

        try {
            const parsed = JSON.parse(raw);
            console.log("AI reply:", parsed);
            return parsed;
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