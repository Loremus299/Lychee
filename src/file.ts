import z from "zod";
import { Aril } from ".";

const createTaskInProjectPath = z.strictObject({
	project: z.string().meta({
		description: "project id for creating task in it",
		example: "123456789",
	}),
});

const createTaskBody = z.object({
	name: z.string(),
	description: z.string(),
	priority: z.enum(["high", "medium", "low"]),
});

const createTask200 = z.strictObject({
	taskId: z
		.uuidv4()
		.meta({ description: "Task id created for task", example: "123456789" }),
	metaLogId: z.uuidv4().meta({
		description: "Logger ID - send it to developers in case of error",
		example: "123456789",
	}),
});

const createTask500520 = z.strictObject({
	error: z.string().meta({
		description: "Error message",
		example: "Internal Server Error",
	}),
	metaLogId: z.uuidv4().meta({
		description: "Logger ID - send it to developers in case of error",
		example: "123456789",
	}),
});

const createTask401 = z.strictObject({
	role: z.string().meta({ example: "user", description: "Current role" }),
	requiredRole: z
		.string()
		.meta({ example: "admin", description: "Required role" }),
	metaLogId: z.uuidv4().meta({
		description: "Logger ID - send it to developers in case of error",
		example: "123456789",
	}),
});

const docs = new Aril("3.0.0", { title: "Test API", version: "1.0.0" });
const createTask = docs.path("/{project}/create-task", "post", {});
createTask.response(
	200,
	"Successfully created task",
	"application/json",
	createTask200,
);
createTask.responses({
	500: {
		description: "500 error",
		type: "application/json",
		zod: createTask500520,
	},
	520: {
		description: "520 error",
		type: "application/json",
		zod: createTask500520,
	},
});
createTask.response(
	401,
	"Authorization failed - wrong role",
	"application/json",
	createTask401,
);
console.log(JSON.stringify(docs.docs, null, 2));
