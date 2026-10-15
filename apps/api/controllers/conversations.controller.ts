// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { ChatDomain, ChatMapper } from '../domains/chat/index.ts';
import { userCtx } from '../lib/ctx.ts';

const id = (req: Request) => req.params.id as string;

export async function create(req: Request, res: Response): Promise<void> {
	res.json(await ChatDomain.openConversation(req.body, userCtx(req)));
}

export async function list(req: Request, res: Response): Promise<void> {
	const { rows, next_cursor } = await ChatDomain.listConversations(req.query, userCtx(req));
	res.json(ChatMapper.toConversationListDto(rows, next_cursor));
}

export async function messages(req: Request, res: Response): Promise<void> {
	res.json(await ChatDomain.listMessages({ ...req.query, conversation_id: id(req) }, userCtx(req)));
}

export async function send(req: Request, res: Response): Promise<void> {
	res.status(201).json(await ChatDomain.sendMessage({ ...req.body, conversation_id: id(req) }, userCtx(req)));
}

export async function read(req: Request, res: Response): Promise<void> {
	await ChatDomain.markRead({ conversation_id: id(req) }, userCtx(req));
	res.status(204).end();
}

export async function block(req: Request, res: Response): Promise<void> {
	await ChatDomain.blockParticipant({ ...req.body, conversation_id: id(req) }, userCtx(req));
	res.status(204).end();
}

export default { create, list, messages, send, read, block };
