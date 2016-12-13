# pg-postgis-types [![Build Status](https://travis-ci.org/zhm/pg-postgis-types.svg?branch=master)](https://travis-ci.org/zhm/pg-postgis-types)

Use PostGIS geometry types with [node-postgres](https://github.com/brianc/node-postgres).

This module registers parsers for the PostGIS geometry types. You can also plug in your own WKB parser.

## Installation

```sh
npm install pg-postgis-types
```

### Documentation

### `postgis(fetcher, key, callback)`

Fetches the OIDs for the given types.

### Parameters

| parameter       | type               | description                                                           |
| --------------- | ------------------ | --------------------------------------------------------------------- |
| `fetcher`       | Function           | The function to query of the form `function (sql, callback)           |
| `key`           | String             | A unique string to key the type map with (e.g. the connection string) |
| `callback`      | Function           | The callback to call after the types are fetched                      |

Callback is called with an error argument.

### `postgis.isGeometryType(oid, key)`

Returns true if the given OID is a geometry or geography type

### Parameters

| parameter       | type               | description                                                           |
| --------------- | ------------------ | --------------------------------------------------------------------- |
| `oid`           | Number             | The oid of a column                                                   |
| `key`           | String             | A unique string to key the type map with (e.g. the connection string) |


### `postgis.setGeometryParser(parser)`

Setup a custom parser for geometry/geography columns. The parser is a function that accepts one
argument for the string value to parse. The library uses `wkx` by default to parse goemetries. You
can use this if you want to use your own WKB parser.

### Parameters

| parameter       | type               | description                                               |
| --------------- | ------------------ | --------------------------------------------------------- |
| `parser`        | Function           | The custom parser to use for geometry columns             |


## Example

```js
var pg = require('pg');
var postgis = require('pg-postgis-types');
var pgtypes = require('pg-custom-types');

var connection = 'some connection string';

postgis(pgtypes.fetcher(pg, connection), null, (err, oids) {
  if (err) {
    throw err;
  }

  pg.connect(connection, function (err, client, done) {
    if (err) {
      return callback(err);
    }

    var sql = "SELECT ST_GeomFromText('POINT(1 2)') AS geom";

    client.query(sql, null, function (err, results) {
      done();

      if (err) {
        throw err;
      }

      var geojson = results.rows[0].geom.toGeoJSON();

      // do something cool with geojson
    });
  });
});
```
