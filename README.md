# Topcoder Tagger API

A API based tool that create and maintain challenge tags.

## Prerequisites
- [NodeJS](https://nodejs.org/en/) (v14)
- [DynamoDB](https://aws.amazon.com/dynamodb/)
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/B

## Configuration

Configuration for the application is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level
- PORT: the server port
- BASE_PATH: the Topcoder tagger API URL
- AUTH_SECRET: The authorization secret used during token verification.
- VALID_ISSUERS: The valid issuer of tokens
- AMAZON.AWS_REGION: The Amazon region to use when connecting. For local dynamodb you can set fake value.
- AMAZON.DYNAMODB_READ_CAPACITY_UNITS: the AWS DynamoDB read capacity units
- AMAZON.DYNAMODB_WRITE_CAPACITY_UNITS: the AWS DynamoDB write capacity units
- AMAZON.IS_LOCAL_DB: Use local or AWS Amazon DynamoDB
- AMAZON.DYNAMODB_URL: The local url, if using local Amazon DynamoDB
- DB_COLLECTION_CHALLENGES: The name of the collection where the challenges details saved
- TAGGING_EMSI_TYPE: The emsi service which is gonna be used for the tagging
- ENABLE_CUSTOM_TAGGING: Decides whether to use custom models for tag extraction
- UPDATE_LOCAL_BEFORE_TAGGING: Decides whether to refresh the local emsi skill list before extracting tags
- EXTRACT_CONFIDENCE: Decides whether to extract confidence scores with the extracted tags
- TEXT_LENGTH: This key restricts the text length given to the external EMSI endpoint to reduce the request size
- HALF_LIFE_DAYS: The value of half-life for the calculation of decay score.
- SKIP_SKILLS_PATH: The path to the skip_skill text file for the member skills.
- DB_COLLECTION_MEMBER: The name of the collection where member profile is cached
- CHALLENGE_BASE_URL: The Topcoder challenge v5 url
- TAGGING_API_BASE_URL: The tagging service url

## Available commands
1. Drop/delete tables: `npm run drop-table`
2. Creating tables: `npm run create-table`
3. Sync data from dev env: `npm run sync-db`

## Local DynamoDB
Change to the ./local directory and run `docker-compose up`.
An instance of DynamoDB listening on port `8000` will be initialized inside docker.

## Local deployment

- From the project root directory, run the following command to install the dependencies

```bash
npm i
```

- To run linters if required

```bash
npm run lint

npm run lint:fix # To fix possible lint errors
```

- Make sure DynamoDB instance is up and create tables

```bash
IS_LOCAL_DB=true npm run create-table
```

- Start the express server

```bash
IS_LOCAL_DB=true npm start
```

## Notes
- db schema updated: _id to id, LastRefreshedAt to lastRefreshedAt, output_tag to outputTags, add tags to store challenge original tags.

- Unified the format returned when searching, based on the format of the original when status is null, put the processed tags value in the outputTags field.

- When there is no tag parameter in the query condition, directly query the challenge of the specified number of pages from challenge service. No need to find out all records.

- change search parameter `challenge_id` to `challengeId`

- Removed the original processing of querying more than 10 pages, now directly query page by page.

- Change the database operation to batch mode.

- The original error handling method is retained, and the error log level is changed from info to error

-During update, the logic of calling the tagging service is the same as the original one, but the tagging service return fails. This is not a code problem.

- The execution logic of endpoint health is different. In the new code, endpoint health will check whether the database link is normal and the response format is consistent with other topcoder project.

- Fix the original bug that when status is null and tag not null, it will throw error.