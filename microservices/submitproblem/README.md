# submitproblem

Creates, updates and runs problems. It keeps the full problem (solver script, input data and
parameters) and publishes it to `questionsExchange` every time it changes. That way showsubmissions
can list it and solversproxy can send it to the solver.

**Endpoints**
- `POST /api/submitProblem/submit`: create a problem (users with the `user` role)
- `PUT /api/submitProblem/updateSubmission`: update a problem (its creator only)
- `PUT /api/runproblem`: set the status to `running` and queue the problem for the solver
- `GET /api/submitProblem/getProblemInfo/:problemId`: a problem's full data (used by the edit/view page and by usersmanagement's permission checks)
- `POST /health/submitproblem/check`

**Messaging:** publishes to `questionsExchange` on rabbitmqquestions. Consumes nothing.

**Database:** `microservices1`, collection `problems`.

See [the architecture README](../architecture/README.md) for the message format and the problem's life.
