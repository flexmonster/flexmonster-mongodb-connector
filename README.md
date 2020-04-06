# The Flexmonster Connector for MongoDB

[![Flexmonster Pivot Table & Charts](https://s3.amazonaws.com/flexmonster/github/fm-github-cover.png)](https://flexmonster.com)
Website: www.flexmonster.com

This repository holds the source code of Flexmonster Connector for [MongoDB](https://www.mongodb.com/) applications.

The Flexmonster MongoDB Connector is a special server-side tool intended to help you retrieve the data from a MongoDB database to Flexmonster Pivot. It has to be embedded into a server that accepts requests for the data from Flexmonster and passes them to the Connector. To learn more about the Connector, visit [our documentation](https://www.flexmonster.com/doc/introduction-to-the-flexmonster-mongodb-connector/).

- [Getting started](#getting-started)
- [Examples](#examples)
- [Usage](#usage)
  - [getSchema](#getSchema)
  - [getMembers](#getMembers)
  - [getSelectResult](#getSelectResult)
- [License](#license)
- [Support & feedback](#support--feedback)

## Getting started

Start by installing the Flexmonster MongoDB Connector as a node module and save it as a dependency in your `package.json`:

```bash
npm instal flexmonster-mongo-connector
```

Then embed the Connector into your server, set up a connection with your MongoDB database, and define the Connector. Here is an example:

```bash
const mongodb = require("mongodb");
const fm_mongo_connector = require("flexmonster-mongo-connector");

let dbo = null;
let _apiReference = null; // it’ll be the Connector instance

mongodb.MongoClient.connect("the connection string to your database", {
    useNewUrlParser: true
}, (err, db) => {
    if (err)
        throw err;
    dbo = db.db("your database name");
    _apiReference = new fm_mongo_connector.MongoDataAPI();
});`
```
The next step is handling all the requests sent to your server by Flexmonster. Visit our website to find a [detailed tutorial](https://www.flexmonster.com/doc/embedding-the-connector-into-the-server/) on handling the requests properly.

On the front end, your code should look like the following to get the data from the Connector:

```bash
<body>
    <div id="pivot"></div>
    <script type="text/javascript">
        new Flexmonster({
            container: "#pivot",
            componentFolder: "https://cdn.flexmonster.com/",
            report: {
                dataSource: {
                    type: "api",
                    url: "url to your API endpoins",
	              index: “your collection’s name”
                }
            }
        })
    </script>
</body>
```

## Examples

The sample project can be found [at GitHub](https://github.com/flexmonster/pivot-mongo).

## Usage

Available methods for the Flexmonster MongoDB Connector:

1. getSchema  <a id="getSchema"></a>

   Allows getting the list of all fields with their types from a MongoDB database.

   **Parameters**

   The `getSchema` method has the following parameters:

   - `mongoDBInstance` – [Db instance](https://mongodb.github.io/node-mongodb-native/api-generated/db.html). The instance of the needed MongoDB database.
   - `index` – String. The collection’s name. `index` is sent in the body of the Flexmonster request.

   **Returns**

   Array of field objects, which contains all the fields and information about them.

   See [our documentation](https://www.flexmonster.com/api/getschema/) to learn more about the `getSchema` method. 

2. getMembers <a id="getMembers"></a>

   Allows getting all members of the field from a MongoDB database.

   **Parameters**

   The `getMembers` method has the following parameters:

   - `mongoDBInstance` – [Db instance](https://mongodb.github.io/node-mongodb-native/api-generated/db.html). The instance of the needed MongoDB database.
   - `index` – String. The collection’s name. `index` is sent in the body of the Flexmonster request.
   - `fieldObject` – Field Object. Represents a field with its properties. `fieldObject` is sent in the body of the Flexmonster request.
   - `page` – Object. Has the `pageNumber` and `pageToken` properties.

   **Returns**

   Array of objects, which contains all the members. 

   See [our documentation](https://www.flexmonster.com/api/getmembers-2/) to learn more about the `getMembers` method. 

3. getSelectResult <a id="getSelectResult"></a>

   Allows getting the data from a MongoDB database.

   **Parameters**

   The `getSelectResult` method has the following parameters:
   - `mongoDBInstance` – [Db instance](https://mongodb.github.io/node-mongodb-native/api-generated/db.html). The instance of the needed MongoDB database.
   - `index` – String. The collection’s name. `index` is sent in the body of the Flexmonster request.
   - `query` – Object. `query` is sent in the body of the Flexmonster request.
   - `page` – Object. Has the `pageNumber` and `pageToken` properties.

   **Returns**
  
   Array of objects, which contains the aggregated data.

   See [our documentation](https://www.flexmonster.com/api/getselectresult/) to learn more about the `getSelectResult` method. 

## License

Here is [Flexmonster licensing page](https://www.flexmonster.com/pivot-table-editions-and-pricing/). We have free 30 day trial! Flexmonster Connector for MongoDB module is released as a MIT-licensed (free and open-source) add-on to Flexmonster Pivot.

## Support & feedback

Please share your feedback or ask questions via [Flexmonster Forum](https://www.flexmonster.com/forum/).