# Topcoder Tagger API

## Preparation

- Make sure DynamoDB instance is up, table created and application is up

- Synchronize dev server data to local database

```bash
IS_LOCAL_DB=true npm run sync-db
```

**Note** Since cannot get the records of the `member_skills_history` in the development environment. Therefore, in the synchronized script, skills data is generated based on the challenge tags data, which causes the data in the local table to be different from the development environment. You can check the code logic and use postman collection to verify.

## Postman test
- Import Postman collection and environment file in the `docs` folder to Postman and execute the scripts to validate the app.

- Execute `get-member-skills` and check the response (`original response/get-member-skills` can be referenced for the filter logic)

 1. unchecked the parameter `handles` to verify handles filter

 2. unchecked the parameter `skill` to verify skill filter

 3. unchecked the parameter `startDate` to verify startDate filter

 4. unchecked the parameter `endDate` to verify endDate filter

 5. Modify page and perPage to verify that the paging function is consistent.

- Execute `get-member-profiles` and check the response (`original response/get-member-profiles` can be referenced for the filter logic)

 1. unchecked the parameter `handles` to verify handles filter

 2. unchecked the parameter `skill` to verify skill filter

 3. unchecked the parameter `startDate` to verify startDate filter

 4. unchecked the parameter `endDate` to verify endDate filter

 5. Modify page and perPage to verify that the paging function is consistent

- Execute `update-member-profiles` and check the response

- Execute `update-member-profiles - missing challenge id` and check the response

- Execute `update-member-profiles - missing token` and check the response

### For validate getting tags correctly

- Execute `challenge_tags - filter on challenge id and skill (with pagination)` it will response `[]` since you check the challengeId.

- Execute `update-open-challenge-tags - challenge ids in the body`, it will response `{"Challenges Updated": 2}`

- Execute `challenge_tags - filter on challenge id and skill (with pagination)` again, it will response updated tags.