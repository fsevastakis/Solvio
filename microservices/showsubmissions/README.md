# showsubmissions

Keeps the lists of submissions. Users see their own submissions, and the admin sees all of them.
It stores a short copy of each problem (name, model, status, dates) built from the problem
messages. It sets the status to `finished` when the problem's answer arrives.

**Endpoints**
- `GET /api/showSubmissions?userId=...`: a user's submissions
- `GET /api/admin/showSubmissions`: all submissions
- `POST /api/deleteProblem`: delete a submission (its creator or an admin)
- `POST /api/updateAllowResults`: hide a problem's results (called by usersmanagement when the user doesn't have enough credits)
- `POST /health/showsubmissions/check`

**Messaging**
- `showSubmissionsQueue` on `questionsExchange`: new and changed problems
- `viewResultsQueue2` on `answersExchange`: answers, to mark problems `finished`

**Database:** `microservices2`, collection `problems`.

See [the architecture README](../architecture/README.md) for the message formats.
