import pg from 'pg';
import chai from 'chai';
import postgis from '../src';
import pgtypes from 'pg-custom-types';

chai.should();

const KEY = null;

const connection = 'pg://postgres@localhost/pg_custom_types';

const exec = (sql, callback) => {
  pg.connect(connection, (err, client, done) => {
    if (err) {
      return callback(err);
    }

    client.query(sql, null, (err, result) => {
      done();

      if (err) {
        return callback(err);
      }

      callback(null, result);
    });
  });
};

describe('custom types', () => {
  before((done) => {
    postgis(pgtypes.fetcher(pg, connection), KEY, done);
  });

  it('parses postgis geometries', function (done) {
    exec("SELECT ST_GeomFromText('POINT(1 2)') AS geom", (err, results) => {
      if (err) {
        return done(err);
      }

      const geometry = results.rows[0].geom.toGeoJSON();

      geometry.should.eql({ type: 'Point', coordinates: [1, 2] });

      done();
    });
  });

  it('parses postgis geographies', function (done) {
    exec("SELECT ST_GeographyFromText('SRID=4326;POINT(-110 30)') AS geom", (err, results) => {
      if (err) {
        return done(err);
      }

      const geometry = results.rows[0].geom.toGeoJSON();

      geometry.should.eql({ type: 'Point', coordinates: [-110, 30] });

      done();
    });
  });

  it('parses postgis box2d', function (done) {
    exec("SELECT Box2D(ST_GeomFromText('LINESTRING(1 2, 3 4, 5 6)')) AS geom", (err, results) => {
      if (err) {
        return done(err);
      }

      const box = results.rows[0].geom;

      box.should.eql([ [1, 2], [5, 6] ]);

      done();
    });
  });

  it('converts type names to oids', function () {
    postgis.getTypeName(postgis.getTypeOID('geometry', KEY), KEY).should.eql('geometry');
  });

  it('produces the full type name from typmods', function (done) {
    exec('SELECT geom FROM test', (err, results) => {
      if (err) {
        return done(err);
      }

      const type = postgis.typename(results.fields[0].dataTypeModifier);

      type.should.eql('(Point,4326)');

      done();
    });
  });

  it('produces an empty type name from typmods', function (done) {
    exec("SELECT ST_GeomFromText('LINESTRING(1 2, 3 4, 5 6)', 4326)", (err, results) => {
      if (err) {
        return done(err);
      }

      const type = postgis.typename(results.fields[0].dataTypeModifier);

      type.should.eql('');

      done();
    });
  });

  it('detects the array types', function (done) {
    exec("SELECT ARRAY[ST_GeomFromText('POINT(1 1)'), ST_GeomFromText('POINT(1 1)')]", (err, results) => {
      if (err) {
        return done(err);
      }

      postgis.isGeometryType(results.fields[0].dataTypeID, KEY).should.eql(true);

      done();
    });
  });
});
