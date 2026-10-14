// submit a new problem (the frontend sends it with status "ready";
// it is queued only when the user presses Run - see runProblem.js)
import Problems from "../../models/Problems.js";

export const submitController = async (req, res) => {
    try {
        let problem = await Problems.create({
            userID: req.body.userID,
            inputDataFile: req.body.inputDataFile,
            extraParams: req.body.extraParams,
            pythonScript: req.body.pythonScript,
            status: req.body.status,
            name: req.body.name,
            model: req.body.model,
        });

        return res.status(200).json({
            message: "Resource created. Problem Added successfully",
            problem: problem,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
};