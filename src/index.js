import wkx from 'wkx';
import array from 'postgres-array';
import types from 'pg-custom-types';
import pg from 'pg';

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

const GEOMETRY_OIDS = {};
const GEOMETRY_ARRAY_OIDS = {};

const GEOGRAPHY_OIDS = {};
const GEOGRAPHY_ARRAY_OIDS = {};

const TYPE_PARSERS = {};

let parseGeometryHandler = function (value) {
  return wkx.Geometry.parse(new Buffer(value, 'hex'));
};

function typeNameKey(key) {
  return key ? POSTGIS + '-' + key : POSTGIS;
}

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

function postgis(exec, key, callback) {
  key = typeNameKey(key);

  if (types.oids[key] && types.oids[key].geometry != null) {
    return callback();
  }

  types(exec, key, TYPENAMES, (err, res) => {
    if (err) {
      return callback(err);
    }

    if (!TYPE_PARSERS[key]) {
      TYPE_PARSERS[key] = {};
    }

    if (!GEOMETRY_OIDS[key]) {
      GEOMETRY_OIDS[key] = {};
    }

    if (!GEOMETRY_ARRAY_OIDS[key]) {
      GEOMETRY_ARRAY_OIDS[key] = {};
    }

    if (!GEOGRAPHY_OIDS[key]) {
      GEOGRAPHY_OIDS[key] = {};
    }

    if (!GEOGRAPHY_ARRAY_OIDS[key]) {
      GEOGRAPHY_ARRAY_OIDS[key] = {};
    }

    if (!postgis.names) {
      postgis.names = {};
    }

    if (!postgis.oids) {
      postgis.oids = {};
    }

    for (let parser of Object.keys(parsers)) {
      if (res[parser]) {
        pg.types.setTypeParser(+res[parser], parsers[parser]);

        TYPE_PARSERS[key][+res[parser]] = parsers[parser];
      }
    }

    GEOMETRY_OIDS[key] = res.geometry;
    GEOMETRY_ARRAY_OIDS[key] = res._geometry;
    GEOGRAPHY_OIDS[key] = res.geography;
    GEOGRAPHY_ARRAY_OIDS[key] = res._geography;

    postgis.names[key] = types.names[key];
    postgis.oids[key] = types.oids[key];

    callback();
  });
}

postgis.isGeometryType = function (oid, key) {
  key = typeNameKey(key);

  return oid === GEOMETRY_OIDS[key] || oid === GEOGRAPHY_OIDS[key] ||
         oid === GEOMETRY_ARRAY_OIDS[key] || oid === GEOGRAPHY_ARRAY_OIDS[key];
};

postgis.setGeometryParser = function (parser) {
  parseGeometryHandler = parser;
};

postgis.getTypeParser = function (oid, key) {
  key = typeNameKey(key);

  return TYPE_PARSERS[key][+oid];
};

postgis.getTypeName = function (oid, key) {
  return types.getTypeName(oid, typeNameKey(key));
};

postgis.getTypeOID = function (name, key) {
  return types.getTypeOID(name, typeNameKey(key));
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
