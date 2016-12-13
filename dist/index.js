'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _wkx = require('wkx');

var _wkx2 = _interopRequireDefault(_wkx);

var _postgresArray = require('postgres-array');

var _postgresArray2 = _interopRequireDefault(_postgresArray);

var _pgCustomTypes = require('pg-custom-types');

var _pgCustomTypes2 = _interopRequireDefault(_pgCustomTypes);

var _pg = require('pg');

var _pg2 = _interopRequireDefault(_pg);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var POSTGIS = 'postgis';

var TYPENAMES = ['geometry', 'geometry_dump', 'geography', 'box2d', 'box3d', '_geometry', '_geometry_dump', '_geography', '_box2d', '_box3d'];

var GEOMETRY_OIDS = {};
var GEOMETRY_ARRAY_OIDS = {};

var GEOGRAPHY_OIDS = {};
var GEOGRAPHY_ARRAY_OIDS = {};

var TYPE_PARSERS = {};

var parseGeometryHandler = function parseGeometryHandler(value) {
  return _wkx2.default.Geometry.parse(new Buffer(value, 'hex'));
};

function typeNameKey(key) {
  return key ? POSTGIS + '-' + key : POSTGIS;
}

function parseGeometry(value) {
  return parseGeometryHandler(value);
}

function parseBox(value) {
  value = value.substring(value.indexOf('(') + 1, value.indexOf(')'));

  var pairs = value.split(',');
  var coordinates = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = pairs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var pair = _step.value;

      coordinates.push(pair.split(' ').map(function (i) {
        return +i;
      }));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return coordinates;
}

function parsePostgisArray(parser) {
  return _pgCustomTypes2.default.allowNull(function (value) {
    return _postgresArray2.default.parse(value.replace(/:/g, ','), _pgCustomTypes2.default.allowNull(parser));
  });
}

var parsers = {
  geometry: _pgCustomTypes2.default.allowNull(parseGeometry),
  geography: _pgCustomTypes2.default.allowNull(parseGeometry),
  box2d: _pgCustomTypes2.default.allowNull(parseBox),
  box3d: _pgCustomTypes2.default.allowNull(parseBox),
  _geometry: parsePostgisArray(parseGeometry),
  _geography: parsePostgisArray(parseGeometry),
  _box2d: parsePostgisArray(parseBox),
  _box3d: parsePostgisArray(parseBox)
};

function postgis(exec, key, callback) {
  key = typeNameKey(key);

  if (_pgCustomTypes2.default.oids[key] && _pgCustomTypes2.default.oids[key].geometry != null) {
    return callback();
  }

  (0, _pgCustomTypes2.default)(exec, key, TYPENAMES, function (err, res) {
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

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = Object.keys(parsers)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var parser = _step2.value;

        if (res[parser]) {
          _pg2.default.types.setTypeParser(+res[parser], parsers[parser]);

          TYPE_PARSERS[key][+res[parser]] = parsers[parser];
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    GEOMETRY_OIDS[key] = res.geometry;
    GEOMETRY_ARRAY_OIDS[key] = res._geometry;
    GEOGRAPHY_OIDS[key] = res.geography;
    GEOGRAPHY_ARRAY_OIDS[key] = res._geography;

    postgis.names[key] = _pgCustomTypes2.default.names[key];
    postgis.oids[key] = _pgCustomTypes2.default.oids[key];

    callback();
  });
}

postgis.isGeometryType = function (oid, key) {
  key = typeNameKey(key);

  return oid === GEOMETRY_OIDS[key] || oid === GEOGRAPHY_OIDS[key] || oid === GEOMETRY_ARRAY_OIDS[key] || oid === GEOGRAPHY_ARRAY_OIDS[key];
};

postgis.setGeometryParser = function (parser) {
  parseGeometryHandler = parser;
};

postgis.getTypeParser = function (oid, key) {
  key = typeNameKey(key);

  return TYPE_PARSERS[key][+oid];
};

postgis.getTypeName = function (oid, key) {
  return _pgCustomTypes2.default.getTypeName(oid, typeNameKey(key));
};

postgis.getTypeOID = function (name, key) {
  return _pgCustomTypes2.default.getTypeOID(name, typeNameKey(key));
};

var POSTGIS_TYPES = ['Unknown', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection', 'CircularString', 'CompoundCurve', 'CurvePolygon', 'MultiCurve', 'MultiSurface', 'PolyhedralSurface', 'Triangle', 'Tin'];

postgis.srid = function (mod) {
  return (mod & 0x1FFFFF00) << 3 >> 11;
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
  var _postgis$typeobj = postgis.typeobj(mod);

  var type = _postgis$typeobj.type;
  var srid = _postgis$typeobj.srid;
  var z = _postgis$typeobj.z;
  var m = _postgis$typeobj.m;

  if (mod < 0) {
    return '';
  }

  var name = '';

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

exports.default = postgis;
//# sourceMappingURL=index.js.map