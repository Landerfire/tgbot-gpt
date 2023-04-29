import { Telegraf, session, type Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { code, spoiler } from 'telegraf/format';
import config from 'config';
import { ogg } from './ogg.js';
import { openai } from './openai.js';
import type { Update } from 'telegraf/types';

interface InitialSession {
	messages: any[];
}

interface MyContext<U extends Update = Update> extends Context<U> {
	session: {
		messages: any[];
	};
}

console.log(config.get('TEST_ENV'));

const INITIAL_SESSION: InitialSession = {
	messages: [],
};

const bot = new Telegraf<MyContext>(config.get('TELEGRAM_TOKEN'));

bot.use(session());

bot.command('new', async (ctx) => {
	ctx.session = INITIAL_SESSION;
	await ctx.reply('Жду вашего голосового или текстового сообщения...');
});

bot.command('start', async (ctx) => {
	ctx.session = INITIAL_SESSION;
	await ctx.reply('Жду вашего голосового или текстового сообщения...');
});

bot.on(message('voice'), async (ctx) => {
	ctx.session ??= INITIAL_SESSION;
	try {
		await ctx.reply(code('Обрабатываю...'));
		const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
		const userId = String(ctx.message.from.id);
		console.log(link.href);

		const oggPath = await ogg.create(link.href, userId);
		if (oggPath === undefined) {
			throw new Error('Error while: creating .ogg (oggPath is undefined)');
		}

		const mp3Path = await ogg.toMp3(oggPath, userId);
		if (mp3Path === undefined) {
			throw new Error('Error while: creating .mp3 (mp3Path is undefined)');
		}

		const text = await openai.transcription(mp3Path);
		if (text === undefined) {
			throw new Error('Error while: transcription (text is undefined)');
		}
		await ctx.reply(code(`Ваш запрос: ${text}`));
		// await ctx.reply(code('Ваш запрос:'));
		// await ctx.reply(spoiler(text));
		await ctx.reply(code('Составляю ответ...'));

		ctx.session.messages.push({ role: openai.roles.USER, content: text });

		const chatResponse = await openai.chat(ctx.session.messages);
		if (chatResponse === undefined) {
			throw new Error(
				'Error while: chat response (chatResponse is undefined)',
			);
		}

		ctx.session.messages.push({
			role: openai.roles.ASSISTANT,
			content: chatResponse.content,
		});

		await ctx.reply(chatResponse.content);
	} catch (error: any) {
		console.log('Error while: voice message', error.message);
	}
});

bot.on(message('text'), async (ctx) => {
	ctx.session ??= INITIAL_SESSION;
	try {
		await ctx.reply(code('Составляю ответ...'));

		ctx.session.messages.push({
			role: openai.roles.USER,
			content: ctx.message.text,
		});

		const chatResponse = await openai.chat(ctx.session.messages);
		if (chatResponse === undefined) {
			throw new Error(
				'Error while: chat response (chatResponse is undefined)',
			);
		}

		ctx.session.messages.push({
			role: openai.roles.ASSISTANT,
			content: chatResponse.content,
		});

		await ctx.reply(chatResponse.content);
	} catch (error: any) {
		console.log('Error while: voice message', error.message);
	}
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

console.log('Working...');
