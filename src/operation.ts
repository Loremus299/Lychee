import z from "zod";
import type { Aril } from "./aril";
import type { In, Method, OpenAPIOperation, OperationConfig } from "./types";

export class ArilOperation {
	private readonly operation: OpenAPIOperation;

	constructor(
		ctx: Aril,
		path: string,
		method: Method,
		meta: Omit<OpenAPIOperation, "parameters" | "responses" | "requestBody">,
	) {
		ctx.docs.paths[path] ??= {};
		this.operation = ctx.docs.paths[path][method] ??= {
			...meta,
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
