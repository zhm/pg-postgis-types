import wkx from 'wkx';
import array from 'postgres-array';
import types from 'pg-custom-types';

const POSTGIS = 'postgis';

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
let GEOMETRY_ARRAY_OID = null;

let GEOGRAPHY_OID = null;
let GEOGRAPHY_ARRAY_OID = null;

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
  if (types.oids[POSTGIS] && types.oids[POSTGIS].geometry != null) {
    return callback();
  }

  types(postgres, connection, POSTGIS, TYPENAMES, (err, res) => {
    if (err) {
      return callback(err);
    }

    for (let parser of Object.keys(parsers)) {
      if (res[parser]) {
        postgres.types.setTypeParser(+res[parser], parsers[parser]);
      }
    }

    GEOMETRY_OID = res.geometry;
    GEOMETRY_ARRAY_OID = res._geometry;
    GEOGRAPHY_OID = res.geography;
    GEOGRAPHY_ARRAY_OID = res._geography;

    postgis.names = types.names[POSTGIS];
    postgis.oids = types.oids[POSTGIS];

    callback();
  });
}

postgis.isGeometryType = function (oid) {
  return oid === GEOMETRY_OID || oid === GEOGRAPHY_OID ||
         oid === GEOMETRY_ARRAY_OID || oid === GEOGRAPHY_ARRAY_OID;
};

postgis.setGeometryParser = function (parser) {
  parseGeometryHandler = parser;
};

const POSTGIS_TYPES = [
  'Unknown',
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'GeometryCollection',
  'CircularString',
  'CompoundCurve',
  'CurvePolygon',
  'MultiCurve',
  'MultiSurface',
  'PolyhedralSurface',
  'Triangle',
  'Tin'
];

postgis.srid = function (mod) {
  return (((mod) & 0x1FFFFF00) << 3) >> 11;
};

postgis.type = function (mod) {
  return (mod & 0x000000FC) >> 2;
};

postgis.z = function (mod) {
  return (mod & 0x00000002) >> 1;
};

postgis.m = function (mod) {
  return mod & 0x00000001;
};

postgis.ndims = function (mod) {
  return 2 + postgis.z(mod) + postgis.m(mod);
};

postgis.typename = function (mod) {
  const {type, srid, z, m} = postgis.typeobj(mod);

  if (mod < 0) {
    return '';
  }

  let name = '';

  if (!(type || srid || z | m)) {
    return '';
  }

  name += '(';

  if (type) {
    name += POSTGIS_TYPES[type];
  } else {
    name += 'Geometry';
  }

  if (z) {
    name += 'Z';
  }

  if (m) {
    name += 'M';
  }

  if (srid > 0) {
    name += ',' + srid;
  }

  name += ')';

  return name;
};

postgis.typeobj = function (mod) {
  return {
    type: postgis.type(mod),
    srid: postgis.srid(mod),
    z: postgis.z(mod),
    m: postgis.m(mod),
    ndims: postgis.ndims(mod)
  };
};

postgis.geometryTypes = POSTGIS_TYPES;

export default postgis;
