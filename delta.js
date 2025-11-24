import express from "express";
import bodyParser from "body-parser";
import { query, sparqlEscapeUri, update } from "mu";

const router = express.Router();

router.post("/delta", bodyParser.json({ limit: "500mb" }), async (req, res) => {
  console.log("receiving delta");
  if (!req.body || !req.body.length) {
    console.log("No delta found");
    return res.status(400).send();
  }
  console.log(JSON.stringify(req.body));

  const insertPair = extractInsertPairs(req.body);
  for (let pair of insertPair) {
    await proccessInsertPair(pair);
  }
  const deletePair = extractDeletePairs(req.body);
  for (let pair of deletePair) {
    await proccessDeletePair(pair);
  }
});

function extractInsertPairs(deltas) {
  const pairs = deltas
    .map(({ inserts }) =>
      inserts.map(({ subject, object }) => ({
        measure: subject.value,
        signListItem: object.value,
      }))
    )
    .flat();

  return pairs;
}

async function proccessInsertPair({ measure, signListItem }) {
  const signUri = await getSign(signListItem);
  if (signUri) {
    await linkSignToMeasure(signUri, measure);
  }
}

async function getSign(signListItemUri) {
  const signUriQuery = `
        PREFIX schema: <http://schema.org/>

        select distinct ?signUri where {
            GRAPH <http://mu.semte.ch/graphs/mow/registry> {
                ${sparqlEscapeUri(signListItemUri)} schema:item ?signUri.
            }
        } 
    `;
  const queryResult = await query(signUriQuery, { sudo: true });
  return queryResult.results.bindings[0]?.signUri.value;
}

async function linkSignToMeasure(signUri, measureUri) {
  const signUriQuery = `
        PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>

        INSERT DATA {
            GRAPH <http://mu.semte.ch/graphs/mow/registry> {
                ${sparqlEscapeUri(
                  signUri
                )} mobiliteit:heeftMaatregelconcept ${sparqlEscapeUri(
    measureUri
  )}.
            }
        } 
    `;
  await update(signUriQuery, { sudo: true });
}

function extractDeletePairs(deltas) {
  const pairs = deltas
    .map(({ deletes }) =>
      deletes.map(({ subject, object }) => ({
        measure: subject.value,
        signListItem: object.value,
      }))
    )
    .flat();

  return pairs;
}

async function proccessDeletePair({ measure, signListItem }) {
  const signUri = await getSign(signListItem);
  if (signUri) {
    await unlinkSignToMeasure(signUri, measure);
    await removeSignListItem(signListItem);
  }
}

async function unlinkSignToMeasure(signUri, measureUri) {
  const unlinkSignQuery = `
        PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>

        DELETE DATA {
            GRAPH <http://mu.semte.ch/graphs/mow/registry> {
                ${sparqlEscapeUri(
                  signUri
                )} mobiliteit:heeftMaatregelconcept ${sparqlEscapeUri(
    measureUri
  )}.
            }
        } 
    `;
  await update(unlinkSignQuery, { sudo: true });
}

async function removeSignListItem(signListItem) {
  const removeSignListItemQuery = `
        PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>

        DELETE {
            GRAPH <http://mu.semte.ch/graphs/mow/registry> {
                ${sparqlEscapeUri(signListItem)} ?b ?c.
            }
        }WHERE {
            GRAPH <http://mu.semte.ch/graphs/mow/registry> {
                ${sparqlEscapeUri(
                  signListItem
                )} a mobiliteit:MaatregelVerkeerstekenLijstItem;
                    ?b ?c.
            }
        } 
    `;
  await update(removeSignListItemQuery, { sudo: true });
}

export default router;
