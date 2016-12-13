# v2.0.0
* Added support for parsing geometries from multiple different databases with different OID maps.
* BREAKING CHANGE - there is now an additional `key` parameter on the APIs to handle multiple different
databases. The easiest way to have it work is to just use the database connection string as the key.

# v1.1.0
* isGeometryType now supports `geometry[]` and `geography[]` array types

# v1.0.4
* Add geometry type array to exports

# v1.0.3
* Add support for PostGIS typmods

# v1.0.2
* Export the `names` and `oids` objects from the pg-custom-types module

# v1.0.1
* Upgrade pg-custom-types dependency

# v1.0.0
* Initial release
