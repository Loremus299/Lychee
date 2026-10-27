import z from "zod";
import type { Aril } from "./aril";
import type { Method, OperationConfig } from "./types";

export class ArilMiddleware {
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
