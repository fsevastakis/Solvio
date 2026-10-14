import Answers from "./Answers.js";

// Turn the solver's stdout into { Objective, Routes, Maximum_distance }.
// Expected output of the VRP script:
//   Objective: <value>
//   Route for vehicle <n>:
//    <node> ->  <node> -> ... <node>
//   Distance of the route: <distance>m
//   (one Route block per vehicle)
//   Maximum of the route distances: <distance>m
function processAnswer(inputText) {
    const lines = inputText.split("\n");
    let objective,
        routes = [],
        maxDistance;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("Objective")) {
            objective = line.split(":")[1].trim();
        } else if (line.startsWith("Route")) {
            const route = lines[i + 1].trim();
            const distanceLine = lines[i + 2].trim();
            const distance = distanceLine.split(":")[1].trim();
            routes.push({ Route: route, Route_distance: distance });
        } else if (line.startsWith("Maximum")) {
            maxDistance = line.split(":")[1].trim();
        }
    }

    const jsonObject = {
        Objective: objective,
        Routes: routes,
        Maximum_distance: maxDistance,
    };

    return jsonObject;
}

export async function storeAnswer(data, thisID, userID, date) {
    const processedResult = processAnswer(data.result);
    console.log("Result received:", processedResult);

    try {
        const newAnswer = await Answers.create({
            _id: thisID,
            userID: userID,
            answer: {
                Objective: processedResult.Objective,
                Routes: processedResult.Routes,
                Maximum_distance: processedResult.Maximum_distance
            },
            execTime: data.execTime,
            date: date
        })
        console.log("Answer stored: ", newAnswer);
    } catch (error) {
        // Handle errors
        console.error("Error updating problem (answer):", error);
        throw error;
    }
}