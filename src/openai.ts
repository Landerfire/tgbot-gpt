import { ChatCompletionRequestMessage } from './../node_modules/openai/dist/api.d';
import {
	Configuration,
	OpenAIApi,
	ChatCompletionRequestMessageRoleEnum,
} from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenAI {
	roles = {
		ASSISTANT: ChatCompletionRequestMessageRoleEnum.Assistant,
		USER: ChatCompletionRequestMessageRoleEnum.User,
		SYSTEM: ChatCompletionRequestMessageRoleEnum.System,
	};
	openai: OpenAIApi;

	constructor(apiKey: string) {
		const configuration = new Configuration({
			apiKey,
		});
		this.openai = new OpenAIApi(configuration);
	}

	async chat(messages: ChatCompletionRequestMessage[]) {
		try {
			const response = await this.openai.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages,
			});
			return response.data.choices[0].message;
		} catch (err: any) {
			console.log('Error while: chat', err.message);
		}
	}

	async transcription(filepath: string) {
		try {
			const stream = createReadStream(filepath);
			const file = stream as unknown as File;

			const response = await this.openai.createTranscription(
				file,
				'whisper-1',
			);
			return response.data.text;
		} catch (err: any) {
			console.log('Error while: transcription', err.message);
		}
	}
}

export const openai = new OpenAI(config.get('OPENAI_KEY'));
