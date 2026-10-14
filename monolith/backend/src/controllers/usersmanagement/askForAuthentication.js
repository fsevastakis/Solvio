import jwt from "jsonwebtoken";
import Answer from "../../models/Answers.js";
import mongoose from "mongoose";
import { authenticationController, usersPermissionsController, adminsPermissionsController, getRoleController, editPermissionsController, deletePermissionsController } from "./auth.js";
// The middlewares below call the permission checks of auth.js directly
// (in the microservices version they were HTTP calls to usersmanagement) so as to
// ensure that a user has enough permissions to make a request
// If not enough permissions available, an appropriate status code is returned

export const hasPermissionsToSeeResults = async (req, res, next) => {
    try {
        let id = req.query.id;
        let id_mongo = new mongoose.Types.ObjectId(id);
        const answer = await Answer.findOne({ _id: id_mongo });
        if (!answer) return res.status(404).json("Answer does not exist");
        console.log("ANSWER", answer, id_mongo);
        jwt.verify(
            req.cookies.access_token,
            process.env.JWT_KEY,
            async (err, userInfo) => {
                if (err) return res.status(403).json("Token is not valid!");
                let userInfoId_mongo = new mongoose.Types.ObjectId(userInfo.id);
                console.log(
                    userInfoId_mongo,
                    answer.userID,
                    userInfoId_mongo != answer.userID,
                    userInfo.id === answer.userID,
                    userInfoId_mongo.equals(answer.userID)
                );

                let response = await getRoleController(userInfo.id);

                if (
                    !userInfoId_mongo.equals(answer.userID) &&
                    response === "user"
                )
                    return res
                        .status(403)
                        .json(
                            "Forbidden : You can only see the results of YOUR submissions!"
                        );

                next();
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.response.data);
    }
};

// check if a user is logged in
export const isLoggedIn = async (req, res, next) => {
    try {
        console.log("COOKIES", req.cookies);
        // checks if a request is made by an authenticated (logged in) user
        const resp = await authenticationController(req.cookies);
        if (!resp) {
            return res.status(401).json("Unauthorized : You need to log in!");
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.response.data);
    }
};

// check for user's permissions
export const hasUsersPermissions = async (req, res, next) => {
    try {
        console.log("COOKIES", req.cookies);
        // checks if a request is made by an authenticated (logged in) user
        const resp = await usersPermissionsController(req.cookies);
        if (!resp) {
            return res
                .status(403)
                .json("Forbidden : You have no permissions to do this");
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.response.data);
    }
};
// check for admin's permissions
export const hasAdminsPermissions = async (req, res, next) => {
    try {
        console.log("COOKIES", req.cookies);
        // checks if a request is made by an authenticated (logged in) user
        const resp = await adminsPermissionsController(req.cookies);
        if (!resp) {
            return res
                .status(403)
                .json("Forbidden : You have no permissions to do this");
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.response.data);
    }
};

export const hasPermissionsToDelete = async (req, res, next) => {
    try {
        console.log("REQUEST FOR HAS PERMISSIONS TO DELETE", req);
        // checks if a this user has permissions to edit this problem
        // i.e. he is the creator of this problem
        const resp = await deletePermissionsController(cookies, problemID);

        if (!resp) {
            return res
                .status(403)
                .json("Forbidden : You have not permissions to delete this problem");
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.response.data);
    }
};

export const hasPermissionsToUpdate = async (req, res, next) => {
    try {
        console.log("REQUEST FOR HAS PERMISSIONS TO EDIT", req.cookies);
        // checks if a this user has permissions to edit this problem
        // i.e. he is the creator of this problem
        const resp = await editPermissionsController(cookies, problemID);
        if (!resp) {
            return res
                .status(403)
                .json("Forbidden : You have no permissions to edit this problem");
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json(error.response.data);
    }
};
