import axios from "axios";
import Problems from "../../models/Problems.js";
import { storeAnswer } from "../../models/storeAnswer.js";
import { sendEmailForAnswer } from "../emailservice/sendEmailForAnswer.js";
import { creditsOfAnswer } from "../usersmanagement/creditsOfAnswer.js";

// In-memory replacement of the RabbitMQ ProxyQueue of the microservices version:
// ids of problems waiting for the solver (its length is shown in the statistics)
export const problemsQueue = [];
// true while the solver is free to take a new problem
export let solverStatus = true;

// Queue a problem whose Run button was pressed and start the solver if it is free
export function consumeProblem(problemID) {
    problemsQueue.push(problemID);
    console.log("Problem queued: ", problemID);

    if (solverStatus) Solver();
}

// Take the next problem from the queue, send it to the solver container and wait for the answer.
// Then do in order what the answers' consumers did in the microservices version:
// store the answer (showresults, viewstatistics), mark the problem finished (showsubmissions),
// email the user (emailservice) and charge the credits (usersmanagement).
// Finally call itself again for the next queued problem, so problems are solved one at a time.
const Solver = async (req, res) => {
    if (problemsQueue.length === 0) return;

    solverStatus = false;
    const thisID = await problemsQueue.shift();
    console.log("Problem taken from queue: ", thisID);
    try {
        const problem = await Problems.findById(thisID);

        if (!problem) {
            console.log(`Problem with ID ${thisID} not found`);
            solverStatus = true;
            return;
        }

        const dataForSolver = {
            python_script: problem.pythonScript.script,
            input_data: problem.inputDataFile.content,
            num_vehicles: problem.extraParams.numVehicles,
            depot: problem.extraParams.depot,
            max_distance: problem.extraParams.maxDistance,
        };

        res = await axios.post("http://solver:5000/Solver", dataForSolver);

        await storeAnswer(res.data, thisID, problem.userID, problem.updatedAt);

        // For showsubmissions
        const toBeUpdated = await Problems.findById(thisID);
        if (toBeUpdated) {
            toBeUpdated.status = 'finished';
            await toBeUpdated.save();
        }

        sendEmailForAnswer(problem.userID, thisID);
        creditsOfAnswer(problem.userID, res.data);

        solverStatus = true;
        Solver();
    }
    catch (error) {
        console.log(error);
    }
}