import mongoose from "mongoose";
import Users from "../models/Users.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import Stripe from "stripe";
const stripe = new Stripe(
  "sk_test_51PHvOEL9KWQMTSTa0LmM80Oo88aI943X1uaQpLIlcpeXTwrdfVD6GjbiNMwW9VXxquWZXaSUrfHaY0oSijSVd2LG00JZCFCb5u"
);

// register a new user
export const registerController = async (req, res) => {
  try {
    console.log(req.body);
    // Check for existing user
    let user = await Users.where("username").equals(req.body.username);
    if (user.length) return res.status(409).json("User already exists!");

    // hash the password and creat the user
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(req.body.password, salt);

    let createdUser = await Users.create({
      username: req.body.username,
      password: hash,
    });
    return res.status(200).json("User has been created!");
  } catch (error) {
    return res.status(500).json(error);
  }
};

// User Login
export const loginController = async (req, res) => {
  try {
    // find user
    let user = await Users.where("username").equals(req.body.username);
    if (user.length === 0) return res.status(404).json("User not found!");
    // if the user is a google user, login via google is required
    if (user[0].google_access_token)
      return res
        .status(409)
        .json("This is a google user! Sign in with google.");

    // else check credentials
    const isPasswordCorrect = bcrypt.compareSync(
      req.body.password,
      user[0].password
    );
    if (!isPasswordCorrect) return res.status(400).json("Wrong password!");

    // create a token based on the unique user's id
    const token = jwt.sign({ id: user[0]._id }, process.env.JWT_KEY);

    // save the token as a cookie accesible only via http API calls
    return res
      .cookie("access_token", token, {
        httpOnly: true,
      })
      .status(200)
      .json({
        id: user[0]._id,
        username: user[0].username,
        role: user[0].role,
      });
  } catch (error) {
    return res.status(500).json(error);
  }
};

// Logout - clear access token
export const logoutController = async (req, res) => {
  return res
    .clearCookie("access_token", {
      sameSite: "none",
      secure: true,
    })
    .status(200)
    .json("User has been logged out.");
};

// get the access token and extra information about a user
export const getTokenController = async (req, res) => {
  const myToken = req.cookies.access_token;
  let role = "";
  let id = "";
  if (myToken) {
    jwt.verify(myToken, process.env.JWT_KEY, async (err, userInfo) => {
      if (err) return res.status(403).json("Token is not valid!");
      id = userInfo.id;
      let user = await Users.findOne({ _id: userInfo.id });
      return res.status(200).json({
        token: myToken,
        role: user.role,
        userid: id,
        username: user.username,
        google_access_token: user.google_access_token,
        picture: user.picture,
        email: user.email,
      });
    });
  } else {
    return res.status(200).json({ token: myToken, role: role, userid: id });
  }
};

// update the username of a user (must be unique)
export const updateUsernameController = async (req, res) => {
  try {
    let existingUser = await Users.findOne({ username: req.body.username });
    if (existingUser && existingUser._id != req.body.userID) {
      return res.status(409).json("This username is already in use");
    }
    let user = await Users.findOne({ username: req.body.oldName });
    user.username = req.body.username;
    await user.save();
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json(error);
  }
};

// get the credits of a user
export const getCreditsController = async (req, res) => {
  try {
    let user = await Users.findOne({ _id: req.params.userid });
    return res.status(200).json({ credits: user.credits });
  } catch (error) {
    return res.status(500).json(error);
  }
};

