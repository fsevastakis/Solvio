import express from "express";
import cors from "cors";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(express.json());
const corsOptions = {
  origin: [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:5001",
  ],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// Solve one problem.
// Request: { python_script, input_data, num_vehicles, depot, max_distance }
// The script (provided by the course, uploaded with each problem) and the input data
// are written to python_code.py and input_data, then run as
//   python3 python_code.py ./input_data <num_vehicles> <depot> <max_distance>
// Response: { result: <the script's stdout>, execTime: <seconds> }
// Both files are overwritten by the next problem - no results are kept here.
app.post("/Solver", (req, res) => {
  const data = req.body;
  const python_code = data.python_script;
  const input_data = JSON.stringify(data.input_data);
  const num_vehicles = data.num_vehicles;
  const depot = data.depot;
  const max_distance = data.max_distance;

  fs.writeFile("python_code.py", python_code, (err) => {
    if (err) {
      console.error("Error saving the python_code", err);
      return;
    }
    console.log("python_code saved successfully!");
  });

  fs.writeFile("input_data", input_data, (err) => {
    if (err) {
      console.error("Error saving the input_data", err);
      return;
    }
    console.log("input_file saved successfully!");
  });

  const start = Date.now();
  const command = `python3 python_code.py ./input_data ${num_vehicles} ${depot} ${max_distance}`;

  exec(command, (error, stdout, stderr) => {
    const end = Date.now();
    const execTime = (end - start) / 1000;

    if (error) {
      console.error("Error executing Python script:", error);
      return;
    }
    if (stderr) {
      console.error("Python script error:", stderr);
      return;
    }

    const result = stdout;
    console.log(`Result: ${result}`);
    console.log(`Execution Time: ${execTime} sec`);

    res.status(200).json({ result: stdout, execTime: execTime });
  });
});

app.listen(5000, () => {
  console.log("Solver up and running !");
});
