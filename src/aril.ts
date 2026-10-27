import { ArilMiddleware } from "./middleware";
import { ArilOperation } from "./operation";
import type {
	InfoObject,
	Method,
	OpenAPI,
	OpenAPIServer,
	OperationConfig,
} from "./types.js";

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
