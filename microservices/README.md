# Solvio - Software as a Service (SaaS) application - Spring Semester 2023-2024  

This project was developed as part of the SaaS course at the National Technical University of Athens.

Solvio is a SaaS application where clients can submit their logistics/SCM problems. The submissions are then being processed by the Google OR-Tools Solver and the results are being returned to the clients. As of now, only the Routing Problem is being supported (the user gives a set of coordinates that must be visited by the company's vehicle for Supply Chain Management reasons, the number of vehicles that will be used and the solver calculates the optimal paths each vehicle must follow).  

## Architecture and Design - Microservices' Description  

The project was implemented using a **microservices architecture**. The microservices communicate with each other using the pub-sub model (choreography) and specifically **RabbitMQ** queues. In addition, we use **nginx** as an API Gateway to manage and direct incoming requests from the frontend to the various microservices, as well as to manage static files. Below, we explain each microservice's purpose:  

- **frontend**: Hosts the frontend of our application. A full walkthrough of our frontend can be found in the **README file of the frontend folder** [here](https://github.com/ntua/saas2024-19/tree/main/frontend)
- **submitproblem**: Manages the creation and submission of problems to the Solver.
- **showsubmissions**: Collects all submissions of the users (whether they have been run or not) so that they can be presented to the users that created them. The admin can view all submissions, regardless of who has submitted them.
- **showresults**: Collects all answers to problems that have been solved so that they can be presented to the users that requested them.
- **solver**: A microservice hosting the solver (Google OR-Tools). It's sole purpose is to receive a problem, solve it and return the results.
- **solversproxy**: A microservice that controls when a new problem will be submitted to the solver. It reads from its queue a new problem and submits it to the solver microservice, only when the solver has finished processing the previous problem.
- **viewstatistics**: Collects valuable statistics regarding the problems that have been submitted and the system's current state in order to present them to the admin.
- **usersmanagement**: A microservice that deals with user authentication and makes sure at all times that users can't perform actions that they are not allowed to. Users can make a Solvio account or sign in with their Google account. It also keeps track of how many credits a user possesses. Credits are necessary in order to submit problems and can be bought using PayPal.
- **emailservice**: Manages the sending of emails to the users when they first make an account and when the results to a problem they submitted are ready.

Detailed **UML diagrams** (Component, Deployment, Sequence and Class), made with **Visual Paradigm**, describing the project's architecture can be found in the **architecture folder** [here](https://github.com/ntua/saas2024-19/tree/main/architecture).  
The UML component diagram is shown here as well to give a full picture of the architecture of the application (in the Visual Paradigm files one can see the diagrams better):  

![1d290247-5c57-44eb-bc79-9f33ddd3b5be](https://github.com/ntua/saas2024-19/assets/115417360/9d4722e6-59b6-4a7b-b3d9-bb882f032858)

Finally, we performed stress testing to our application using **Apache JMeter**. We tested the application for different amounts of requests and measured the throughput for each case. We also observed through the RabbitMQ UI the behaviour of the queues when the system is under heavy load. The results of this study can be found in the **stress testing** folder [here](https://github.com/ntua/saas2024-19/tree/main/stress%20testing)  

## Installation - Deployment  

The project was deployed using Docker. The necessary scripts (docker-compose.yml file and one Dockerfile for each microservice) are present in this repo.  

The keys and passwords (JWT key, Google OAuth client, Gmail app password, PayPal and Stripe keys) are read from a `.env` file that is not tracked by git. Copy `.env.example` to `.env` in the project's root and fill in the values.  

Then run:  
```
(sudo) docker-compose up
```
in the project's root and then access the frontend through `localhost:8080/landing` (landing page) if you run it locally or through `publicip:8080/landing` if you run it using a Virtual Machine, where publicip is the public IP of the VM where the project is being run.  

## Collaborators  

| Name  | NTUA register number (Αριθμός Μητρώου) |
| ------------- | ------------- |  
|  [Dimitrios-David Gerokonstantis](https://github.com/DimitrisDavidGerokonstantis)  | el19209  | 
|  [Athanasios Tsoukleidis-Karydakis](https://github.com/ThanosTsoukleidis-Karydakis) | el19009  |  
|  [Filippos Sevastakis](https://github.com/FilipposSevastakis)  |  el19183 |  








