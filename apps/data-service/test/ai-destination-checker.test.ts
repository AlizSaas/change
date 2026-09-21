import { describe, expect, it } from 'vitest';
import { parseAiDestinationResponse } from '../src/helpers/ai-destination-checker';

describe('parseAiDestinationResponse', () => {
	it('returns parsed data for valid JSON text', () => {
		expect(
			parseAiDestinationResponse(
				JSON.stringify({
					pageStatus: {
						status: 'AVAILABLE_PRODUCT',
						statusReason: 'The page says "In stock" and shows an add to cart button.',
					},
				}),
			),
		).toEqual({
			status: 'AVAILABLE_PRODUCT',
			statusReason: 'The page says "In stock" and shows an add to cart button.',
		});
	});

	it('extracts JSON from fenced output', () => {
		expect(
			parseAiDestinationResponse(`
\`\`\`json
{"pageStatus":{"status":"NOT_AVAILABLE_PRODUCT","statusReason":"The page says sold out."}}
\`\`\`
			`),
		).toEqual({
			status: 'NOT_AVAILABLE_PRODUCT',
			statusReason: 'The page says sold out.',
		});
	});

	it('falls back gracefully for malformed JSON', () => {
		expect(parseAiDestinationResponse('{"pageStatus":')).toEqual({
			status: 'UNKNOWN_STATUS',
			statusReason: 'The AI response could not be parsed into the expected JSON structure.',
		});
	});

	it('falls back gracefully for unexpected JSON structure', () => {
		expect(
			parseAiDestinationResponse(
				JSON.stringify({
					pageStatus: {
						status: 'AVAILABLE_PRODUCT',
					},
				}),
			),
		).toEqual({
			status: 'UNKNOWN_STATUS',
			statusReason: 'The AI response JSON did not match the expected structure.',
		});
	});
});
