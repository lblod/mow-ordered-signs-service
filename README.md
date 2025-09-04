# MOW Ordered Signs Service

This service has 2 main uses:

- First generate the ordered signs relationships bases on the unordered signs for each measure and order them if possible based on the measure name.
- Second expose and endpoint to be called by deltas in order to ensure that the ordered sign and unordered signs relationships stay in sync

# Endpoints

## generate-ordered-signs

You can call the endpoint `/generate-ordered-signs` with a POST request to generate the ordered sign relationship for the first time. You will receive a "Done"
text when the relationship generation is finished

## delta

This endpoint will be called by the delta service, in order to keep in sync the 2 relationhips, a delta should be sent if the ordered relationship changes so the service
updates the unordered one

# Configuration

In order to configure this service you just need to add it to the docker-compose.yml as always, and link the database as database. For example:

```
links:
    - triplestore:database
```

For the delta behaviour you must configure the rules in order to send all the modifications to the ordered relationship

```
{
    match: {
        predicate: {
        type: "uri"
        value: "https://data.vlaanderen.be/ns/mobiliteit#heeftMaatregelconcept"
        },
    },
    callback: {
        url: "http://ordered-signs-service/delta",
        method: "POST",
    },
    options: {
        resourceFormat: "v0.0.1",
        gracePeriod: 10000,
        ignoreFromSelf: true,
    },
}
```
