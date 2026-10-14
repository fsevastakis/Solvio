import Problems from "../../models/Problems.js";

// update a submitted problem (only the database is updated - nothing is queued)
export const updateSubmission = async (req, res) => {
    try {
        let problemToUpdate = await Problems.findOne({ _id: req.body.problemId });
        if (!problemToUpdate) return res.status(404).json("Problem not found!");
        problemToUpdate.pythonScript = req.body.pythonScript;
        problemToUpdate.inputDataFile = req.body.inputDataFile;
        problemToUpdate.extraParams = req.body.extraParams;
        problemToUpdate.name = req.body.name;
        await problemToUpdate.save();
        return res
            .status(200)
            .json({ message: "Resource updated. Problem updated successfully" });
    } catch (error) {
        return res.status(500).json(error);
    }
};