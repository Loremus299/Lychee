type Method = "get" | "post";

interface BaseOpenAPIOperation {
	summary?: string;
	description?: string;
	tags?: string[];

	responses: {};
}

class OpenAPIOperation {
	private readonly operation: BaseOpenAPIOperation;

	constructor(ctx: Aril, path: string, method: Method) {
		ctx.docs.paths[path] ??= {};
		this.operation = ctx.docs.paths[path][method] ??= { responses: {} };
	}
}

interface InfoObject {
	title: string;
	version: string;
}

interface OpenAPIPath {
	[path: string]: {
		[method: string]: BaseOpenAPIOperation;
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

	path(path: string, method: Method) {
		return new OpenAPIOperation(this, path, method);
	}
}
