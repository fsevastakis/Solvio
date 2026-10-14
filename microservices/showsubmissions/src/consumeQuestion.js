import amqp from "amqplib";
import Problem from "./models/Problems.js"; 
import mongoose from "mongoose";

export async function consume_from_questions_queue() {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect(process.env.RABBITMQ_QUESTIONS_URL);
    console.log(process.env.RABBITMQ_QUESTIONS_URL);

    // Create a channel
    const channel = await connection.createChannel();

    // Create the fanout exchange of problems
    const exchangeName = process.env.EXCHANGE_NAME;
    await channel.assertExchange(exchangeName, 'fanout', { durable: true });

    // Create the showsubmissions problems queue and bind it to the exchange
    // (no binding key is necessary - fanout exchange)
    const queueName = process.env.QUEUE_SHOW_SUBMISSIONS;
    const assertQueue = await channel.assertQueue(queueName, { durable: true });

    await channel.bindQueue(assertQueue.queue, exchangeName, "");

    // Start consuming messages
    console.log(`Consumer started. Waiting for messages in queue ${queueName}...`);
    channel.consume(assertQueue.queue, async (message) => {
      try {
        const messageData = JSON.parse(message.content.toString());
        console.log(`Received message from ${queueName}: ${messageData}`);

        //we consume every problem that's created. Note: when a problem is edited or has its status changed, it's also re-sent to the queue so we re-consume it.
        const existingProblem = await Problem.findOne({ _id: messageData._id });

        //if we receive a problem whose id is already in the DB it means that this problem was edited or someone pressed Run
        if(existingProblem){

          //case where the problem's name was edited
          if(existingProblem.name!==messageData.name){
            existingProblem.name = messageData.name;
            await existingProblem.save(); 
          }

          //case where the problem's status was edited (meaning the user pressed the Run button to submit it to the solver)
          if(messageData.status==="running"){
            existingProblem.status = 'running';
            await existingProblem.save(); 
          }

          //if the problem was edited and not submitted to the solver (through pressing the run button) we need to compute the last updated on value
          else{
            existingProblem.updatedAt = new Date();
            await existingProblem.save(); 
          }
        }

        //if the problem is completely new we need to save it to the DB
        else{
        const newProblem = new Problem({
          _id: messageData._id,
          userID: messageData.userID,
          name: messageData.name,
          model: messageData.model,
          status: messageData.status,
          createdAt: messageData.createdAt,
          updatedAt: messageData.updatedAt
        });
        await newProblem.save();
        }
        channel.ack(message);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    }, { noAck: false });

  } catch (error) {
    console.log(error);
  }
}
