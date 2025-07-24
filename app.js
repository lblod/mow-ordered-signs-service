import {
  app,
  query,
  sparqlEscapeUri,
  sparqlEscapeInt,
  sparqlEscapeString,
  update,
  uuid,
} from "mu";

app.post("/generate-ordered-signs", async (req, res) => {
  const trafficMeasureUris = await getTrafficMeasureUris();
  for (let uri of trafficMeasureUris) {
    await generateOrderedSigns(uri);
  }
  res.end("Done");
});

async function getTrafficMeasureUris() {
  const uriQuery = `
    PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>
    select distinct * where {
      ?uri a mobiliteit:Mobiliteitmaatregelconcept
    }
  `;
  const queryResult = await query(uriQuery);
  return queryResult.results.bindings.map((binding) => binding.uri.value);
}

async function generateOrderedSigns(uri) {
  const { label, signs } = await getSignsAndLabel(uri);
  if (!label) return;
  const splittedLabel = label.split("-");
  for (let sign of signs) {
    const position = splittedLabel.findIndex((label) => label === sign.label);
    const itExists = await checkOrderedSign(uri, sign.uri);
    if (itExists) continue;
    await generateOrderedSign(uri, sign.uri, position);
    console.log("ordered sign generated");
  }
}

async function getSignsAndLabel(measureUri) {
  const signsAndLabelQuery = `
    PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

    select distinct * where {
      GRAPH <http://mu.semte.ch/graphs/mow/registry> {
        ${sparqlEscapeUri(measureUri)} skos:prefLabel ?label.
        ?signUri mobiliteit:heeftMaatregelconcept ${sparqlEscapeUri(
          measureUri
        )}.
        ?signUri skos:prefLabel ?signLabel.
      }
    } 
  `;
  const queryResult = await query(signsAndLabelQuery);
  if (!queryResult.results.bindings[0]) return {};
  const measureLabel = queryResult.results.bindings[0].label.value;
  const signs = queryResult.results.bindings.map((binding) => ({
    uri: binding.signUri.value,
    label: binding.signLabel.value,
  }));
  return { label: measureLabel, signs };
}

async function generateOrderedSign(measureUri, signUri, position) {
  const listItemUuid = uuid();
  const listItemUri = `http://data.lblod.info/traffic-signal-list-items/${listItemUuid}`;
  const insertDataQuery = `
    PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX schema: <http://schema.org/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

    INSERT DATA {
      GRAPH <http://mu.semte.ch/graphs/mow/registry> {
        ${sparqlEscapeUri(
          measureUri
        )} mobiliteit:heeftVerkeerstekenLijstItem ${sparqlEscapeUri(
    listItemUri
  )}.
        ${sparqlEscapeUri(
          listItemUri
        )} a mobiliteit:MaatregelVerkeerstekenLijstItem;
          mu:uuid ${sparqlEscapeString(listItemUuid)};
          schema:item ${sparqlEscapeUri(signUri)};
          schema:position ${sparqlEscapeInt(position)}
      }
    } 
  `;
  console.log(insertDataQuery);
  await update(insertDataQuery);
}

async function checkOrderedSign(measureUri, signUri) {
  const checkOrderedSignQuery = `
    PREFIX mobiliteit: <https://data.vlaanderen.be/ns/mobiliteit#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX schema: <http://schema.org/>
    

    select distinct * where {
      GRAPH <http://mu.semte.ch/graphs/mow/registry> {
        ${sparqlEscapeUri(
          measureUri
        )} mobiliteit:heeftVerkeerstekenLijstItem ?listItem.
        ?listItem schema:item ${sparqlEscapeUri(signUri)}.
      }
    } 
  `;
  const queryResult = await query(checkOrderedSignQuery);
  return !!queryResult.results.bindings[0];
}
