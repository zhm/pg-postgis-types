import pg from 'pg';
import chai from 'chai';
import postgis from '../src';

chai.should();

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
    postgis(pg, connection, done);
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
    postgis.names[postgis.oids['geometry']].should.eql('geometry');
  });
});
