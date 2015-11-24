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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TYPENAMES = ['geometry', 'geometry_dump', 'geography', 'box2d', 'box3d', '_geometry', '_geometry_dump', '_geography', '_box2d', '_box3d'];

var GEOMETRY_OID = null;
var GEOGRAPHY_OID = null;

var parseGeometryHandler = function parseGeometryHandler(value) {
  return _wkx2.default.Geometry.parse(new Buffer(value, 'hex'));
};

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

function postgis(postgres, connection, callback) {
  if (_pgCustomTypes2.default.oids.geometry != null) {
    return callback();
  }

  (0, _pgCustomTypes2.default)(postgres, connection, TYPENAMES, function (err, res) {
    if (err) {
      return callback(err);
    }

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = Object.keys(parsers)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var parser = _step2.value;

        if (res[parser]) {
          postgres.types.setTypeParser(+res[parser], parsers[parser]);
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

exports.default = postgis;
//# sourceMappingURL=index.js.map