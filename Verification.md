# Topcoder Tagger API

## Preparation

- Make sure DynamoDB instance is up, table created and application is up

- Synchronize dev server data to local database

```bash
IS_LOCAL_DB=true npm run sync-db
```

## Postman test
- Import Postman collection and environment file in the `docs` folder to Postman and execute the scripts to validate the app.

- Compare the return values ​​of the `challenge_tags` and `original response/challenge_tags` to make sure that the execution logic of the two project is the same

 1. when parameter `status` unchecked, the sorting is related to the database, so the sorting of the two is different. You can compare them by the total number(from response header) of items, or you can compare their return values ​​by check the `challengeId` parameter.

 2. check the parameter `tag` to verify tag filter

 3. check the parameter `name` to verify name filter(it only works in the case of `status` unchecked)

 4. Modify page and perPage to verify that the paging function is consistent.

- Compare the return values ​​of the `update-open-challenge-tags` and `original response/update-open-challenge-tags` to make sure that the execution logic of the two project is the same

- Compare the return values ​​of the `update-challenge-tags - missing challenge ids` and `original response/update-challenge-tags - missing challenge ids` to make sure that the execution logic of the two project is the same