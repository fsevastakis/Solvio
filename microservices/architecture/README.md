# Architecture

This folder holds `solveMyProblem.vpp`, a Visual Paradigm project with the UML Component,
Deployment, Sequence and Class diagrams of the application. This README describes the same
architecture in text: the containers, how they talk to each other, and the messages they exchange.

The application was built to learn about queues and microservices: how services depend on each
other, and how queues keep them independent. A service that is down does not block the others;
messages for it wait in its queue until it is back up.

## Containers

All containers are defined in `docker-compose.yml`. Every Node.js service listens on port 5000
inside its container.

| Container | Host port | Role |
| --- | --- | --- |
| nginx | 8080 | Entry point. Serves static files and routes each path to a service (`default.conf`) |
| frontend | 3000 | React application |
| submitproblem | 5000 | Creates, updates and runs problems |
| usersmanagement | 5001 | Users, authentication, permissions, credits, payments |
| showsubmissions | 5002 | Lists of submissions for users and the admin |
| solversproxy | 5003 | Feeds problems to the solver one at a time |
| solver | 5004 | Runs the solver script (Python, Google OR-Tools) |
| emailservice | 5005 | Emails to Google users |
| showresults | 5006 | Answers of solved problems |
| viewstatistics | 5007 | Statistics for the admin |
| rabbitmqquestions | 5672, 15672 (UI) | Broker for problems |
| rabbitmqanswers | 5673, 15673 (UI) | Broker for answers |
| db | 27016 | MongoDB, one database per service |

## Messaging

Services communicate through two RabbitMQ brokers, one per direction: problems go to
`rabbitmqquestions` and answers come back through `rabbitmqanswers`. (A single broker with two
exchanges would work the same way; the two-broker setup was kept as built.) Each broker has one
durable **fanout** exchange, so every queue bound to it receives a copy of every message. Each
consumer has its own queue.

| Exchange (broker) | Published by | Queue | Consumed by |
| --- | --- | --- | --- |
| `questionsExchange` (rabbitmqquestions) | submitproblem | `showSubmissionsQueue` | showsubmissions |
| | | `ProxyQueue` | solversproxy |
| `answersExchange` (rabbitmqanswers) | solversproxy | `viewResultsQueue` | showresults |
| | | `viewResultsQueue2` | showsubmissions |
| | | `UsersManagementQueue` | usersmanagement |
| | | `EmailServiceQueue` | emailservice |
| | | `viewstatisticsQueue` | viewstatistics |

The consumers start 40 seconds after their service starts (`sleep(40000)` in each `index.js`).
`depends_on` in docker-compose only waits for the broker containers to start, not for RabbitMQ to
be ready to accept connections. submitproblem and solversproxy publish by opening a connection
when they have something to send, so publishing needs no delay.

### Problem message (`questionsExchange`)

The whole problem document, as stored by submitproblem:

```
{
  _id, userID, name, model, status, createdAt, updatedAt,
  pythonScript:  { script, info },
  inputDataFile: { content: { Locations: [ { Latitude, Longitude } ] }, info },
  extraParams:   { numVehicles, depot, maxDistance }
}
```

It is published three times in a problem's life: when it is created, when it is updated, and when
the user presses Run (with `status: "running"`).
- showsubmissions stores a short copy of every new problem (name, model, status, dates). It updates
  the name, status or last-updated date when the same problem arrives again.
- solversproxy sends to the solver only the messages with `status: "running"`.

### Answer message (`answersExchange`)

```
{
  id,          // the problem's id
  problemID,   // the problem's id
  userID,
  answer:   { Objective, Routes: [ { Route, Route_distance } ], Maximum_distance },
  execTime, // seconds the solver needed
  updatedAt // the problem's last update, i.e. when Run was pressed
}
```

Each consumer does its own part:
- **showresults** stores the answer with the problem's id as its `_id`.
- **showsubmissions** sets the problem's status to `finished`.
- **usersmanagement** charges the user's credits (see [Credits](#credits)).
- **emailservice** emails the user a link to the results, if the user signed in with Google.
- **viewstatistics** stores the problem id, user id, date and execTime for the statistics.

## A problem's life

1. **Create:** the user uploads the input data (`.json`) and the solver script (`.py`) and gives
   the number of vehicles, the depot and the maximum distance. The frontend sends the problem with
   status `ready`. submitproblem stores it and publishes it.
