import wkx from 'wkx';
import array from 'postgres-array';
import types from 'pg-custom-types';

const TYPENAMES = [ 'geometry',
                    'geometry_dump',
                    'geography',
                    'box2d',
                    'box3d',
                    '_geometry',
                    '_geometry_dump',
                    '_geography',
                    '_box2d',
                    '_box3d' ];

let GEOMETRY_OID = null;
let GEOGRAPHY_OID = null;

let parseGeometryHandler = function (value) {
  return wkx.Geometry.parse(new Buffer(value, 'hex'));
};

function parseGeometry(value) {
  return parseGeometryHandler(value);
}

function parseBox(value) {
  value = value.substring(value.indexOf('(') + 1, value.indexOf(')'));

  const pairs = value.split(',');
  const coordinates = [];

  for (let pair of pairs) {
    coordinates.push(pair.split(' ').map(i => +i));
  }

  return coordinates;
}

function parsePostgisArray(parser) {
  return types.allowNull((value) => {
    return array.parse(value.replace(/:/g, ','), types.allowNull(parser));
  });
}

const parsers = {
  geometry: types.allowNull(parseGeometry),
  geography: types.allowNull(parseGeometry),
  box2d: types.allowNull(parseBox),
  box3d: types.allowNull(parseBox),
  _geometry: parsePostgisArray(parseGeometry),
  _geography: parsePostgisArray(parseGeometry),
  _box2d: parsePostgisArray(parseBox),
  _box3d: parsePostgisArray(parseBox)
};

function postgis(postgres, connection, callback) {
  if (types.oids.geometry != null) {
    return callback();
  }

  types(postgres, connection, TYPENAMES, (err, res) => {
    if (err) {
      return callback(err);
    }

    for (let parser of Object.keys(parsers)) {
      if (res[parser]) {
        postgres.types.setTypeParser(+res[parser], parsers[parser]);
      }
    }

    GEOMETRY_OID = res.geometry;
    GEOGRAPHY_OID = res.geography;

    callback();
  });
}

postgis.isGeometryType = function (oid) {
  return oid === GEOMETRY_OID || oid === GEOGRAPHY_OID;
};

postgis.setGeometryParser = function (parser) {
  parseGeometryHandler = parser;
};

postgis.names = types.names;
postgis.oids = types.oids;

export default postgis;
