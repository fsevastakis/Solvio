import Users from "../../models/Users.js";
import { updateAllowResultsOnProblem } from "../showsubmissions/updateAllowResults.js"
import { updateAllowResultsOnAnswer } from "../showresults/updateAllowResults.js";

// charge the user for a new answer
// (called directly by the solver queue in consumeProblem.js after an answer is stored)
export async function creditsOfAnswer(userID, answer) {
    try {
        // find the user related to the produced answer
        const user = await Users.findOne({ _id: userID });

        // if enough credits available, decrease credits.
        // Also, after every 60 seconds of using the solver,
        // give 10 credits as a gift
        if (parseInt(user.credits) - answer.execTime >= 0) {
            user.credits = `${parseInt(user.credits) - answer.execTime}`;
            console.log(user.credits);
            user.totalExecTime = user.totalExecTime + answer.execTime;
            if (user.totalExecTime > 60) {
                const times = parseInt(user.totalExecTime / 60);
                user.totalExecTime = user.totalExecTime % 60;
                user.credits = `${parseInt(user.credits) + 10 * times}`;
            }
            console.log("FINAL", user);
            await user.save();
        } else {
            // if not enough credits, ensure that the produced answer
            // is not accessible by the user
            // (allowToShowResults parameter -> false)
            let result = await updateAllowResultsOnProblem(answer.problemID);
            let result2 = await updateAllowResultsOnAnswer(answer.problemID);

        }
    } catch (error) {
        console.log(error);
    }
}
