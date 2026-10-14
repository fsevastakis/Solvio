# usersmanagement

Users, authentication and credits. It signs the JWT kept in the `access_token` cookie and answers
the permission checks of the other services. It also handles sign-in with Google and payments
with PayPal, and charges credits when an answer arrives.

**Endpoints used by the frontend**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/getToken`
- `PUT /auth/updateUsername`, `GET /auth/getCredits/:userid`
- `GET /auth/getUserDetails/:userID`: user details for the admin
- `POST /googleAuth/googleRequest`, `GET /googleAuth/oauth`, `POST /googleAuth/loginByGoogleToken`: sign-in with Google
- `POST /pay/paypal/create-paypal-order`, `POST /pay/paypal/orders/:orderID/capture`: buy credits with PayPal
- `PUT /auth/buyCredits/:userid`: the earlier Stripe flow, no longer called by the frontend

**Endpoints used by the other services**
- `POST /auth/authenticate`, `/auth/usersPermissions`, `/auth/adminsPermissions`,
  `/auth/editPermissions`, `/auth/deletePermissions`: permission checks on the forwarded cookies
- `GET /auth/getRole/:userid`

`POST /health/usersmanagement/check` is the health check.

**Messaging:** consumes `UsersManagementQueue` on `answersExchange`. For each answer it charges the
user 1 credit per second of solver time, or hides the results if the user doesn't have enough credits.

**Database:** `users`, collection `users`.

See [the architecture README](../architecture/README.md) for authentication and the credit model.
