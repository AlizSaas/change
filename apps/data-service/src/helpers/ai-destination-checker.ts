import { generateText } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { z } from 'zod';

const destinationCheckResponseSchema = z
	.object({
		pageStatus: z
			.object({
				status: z.enum(['AVAILABLE_PRODUCT', 'NOT_AVAILABLE_PRODUCT', 'UNKNOWN_STATUS']),
				statusReason: z.string(),
			})
			.describe('Information about the product availability status determined from the webpage content.'),
	})
	.describe('The result object returned by the assistant.');

type DestinationCheckResponse = z.infer<typeof destinationCheckResponseSchema>;
type DestinationCheckResult = DestinationCheckResponse['pageStatus'];

const FALLBACK_UNKNOWN_STATUS: DestinationCheckResult = {
	status: 'UNKNOWN_STATUS',
	statusReason: 'The AI response could not be parsed into the expected JSON structure.',
};

function extractJsonPayload(text: string) {
	const trimmed = text.trim();
	const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

	if (fencedMatch?.[1]) {
		return fencedMatch[1].trim();
	}

	const firstBrace = trimmed.indexOf('{');
	const lastBrace = trimmed.lastIndexOf('}');

	if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
		return trimmed.slice(firstBrace, lastBrace + 1);
	}

	return trimmed;
}

export function parseAiDestinationResponse(text: string): DestinationCheckResult {
	const jsonPayload = extractJsonPayload(text);

	try {
		const parsedJson = JSON.parse(jsonPayload);
		const parsedResponse = destinationCheckResponseSchema.safeParse(parsedJson);

		if (!parsedResponse.success) {
			console.warn('AI destination checker returned invalid JSON shape.', parsedResponse.error.flatten());
			return {
				status: 'UNKNOWN_STATUS',
				statusReason: 'The AI response JSON did not match the expected structure.',
			};
		}

		return parsedResponse.data.pageStatus;
	} catch (error) {
		console.warn('AI destination checker returned malformed JSON.', error);
		return FALLBACK_UNKNOWN_STATUS;
	}
}

export async function aiDestinationChecker(env: Env, bodyText: string): Promise<DestinationCheckResult> {
	const workersAi = createWorkersAI({ binding: env.AI });
	const result = await generateText({
		model: workersAi('@cf/meta/llama-3.1-8b-instruct-fp8'),
		prompt:
			`You will analyze the provided webpage content and determine if it reflects a product that is currently available, not available, or if the status is unclear.

			Your goal is to:
			- Identify language that indicates product availability (e.g., "in stock", "available for purchase", "add to cart").
			- Identify language that indicates product unavailability (e.g., "out of stock", "sold out", "unavailable", "discontinued").
			- Return "UNKNOWN_STATUS" if you cannot confidently determine the status.

			Provide a clear reason supporting your determination based on the text.

			Return only valid JSON with this exact shape:
			{
			  "pageStatus": {
			    "status": "AVAILABLE_PRODUCT" | "NOT_AVAILABLE_PRODUCT" | "UNKNOWN_STATUS",
			    "statusReason": "string"
			  }
			}

			Do not include markdown, code fences, or any text outside the JSON object.

			---
			Webpage Content:
			${bodyText}
			`.trim(),
		system:
			`You are an AI assistant for ecommerce analysis. Your job is to determine if the product on a webpage is available, not available, or if its status is unclear, based solely on the provided text. Be concise and base your reasoning on specific evidence from the content. Do not guess if information is insufficient.
			`.trim(),
	});

	return parseAiDestinationResponse(result.text);
}
