# Solvio - monolithic version

This is the monolithic version of Solvio. The original Solvio is a microservices application
developed for the SaaS course at the National Technical University of Athens (Spring Semester
2023-2024) and lives in [`../microservices`](../microservices/README.md).

This version was written later as the monolithic counterpart of the microservices version. It
serves as input for a tool, from thesis-related work, that converts applications between monolithic
and microservice architectures. The application's features are the same: users submit Vehicle
Routing Problems, the Google OR-Tools solver solves them one at a time, and users pay for solver
time with credits. Only the backend's architecture changed.

## What changed from the microservices version

- **One backend instead of eight services.** `backend/` is a single Express application. Its
  folders keep the names of the services they replaced:

  | Microservice | Folder in `backend/src/controllers/` |
  | --- | --- |
  | submitproblem | `submitproblem/` |
  | showsubmissions | `showsubmissions/` |
  | showresults | `showresults/` |
  | solversproxy | `solversproxy/` |
  | usersmanagement | `usersmanagement/` (routes in `routes/authRoutes.js`, `oauth.js`, `paymentRoutes.js`) |
  | emailservice | `emailservice/` |
  | viewstatistics | `viewstatistics/` |

- **No RabbitMQ.** Services that used to communicate through queues now call each other's functions.
  - When the user presses Run, the problem's id is pushed to an in-memory queue
    (`controllers/solversproxy/consumeProblem.js`). The queue sends problems to the solver one at a
    time, like `ProxyQueue` and solversproxy did.
  - After each answer, the work the answer consumers used to do runs in order: store the answer,
    mark the problem `finished`, email the user, charge the credits.
  - Creating or updating a problem only writes to the database. Nothing is queued until Run.
- **Permission checks are function calls.** The middlewares in
  `controllers/usersmanagement/askForAuthentication.js` call the checks in
  `controllers/usersmanagement/auth.js`. They no longer go over HTTP to usersmanagement.
- **One database.** The database `backend` holds four collections:
  - `problems`: full problems, status and `allowToShowResults`.
  - `answers`: parsed answers, execution time and date. This one collection serves both the results and the statistics.
  - `users`.
  - `googleusers`.
- **The solver is still a separate container.** The backend calls it over HTTP with the same contract
  (see the [architecture README](../microservices/architecture/README.md#solver-contract)).
- **Statistics:** the queue length comes from the in-memory queue, plus one while a problem is being solved.
- **Frontend:** the same React application without the microservices health-check panel.

## Containers

| Container | Host port | Role |
| --- | --- | --- |
| nginx | 8080 | Entry point. Serves static files and routes paths to the frontend or the backend (`default.conf`) |
| frontend | 3000 | React application |
| backend | 5000, 5001 | The whole backend. 5001 is also mapped because the Google sign-in redirect URL points to `127.0.0.1:5001` |
| solver | 5004 | Runs the solver script (Python, Google OR-Tools) |
| db | 27016 | MongoDB |

The credit model, the solver contract and the Google sign-in flow are the same as in the
microservices version and are described in its [architecture README](../microservices/architecture/README.md).

## Running

From this folder:

```
(sudo) docker-compose up
```

Then open `localhost:8080/landing`.

## Collaborators of the original application

| Name  | NTUA register number (Αριθμός Μητρώου) |
| ------------- | ------------- |
|  [Dimitrios-David Gerokonstantis](https://github.com/DimitrisDavidGerokonstantis)  | el19209  |
|  [Athanasios Tsoukleidis-Karydakis](https://github.com/ThanosTsoukleidis-Karydakis) | el19009  |
|  [Filippos Sevastakis](https://github.com/FilipposSevastakis)  |  el19183 |
