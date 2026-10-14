import Problems from "../../models/Problems.js";
import { consumeProblem } from "../solversproxy/consumeProblem.js";

// update the status of a problem to "running" and push its id to the in-memory queue
// (consumeProblem in solversproxy/ forwards the problem to the solver for execution)
export const runProblemController = async (req, res) => {
    try {
        let problem = await Problems.findOne({ _id: req.body.problemID });
        problem.status = "running";
        await problem.save();
        consumeProblem(req.body.problemID);
        return res.status(200).json("Problem status updated to running");
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
};