2. **Run:** submitproblem sets the status to `running` and publishes the problem again. It waits
   in `ProxyQueue` until the solver is free.
3. **Solve:** solversproxy pulls the next problem from `ProxyQueue` only after the solver has
   answered the previous one (see `solversproxy/src/consumeProblem.js`). It posts the problem to the
   solver, parses the solver's output and publishes the answer.
4. **Finished:** showsubmissions marks the problem `finished`, and the user can open the results
   through showresults.

The status shown in the users' and the admin's lists is the one kept by showsubmissions.

## Solver contract

The solver is a server that solves one problem at a time and keeps nothing between problems. The
solver script was provided by the course, and users upload it with each problem.

- Request: `POST /Solver` with `{ python_script, input_data, num_vehicles, depot, max_distance }`.
- The script and the input data are written to files and run as
  `python3 python_code.py ./input_data <num_vehicles> <depot> <max_distance>`.
- Response: `{ result: <the script's stdout>, execTime: <seconds> }`.
- Expected stdout of the VRP script, parsed by `processResult` in solversproxy:

```
Objective: <value>
Route for vehicle 0:
 0 ->  4 ->  2 -> 0
Distance of the route: <distance>m
...                                (one block per vehicle)
Maximum of the route distances: <distance>m
```

## Authentication and permissions

- usersmanagement signs a JWT at login and sets it in the `access_token` httpOnly cookie.
- Users can also sign in with Google:
  1. `/googleAuth/googleRequest` returns the Google sign-in URL.
  2. Google redirects to `/googleAuth/oauth`.
  3. The user is created or updated in usersmanagement. emailservice stores new Google users and
     sends them a welcome email.
  4. The browser is sent back to `/login?google=true&token=...`.
  5. `/googleAuth/loginByGoogleToken` issues the same JWT cookie.
- The other services don't check permissions themselves. Their middlewares
  (`src/controllers/askForAuthentication.js`) forward the request's cookies to usersmanagement.
  The endpoints they call are:
  - `/auth/authenticate`: logged in.
  - `/auth/usersPermissions`: role `user`.
  - `/auth/adminsPermissions`: role `admin`.
  - `/auth/editPermissions`: creator of the problem.
  - `/auth/deletePermissions`: creator or admin.
- showresults verifies the JWT itself and asks usersmanagement for the user's role (`/auth/getRole`).

## Credits

- New users get 100 credits.
- Solving costs 1 credit per second of solver time (`execTime`). The charge happens when the answer
  arrives (usersmanagement's consumer).
- For every full minute of total solver time, the user gets 10 credits back.
- If the user doesn't have enough credits, the answer is still stored but hidden. usersmanagement
  sets `allowToShowResults` to `"false"` in showsubmissions and showresults (`POST /api/updateAllowResults`),
  and the user sees "Not enough credits". Keeping the hidden answer means it can be shown once paid for.
- Credits are bought with PayPal (sandbox), at 1 USD per credit
  (`usersmanagement/src/controllers/payments.js`).

## Databases

One MongoDB container, with a separate database per service. The files in `Dummy Data/` are
exports of these collections (`<database>.<collection>.json`).

| Service | Database | Collection: contents |
| --- | --- | --- |
| submitproblem | `microservices1` | `problems`: full problems (script and input data included) |
| showsubmissions | `microservices2` | `problems`: name, model, status, dates, `allowToShowResults` |
| solversproxy | `microservices3` | holds no data (solversproxy only forwards problems) |
| showresults | `microservices4` | `answers`: parsed answers, `allowToShowResults` |
| viewstatistics | `microservices5` | `results`: problem id, user id, date, execTime |
| usersmanagement | `users` | `users`: credentials, role, credits, Google profile |
| emailservice | `googleusers` | `users`: id, username and email of Google users |

## Statistics

viewstatistics gives the admin:
- the number of problems solved, in total and today;
- the average execution time;
- the current length of `ProxyQueue` (read from the RabbitMQ management API);
- the problems solved per hour of each day;
- a histogram of execution times.

## Health checks

Every backend service answers `POST /health/<service>/check` with `{ "status": "UP" }`
(showresults uses the name `viewresults`). The health-check icon in the navigation bar calls all
of them through nginx and shows which services are up.
