# emailservice

Sends emails to users who signed in with Google, from `solvio.app@gmail.com` through Gmail SMTP
(the app password is the `APP_PWD` environment variable). It sends:
- a welcome email the first time a Google user signs in;
- an email with a link to the results when one of the user's problems has been solved.

**Endpoints**
- `POST /email/addUser`: store a new Google user and send the welcome email (called by usersmanagement)
- `POST /email/sendEmailForAnswer`: send the results email
- `POST /health/emailservice/check`

**Messaging:** consumes `EmailServiceQueue` on `answersExchange` and sends the results email for each answer.

**Database:** `googleusers`, collection `users` (id, username and email of Google users).

See [the architecture README](../architecture/README.md) for the message formats.
