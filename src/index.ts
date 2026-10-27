import z from "zod";

type Method =
	| "get"
	| "put"
	| "post"
	| "delete"
	| "options"
	| "head"
	| "patch"
	| "trace";

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
	operationId?: string;

	parameters?: OpenAPIParameter[];
	requestBody?: OpenAPIBody;
	responses?: { [status: string]: OpenAPIResponse };
}

type OperationConfig = {
	path?: z.ZodObject;
	query?: z.ZodObject;
	header?: z.ZodObject;
	cookie?: z.ZodObject;
	body?: {
		type: string;
		description?: string;
		required?: boolean;
		zod: z.ZodType;
	};
	responses?: Record<
		number,
		{ description: string; type: string; zod: z.ZodType }
	>;
};

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
			operationId,
		}: {
			summary?: string;
			description?: string;
			tags?: string[];
			operationId?: string;
		},
	) {
		ctx.docs.paths[path] ??= {};
		this.operation = ctx.docs.paths[path][method] ??= {
			...(operationId && { operationId: operationId }),
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

	public apply({
		path,
		query,
		header,
		cookie,
		body,
		responses,
	}: OperationConfig) {
		if (path) this.path(path);
		if (query) this.query(query);
		if (header) this.header(header);
		if (cookie) this.cookie(cookie);
		if (body) this.body(body.type, body.zod, body.required, body.description);
		if (responses) this.responses(responses);
	}

	public documentFunction<
		P extends z.ZodObject = never,
		Q extends z.ZodObject = never,
		H extends z.ZodObject = never,
		C extends z.ZodObject = never,
		B extends z.ZodType = never,
		R extends Record<
			number,
			{ description: string; type: string; zod: z.ZodType }
		> = {},
	>({
		path,
		query,
		header,
		cookie,
		body,
		responses,
	}: {
		path?: P;
		query?: Q;
		header?: H;
		cookie?: C;
		body?: { type: string; description?: string; required?: boolean; zod: B };
		responses?: R;
	}) {
		this.apply({ path, query, header, cookie, body, responses });

		type Req<
			P extends z.ZodType,
			Q extends z.ZodType,
			H extends z.ZodType,
			C extends z.ZodType,
			B extends z.ZodType,
		> = ([P] extends [never] ? {} : { path: z.infer<P> }) &
			([Q] extends [never] ? {} : { query: z.infer<Q> }) &
			([H] extends [never] ? {} : { header: z.infer<H> }) &
			([C] extends [never] ? {} : { cookie: z.infer<C> }) &
			([B] extends [never] ? {} : { body: z.infer<B> });

		type Res<R extends Record<number, { zod: z.ZodType }>> = {
			[K in keyof R]: R[K] extends { zod: infer Z extends z.ZodType }
				? { [P in K]: z.infer<Z> }
				: never;
		}[keyof R];

		return <A extends unknown[]>(
			fn: (req: Req<P, Q, H, C, B>, ...rest: A) => Promise<Res<R>>,
		) => fn;
	}
}

class ArilMiddleware {
	constructor(
		private readonly ctx: Aril,
		private readonly prefix: string,
		private readonly config: OperationConfig,
	) {}

	public path(
		path: string,
		method: Method,
		meta: {
			summary?: string;
			description?: string;
			tags?: string[];
			operationId?: string;
		},
	) {
		const op = this.ctx.path(this.prefix + path, method, meta);
		op.apply(this.config);
		return op;
	}

	public middleware(prefix: string, config: OperationConfig) {
		const mergeSchema = (parent?: z.ZodObject, child?: z.ZodObject) =>
			parent && child ? parent.extend(child.shape) : (child ?? parent);

		return new ArilMiddleware(this.ctx, this.prefix + prefix, {
			path: mergeSchema(this.config.path, config.path),
			query: mergeSchema(this.config.query, config.query),
			header: mergeSchema(this.config.header, config.header),
			cookie: mergeSchema(this.config.cookie, config.cookie),
			body: config.body ?? this.config.body,
			responses: { ...this.config.responses, ...config.responses },
		});
	}
}

interface InfoObject {
	title: string;
	description?: string;
	version: string;
}

interface OpenAPIPath {
	[path: string]: {
		[method: string]: OpenAPIOperation;
	};
}

interface OpenAPIServer {
	url: string;
	description?: string;
}

interface OpenAPI {
	openapi: string;
	info: InfoObject;
	servers?: OpenAPIServer[];

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

	public servers(servs: OpenAPIServer[]) {
		this.json.servers ??= [];
		for (const serv of servs) {
			this.json.servers.push({ description: serv.description, url: serv.url });
		}
	}

	public path(
		path: string,
		method: Method,
		{
			summary,
			description,
			tags,
			operationId,
		}: {
			summary?: string;
			description?: string;
			tags?: string[];
			operationId?: string;
		},
	) {
		return new ArilOperation(this, path, method, {
			summary,
			description,
			tags,
			operationId,
		});
	}

	public middleware(prefix: string, config: OperationConfig) {
		return new ArilMiddleware(this, prefix, config);
	}
}
