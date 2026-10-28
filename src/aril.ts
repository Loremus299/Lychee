import { ArilMiddleware } from "./middleware";
import { ArilOperation } from "./operation";
import type {
	InfoObject,
	Method,
	OpenAPI,
	OpenAPIOperation,
	OpenAPIServer,
	OperationConfig,
} from "./types";

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
		meta: Omit<OpenAPIOperation, "parameters" | "responses" | "requestBody">,
	) {
		return new ArilOperation(this, path, method, meta);
	}

	public middleware(prefix: string, config: OperationConfig) {
		return new ArilMiddleware(this, prefix, config);
	}
}
