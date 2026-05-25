import { WorkerEntrypoint } from 'cloudflare:workers';
import { App } from './hono/app';
import { initDatabase } from '@repo/data-ops/database';
import { QueueMessageSchema } from '@repo/data-ops/zod-schema/queue';
import { handleLinkClick } from './queue-handlers/link-clicks';
export  { DestinationEvaluationWorkflow } from './workflows/destination-evalutation-workflow';
export { EvaluationScheduler} from "@/durable-objects/evaluation-scheduler";
export { LinkClickTracker } from "@/durable-objects/link-click-tracker";


export default class DataService extends WorkerEntrypoint<Env> {
	constructor(ctx:ExecutionContext, env: Env) {
		super(ctx, env); // Call the parent constructor
		initDatabase(env.DB); // Initialize the database with the provided environment variable
	} // constructor
	fetch(request: Request) {
	
		return App.fetch(request,this.env,this.ctx); // Delegate HTTP requests to the Hono app
	}
async queue(batch: MessageBatch<unknown>) {

	for (const message of batch.messages) {
		const parsedEvent = QueueMessageSchema.safeParse(message.body);
		if(parsedEvent.success) {
			const event = parsedEvent.data;
			if(event.type === 'LINK_CLICK' ) {
				await handleLinkClick(this.env, event);

			} // if event type === 'LINK_CLICK' saves link click data and schedules eval workflow

		} else {
			console.error('Invalid message received in queue:', parsedEvent.error);
		}
		
	}
		
	}
	 

}
