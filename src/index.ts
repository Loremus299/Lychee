import z from "zod";

type Method = "get" | "post";

interface OpenAPIMedia {
	[type: string]: {
		schema: unknown;
	};
}

interface OpenAPIResponse {
	description: string;
	content: OpenAPIMedia;
}

interface OpenAPIBody {
	description?: string;
	required?: boolean;
	content: OpenAPIMedia;
}

type In = "path" | "query" | "header" | "cookie";
interface OpenAPIParameter {
	name: string;
	in: In;
	required: boolean;
	schema: unknown;
	description?: string;
	example?: string;
}

interface OpenAPIOperation {
	summary?: string;
	description?: string;
	tags?: string[];

	parameters?: OpenAPIParameter[];
	requestBody?: OpenAPIBody;
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
		status: number,
		description: string,
		type: string,
		zod: z.ZodType,
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
		res: Record<number, { description: string; type: string; zod: z.ZodType }>,
	) {
		for (const [status, details] of Object.entries(res)) {
			this.response(
				Number(status),
				details.description,
				details.type,
				details.zod,
			);
		}
	}

	public body(
		type: string,
		zod: z.ZodType,
		required?: boolean,
		description?: string,
	) {
		this.operation.requestBody = {
			description,
			required,
			content: {
				[type]: { schema: zod.toJSONSchema({ target: "openapi-3.0" }) },
			},
		};
	}

	private parameter(inn: In, zod: z.ZodObject) {
		this.operation.parameters ??= [];

		const jsonSchema = zod.toJSONSchema({ target: "openapi-3.0" });
		for (const [name, schema] of Object.entries(zod.shape)) {
			const property = jsonSchema.properties![name]!;
			const meta = schema.meta();

			this.operation.parameters.push({
				name: name,
				in: inn,
				required:
					(inn === "path" || jsonSchema.required?.includes(name)) ?? false,
				...(meta?.description && { description: meta.description }),
				...(meta?.example !== undefined && { example: meta.example }),
				schema: property,
			});
		}
	}

	public path(zod: z.ZodObject) {
		this.parameter("path", zod);
	}

	public query(zod: z.ZodObject) {
		this.parameter("query", zod);
	}

	public header(zod: z.ZodObject) {
		this.parameter("header", zod);
	}

	public cookie(zod: z.ZodObject) {
		this.parameter("cookie", zod);
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
