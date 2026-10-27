import z from "zod";

export type Method =
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

export type In = "path" | "query" | "header" | "cookie";
interface OpenAPIParameter {
	name: string;
	in: In;
	required: boolean;
	schema: unknown;
	description?: string;
	example?: string;
}

export interface OpenAPIOperation {
	summary?: string;
	description?: string;
	tags?: string[];
	operationId?: string;

	parameters?: OpenAPIParameter[];
	requestBody?: OpenAPIBody;
	responses?: { [status: string]: OpenAPIResponse };
}

export type OperationConfig = {
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

export interface InfoObject {
	title: string;
	description?: string;
	version: string;
}

interface OpenAPIPath {
	[path: string]: {
		[method: string]: OpenAPIOperation;
	};
}

export interface OpenAPIServer {
	url: string;
	description?: string;
}

export interface OpenAPI {
	openapi: string;
	info: InfoObject;
	servers?: OpenAPIServer[];

	paths: OpenAPIPath;
}
