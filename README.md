# Overview

This is the backend for the [`Prompt together POC`](https://github.com/phoenix-flyhigh/prompt-together-ui)

## Tech stack

- NodeJS
- Express
- Typescript
- Socket.IO
- redis

## Setup

- Create redis cloud account and then a database
- Add below keys to .env file 
    ```
        REDIS_USERNAME=default (or username if specified)
        REDIS_PASSWORD=<dbPassword>
        REDIS_DB_URL=<dbUrl>
        REDIS_DB_PORT=<dbPort>
        FRONTEND_URL=<frontend Url>
    ```

## Getting started
- Build the application
    ```
    npm run build
    ```
- Run below command to start the server
    ```
    npm start
    ```