// buy credits with Stripe
// (earlier payment flow - the frontend now buys credits with PayPal, see payments.js)
export const buyCreditsController = async (req, res) => {
  try {
    const lineItem = [
      {
        price_data: {
          currency: "usd",
          unit_amount: 100,
          product_data: { name: "credits" },
        },
        quantity: parseInt(req.body.creditsToBuy),
      },
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItem,
      mode: "payment",
      success_url: "http://localhost:8080/login",
      cancel_url: "http://localhost:8080/login",
    });

    console.log("SESSION", session);

    let user = await Users.findOne({ _id: req.params.userid });
    user.credits = `${
      parseInt(user.credits) + parseInt(req.body.creditsToBuy)
    }`;

    await user.save();
    return res.status(200).json({ id: session.id });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

// checks if a user is logged in with a valid token
export const authenticationController = async (req, res) => {
  console.log("REQUEST", req.body);
  if (!req.body.request.access_token) {
    return res.status(200).json(false);
  } else {
    jwt.verify(
      req.body.request.access_token,
      process.env.JWT_KEY,
      async (err, userInfo) => {
        if (err) return res.status(403).json("Token is not valid!");
        return res.status(200).json(true);
      }
    );
  }
};

// checks for user's permissions
export const usersPermissionsController = async (req, res) => {
  console.log("REQUEST", req.body);
  jwt.verify(
    req.body.request.access_token,
    process.env.JWT_KEY,
    async (err, userInfo) => {
      if (err) return res.status(403).json("Token is not valid!");
      let user = await Users.findOne({ _id: userInfo.id });
      if (user.role === "user") return res.status(200).json(true);
      return res.status(200).json(false);
    }
  );
};

// checks for admin's permissions
export const adminsPermissionsController = async (req, res) => {
  console.log("REQUEST", req.body);
  jwt.verify(
    req.body.request.access_token,
    process.env.JWT_KEY,
    async (err, userInfo) => {
      if (err) return res.status(403).json("Token is not valid!");
      let user = await Users.findOne({ _id: userInfo.id });
      if (user.role === "admin") return res.status(200).json(true);
      return res.status(200).json(false);
    }
  );
};

// get the role of a participant (user-admin)
export const getRoleController = async (req, res) => {
  try {
    console.log("GETO ROLE REQUEST", req.params);
    const userID = req.params.userid;
    let user = await Users.findOne({ _id: userID });
    console.log("USER FOUND", user);
    return res.status(200).json({ role: user.role });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

// check for permissions to update a problem
// the editor must be the creator of the problem
export const editPermissionsController = async (req, res) => {
  jwt.verify(
    req.body.request.access_token,
    process.env.JWT_KEY,
    async (err, userInfo) => {
      if (err) return res.status(403).json("Token is not valid!");
      try {
        console.log("REQUEST COOKIE", req);
        const result = await axios.get(
          `http://submitproblem:5000/api/submitProblem/getProblemInfo/${req.body.problemToEdit}`,
          {
            headers: {
              Cookie: { access_token: req.cookies.access_token },
            },
          }
        );
        console.log(
          "PROBLEM's USER ID",
          result.data,
          result.data !== userInfo.id
        );
        if (result.data.problem[0].userID != userInfo.id)
          return res.status(200).json(false);
        return res.status(200).json(true);
      } catch (error) {
        console.log(error);
      }
    }
  );
};

// checks if a user has permissions to delete a problem
// (must be the creator of the problem or an admin)
export const deletePermissionsController = async (req, res) => {
  jwt.verify(
    req.body.request.access_token,
    process.env.JWT_KEY,
    async (err, userInfo) => {
      if (err) return res.status(403).json("Token is not valid!");
      try {
        const result = await axios.get(
          `http://submitproblem:5000/api/submitProblem/getProblemInfo/${req.body.problemToDelete}`
        );

        let user = await Users.where("_id").equals(userInfo.id);
        console.log(userInfo.id, user);
        if (
          result.data.problem[0].userID != userInfo.id &&
          user[0].role !== "admin"
        )
          return res.status(200).json(false);
        return res.status(200).json(true);
      } catch (error) {
        console.log(error);
      }
    }
  );
};

// get details about a user
export const getUserDetailsController = async (req, res) => {
  const userID = req.params.userID;
  let user = await Users.findOne({ _id: userID });
  if (!user) return res.status(404).json("User not found!");
  return res.status(200).json(user);
};
