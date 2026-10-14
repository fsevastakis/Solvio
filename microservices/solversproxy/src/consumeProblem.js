import amqp from 'amqplib';
import { storeProblem } from './models/storeProblem.js';
import { Solver } from './controllers/controllers.js';

// true while the solver is free to take a new problem
let solverStatus = true;

// Forward problems from ProxyQueue to the solver, one at a time.
// Messages are pulled with channel.get instead of being pushed with channel.consume,
// so the next problem is taken from the queue only after the solver has answered
// the previous one. Problems waiting for the solver stay in ProxyQueue
// (its length is shown to the admin by viewstatistics).
export async function consumeProblem() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_QUESTIONS_URL);
        const channel = await connection.createChannel();
        
        await channel.assertExchange(process.env.EXCHANGE_NAME_QUESTIONS, 'fanout', { durable: true });
        
        const queueName = process.env.QUEUE_NAME;
        const queue = await channel.assertQueue(queueName, { durable: true });
        
        console.log(`Consumer started. Waiting for messages in queue ${queueName}...`);
        await channel.bindQueue(queue.queue, process.env.EXCHANGE_NAME_QUESTIONS, '');

        while (true) {
            if (solverStatus) {
                solverStatus = false;
                const message = await channel.get(queue.queue, { noAck: false });
                if (message) {
                    channel.ack(message);
                    const parsedMessage = await JSON.parse(message.content.toString());

                    // the problems' exchange carries every create, update and run of a problem;
                    // only problems whose Run button was pressed (status "running") go to the solver
                    if (parsedMessage.status === "running") {
                        console.log(`Received Problem (id: ${parsedMessage._id}) from ProxyQueue`);
                        //await storeProblem(parsedMessage);
                        await Solver(parsedMessage);
                    }
                }
                solverStatus = true;
            }
        }
    } catch (error) {
        console.log(error);
    }
}