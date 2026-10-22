import z from "zod";

type Method = "get" | "post";

interface OpenAPIResponse {
	description: string;
	content: { [type: string]: { schema: unknown } };
}

interface OpenAPIOperation {
	summary?: string;
	description?: string;
	tags?: string[];

	responses?: { [status: string]: OpenAPIResponse };
}

class ArilOperation {
	private readonly operation: OpenAPIOperation;

	constructor(
		ctx: Aril,
		path: string,
		method: Method,
		{
			summary,
			description,
			tags,
		}: { summary?: string; description?: string; tags?: string[] },
	) {
		ctx.docs.paths[path] ??= {};
		this.operation = ctx.docs.paths[path][method] ??= {
			...(summary && { summary: summary }),
			...(description && { description: description }),
			...(tags && { tags: tags }),
		};
	}

	public response(
		status: string | number,
		description: string,
		type: string,
		zod: z.ZodObject,
	) {
		this.operation.responses ??= {};
		this.operation.responses[String(status)] = {
			description,
			content: {
				[type]: { schema: zod.toJSONSchema({ target: "openapi-3.0" }) },
			},
		};
	}

	public responses(
		res: Record<
			number,
			{ description: string; type: string; zod: z.ZodObject }
		>,
	) {
		for (const [status, details] of Object.entries(res)) {
			this.response(status, details.description, details.type, details.zod);
		}
	}
}

interface InfoObject {
	title: string;
	version: string;
}

interface OpenAPIPath {
	[path: string]: {
		[method: string]: OpenAPIOperation;
	};
}

interface OpenAPI {
	openapi: string;
	info: InfoObject;

	paths: OpenAPIPath;
}

export class Aril {
	private readonly json: OpenAPI;

	constructor(openapi: string, info: InfoObject) {
		this.json = { openapi, info, paths: {} };
	}

	public get docs() {
		return this.json;
	}

	public path(
		path: string,
		method: Method,
		{
			summary,
			description,
			tags,
		}: { summary?: string; description?: string; tags?: string[] },
	) {
		return new ArilOperation(this, path, method, {
			summary,
			description,
			tags,
		});
	}
}
